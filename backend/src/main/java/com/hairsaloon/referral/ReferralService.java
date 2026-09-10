package com.hairsaloon.referral;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReferralService {

    private static final char[] CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ReferrerProfileRepository profiles;
    private final ReferralSubmissionRepository submissions;
    private final com.hairsaloon.auth.UserRepository users;
    private final ScraperLeadsClient scraper;

    public ReferralService(ReferrerProfileRepository profiles,
                           ReferralSubmissionRepository submissions,
                           com.hairsaloon.auth.UserRepository users,
                           ScraperLeadsClient scraper) {
        this.profiles = profiles;
        this.submissions = submissions;
        this.users = users;
        this.scraper = scraper;
    }

    /** Admin roster: every referrer with their details, salons and earnings. */
    @Transactional(readOnly = true)
    public List<ReferrerView> adminReferrers() {
        java.time.YearMonth month = java.time.YearMonth.now(java.time.ZoneId.of("Asia/Kolkata"));
        return users.findAllByRole(com.hairsaloon.auth.UserRole.REFERRER).stream().map(u -> {
            ReferrerProfile p = profiles.findById(u.getId()).orElse(null);
            List<ReferralSubmission> mine = submissions.findByReferrerIdOrderByCreatedAtDesc(u.getId());
            BigDecimal paid = sumByStatus(mine, ReferralStatus.PAID);
            BigDecimal pending = sumByStatus(mine, ReferralStatus.PENDING);
            BigDecimal thisMonth = mine.stream()
                .filter(s -> s.getStatus() == ReferralStatus.PAID && s.getPaidAt() != null
                    && java.time.YearMonth.from(s.getPaidAt().atZone(java.time.ZoneId.of("Asia/Kolkata")))
                        .equals(month))
                .map(ReferralSubmission::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            long successful = mine.stream().filter(s -> s.getStatus() == ReferralStatus.PAID).count();
            long processing = mine.stream().filter(s -> s.getStatus() == ReferralStatus.VERIFYING
                || s.getStatus() == ReferralStatus.PENDING).count();
            long declined = mine.stream().filter(s -> s.getStatus() == ReferralStatus.REJECTED).count();
            return new ReferrerView(u.getId(), u.getName(), u.getPhone(), u.getEmail(),
                p != null ? p.getReferralCode() : null,
                p != null && p.isApproved(),
                p != null ? p.getPerReferralAmount() : BigDecimal.ZERO.setScale(2),
                p != null && p.isOnHold(),
                p != null ? p.getHoldReason() : null,
                p != null ? p.getSiteLimit() : 50,
                paid, pending, thisMonth, successful, processing, declined,
                mine.stream().map(AdminSubmissionView::of).toList());
        }).toList();
    }

    private static BigDecimal sumByStatus(List<ReferralSubmission> list, ReferralStatus status) {
        return list.stream().filter(s -> s.getStatus() == status)
            .map(ReferralSubmission::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Auto-fills salon details from a pasted Google Maps link (name, phone, address). */
    // (Google Maps auto-fill removed.)

    /**
     * Creates the referrer's profile with a unique code (called at signup) and
     * registers that code with the scraper app so the scraper admin can approve
     * their lead access.
     */
    @Transactional
    public void createProfile(long userId, String name, String phone) {
        String code = null;
        if (profiles.existsById(userId)) {
            code = profiles.findById(userId).map(ReferrerProfile::getReferralCode).orElse(null);
        } else {
            for (int attempt = 0; attempt < 8 && code == null; attempt++) {
                String candidate = randomCode();
                if (!profiles.existsByReferralCode(candidate)) {
                    profiles.save(new ReferrerProfile(userId, candidate));
                    code = candidate;
                }
            }
            if (code == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not allocate a referral code.");
            }
        }
        // Best-effort: register the code with the scraper (PENDING until its admin approves).
        try {
            scraper.register(name, phone, code);
        } catch (RuntimeException ignored) {
            // Registration can be retried; do not block signup on the scraper being up.
        }
    }

    @Transactional(readOnly = true)
    public Overview overview(long userId) {
        ReferrerProfile profile = profiles.findById(userId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Referrer profile not found"));
        List<ReferralSubmission> mine = submissions.findByReferrerIdOrderByCreatedAtDesc(userId);
        BigDecimal paid = mine.stream()
            .filter(s -> s.getStatus() == ReferralStatus.PAID)
            .map(ReferralSubmission::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pending = mine.stream()
            .filter(s -> s.getStatus() == ReferralStatus.PENDING)
            .map(ReferralSubmission::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Overview(profile.getReferralCode(), profile.isApproved(),
            profile.getPerReferralAmount(), paid, pending,
            mine.stream().map(SubmissionView::of).toList());
    }

    /** Submits a referral. Immutable after creation; blocks already-referred salons. */
    @Transactional
    public SubmissionView submit(long userId, String salonName, String salonPhone, String mapsUrl,
                                 String contactName, String salonAddress) {
        ReferrerProfile profile = profiles.findById(userId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Referrer profile not found"));
        if (!profile.isApproved()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Your referrer account is not approved yet.");
        }
        String normalized = normalizePhone(salonPhone);
        if (submissions.existsBySalonPhoneNormalizedAndStatusNot(normalized, ReferralStatus.REJECTED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This salon already has a referral from someone else.");
        }
        try {
            ReferralSubmission saved = submissions.saveAndFlush(new ReferralSubmission(
                userId, salonName.trim(), salonPhone.trim(), normalized, mapsUrl.trim(),
                contactName == null || contactName.isBlank() ? null : contactName.trim(),
                salonAddress == null || salonAddress.isBlank() ? null : salonAddress.trim()));
            return SubmissionView.of(saved);
        } catch (DataIntegrityViolationException duplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This salon already has a referral from someone else.");
        }
    }

    // --- Admin actions ---

    @Transactional(readOnly = true)
    public List<AdminSubmissionView> allSubmissions() {
        return submissions.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")).stream()
            .map(AdminSubmissionView::of).toList();
    }

    @Transactional
    public AdminSubmissionView verify(long submissionId, BigDecimal amount) {
        ReferralSubmission s = require(submissionId);
        if (s.getStatus() != ReferralStatus.VERIFYING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Only submissions being verified can be approved.");
        }
        s.verify(amount);
        return AdminSubmissionView.of(submissions.save(s));
    }

    @Transactional
    public AdminSubmissionView reject(long submissionId, String reason) {
        ReferralSubmission s = require(submissionId);
        if (s.getStatus() == ReferralStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A paid referral cannot be rejected.");
        }
        s.reject(reason);
        return AdminSubmissionView.of(submissions.save(s));
    }

    @Transactional
    public AdminSubmissionView markPaid(long submissionId) {
        ReferralSubmission s = require(submissionId);
        if (s.getStatus() != ReferralStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Only verified (pending) referrals can be marked paid.");
        }
        s.markPaid();
        return AdminSubmissionView.of(submissions.save(s));
    }

    @Transactional
    public void setReferrerApproval(long referrerUserId, boolean approved, BigDecimal amount) {
        ReferrerProfile profile = profiles.findById(referrerUserId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Referrer profile not found"));
        if (approved) profile.approve(amount);
        else profile.setPerReferralAmount(amount);
        profiles.save(profile);
    }

    @Transactional
    public void setReferrerHold(long referrerUserId, boolean onHold, String reason) {
        ReferrerProfile profile = profiles.findById(referrerUserId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Referrer profile not found"));
        if (onHold) profile.hold(reason == null || reason.isBlank() ? "Placed on hold by admin." : reason);
        else profile.reactivate();
        profiles.save(profile);
    }

    /** Admin raises (or lowers) how many active trial sites this referrer may hold. */
    @Transactional
    public void setReferrerSiteLimit(long referrerUserId, int limit) {
        ReferrerProfile profile = profiles.findById(referrerUserId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Referrer profile not found"));
        profile.setSiteLimit(limit);
        profiles.save(profile);
    }

    private ReferralSubmission require(long id) {
        return submissions.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Referral not found"));
    }

    private static String normalizePhone(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        return digits.length() == 10 ? "91" + digits : digits;
    }

    private static String randomCode() {
        StringBuilder sb = new StringBuilder(7);
        for (int i = 0; i < 7; i++) sb.append(CODE_ALPHABET[RANDOM.nextInt(CODE_ALPHABET.length)]);
        return sb.toString();
    }

    public record Overview(String referralCode, boolean approved, BigDecimal perReferralAmount,
                           BigDecimal totalPaid, BigDecimal totalPending,
                           List<SubmissionView> history) {}


    public record ReferrerView(Long userId, String name, String phone, String email,
                               String referralCode, boolean approved, BigDecimal perReferralAmount,
                               boolean onHold, String holdReason, int siteLimit,
                               BigDecimal totalPaid, BigDecimal totalPending, BigDecimal paidThisMonth,
                               long successful, long processing, long declined,
                               List<AdminSubmissionView> referrals) {}

    public record SubmissionView(Long id, String salonName, String salonPhone, String contactName,
                                 String salonAddress, String mapsUrl, String status,
                                 BigDecimal amount, String rejectReason, Instant createdAt,
                                 Instant decidedAt, Instant paidAt) {
        static SubmissionView of(ReferralSubmission s) {
            return new SubmissionView(s.getId(), s.getSalonName(), s.getSalonPhone(),
                s.getContactName(), s.getSalonAddress(), s.getMapsUrl(), s.getStatus().name(),
                s.getAmount(), s.getRejectReason(), s.getCreatedAt(), s.getDecidedAt(), s.getPaidAt());
        }
    }

    public record AdminSubmissionView(Long id, Long referrerId, String salonName, String salonPhone,
                                      String contactName, String salonAddress, String mapsUrl,
                                      String status, BigDecimal amount, String rejectReason,
                                      Instant createdAt, Instant decidedAt, Instant paidAt) {
        static AdminSubmissionView of(ReferralSubmission s) {
            return new AdminSubmissionView(s.getId(), s.getReferrerId(), s.getSalonName(),
                s.getSalonPhone(), s.getContactName(), s.getSalonAddress(), s.getMapsUrl(),
                s.getStatus().name(), s.getAmount(), s.getRejectReason(), s.getCreatedAt(),
                s.getDecidedAt(), s.getPaidAt());
        }
    }
}
