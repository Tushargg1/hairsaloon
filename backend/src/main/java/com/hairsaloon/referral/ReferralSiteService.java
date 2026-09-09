package com.hairsaloon.referral;

import com.hairsaloon.auth.AuthService;
import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.TenantProperties;
import com.hairsaloon.tenant.TenantResolver;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lets a referrer spin up a live "trial" preview site for a lead's salon and tear it
 * down again. A trial site is a real ACTIVE {@link Salon} (so it is publicly reachable
 * at its subdomain) flagged {@code is_trial}; booking and other actions are blocked
 * with a notice. Login for the auto-created owner is by email
 * {@code <referralCode>-<n>@groomit.in} with the referral code as the password.
 */
@Service
public class ReferralSiteService {

    /** Active trial/live sites a single referrer may hold at once. */
    private static final int MAX_SITES = 50;
    private static final String EMAIL_DOMAIN = "@groomit.in";
    private static final String DEFAULT_TIMEZONE = "Asia/Kolkata";

    private final ReferralLeadRepository leads;
    private final ReferrerProfileRepository profiles;
    private final SalonRepository salons;
    private final AuthService authService;
    private final TenantResolver tenantResolver;
    private final TenantProperties tenantProperties;

    public ReferralSiteService(ReferralLeadRepository leads, ReferrerProfileRepository profiles,
                               SalonRepository salons, AuthService authService,
                               TenantResolver tenantResolver, TenantProperties tenantProperties) {
        this.leads = leads;
        this.profiles = profiles;
        this.salons = salons;
        this.authService = authService;
        this.tenantResolver = tenantResolver;
        this.tenantProperties = tenantProperties;
    }

    @Transactional
    public SiteView createTrialSite(AuthenticatedUser user, long leadId) {
        ReferralLead lead = ownedLead(user.id(), leadId);
        if (lead.getCreatedSalonId() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "A site already exists for this lead.");
        }
        if (leads.countByReferrerIdAndCreatedSalonIdNotNull(user.id()) >= MAX_SITES) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "You have reached the limit of " + MAX_SITES + " trial sites. "
                    + "Delete an unused site to create a new one.");
        }
        ReferrerProfile profile = profiles.findById(user.id()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Referrer profile not found"));
        String code = profile.getReferralCode();

        String subdomain = uniqueSubdomain(lead.getSalonName());
        String email = uniqueEmail(code);
        long ownerId = authService.provisionSiteOwner(
            lead.getSalonName(), placeholderPhone(code), email, code);

        Salon salon = Salon.trial(ownerId, subdomain,
            blankTo(lead.getSalonName(), "Salon"),
            blankTo(lead.getSalonLocation(), "Address on file"),
            firstWord(lead.getSalonLocation()),
            lead.getSalonPhone(), lead.getSalonMapsUrl(), DEFAULT_TIMEZONE);
        Long salonId = salons.saveAndFlush(salon).getId();

        lead.setCreatedSalonId(salonId);
        leads.save(lead);
        tenantResolver.evict(subdomain);

        return new SiteView(salonId, subdomain, siteUrl(subdomain), email, code, true);
    }

    @Transactional
    public void deleteTrialSite(AuthenticatedUser user, long leadId) {
        ReferralLead lead = ownedLead(user.id(), leadId);
        Long salonId = lead.getCreatedSalonId();
        if (salonId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No site to delete.");
        }
        Salon salon = salons.findById(salonId).orElse(null);
        lead.setCreatedSalonId(null);
        leads.save(lead);
        if (salon != null) {
            String subdomain = salon.getSubdomain();
            Long ownerId = salon.getOwnerId();
            salons.delete(salon);
            salons.flush();
            if (ownerId != null) authService.deleteUser(ownerId);
            tenantResolver.evict(subdomain);
        }
    }

    private ReferralLead ownedLead(long referrerId, long leadId) {
        ReferralLead lead = leads.findById(leadId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        if (!lead.getReferrerId().equals(referrerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your lead");
        }
        return lead;
    }

    /** Slugify the salon name into a valid, unique subdomain. */
    private String uniqueSubdomain(String name) {
        String base = (name == null ? "" : name).toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+)|(-+$)", "");
        if (base.length() < 3) base = "salon-" + base;
        if (base.length() > 26) base = base.substring(0, 26).replaceAll("-+$", "");
        String candidate = base;
        int suffix = 2;
        while (salons.existsBySubdomain(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String uniqueEmail(String code) {
        int n = 1;
        String email = code + "-" + n + EMAIL_DOMAIN;
        while (authService.emailExists(email)) {
            email = code + "-" + (++n) + EMAIL_DOMAIN;
        }
        return email;
    }

    // Owner phone is NOT NULL + UNIQUE but unused for trial sites; keep it short + unique.
    private String placeholderPhone(String code) {
        String base = ("t" + code + Long.toString(System.nanoTime(), 36))
            .replaceAll("[^a-zA-Z0-9]", "");
        return base.length() > 32 ? base.substring(0, 32) : base;
    }

    private String siteUrl(String subdomain) {
        return "https://" + subdomain + "." + tenantProperties.getBaseDomain();
    }

    private static String firstWord(String location) {
        String v = blankTo(location, "City");
        String[] parts = v.split(",");
        return parts[0].trim().isEmpty() ? "City" : parts[0].trim();
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    public record SiteView(Long salonId, String subdomain, String url, String loginEmail,
                           String loginPassword, boolean trial) {}
}
