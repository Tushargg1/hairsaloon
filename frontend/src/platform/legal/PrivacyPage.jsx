import LegalPage from './LegalPage.jsx'

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="19 August 2026">
      <p>
        This policy explains what personal information Groomit collects, why we collect it,
        who we share it with, and the choices you have. It applies to groomit.in and every
        salon subdomain hosted on it.
      </p>

      <h2>1. Information we collect</h2>

      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account details:</strong> mobile number, name, and email address if you provide one.</li>
        <li><strong>Password:</strong> stored only as a salted cryptographic hash, never in readable form.</li>
        <li><strong>Booking details:</strong> the salon, service, staff member, date, and time you select.</li>
        <li><strong>Reviews:</strong> the rating and any comment you submit after a completed appointment.</li>
        <li><strong>Salon listing data:</strong> for owners, your business name, address, city, contact details, services, staff, working hours, and photos you upload.</li>
      </ul>

      <h3>Information we collect automatically</h3>
      <ul>
        <li><strong>Session cookie:</strong> an HttpOnly authentication cookie that keeps you signed in.</li>
        <li><strong>Technical data:</strong> IP address and basic request details, used for security and rate limiting.</li>
        <li><strong>Location:</strong> only if you tap "Use my location" to find nearby salons. We use the coordinates for that search and do not store them against your account.</li>
      </ul>

      <h2>2. Why we use your information</h2>
      <ul>
        <li>To create and secure your account, including verifying your phone by one-time code.</li>
        <li>To create, confirm, remind you about, reschedule, and cancel bookings.</li>
        <li>To show salons the information they need to serve you, such as your name and phone number.</li>
        <li>To display reviews on salon pages.</li>
        <li>To protect the platform against fraud, abuse, and automated attacks.</li>
        <li>To provide salon owners with aggregate analytics about their own bookings.</li>
        <li>To meet legal and accounting obligations.</li>
      </ul>

      <h2>3. Who we share it with</h2>
      <ul>
        <li>
          <strong>The salon you book with.</strong> They receive your name, phone number, and
          booking details so they can serve you. They are independent businesses and act as
          their own data controller for that information.
        </li>
        <li>
          <strong>Service providers.</strong> We use third parties for hosting, databases,
          email delivery, SMS delivery, and push notifications. They process data on our
          instructions only.
        </li>
        <li>
          <strong>Authorities.</strong> Where we are legally required to disclose information.
        </li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>4. Multi-tenant separation</h2>
      <p>
        Each salon on Groomit operates on its own subdomain and its data is scoped to that
        salon at the database layer. A salon cannot see another salon's bookings, customers,
        staff, or reviews.
      </p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li><strong>Account data:</strong> while your account is open, then removed or anonymised.</li>
        <li><strong>Booking records:</strong> retained as long as needed for the salon's records and any legal or tax obligations.</li>
        <li><strong>One-time codes:</strong> minutes only, then expired and discarded.</li>
        <li><strong>Security logs:</strong> a short rolling window sufficient for abuse investigation.</li>
      </ul>

      <h2>6. Security</h2>
      <p>We take practical measures to protect your information:</p>
      <ul>
        <li>All traffic is encrypted in transit over HTTPS.</li>
        <li>Passwords are hashed with bcrypt.</li>
        <li>Authentication uses HttpOnly cookies, which JavaScript cannot read.</li>
        <li>Databases and caches are encrypted at rest and are not publicly reachable.</li>
        <li>Login and one-time-code endpoints are rate limited.</li>
        <li>Phone numbers used in rate-limit keys are hashed, not stored in plain text.</li>
      </ul>
      <p>
        No system is perfectly secure. If we become aware of a breach affecting your data we
        will notify you and any regulator as required.
      </p>

      <h2>7. Your choices and rights</h2>
      <ul>
        <li><strong>Access and correction:</strong> view and edit your details on your profile page.</li>
        <li><strong>Deletion:</strong> ask us to close your account and delete your data, subject to records we must keep.</li>
        <li><strong>Notifications:</strong> booking confirmations and reminders are part of the service. Push notifications are opt-in and can be turned off at any time.</li>
        <li><strong>Location:</strong> nearby search is opt-in each time and your browser controls the permission.</li>
        <li><strong>Complaints:</strong> you may raise a concern with us or with your local data protection authority.</li>
      </ul>
      <p>
        To exercise any of these, contact us through our <a href="/contact">contact page</a>.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use a single essential cookie for authentication. It is HttpOnly, scoped to our
        domain and its subdomains, and marked Secure in production. We do not use advertising
        or third-party tracking cookies.
      </p>

      <h2>9. Children</h2>
      <p>
        Groomit is not intended for children under 18. If we learn that we hold data for a
        child without appropriate consent we will delete it.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We will post any updates on this page and change the date above. If a change
        materially affects how we use your information we will give you reasonable notice.
      </p>

      <h2>11. Contact</h2>
      <p>
        For any privacy question, reach us through our <a href="/contact">contact page</a>.
      </p>

      <hr />
      <p>
        <strong>Note:</strong> This document is provided as a starting point and does not
        constitute legal advice. Have it reviewed by a qualified lawyer, and confirm your
        obligations under India's Digital Personal Data Protection Act before launch.
      </p>
    </LegalPage>
  )
}
