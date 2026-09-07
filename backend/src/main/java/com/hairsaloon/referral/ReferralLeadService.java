package com.hairsaloon.referral;

import com.hairsaloon.auth.AuthenticatedUser;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Hands scraped salon leads to referrers under the program rules:
 *  - batches of {@code batchSize} (default 10), up to {@code dailyLimit} (30) per day;
 *  - the daily cap lifts in blocks of {@code dailyLimit} once the referrer gets
 *    {@code onboardTarget} (3) of that day's leads onboarded (admin marks PAID);
 *  - failing the target on more than {@code maxFailDays} (3) consecutive request-days
 *    puts the account on hold, and held accounts get no leads until an admin reactivates.
 * A referral_submissions row is auto-created per delivered lead so the existing
 * verify/mark-paid flow drives onboarding.
 */
@Service
public class ReferralLeadService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    private final ReferrerProfileRepository profiles;
    private final ReferralSubmissionRepository submissions;
    private final ReferralLeadRepository leads;
    private final ScraperLeadsClient scraper;
    private final ReferralLeadsProperties properties;

    public ReferralLeadService(ReferrerProfileRepository profiles,
                               ReferralSubmissionRepository submissions,
                               ReferralLeadRepository leads,
                               ScraperLeadsClient scraper,
                               ReferralLeadsProperties properties) {
        this.profiles = profiles;
        this.submissions = submissions;
        this.leads = leads;
        this.scraper = scraper;
        this.properties = properties;
    }

    @Transactional
    public LeadBatch nextBatch(AuthenticatedUser user) {
        if (!scraper.enabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Lead delivery is not configured yet.");
        }
        ReferrerProfile profile = profiles.findById(user.id()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Referrer profile not found"));
        if (!profile.isApproved()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Your referrer account is not approved yet.");
        }

        // Auto-hold check first (uses history through yesterday), then serve.
        evaluateHold(profile);
        if (profile.isOnHold()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Your account is on hold. Please contact the admin to reactivate.");
        }

        LocalDate today = LocalDate.now(ZONE);
        int limit = properties.dailyLimitOr();
        int target = properties.onboardTargetOr();
        int batch = properties.batchSizeOr();

        long takenToday = leads.countByReferrerIdAndAssignedOn(user.id(), today);
        int onboardedToday = onboardedOn(user.id(), today);

        // The cap lifts one block at a time: each completed block of `limit` requires
        // `target` onboarded to unlock the next block.
        long blocksUsed = takenToday / limit;
        long onboardBlocksEarned = onboardedToday / target;
        long allowedBlocks = onboardBlocksEarned + 1;
        if (blocksUsed >= allowedBlocks) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Daily limit reached. Onboard " + target + " of today's leads to unlock more.");
        }
        long remainingInBlock = (allowedBlocks * limit) - takenToday;
        int want = (int) Math.min(batch, Math.max(0, remainingInBlock));
        if (want <= 0) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Daily limit reached. Onboard " + target + " of today's leads to unlock more.");
        }

        List<ScraperLeadsClient.Lead> fresh = fetchUnclaimed(want);
        if (fresh.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                "No new leads are available right now. Please try again later.");
        }

        List<LeadView> delivered = new ArrayList<>();
        for (ScraperLeadsClient.Lead lead : fresh) {
            String phone = lead.phone() == null ? "" : lead.phone();
            String normalized = normalizePhone(phone);
            // Skip salons already referred by anyone (keeps the one-referral rule).
            if (!normalized.isBlank()
                && submissions.existsBySalonPhoneNormalizedAndStatusNot(normalized, ReferralStatus.REJECTED)) {
                continue;
            }
            ReferralSubmission submission = new ReferralSubmission(
                user.id(),
                blankTo(lead.name(), "Unknown salon"),
                blankTo(phone, "N/A"),
                normalized.isBlank() ? ("lead-" + lead.externalId()) : normalized,
                blankTo(lead.mapsUrl(), ""),
                null,
                lead.address());
            ReferralSubmission saved;
            try {
                saved = submissions.saveAndFlush(submission);
            } catch (RuntimeException duplicate) {
                continue; // salon got referred concurrently; skip
            }
            leads.save(new ReferralLead(user.id(), lead.externalId(), saved.getId(), today));
            delivered.add(new LeadView(saved.getId(), lead.name(), phone, lead.address(), lead.mapsUrl()));
        }

        long takenAfter = leads.countByReferrerIdAndAssignedOn(user.id(), today);
        return new LeadBatch(delivered, (int) takenAfter, (int) (allowedBlocks * limit),
            onboardedToday, target);
    }

    /** Pulls unclaimed leads from the scraper, paging until it has enough or runs out. */
    private List<ScraperLeadsClient.Lead> fetchUnclaimed(int want) {
        List<ScraperLeadsClient.Lead> picked = new ArrayList<>();
        int offset = 0;
        int pages = 0;
        while (picked.size() < want && pages < 20) {
            List<ScraperLeadsClient.Lead> page = scraper.fetch(offset, Math.max(want * 2, 20));
            if (page.isEmpty()) break;
            for (ScraperLeadsClient.Lead lead : page) {
                if (!leads.existsByExternalId(lead.externalId())) {
                    picked.add(lead);
                    if (picked.size() >= want) break;
                }
            }
            offset += page.size();
            pages++;
        }
        return picked;
    }

    /** Onboarded = leads assigned on {@code day} whose submission is now PAID. */
    private int onboardedOn(long referrerId, LocalDate day) {
        List<ReferralLead> dayLeads = leads.findByReferrerIdOrderByAssignedOnDesc(referrerId).stream()
            .filter(l -> day.equals(l.getAssignedOn()) && l.getSubmissionId() != null)
            .toList();
        if (dayLeads.isEmpty()) return 0;
        var paidIds = dayLeads.stream().map(ReferralLead::getSubmissionId).collect(Collectors.toSet());
        return (int) submissions.findAllById(paidIds).stream()
            .filter(s -> s.getStatus() == ReferralStatus.PAID).count();
    }

    /**
     * Holds the account if the last {@code maxFailDays}+1 consecutive request-days each
     * missed the onboard target. Only days the referrer actually pulled leads count.
     */
    private void evaluateHold(ReferrerProfile profile) {
        if (profile.isOnHold()) return;
        int target = properties.onboardTargetOr();
        int maxFail = properties.maxFailDaysOr();
        LocalDate today = LocalDate.now(ZONE);

        // Onboarded count per request-day, only for completed past days (exclude today).
        Map<LocalDate, Integer> byDay = new TreeMap<>();
        for (ReferralLead lead : leads.findByReferrerIdOrderByAssignedOnDesc(profile.getUserId())) {
            if (lead.getAssignedOn().isBefore(today)) {
                byDay.putIfAbsent(lead.getAssignedOn(), 0);
            }
        }
        for (LocalDate day : byDay.keySet()) {
            byDay.put(day, onboardedOn(profile.getUserId(), day));
        }
        // Walk the most recent request-days; count consecutive failures.
        List<LocalDate> daysDesc = new ArrayList<>(byDay.keySet());
        java.util.Collections.reverse(daysDesc);
        int consecutiveFail = 0;
        for (LocalDate day : daysDesc) {
            if (byDay.get(day) < target) consecutiveFail++;
            else break;
        }
        if (consecutiveFail > maxFail) {
            profile.hold("Missed the daily onboarding target for more than "
                + maxFail + " consecutive days.");
            profiles.save(profile);
        }
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String normalizePhone(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        return digits.length() == 10 ? "91" + digits : digits;
    }

    public record LeadView(Long referralId, String salonName, String salonPhone,
                           String salonAddress, String mapsUrl) {}

    public record LeadBatch(List<LeadView> leads, int takenToday, int dailyAllowance,
                            int onboardedToday, int onboardTarget) {}
}
