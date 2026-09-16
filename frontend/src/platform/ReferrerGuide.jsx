import { useEffect } from 'react'
import Icon from '../shared/components/Icon.jsx'

// A plain-language onboarding guide for referrers: what the product does, how to
// pitch it professionally, and what to keep in mind. We represent the company as
// "Unitechverse" here — the actual brand is introduced later by the team.
const SECTIONS = [
  {
    title: 'What Unitechverse offers',
    icon: 'rocket_launch',
    points: [
      'A complete digital growth system for salons — not just a website, a full business platform.',
      'A professional booking website with online appointments, services, photos and reviews.',
      'WhatsApp automation — auto-replies, booking confirmations and reminders that go out on their own.',
      'An AI chatbot that answers customer questions and books appointments 24/7, even after hours.',
      'A built-in CRM (customer relationship management) that stores every customer and their history in one place.',
      'Lead management to track every enquiry from "new" to "booked" so nothing slips through.',
      'AI sales analysis that shows what is working, busiest hours, top services and where the money comes from.',
      'You show them a live preview built for their own salon, so they see it before deciding.',
    ],
  },
  {
    title: 'Why a salon will want this',
    icon: 'trending_up',
    points: [
      'More visibility on Google — customers searching nearby actually find them.',
      'Never miss a customer — the AI chatbot and WhatsApp automation reply and book even when the salon is busy or closed.',
      'Fewer no-shows — automatic WhatsApp reminders bring customers back on time.',
      'Smarter decisions — AI sales analysis tells them what to promote and when.',
      'Loyal customers — the CRM helps them remember and re-engage every client.',
      'Results: salons using this retain 90%+ of their customers and can get up to 2x more new leads.',
    ],
  },
  {
    title: 'How to pitch — step by step',
    icon: 'record_voice_over',
    points: [
      'Open friendly, like a real enquiry — ask if they take appointments and about their services.',
      'Give a genuine compliment about their work and their Google reviews.',
      'Point out the gap: even with great reviews they may not rank high on Google, so people search but do not always find them.',
      'Introduce the solution — a complete system with a booking website, WhatsApp automation, an AI chatbot, a CRM and AI sales insights.',
      'Share the live preview site you built for their salon so it feels real.',
      'End with an easy yes/no question, e.g. "Would you be open to a quick look?"',
      'Use the ready-made WhatsApp scripts on each lead — message 1, then 2, then 3, then follow-ups A, B, C. Never all at once.',
    ],
  },
  {
    title: 'Words that make them curious',
    icon: 'auto_awesome',
    points: [
      '"An AI chatbot that books appointments for you 24/7, even when you are closed."',
      '"WhatsApp automation that sends reminders and confirmations automatically."',
      '"A dashboard that shows your sales, busiest hours and best services using AI."',
      '"A CRM that remembers every customer so you can bring them back."',
      '"Your own booking website that gets you found on Google."',
      'Say it is a complete growth platform, not just a website — that is what makes people want to try it.',
    ],
  },
  {
    title: 'Sound professional',
    icon: 'workspace_premium',
    points: [
      'Introduce yourself as being from Unitechverse. Keep it warm and confident, never pushy.',
      'Write short, natural messages — like a person, not an ad. Avoid heavy formatting or too many emojis.',
      'Personalise: use their salon name and the preview link made for them.',
      'Lead with one big benefit (more bookings, less manual work), then offer to show the demo.',
      'One clear ask per message. Make it easy to reply yes.',
      'If they go quiet, the preview link is your best nudge — a system built for them usually gets a reply.',
    ],
  },
  {
    title: 'Keep in mind',
    icon: 'checklist',
    points: [
      'Space out your follow-ups — do not send them back to back.',
      'Stop after three unanswered follow-ups so it never feels like spam.',
      'The demo and setup are free — say so clearly, it removes their hesitation.',
      'You represent Unitechverse. Be honest and only promise what the platform delivers.',
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
