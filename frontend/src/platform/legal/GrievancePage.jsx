import LegalPage from './LegalPage.jsx'

// NOTE: Replace the placeholder officer name, email, address and phone below with
// the real, appointed Grievance Officer's details before launch. Publishing a
// named contact is mandatory under the IT Rules and Consumer Protection
// (E-Commerce) Rules, 2020.
const OFFICER = {
  name: '[Grievance Officer name]',
  email: '[grievance@groomit.in]',
  phone: '[+91 XXXXXXXXXX]',
  address: '[Registered office address, City, State, PIN]',
}

export default function GrievancePage() {
  return (
    <LegalPage title="Grievance Redressal" updated="19 August 2026">
      <p>
        Groomit is an intermediary that connects customers with independent salons. This page
        explains how to raise a complaint about a listing, a booking, content on the platform,
        or how we handle your personal data, and how quickly we respond.
      </p>

      <h2>1. Grievance Officer</h2>
      <p>
        In accordance with the Information Technology Act, 2000 and the rules made under it,
        the Consumer Protection (E-Commerce) Rules, 2020, and the Digital Personal Data
        Protection Act, 2023, our Grievance Officer is:
      </p>
      <ul>
        <li><strong>Name:</strong> {OFFICER.name}</li>
        <li><strong>Email:</strong> {OFFICER.email}</li>
        <li><strong>Phone:</strong> {OFFICER.phone}</li>
        <li><strong>Address:</strong> {OFFICER.address}</li>
      </ul>

      <h2>2. What you can report</h2>
      <ul>
        <li>A fake, fraudulent, or misleading salon listing.</li>
        <li>Incorrect pricing, services, or availability shown on a salon page.</li>
        <li>Content that is unlawful, abusive, defamatory, or infringes someone&apos;s rights (including images uploaded without permission).</li>
        <li>A problem with a booking, cancellation, refund, or a service you received.</li>
        <li>A concern about how your personal data has been collected or used.</li>
        <li>A review you believe is fake or unfair (salons can report reviews from their dashboard).</li>
      </ul>

      <h2>3. How to raise a complaint</h2>
      <p>
        Email the Grievance Officer at {OFFICER.email} with the following, so we can act
        quickly:
      </p>
      <ul>
        <li>Your name and the phone number or email on your account.</li>
        <li>The salon, booking reference, listing link, or review in question.</li>
        <li>A clear description of the issue and what outcome you are seeking.</li>
        <li>Any screenshots or evidence that help.</li>
      </ul>
      <p>
        You can also reach us through our <a href="/contact">contact page</a> and mark the
        message for the Grievance Officer.
      </p>

      <h2>4. Our response timeline</h2>
      <ul>
        <li>We acknowledge every complaint within <strong>48 hours</strong> of receiving it.</li>
        <li>We aim to resolve complaints within <strong>15 days</strong>, in line with the applicable rules.</li>
        <li>For unlawful or clearly infringing content, we act to disable or remove access on a priority basis once verified.</li>
      </ul>

      <h2>5. Content takedown</h2>
      <p>
        As an intermediary we do not author salon listings or reviews. When we receive a valid
        report that content is unlawful, fraudulent, or infringes a right, we review it and,
        where warranted, remove or disable access to it and may suspend or delist the salon
        responsible. We keep a record of the report and the action taken.
      </p>

      <h2>6. Service quality complaints</h2>
      <p>
        Because salons are independent businesses responsible for the services they deliver,
        complaints about the quality, safety, or outcome of a service should be raised with the
        salon first. We will help facilitate a resolution where we reasonably can, and we act on
        patterns of complaints, hygiene issues, or fraud through delisting.
      </p>

      <hr />
      <p>
        <strong>Note:</strong> This document is a starting point and does not constitute legal
        advice. Appoint a real Grievance Officer and have this reviewed by a qualified lawyer
        before launch.
      </p>
    </LegalPage>
  )
}
