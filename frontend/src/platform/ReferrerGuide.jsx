import { useEffect } from 'react'
import Icon from '../shared/components/Icon.jsx'

// A plain-language onboarding guide for referrers: what the product does, how to
// pitch it professionally, and what to keep in mind. We represent the company as
// "Unitechverse" here — the actual brand is introduced later by the team.
const SECTIONS = [
  {
    title: 'The platform & why salons want it',
    icon: 'rocket_launch',
    points: [
      'A complete growth platform for salons — not just a website. Each feature also solves a real problem:',
      'Booking website → gets them found on Google and lets customers book online.',
      'WhatsApp automation → sends confirmations and reminders automatically, cutting no-shows.',
      'AI chatbot → answers questions and books appointments 24/7, even when the salon is closed.',
      'CRM → stores every customer and their history so they can bring people back.',
      'Lead management → tracks every enquiry from "new" to "booked" so nothing is missed.',
      'AI sales analysis → shows busiest hours, top services and where the money comes from.',
      'Headline result: salons using this retain 90%+ of customers and can get up to 2x more new leads.',
      'Always show the live preview built for their own salon — seeing it beats describing it.',
    ],
  },
  {
    title: 'How to pitch — step by step',
    icon: 'record_voice_over',
    points: [
      'Open friendly, like a real enquiry — ask if they take appointments and about their services.',
      'Give a genuine compliment about their work and their Google reviews.',
      'Point out the gap: even with great reviews they may not rank high on Google, so people search but do not always find them.',
      'Introduce the solution as a complete system (booking site, WhatsApp automation, AI chatbot, CRM, AI insights).',
      'Share the live preview site you built for their salon so it feels real.',
      'End with an easy yes/no question, e.g. "Would you be open to a quick look?"',
      'Keep messages short and human — one clear ask each. Lead with one big benefit (more bookings, less manual work).',
      'Use the ready-made WhatsApp scripts in order — message 1, then 2, then 3, then follow-ups A, B, C. Never all at once. Space them out; stop after three unanswered.',
    ],
  },
  {
    title: 'Handling common questions',
    icon: 'quiz',
    points: [
      '"How much does it cost?" → "There is a free demo/preview so you can try it first. Pricing is simple and I will share the exact plan once you have seen it work — most salons find it pays for itself with a few extra bookings." (Do not quote a number you are unsure of — confirm the current plan with your Unitechverse manager.)',
      '"Do you have other salon clients I can check?" → "Yes, we work with salons like yours. I can share references once you are seriously considering it — for now, the preview built for your salon is the fastest way to judge it."',
      '"Is the AI actually AI, or just canned replies?" → "It understands customer questions and books real appointments — not fixed templates. The demo shows it replying live, judge it yourself."',
      '"I already use [competitor]." → "Great that you are already online. This brings booking, WhatsApp automation, AI chat and sales insights into one place — many salons switch to stop juggling tools. Worth a 2-minute look at the demo?"',
      '"I do not have time." → "That is exactly what it fixes — the chatbot and automation handle replies and reminders for you. The demo takes 2 minutes."',
      'If you do not know an answer, never bluff. Say "Good question — let me confirm and get back to you," and check with your Unitechverse manager.',
    ],
  },
  {
    title: 'Pricing & the free demo',
    icon: 'sell',
    points: [
      'Lead with the free demo/preview — no charge to look, and it removes hesitation.',
      'Do NOT invent prices. Use only the current plans and any discount limits given to you by your Unitechverse manager.',
      'When asked for a number early, anchor on value first ("pays for itself with a few extra bookings"), then share the exact plan after they have seen the demo.',
      'After the demo, the Unitechverse team handles final pricing and onboarding — your job is to get an interested "yes".',
      '[Fill in for your team: monthly/annual price, free-trial length, and what is negotiable.]',
    ],
  },
  {
    title: 'WhatsApp — stay compliant',
    icon: 'verified_user',
    points: [
      'Only message salons using publicly listed business numbers, for a genuine business enquiry — that is outreach, not spam.',
      'Do not mass-blast. Send personally, space out follow-ups, and stop after three unanswered messages.',
      'The salon\'s customer messaging (confirmations, reminders, chatbot) runs on the official WhatsApp Business API with customer opt-in and Meta-approved templates — set up by the Unitechverse team, not by you.',
      'Never promise a salon they can send bulk unsolicited WhatsApp messages — that violates Meta policy. Position it as opt-in automation for their own customers.',
    ],
  },
  {
    title: 'Keep in mind',
    icon: 'checklist',
    points: [
      'Introduce yourself as being from Unitechverse. Be warm, confident and honest — only promise what the platform delivers.',
      'Personalise: use the salon name and the preview link made for them. If they go quiet, the preview link is your best nudge.',
      'Update each lead status (Contacted, Interested, Not interested, etc.) so your pipeline stays clean.',
    ],
  },
]

export default function ReferrerGuide({ onClose }) {
  // Lock background scroll while the guide is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
      onClick={onClose}>
      <div className="glass-panel rounded-2xl max-w-2xl w-full p-6 md:p-8 my-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Getting started</p>
            <h2 className="font-display text-headline-sm text-on-surface">How to pitch Unitechverse</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="text-on-surface-variant hover:text-secondary transition-colors">
            <Icon name="close" className="text-[24px]" />
          </button>
        </div>
        <p className="font-body text-body-md text-on-surface-variant mb-6">
          You are offering salons a complete growth platform — a booking website, WhatsApp
          automation, an AI chatbot, a CRM and AI sales insights. This guide shows how to explain
          it so salons get curious and want a demo. Read it once — it makes every pitch easier.
        </p>

        <div className="flex flex-col gap-6">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h3 className="font-display text-title-lg text-on-surface flex items-center gap-2 mb-2">
                <Icon name={s.icon} className="text-[20px] text-secondary" />
                {s.title}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {s.points.map((p, i) => (
                  <li key={i} className="font-body text-body-md text-on-surface-variant flex gap-2">
                    <span className="text-secondary mt-1">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <button type="button" onClick={onClose}
          className="brass-gradient text-espresso font-body font-semibold px-6 py-2.5 rounded mt-8 w-full">
          Got it, let&apos;s start
        </button>
      </div>
    </div>
  )
}
