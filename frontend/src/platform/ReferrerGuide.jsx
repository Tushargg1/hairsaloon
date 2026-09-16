import { useEffect } from 'react'
import Icon from '../shared/components/Icon.jsx'

// A plain-language onboarding guide for referrers: what the product does, how to
// pitch it professionally, and what to keep in mind. We represent the company as
// "Unitechverse" here — the actual brand is introduced later by the team.
const SECTIONS = [
  {
    title: 'What you are offering',
    icon: 'storefront',
    points: [
      'A ready-made website for the salon — services, photos, reviews and an online booking page, all in one link.',
      'Customers can view the salon and book an appointment online, so the salon looks professional and gets found more easily.',
      'You show them a live preview site built for their own salon, so they see exactly what they get before deciding.',
    ],
  },
  {
    title: 'Why a salon wants this',
    icon: 'trending_up',
    points: [
      'More visibility on Google — people searching nearby actually find them.',
      'Fewer missed customers — online booking works even when they are busy or closed.',
      'Looks premium — a clean website builds trust and brings repeat customers.',
      'Salons using it retain 90%+ of their customers and can get up to 2x more new leads.',
    ],
  },
  {
    title: 'How to pitch — step by step',
    icon: 'record_voice_over',
    points: [
      'Start friendly, like a real enquiry. Ask if they take appointments and about their services.',
      'Give a genuine compliment about their work and their Google reviews.',
      'Point out the gap: even with great reviews they may not rank high on Google, so people search but do not always find them.',
      'Offer the fix and share the preview website you built for their salon.',
      'End with an easy yes/no question, e.g. "Would you be open to that?"',
      'Use the ready-made WhatsApp scripts on each lead — send message 1, then 2, then 3, then follow-ups A, B, C. Do not rush all at once.',
    ],
  },
  {
    title: 'Sound professional',
    icon: 'workspace_premium',
    points: [
      'Introduce yourself as being from Unitechverse. Keep it warm and confident, never pushy.',
      'Write short, natural messages — like a person, not an ad. Avoid heavy formatting or too many emojis.',
      'Personalise: use their salon name and the site link made for them.',
      'One clear ask per message. Make it easy to reply yes.',
      'If they go quiet, the preview link is your best nudge — a page built for them usually gets a reply.',
    ],
  },
  {
    title: 'Keep in mind',
    icon: 'checklist',
    points: [
      'Space out your follow-ups — do not send them back to back.',
      'Stop after three unanswered follow-ups so it never feels like spam.',
      'The setup is completely free for the salon — say so clearly, it removes their hesitation.',
      'You represent Unitechverse. Be honest about what the site does and does not do yet.',
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
            <h2 className="font-display text-headline-sm text-on-surface">How to start &amp; pitch</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="text-on-surface-variant hover:text-secondary transition-colors">
            <Icon name="close" className="text-[24px]" />
          </button>
        </div>
        <p className="font-body text-body-md text-on-surface-variant mb-6">
          A quick guide to what you are offering and how to pitch it well. Read it once — it makes
          every conversation easier.
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
