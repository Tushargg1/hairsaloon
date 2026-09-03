import LegalPage from './legal/LegalPage.jsx'

export default function ReferEarn() {
  return (
    <LegalPage title="Refer & Earn">
      <p>
        Love Groomit? Share it with friends and salons you know, and earn rewards when they
        join and complete their first booking.
      </p>

      <h2>How it works</h2>
      <ul>
        <li>Share your personal referral link with a friend or a salon owner.</li>
        <li>They sign up on Groomit using your link.</li>
        <li>Once they complete their first appointment, you both earn a reward.</li>
      </ul>

      <h2>Rewards</h2>
      <ul>
        <li>Refer a customer: you earn credit towards your next booking.</li>
        <li>Refer a salon: earn a bonus when they go live on Groomit.</li>
      </ul>

      <h2>Get your referral link</h2>
      <p>
        Sign in to your Groomit account to find your unique referral link, or reach out through
        our <a href="/contact">contact page</a> and we&apos;ll help you get started.
      </p>

      <p className="muted">
        Referral rewards are subject to our terms; Groomit may update or end the program at any
        time.
      </p>
    </LegalPage>
  )
}
