import LegalPage from './LegalPage.jsx'

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy" updated="19 August 2026">
      <p>
        This policy explains how Groomit uses cookies and similar local storage on groomit.in
        and on the salon subdomains hosted on it. It should be read together with our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>1. What are cookies and local storage?</h2>
      <p>
        Cookies are small text files a website can store in your browser. Local storage is a
        similar browser feature that keeps small preferences on your device. Neither is used by
        Groomit for advertising or cross-site tracking.
      </p>

      <h2>2. What we use, and why</h2>

      <h3>Strictly necessary cookie</h3>
      <ul>
        <li>
          <strong>auth_token</strong> — set only after you sign in. It keeps you logged in as
          you move between pages. It is <strong>HttpOnly</strong> (JavaScript cannot read it),
          marked <strong>Secure</strong> in production, and scoped to our domain and its
          salon subdomains. Without it you could not stay signed in, so it cannot be switched
          off while you use your account. It is removed when you log out or when it expires.
        </li>
      </ul>

      <h3>Local storage (preferences, not cookies)</h3>
      <ul>
        <li><strong>groomit-site-theme</strong> — remembers whether you chose the light or dark theme for salon pages.</li>
        <li><strong>groomit-dashboard-theme</strong> — remembers the light/dark theme for the owner dashboard.</li>
        <li><strong>groomit-referrer-guide-seen</strong> — remembers that a referral partner has already seen the one-time getting-started guide.</li>
      </ul>
      <p>
        These stay on your own device, are not sent to advertisers, and can be cleared any time
        from your browser settings.
      </p>

      <h2>3. Cookies we do not use</h2>
      <p>
        Groomit does <strong>not</strong> use advertising cookies, analytics or tracking cookies
        (no Google Analytics, no Meta Pixel, no third-party trackers), or any cookie that follows
        you across other websites.
      </p>

      <h2>4. Third-party requests</h2>
      <ul>
        <li>
          <strong>Google Fonts.</strong> Our pages load fonts from Google&apos;s font servers
          (fonts.googleapis.com / fonts.gstatic.com). This does not set cookies, but it does
          share your IP address with Google so the fonts can be delivered. See{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google&apos;s privacy policy</a>.
        </li>
        <li>
          <strong>Google Maps &amp; Google reviews.</strong> Salon pages may show a Google rating,
          Google reviews, or a &ldquo;Google Maps&rdquo; link. Opening a map link takes you to
          Google, where Google&apos;s own cookies and policies apply.
        </li>
        <li>
          <strong>Salon owners connecting WhatsApp</strong> load Meta&apos;s SDK only on the
          WhatsApp-connect screen in the owner dashboard. This does not run on customer-facing pages.
        </li>
      </ul>

      <h2>5. Managing cookies</h2>
      <p>
        Because we only use one strictly necessary cookie, we do not show a cookie consent
        banner. You can still block or delete cookies and clear local storage through your
        browser settings, but blocking the authentication cookie will prevent you from signing in.
      </p>

      <h2>6. Changes to this policy</h2>
      <p>
        We will post any updates on this page and change the date above.
      </p>

      <h2>7. Contact</h2>
      <p>
        For any question about this policy, reach us through our{' '}
        <a href="/contact">contact page</a>.
      </p>

      <hr />
      <p>
        <strong>Note:</strong> This document is provided as a starting point and does not
        constitute legal advice. Have it reviewed by a qualified lawyer, and confirm your
        obligations under India&apos;s Digital Personal Data Protection Act before launch.
      </p>
    </LegalPage>
  )
}
