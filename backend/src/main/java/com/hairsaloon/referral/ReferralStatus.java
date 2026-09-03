package com.hairsaloon.referral;

public enum ReferralStatus {
    /** Just submitted; the admin has not verified the salon yet. */
    VERIFYING,
    /** Admin verified the referral; awaiting payout. */
    PENDING,
    /** Admin has paid the referrer for this referral. */
    PAID,
    /** Admin rejected it (e.g. salon already referred, or invalid). */
    REJECTED
}
