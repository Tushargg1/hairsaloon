import LegalPage from './LegalPage.jsx'

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund and Cancellation Policy" updated="19 August 2026">
      <p>
        This policy explains how cancellations, rescheduling, and refunds work on Groomit.
        It covers both appointments you book with a salon and any subscription a salon owner
        pays to us.
      </p>

      <h2>1. Appointments booked through Groomit</h2>
      <p>
        Groomit is a booking platform. Payment for grooming services is collected by the
        salon, normally at the time of your visit. We do not take payment for the service
        itself, so there is generally nothing for us to refund.
      </p>

      <h3>Cancelling an appointment</h3>
      <ul>
        <li>You can cancel a confirmed booking from your bookings page at no charge, provided you do so within the salon's cancellation window.</li>
        <li>Each salon sets its own window. The default is two hours before the appointment.</li>
        <li>Once the window has passed, cancellation through the platform may be unavailable. Contact the salon directly.</li>
      </ul>

      <h3>Rescheduling</h3>
      <p>
        You can move a confirmed booking to any other available slot for the same service and
        staff member. Your original appointment stays confirmed until the new time is
        successfully booked, so you never lose your place by trying.
      </p>

      <h3>If the salon cancels</h3>
      <p>
        If a salon cancels your appointment we will notify you and the booking is voided at no
        cost to you. Any amount you paid the salon directly is refundable by that salon under
        its own terms.
      </p>

      <h3>No-shows</h3>
      <p>
        If you do not attend without cancelling, the salon may record a no-show. Salons may
        charge a no-show fee under their own terms. Repeated no-shows may lead to booking
        restrictions on your Groomit account.
      </p>

      <h3>Promotional codes</h3>
      <p>
        Discounts applied at booking are released back to the promotion when a booking is
        cancelled, so the code becomes available again subject to its validity period and
        usage limits. Promotional discounts have no cash value and are not refundable
        separately.
      </p>

      <h2>2. Disputes about a service you received</h2>
      <p>
        Because the salon delivers the service, please raise any concern with the salon first
        using the contact details on its page. If you cannot reach a resolution, contact us
        through our <a href="/contact">contact page</a> and we will help where we reasonably
        can. Persistent or serious complaints may lead us to suspend a listing.
      </p>

      <h2>3. Salon subscriptions</h2>
      <p>
        Groomit is currently free for salons. If and when we introduce paid plans, the terms
        below will apply and we will give existing salons advance notice before any charge.
      </p>
      <ul>
        <li><strong>Billing:</strong> plans are billed in advance for the period you select.</li>
        <li><strong>Cancelling:</strong> you may cancel at any time. Your listing stays active until the end of the paid period.</li>
        <li><strong>Part-periods:</strong> we do not refund unused days of a period that has already started, unless required by law.</li>
        <li><strong>First 14 days:</strong> if you cancel a new paid plan within 14 days of your first payment and have not used the platform to take bookings, we will refund that payment in full.</li>
        <li><strong>Service failure:</strong> if a prolonged outage on our side prevents you from taking bookings, contact us and we will credit or refund the affected period.</li>
        <li><strong>Suspension for breach:</strong> where we suspend an account for breaching our <a href="/terms">Terms of Service</a>, fees already paid are not refundable.</li>
      </ul>

      <h2>4. How to request a refund</h2>
      <p>
        Contact us through our <a href="/contact">contact page</a> with your account phone
        number or email, the booking or invoice reference, and a short description of the
        issue. We aim to acknowledge requests within two working days and resolve them within
        seven. Approved refunds go back to the original payment method and may take a further
        five to ten working days to appear, depending on your bank.
      </p>

      <h2>5. Changes to this policy</h2>
      <p>
        We may update this policy as the service develops, particularly when paid plans launch.
        Changes are posted here with an updated date, and we will give notice of material
        changes.
      </p>

      <hr />
      <p>
        <strong>Note:</strong> This document is provided as a starting point and does not
        constitute legal advice. Before you accept online payments, have this reviewed by a
        qualified lawyer and check the requirements of your payment gateway, which may
        mandate specific refund terms and timelines.
      </p>
    </LegalPage>
  )
}
