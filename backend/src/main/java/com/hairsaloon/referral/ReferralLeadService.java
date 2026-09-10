package com.hairsaloon.referral;

import com.hairsaloon.auth.AuthenticatedUser;
import java.time.Instant;
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
    private final com.hairsaloon.tenant.SalonRepository salons;
    private final com.hairsaloon.tenant.TenantProperties tenantProperties;
    private final com.hairsaloon.auth.UserRepository users;

    public ReferralLeadService(ReferrerProfileRepository profiles,
                               ReferralSubmissionRepository submissions,
                               ReferralLeadRepository leads,
                               ScraperLeadsClient scraper,
                               ReferralLeadsProperties properties,
                               com.hairsaloon.tenant.SalonRepository salons,
                               com.hairsaloon.tenant.TenantProperties tenantProperties,
                               com.hairsaloon.auth.UserRepository users) {
        this.profiles = profiles;
        this.submissions = submissions;
        this.leads = leads;
        this.scraper = scraper;
        this.properties = properties;
        this.salons = salons;
        this.tenantProperties = tenantProperties;
        this.users = users;
    }

    /** Live access status from the scraper for this referrer's code, and whether leads are configured. */
    @Transactional(readOnly = true)
    public AccessStatus accessStatus(AuthenticatedUser user) {
        if (!scraper.enabled()) {
            return new AccessStatus(false, "UNKNOWN", null);
        }
        ReferrerProfile profile = profiles.findById(user.id()).orElse(null);
        if (profile == null) return new AccessStatus(true, "UNKNOWN", null);
        String status = scraper.status(profile.getReferralCode());
        return new AccessStatus(true, status, profile.getReferralCode());
    }

    /** Re-sends the access request: (re)registers the code with the scraper, then returns status. */
    @Transactional(readOnly = true)
    public AccessStatus requestAccess(AuthenticatedUser user) {
        if (!scraper.enabled()) {
            return new AccessStatus(false, "UNKNOWN", null);
        }
        ReferrerProfile profile = profiles.findById(user.id()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Referrer profile not found"));
        scraper.register(user.name(), user.phone(), profile.getReferralCode());
        String status = scraper.status(profile.getReferralCode());
        return new AccessStatus(true, status, profile.getReferralCode());
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

        List<ScraperLeadsClient.Lead> fresh;
        try {
            // The scraper returns up to 10 fresh (never-sent) businesses and marks them sent.
            fresh = scraper.fetchBatch(profile.getReferralCode());
        } catch (ScraperLeadsClient.NotApprovedException notApproved) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Your lead access is pending approval. Please try again once it is approved.");
        }
        // The scraper already returns <=10 fresh leads and marked them sent, so we keep
        // all of them (trimming would lose leads the scraper won't hand out again).
        fresh = fresh.stream()
            .filter(l -> !leads.existsByExternalId(l.externalId()))
            .toList();
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
            ReferralLead leadRow = new ReferralLead(user.id(), lead.externalId(), saved.getId(), today);
            leadRow.setSalonDetails(lead.name(), phone, lead.website(), lead.mapsUrl(), lead.address());
            leads.save(leadRow);
            delivered.add(new LeadView(leadRow.getId(), saved.getId(), lead.name(), phone,
                lead.address(), lead.mapsUrl(), lead.website(), "NEW", null, null, null,
                null, 0, null, null));
        }

        long takenAfter = leads.countByReferrerIdAndAssignedOn(user.id(), today);
        return new LeadBatch(delivered, (int) takenAfter, (int) (allowedBlocks * limit),
            onboardedToday, target);
    }

    /** All leads ever delivered to this referrer, newest first, with contact status. */
    @Transactional
    public List<LeadView> myLeads(long referrerId) {
        List<ReferralLead> rows = leads.findByReferrerIdOrderByAssignedOnDesc(referrerId);
        // A contacted lead that goes 24h without the next message is auto not-interested.
        Instant cutoff = Instant.now().minus(java.time.Duration.ofHours(24));
        List<ReferralLead> expired = new ArrayList<>();
        for (ReferralLead l : rows) {
            if (!"CONTACTED".equals(l.getContactStatus())) continue;
            Instant last = l.getLastFollowupAt() != null ? l.getLastFollowupAt() : l.getContactedAt();
            if (last != null && last.isBefore(cutoff)) {
                l.setContactStatus("NOT_INTERESTED");
                expired.add(l);
            }
        }
        if (!expired.isEmpty()) leads.saveAll(expired);
        return toViews(rows);
    }

    /** Admin: every delivered lead across all referrers, newest first. */
    @Transactional(readOnly = true)
    public List<AdminLeadView> allLeads() {
        List<ReferralLead> rows = leads.findAll(org.springframework.data.domain.Sort
            .by(org.springframework.data.domain.Sort.Direction.DESC, "assignedOn"));
        // Pre-fetch linked submissions for name/phone fallback on older rows.
        var subs = submissions.findAllById(rows.stream()
            .map(ReferralLead::getSubmissionId).filter(java.util.Objects::nonNull).toList());
        Map<Long, ReferralSubmission> byId = subs.stream()
            .collect(Collectors.toMap(ReferralSubmission::getId, s -> s, (a, b) -> a));
        var siteIds = rows.stream().map(ReferralLead::getCreatedSalonId)
            .filter(java.util.Objects::nonNull).toList();
        Map<Long, com.hairsaloon.tenant.Salon> siteById = salons.findAllById(siteIds).stream()
            .collect(Collectors.toMap(com.hairsaloon.tenant.Salon::getId, s -> s, (a, b) -> a));
        var referrerIds = rows.stream().map(ReferralLead::getReferrerId)
            .filter(java.util.Objects::nonNull).distinct().toList();
        Map<Long, String> nameById = users.findAllById(referrerIds).stream()
            .collect(Collectors.toMap(com.hairsaloon.auth.User::getId,
                u -> u.getName() == null ? "" : u.getName(), (a, b) -> a));
        Map<Long, String> codeById = profiles.findAllById(referrerIds).stream()
            .collect(Collectors.toMap(ReferrerProfile::getUserId,
                ReferrerProfile::getReferralCode, (a, b) -> a));
        return rows.stream().map(l -> {
            LeadView v = toView(l, byId.get(l.getSubmissionId()));
            com.hairsaloon.tenant.Salon site = l.getCreatedSalonId() == null ? null
                : siteById.get(l.getCreatedSalonId());
            String url = site == null ? null
                : "https://" + site.getSubdomain() + "." + tenantProperties.getBaseDomain();
            return new AdminLeadView(l.getReferrerId(), nameById.get(l.getReferrerId()),
                codeById.get(l.getReferrerId()), v.salonName(), v.salonPhone(),
                v.salonAddress(), v.mapsUrl(), v.website(), v.contactStatus(),
                l.getAssignedOn() == null ? null : l.getAssignedOn().toString(),
                url, site != null && site.isTrial());
        }).toList();
    }

    private List<LeadView> toViews(List<ReferralLead> rows) {
        var subs = submissions.findAllById(rows.stream()
            .map(ReferralLead::getSubmissionId).filter(java.util.Objects::nonNull).toList());
        Map<Long, ReferralSubmission> byId = subs.stream()
            .collect(Collectors.toMap(ReferralSubmission::getId, s -> s, (a, b) -> a));
        var siteIds = rows.stream().map(ReferralLead::getCreatedSalonId)
            .filter(java.util.Objects::nonNull).toList();
        Map<Long, com.hairsaloon.tenant.Salon> siteById = salons.findAllById(siteIds).stream()
            .collect(Collectors.toMap(com.hairsaloon.tenant.Salon::getId, s -> s, (a, b) -> a));
        var ownerIds = siteById.values().stream()
            .map(com.hairsaloon.tenant.Salon::getOwnerId).filter(java.util.Objects::nonNull).toList();
        Map<Long, String> emailByOwnerId = users.findAllById(ownerIds).stream()
            .filter(u -> u.getEmail() != null)
            .collect(Collectors.toMap(com.hairsaloon.auth.User::getId,
                com.hairsaloon.auth.User::getEmail, (a, b) -> a));
        return rows.stream().map(l -> {
            com.hairsaloon.tenant.Salon site = l.getCreatedSalonId() == null ? null
                : siteById.get(l.getCreatedSalonId());
            String url = site == null ? null
                : "https://" + site.getSubdomain() + "." + tenantProperties.getBaseDomain();
            String loginEmail = site == null ? null : emailByOwnerId.get(site.getOwnerId());
            return toView(l, byId.get(l.getSubmissionId()), url, loginEmail);
        }).toList();
    }

    /** Uses the lead's snapshot, falling back to the linked submission for older rows. */
    private static LeadView toView(ReferralLead l, ReferralSubmission sub) {
        return toView(l, sub, null, null);
    }

    private static LeadView toView(ReferralLead l, ReferralSubmission sub, String siteUrl,
                                   String siteLoginEmail) {
        String name = firstNonBlank(l.getSalonName(), sub == null ? null : sub.getSalonName());
        String phone = firstNonBlank(l.getSalonPhone(), sub == null ? null : sub.getSalonPhone());
        String location = firstNonBlank(l.getSalonLocation(), sub == null ? null : sub.getSalonAddress());
        String maps = firstNonBlank(l.getSalonMapsUrl(), sub == null ? null : sub.getMapsUrl());
        return new LeadView(l.getId(), l.getSubmissionId(), name, phone, location, maps,
            l.getSalonWebsite(), l.getContactStatus(), l.getCreatedSalonId(), siteUrl, siteLoginEmail,
            l.getContactedAt() == null ? null : l.getContactedAt().toString(),
            l.getFollowupStage(),
            l.getLastFollowupAt() == null ? null : l.getLastFollowupAt().toString(),
            l.getLastScript());
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        return b != null && !b.isBlank() ? b : null;
    }

    /** Referrer updates their own call-outcome status for a delivered lead. */
    @Transactional
    public void setLeadStatus(long referrerId, long leadId, String status) {
        ReferralLead lead = ownedLead(referrerId, leadId);
        lead.setContactStatus(status);
        // Marking CONTACTED (the first time) starts the follow-up clock.
        if ("CONTACTED".equals(status) && lead.getContactedAt() == null) {
            lead.markContacted(Instant.now());
        }
        leads.save(lead);
    }

    /**
     * Records that the referrer sent a WhatsApp script to this lead.
     *  - {@code kind = "first"} (message 1 / the WhatsApp button): marks the lead
     *    CONTACTED and starts the 24h clock.
     *  - {@code kind = "followup"} (A/B/C): advances the follow-up stage; after C the
     *    lead is marked NOT_INTERESTED so the sequence stops.
     * Either way, the label and time of the last message are stored for display.
     */
    @Transactional
    public void recordScriptSent(long referrerId, long leadId, String label, String kind) {
        ReferralLead lead = ownedLead(referrerId, leadId);
        Instant now = Instant.now();
        lead.setLastScript(label);
        if ("followup".equals(kind)) {
            lead.recordFollowupSent(now);
            if (lead.getFollowupStage() >= 3) lead.setContactStatus("NOT_INTERESTED");
        } else {
            // First contact message: begin the CONTACTED lifecycle (no stage advance).
            if (lead.getContactedAt() == null) lead.markContacted(now);
            lead.setContactStatus("CONTACTED");
            lead.stampLastMessage(now);
        }
        leads.save(lead);
    }

    private ReferralLead ownedLead(long referrerId, long leadId) {
        ReferralLead lead = leads.findById(leadId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        if (!lead.getReferrerId().equals(referrerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your lead");
        }
        return lead;
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

    public record AccessStatus(boolean configured, String status, String referralCode) {}

    public record LeadView(Long leadId, Long referralId, String salonName, String salonPhone,
                           String salonAddress, String mapsUrl, String website, String contactStatus,
                           Long createdSalonId, String siteUrl, String siteLoginEmail,
                           String contactedAt, int followupStage, String lastFollowupAt,
                           String lastScript) {}

    public record AdminLeadView(Long referrerId, String referrerName, String referrerCode,
                                String salonName, String salonPhone,
                                String salonAddress, String mapsUrl, String website,
                                String contactStatus, String assignedOn,
                                String siteUrl, boolean trialSite) {}

    public record LeadBatch(List<LeadView> leads, int takenToday, int dailyAllowance,
                            int onboardedToday, int onboardTarget) {}
}
