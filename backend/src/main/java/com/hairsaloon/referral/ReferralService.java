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

    public ReferralService(ReferrerProfileRepository profiles,
                           ReferralSubmissionRepository submissions) {
        this.profiles = profiles;
        this.submissions = submissions;
    }

    /** Creates the referrer's profile with a unique code (called at signup). */
    @Transactional
    public void createProfile(long userId) {
        if (profiles.existsById(userId)) return;
        for (int attempt = 0; attempt < 8; attempt++) {
            String code = randomCode();
            if (!profiles.existsByReferralCode(code)) {
                profiles.save(new ReferrerProfile(userId, code));
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
            "Could not allocate a referral code.");
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
    public SubmissionView submit(long userId, String salonName, String salonPhone, String mapsUrl) {
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
                userId, salonName.trim(), salonPhone.trim(), normalized, mapsUrl.trim()));
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

    public record SubmissionView(Long id, String salonName, String salonPhone, String mapsUrl,
                                 String status, BigDecimal amount, String rejectReason,
                                 Instant createdAt, Instant decidedAt, Instant paidAt) {
        static SubmissionView of(ReferralSubmission s) {
            return new SubmissionView(s.getId(), s.getSalonName(), s.getSalonPhone(), s.getMapsUrl(),
                s.getStatus().name(), s.getAmount(), s.getRejectReason(),
                s.getCreatedAt(), s.getDecidedAt(), s.getPaidAt());
        }
    }

    public record AdminSubmissionView(Long id, Long referrerId, String salonName, String salonPhone,
                                      String mapsUrl, String status, BigDecimal amount,
                                      String rejectReason, Instant createdAt, Instant decidedAt,
                                      Instant paidAt) {
        static AdminSubmissionView of(ReferralSubmission s) {
            return new AdminSubmissionView(s.getId(), s.getReferrerId(), s.getSalonName(),
                s.getSalonPhone(), s.getMapsUrl(), s.getStatus().name(), s.getAmount(),
                s.getRejectReason(), s.getCreatedAt(), s.getDecidedAt(), s.getPaidAt());
        }
    }
}
