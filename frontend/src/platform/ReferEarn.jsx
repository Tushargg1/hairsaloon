import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import DeleteAccount from '../shared/components/DeleteAccount.jsx'
import PageLoader from '../shared/components/PageLoader.jsx'
import {
  createLeadSite, deleteLeadSite, errorMessage, getLeadAccess, getMyLeads, getReferralLeads,
  getReferralOverview, recordScriptSent, referralKeys, requestLeadAccess, setLeadStatus, submitReferral,
} from './referral-api.js'

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'ONBOARDED',
  'NOT_ON_WHATSAPP', 'NOT_PICKING_CALL']
// Sort order for the lead list: new first, onboarded last.
const LEAD_STATUS_ORDER = {
  NEW: 0, CONTACTED: 1, INTERESTED: 2, NOT_ON_WHATSAPP: 3, NOT_PICKING_CALL: 4,
  NOT_INTERESTED: 5, ONBOARDED: 6,
}
const LEAD_STATUS_LABEL = {
  NEW: 'New', CONTACTED: 'Contacted', INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not interested', ONBOARDED: 'Onboarded',
  NOT_ON_WHATSAPP: 'Not on WhatsApp', NOT_PICKING_CALL: 'Not picking call',
}

// Digits only; a bare 10-digit Indian number gets 91 prefixed for wa.me.
function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '')
  return d.length === 10 ? `91${d}` : d
}

// Outreach scripts, written to sound like a real person. {salon} and {link} are
// filled in per lead. Use them in order; space out the follow-ups (hours, a day,
// 2-3 days) and stop after three unanswered.
const WA_TEMPLATES = [
  { key: 'intro', label: '1. First hello', short: 'Message 1', kind: 'first',
    text: 'Hi! Do you take appointments? Wanted to ask about your services and prices.' },
  { key: 'observation', label: '2. The compliment + hook', short: 'Message 2', kind: 'first',
    text: 'Actually I came across your salon and your work looks great. Went through your Google profile too and the reviews are genuinely impressive.\n\nOne thing I noticed though: even with reviews this good, you are not showing up as high on Google search as you should be. So people search, but do not always find you.\n\nThere is a simple way to fix this that has helped salons retain 90%+ of their customers and get up to 2x more new leads. I could help you with the same, want me to explain?' },
  { key: 'offer', label: '3. The offer + link', short: 'Message 3', kind: 'first',
    text: 'We help salons like yours turn those great reviews into more visibility and more bookings.\n\nI actually built a personalised website for {salon} so you can see what is possible:\n{link}\n\nIf you like it, I can connect you with our tech team, completely free with no charges. Would you be open to that?' },
  { key: 'hook', label: 'Follow-up A - the hook', short: 'Follow-up A', kind: 'followup',
    text: 'Let me just show you what I meant:\n{link}\n\nBuilt this sample page for {salon} so you can see how it could look online. Take a look whenever you get a moment.\n\nIf you like it, I can connect you with our technical team to personalise and update it fully for you. It will not cost you anything. Should I go ahead?' },
  { key: 'nudge', label: 'Follow-up B - soft nudge', short: 'Follow-up B', kind: 'followup',
    text: 'No pressure at all. Just wanted to make sure you saw the page I made for you: {link}\n\nIf it is something you would like, I can connect you with our team for free. If not, no worries.' },
  { key: 'closer', label: 'Follow-up C - the closer', short: 'Follow-up C', kind: 'followup',
    text: 'I will leave this here. If you ever want more customers finding you on Google, the offer stands, completely free. Just reply "interested" anytime.' },
]

function fillTemplate(text, salon, link) {
  return text
    .replaceAll('{salon}', salon || 'your salon')
    .replaceAll('{link}', link || '(create the site first to get the link)')
}

// The three follow-ups (A, B, C) map to these template keys, in order.
const FOLLOWUP_KEYS = ['hook', 'nudge', 'closer']
const FOLLOWUP_LABELS = ['Follow-up A', 'Follow-up B', 'Follow-up C']

// Short date, or date + time, from an ISO string.
function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString([], {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

const byShort = (short) => WA_TEMPLATES.find((t) => t.short === short)

// Work out the next message to send from the lead's last script and status.
//  - nothing sent yet: New -> Message 1; already Contacted -> Message 2.
//  - after Message 1 or 2 -> Follow-up A.
//  - after Message 3 -> Follow-up B (skips A).
//  - after Follow-up A -> B, after B -> C, after C -> done.
function nextTemplate(lead) {
  const last = lead.lastScript
  if (!last) return byShort(lead.contactStatus === 'CONTACTED' ? 'Message 2' : 'Message 1')
  switch (last) {
    case 'Message 1': return byShort('Message 2')
    case 'Message 2': return byShort('Message 3')
    case 'Message 3': return byShort('Follow-up B') // skip A after the 3-message intro
    case 'Follow-up A': return byShort('Follow-up B')
    case 'Follow-up B': return byShort('Follow-up C')
    default: return null // Follow-up C or unknown -> sequence complete
  }
}

function LeadCard({ lead, onStatus, onCreateSite, onDeleteSite, site, siteBusy, sitePassword, onSendMessage }) {
  const phoneUsable = lead.salonPhone && lead.salonPhone !== 'N/A'
  const introTpl = WA_TEMPLATES[0]
  const hasSite = Boolean(lead.createdSalonId) || Boolean(site)
  // After a page refresh the fresh `site` state is gone, so fall back to the
  // persisted fields the backend returns on the lead.
  const siteInfo = site || (lead.siteUrl
    ? { url: lead.siteUrl, loginEmail: lead.siteLoginEmail, loginPassword: sitePassword }
    : null)
  return (
    <div className="rounded-lg border border-outline-variant/20 p-4 flex flex-col gap-1.5">
      <p className="font-body text-on-surface font-semibold">{lead.salonName || 'Unknown salon'}</p>
      {lead.salonAddress && <p className="font-body text-label-sm text-on-surface-variant">{lead.salonAddress}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {lead.mapsUrl && <a href={lead.mapsUrl} target="_blank" rel="noreferrer"
          className="font-body text-label-sm text-secondary underline">Google Maps</a>}
        {lead.mapsUrl && <button type="button"
          onClick={() => navigator.clipboard?.writeText(lead.mapsUrl)}
          className="font-body text-label-sm text-on-surface-variant underline hover:text-secondary transition-colors">Copy map</button>}
        {lead.website
          ? <a href={lead.website} target="_blank" rel="noreferrer"
              className="font-body text-label-sm text-secondary underline break-all">Website</a>
          : <span className="font-body text-label-sm text-on-surface-variant">Website: NA</span>}
      </div>
      <p className="font-body text-label-sm text-on-surface-variant">
        {phoneUsable ? lead.salonPhone : 'No phone listed'}
      </p>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {phoneUsable && (
          <button type="button" onClick={() => onSendMessage(lead, introTpl)}
            className="font-body text-label-sm px-3 py-1.5 rounded bg-[#25D366] text-white font-semibold hover:opacity-90 transition-opacity">
            WhatsApp
          </button>
        )}
        {phoneUsable && (
          <select value="" aria-label="Send a WhatsApp script"
            onChange={(e) => {
              const tpl = WA_TEMPLATES.find((t) => t.key === e.target.value)
              e.target.value = ''
              if (tpl) onSendMessage(lead, tpl)
            }}
            className="font-body text-label-sm rounded border border-[#25D366]/50 bg-transparent px-2 py-1.5 text-[#1a9c4c]">
            <option value="">Send script…</option>
            {WA_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        )}
        <select value={lead.contactStatus || 'NEW'}
          onChange={(e) => onStatus(lead.leadId, e.target.value)}
          className="font-body text-label-sm rounded border border-outline-variant/40 bg-transparent px-2 py-1.5">
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
        </select>
        {hasSite
          ? <button type="button" onClick={() => onDeleteSite(lead.leadId)} disabled={siteBusy}
              className="font-body text-label-sm px-3 py-1.5 rounded border border-error/60 text-error hover:bg-error hover:text-white transition-colors disabled:opacity-50">
              {siteBusy ? 'Deleting…' : 'Delete site'}
            </button>
          : <button type="button" onClick={() => onCreateSite(lead.leadId)} disabled={siteBusy}
              className="font-body text-label-sm px-3 py-1.5 rounded bg-secondary text-on-secondary hover:opacity-90 transition-opacity disabled:opacity-50">
              {siteBusy ? 'Creating…' : 'Create site'}
            </button>}
      </div>
      {phoneUsable && (() => {
        const next = nextTemplate(lead)
        return (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-body text-label-sm text-on-surface-variant">
              Last sent: {lead.lastScript || 'none'} · {lead.followupStage || 0}/3 follow-ups
              {lead.contactedAt && ` · Contacted ${fmtDate(lead.contactedAt)}`}
              {lead.lastFollowupAt && ` · Last follow-up ${fmtDateTime(lead.lastFollowupAt)}`}
            </span>
            {next && (
              <button type="button" onClick={() => onSendMessage(lead, next)}
                className="font-body text-label-sm px-3 py-1.5 rounded bg-[#25D366] text-white font-semibold hover:opacity-90 transition-opacity">
                Send next: {next.short}
              </button>
            )}
          </div>
        )
      })()}
      {siteInfo && (
        <div className="mt-2 rounded border border-secondary/40 bg-secondary/5 p-3 flex flex-col gap-0.5">
          <p className="font-body text-label-sm text-on-surface">Trial site created. Share these:</p>
          <a href={siteInfo.url} target="_blank" rel="noreferrer"
            className="font-body text-label-sm text-secondary underline break-all">{siteInfo.url}</a>
          {siteInfo.loginEmail && <p className="font-body text-label-sm text-on-surface-variant">Login: {siteInfo.loginEmail}</p>}
          {siteInfo.loginPassword && <p className="font-body text-label-sm text-on-surface-variant">Password: {siteInfo.loginPassword}</p>}
          {siteInfo.url && siteInfo.loginEmail && (
            <a href={`${siteInfo.url}/manage/login?email=${encodeURIComponent(siteInfo.loginEmail)}&password=${encodeURIComponent(siteInfo.loginPassword || '')}`}
              target="_blank" rel="noreferrer"
              className="font-body text-label-sm mt-1.5 self-start px-3 py-1.5 rounded bg-secondary text-on-secondary hover:opacity-90 transition-opacity">
              Login to site
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function money(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

const STATUS_LABEL = {
  VERIFYING: 'Verifying',
  PENDING: 'Approved — awaiting payment',
  PAID: 'Paid',
  REJECTED: 'Rejected',
}

// Group the four backend statuses into the three columns the referrer sees.
const COLUMNS = [
  { key: 'completed', title: 'Completed', statuses: ['PAID'] },
  { key: 'processing', title: 'Pending / Processing', statuses: ['VERIFYING', 'PENDING'] },
  { key: 'denied', title: 'Cancelled / Denied', statuses: ['REJECTED'] },
]

function AuthForm() {
  const { referrerSignup, referrerLogin } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', phone: '', password: '' })
  const [status, setStatus] = useState({ pending: false, error: '' })
  const signingUp = mode === 'signup'
  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setStatus({ pending: true, error: '' })
    try {
      if (signingUp) await referrerSignup(form)
      else await referrerLogin({ phone: form.phone, password: form.password })
    } catch (error) {
      setStatus({ pending: false, error: errorMessage(error, 'Something went wrong.') })
    }
  }

  return (
    <div className="booking-frame">
      <div className="booking-plate">
        <div className="booking-texture" />

        <header className="booking-head">
          <div className="booking-title-row">
            <span className="booking-title-rule" />
            <h2 className="booking-title gold-gradient-text">
              {signingUp ? <>Referrer<br />Sign Up</> : <>Referrer<br />Login</>}
            </h2>
            <span className="booking-title-rule" />
          </div>
        </header>

        <div className="relative z-10 flex flex-col gap-4">
          <p className="booking-note">Sign in to get your referral code and track your earnings.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {signingUp && (
              <label className="flex flex-col gap-1">
                <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Name</span>
                <input className="price-search-input" name="name" required minLength="2" maxLength="160"
                  value={form.name} onChange={update} />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Phone number</span>
              <input className="price-search-input" name="phone" type="tel" inputMode="tel"
                required minLength="10" maxLength="15" value={form.phone} onChange={update} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-body text-xs uppercase tracking-[0.15em] text-on-surface-variant">Password</span>
              <input className="price-search-input" name="password" type="password"
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                required minLength="8" maxLength="72" value={form.password} onChange={update} />
            </label>
            {status.error && <p className="booking-note is-error" role="alert">{status.error}</p>}
            <button type="submit" className="booking-confirm !w-full" disabled={status.pending}>
              {status.pending ? 'Please wait…' : signingUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <button type="button"
            onClick={() => { setMode(signingUp ? 'login' : 'signup'); setStatus({ pending: false, error: '' }) }}
            className="font-body text-xs text-center underline text-on-surface-variant hover:text-secondary transition-colors">
            {signingUp ? 'Already have an account? Log in' : 'New here? Create an account'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReferrerDashboard() {
  const client = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: referralKeys.me, queryFn: getReferralOverview })
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'overview'
  const setTab = (next) => setSearchParams({ tab: next }, { replace: true })
  const [form, setForm] = useState({ salonName: '', salonPhone: '', mapsUrl: '', contactName: '', salonAddress: '' })
  const [error, setError] = useState('')
  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = useMutation({
    mutationFn: () => submitReferral(form),
    onSuccess: () => {
      setForm({ salonName: '', salonPhone: '', mapsUrl: '', contactName: '', salonAddress: '' })
      setError('')
      client.invalidateQueries({ queryKey: referralKeys.me })
    },
    onError: (e) => setError(errorMessage(e, 'Could not submit this referral.')),
  })

  const access = useQuery({ queryKey: ['referrals', 'lead-access'], queryFn: getLeadAccess })
  const scraperStatus = access.data?.status
  const scraperConfigured = access.data?.configured
  const leadApproved = scraperStatus === 'APPROVED'
  const [accessMsg, setAccessMsg] = useState('')
  const requestAccess = useMutation({
    mutationFn: requestLeadAccess,
    onSuccess: (d) => {
      client.setQueryData(['referrals', 'lead-access'], d)
      setAccessMsg(d.status === 'APPROVED' ? 'Approved!' : 'Request sent. Awaiting admin approval.')
    },
    onError: (e) => setAccessMsg(errorMessage(e, 'Could not send the request.')),
  })

  const [leadMsg, setLeadMsg] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const myLeads = useQuery({ queryKey: ['referrals', 'my-leads'], queryFn: getMyLeads })
  const getLeads = useMutation({
    mutationFn: getReferralLeads,
    onSuccess: (d) => {
      setLeadMsg(`Got ${d.leads.length} leads. ${d.takenToday}/${d.dailyAllowance} today · ${d.onboardedToday}/${d.onboardTarget} onboarded.`)
      client.invalidateQueries({ queryKey: referralKeys.me })
      client.invalidateQueries({ queryKey: ['referrals', 'my-leads'] })
    },
    onError: (e) => setLeadMsg(errorMessage(e, 'Could not get leads.')),
  })
  const leadStatus = useMutation({
    mutationFn: ({ leadId, status }) => setLeadStatus(leadId, status),
    onMutate: ({ leadId, status }) => {
      client.setQueryData(['referrals', 'my-leads'], (old) =>
        (old || []).map((l) => (l.leadId === leadId
          ? { ...l, contactStatus: status,
              contactedAt: status === 'CONTACTED' && !l.contactedAt
                ? new Date().toISOString() : l.contactedAt }
          : l)))
    },
  })
  const sendScript = useMutation({
    mutationFn: ({ leadId, label, kind }) => recordScriptSent(leadId, label, kind),
    onMutate: ({ leadId, label, kind }) => {
      client.setQueryData(['referrals', 'my-leads'], (old) =>
        (old || []).map((l) => {
          if (l.leadId !== leadId) return l
          const now = new Date().toISOString()
          if (kind === 'followup') {
            const stage = Math.min(3, (l.followupStage || 0) + 1)
            return { ...l, followupStage: stage, lastFollowupAt: now, lastScript: label,
              contactStatus: stage >= 3 ? 'NOT_INTERESTED' : l.contactStatus }
          }
          return { ...l, contactStatus: 'CONTACTED', lastScript: label, lastFollowupAt: now,
            contactedAt: l.contactedAt || now }
        }))
    },
  })

  const [sites, setSites] = useState({})
  const [siteBusyId, setSiteBusyId] = useState(null)
  const createSite = useMutation({
    mutationFn: (leadId) => createLeadSite(leadId),
    onMutate: (leadId) => setSiteBusyId(leadId),
    onSuccess: (d, leadId) => {
      setSites((s) => ({ ...s, [leadId]: d }))
      client.setQueryData(['referrals', 'my-leads'], (old) =>
        (old || []).map((l) => (l.leadId === leadId ? { ...l, createdSalonId: d.salonId } : l)))
    },
    onError: (e) => setLeadMsg(errorMessage(e, 'Could not create the site.')),
    onSettled: () => setSiteBusyId(null),
  })
  const deleteSite = useMutation({
    mutationFn: (leadId) => deleteLeadSite(leadId),
    onMutate: (leadId) => setSiteBusyId(leadId),
    onSuccess: (_d, leadId) => {
      setSites((s) => { const n = { ...s }; delete n[leadId]; return n })
      client.setQueryData(['referrals', 'my-leads'], (old) =>
        (old || []).map((l) => (l.leadId === leadId
          ? { ...l, createdSalonId: null, siteUrl: null, siteLoginEmail: null } : l)))
    },
    onError: (e) => setLeadMsg(errorMessage(e, 'Could not delete the site.')),
    onSettled: () => setSiteBusyId(null),
  })

  // Returns the lead's trial-site URL, creating the site first if it doesn't exist.
  const ensureSite = async (lead) => {
    if (lead.siteUrl) return lead.siteUrl
    if (sites[lead.leadId]?.url) return sites[lead.leadId].url
    setSiteBusyId(lead.leadId)
    try {
      const d = await createLeadSite(lead.leadId)
      setSites((s) => ({ ...s, [lead.leadId]: d }))
      client.setQueryData(['referrals', 'my-leads'], (old) =>
        (old || []).map((l) => (l.leadId === lead.leadId
          ? { ...l, createdSalonId: d.salonId, siteUrl: d.url, siteLoginEmail: d.loginEmail } : l)))
      return d.url
    } catch (e) {
      setLeadMsg(errorMessage(e, 'Could not create the site.'))
      return null
    } finally {
      setSiteBusyId(null)
    }
  }

  // Opens WhatsApp with a filled script. Templates that carry {link} auto-create the
  // trial site first, then point the already-opened tab at the final wa.me URL.
  const sendMessage = async (lead, tpl) => {
    const wa = waNumber(lead.salonPhone)
    const needsLink = tpl.text.includes('{link}')
    let link = lead.siteUrl || sites[lead.leadId]?.url || null
    const openWa = (l) => {
      const msg = encodeURIComponent(fillTemplate(tpl.text, lead.salonName, l))
      window.open(`https://wa.me/${wa}?text=${msg}`, '_blank', 'noopener')
    }
    if (needsLink && !link) {
      // Open a real tab synchronously (no noopener so we keep the handle), then
      // point it at WhatsApp once the site is created; close it if creation fails.
      const win = window.open('about:blank', '_blank')
      link = await ensureSite(lead)
      if (!link) { if (win) win.close(); return }
      const msg = encodeURIComponent(fillTemplate(tpl.text, lead.salonName, link))
      const url = `https://wa.me/${wa}?text=${msg}`
      if (win) win.location.href = url
      else openWa(link)
    } else {
      openWa(link)
    }
    sendScript.mutate({ leadId: lead.leadId, label: tpl.short, kind: tpl.kind })
  }

  if (isLoading) return <PageLoader />

  const { referralCode, approved, perReferralAmount, totalPaid, totalPending, history = [] } = data || {}
  // Trial-site owner password = referral code padded to 8+ chars (matches backend).
  const sitePasswordValue = (referralCode || '').padEnd(8, '0')
  const successful = history.filter((r) => r.status === 'PAID').length
  const processing = history.filter((r) => r.status === 'VERIFYING' || r.status === 'PENDING').length
  const declined = history.filter((r) => r.status === 'REJECTED').length

  const Stat = ({ label, value, accent }) => (
    <div className="glass-panel rounded-xl p-5">
      <p className="font-body text-label-sm uppercase tracking-wider text-on-surface-variant mb-1">{label}</p>
      <p className={`font-display text-headline-sm ${accent || 'text-on-surface'}`}>{value}</p>
    </div>
  )

  // Contacted leads still in the follow-up sequence (not interested/onboarded excluded).
  const followupLeads = (myLeads.data || [])
    .filter((l) => l.contactStatus === 'CONTACTED' && (l.followupStage || 0) < 3)

  // Leads that currently have a live trial site (my-leads is already newest-first).
  const trialSiteLeads = (myLeads.data || [])
    .filter((l) => l.createdSalonId || l.siteUrl)

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'leads', label: 'Get leads' },
    { key: 'refer', label: 'Refer a salon' },
    { key: 'referrals', label: 'My referrals' },
    { key: 'followups', label: `Follow-ups${followupLeads.length ? ` (${followupLeads.length})` : ''}` },
    { key: 'sites', label: `Trial sites${trialSiteLeads.length ? ` (${trialSiteLeads.length})` : ''}` },
    { key: 'account', label: 'Account' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Sub navbar */}
      <div className="flex gap-1 overflow-x-auto border-b border-outline-variant/20 pb-px">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`font-body text-label-md px-4 py-2 whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-secondary text-secondary'
                : 'border-transparent text-on-surface-variant hover:text-secondary-fixed'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Your code" value={referralCode} accent="text-secondary" />
        <Stat label="Total earned" value={money(totalPaid)} />
        <Stat label="Awaiting payment" value={money(totalPending)} />
        <Stat label="Successful referrals" value={successful} />
        <Stat label="Pending / processing" value={processing} />
        <Stat label="Declined" value={declined} accent="text-error" />
      </div>
      )}

      {tab === 'leads' && approved && (
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-headline-sm text-on-surface">Get salon leads</h2>
              <p className="font-body text-label-md text-on-surface-variant">
                Pull a batch of salons to contact. Onboard 3 of each day&apos;s leads to unlock more.
              </p>
            </div>
            <button type="button" onClick={() => getLeads.mutate()}
              disabled={getLeads.isPending || !leadApproved}
              className="brass-gradient text-espresso font-body font-semibold px-6 py-2.5 rounded disabled:opacity-50">
              {getLeads.isPending ? 'Fetching…' : 'Get leads'}
            </button>
          </div>

          {/* Lead-access status from the data provider, with a manual refresh. */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <span className="font-body text-label-md">
              Lead access:{' '}
              {!scraperConfigured ? <span className="text-on-surface-variant">unavailable</span>
                : leadApproved ? <span className="text-emerald-400 font-semibold">Approved</span>
                  : scraperStatus === 'REJECTED' ? <span className="text-error font-semibold">Rejected</span>
                    : scraperStatus === 'PENDING' ? <span className="text-amber-400 font-semibold">Pending approval</span>
                      : <span className="text-on-surface-variant font-semibold">Not registered</span>}
            </span>
            <button type="button" onClick={() => access.refetch()} disabled={access.isFetching}
              className="font-body text-label-sm px-3 py-1.5 rounded border border-secondary/60 text-secondary hover:bg-secondary hover:text-on-secondary transition-colors disabled:opacity-50">
              {access.isFetching ? 'Checking…' : 'Refresh status'}
            </button>
            {!leadApproved && scraperConfigured && (
              <button type="button" onClick={() => { setAccessMsg(''); requestAccess.mutate() }}
                disabled={requestAccess.isPending}
                className="font-body text-label-sm px-3 py-1.5 rounded bg-secondary text-on-secondary hover:opacity-90 transition-opacity disabled:opacity-50">
                {requestAccess.isPending ? 'Sending…' : 'Request access'}
              </button>
            )}
          </div>
          {accessMsg && <p className="font-body text-label-sm text-on-surface-variant mt-2">{accessMsg}</p>}
          {!leadApproved && scraperConfigured && !accessMsg && (
            <p className="font-body text-label-sm text-on-surface-variant mt-2">
              {scraperStatus === 'PENDING'
                ? 'Your code is registered. Leads unlock once the admin approves it.'
                : scraperStatus === 'REJECTED'
                  ? 'Your access request was rejected. Contact the admin, then tap Request access to try again.'
                  : 'You are not registered for leads yet. Tap "Request access" to send your request.'}
            </p>
          )}

          {leadMsg && <p className="font-body text-label-md text-on-surface-variant mt-3">{leadMsg}</p>}
          {(myLeads.data || []).length > 0 && (
            <input type="search" inputMode="tel" value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              placeholder="Search by phone number"
              className="font-body text-label-md rounded border border-outline-variant/40 bg-transparent px-3 py-2 mt-4 w-full sm:max-w-xs" />
          )}
          {(myLeads.data || []).length > 0 && (
            <div className="flex flex-col gap-2 mt-3">
              {[...myLeads.data]
                .filter((l) => {
                  const q = leadSearch.replace(/\D/g, '')
                  return !q || String(l.salonPhone || '').replace(/\D/g, '').includes(q)
                })
                .sort((a, b) =>
                  (LEAD_STATUS_ORDER[a.contactStatus] ?? 99) - (LEAD_STATUS_ORDER[b.contactStatus] ?? 99))
                .map((l) => (
                <LeadCard key={l.leadId} lead={l}
                  onStatus={(leadId, status) => leadStatus.mutate({ leadId, status })}
                  onCreateSite={(leadId) => createSite.mutate(leadId)}
                  onDeleteSite={(leadId) => deleteSite.mutate(leadId)}
                  onSendMessage={sendMessage}
                  site={sites[l.leadId]} siteBusy={siteBusyId === l.leadId}
                  sitePassword={sitePasswordValue} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'leads' && !approved && (
        <div className="glass-panel rounded-xl p-6">
          <p className="font-body text-on-surface-variant">
            Your referrer account is awaiting admin approval. Once approved you can pull leads and
            submit salon referrals.
          </p>
        </div>
      )}

      {tab === 'refer' && !approved && (
        <div className="glass-panel rounded-xl p-6">
          <p className="font-body text-on-surface-variant">
            Your referrer account is awaiting admin approval. Once approved you can submit salon
            referrals and start earning.
          </p>
        </div>
      )}

      {tab === 'refer' && approved && (
        <div className="glass-panel rounded-xl p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-1">Refer a salon</h2>
          <p className="font-body text-label-md text-on-surface-variant mb-4">
            You earn {money(perReferralAmount)} per approved referral. Details cannot be edited
            once submitted.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); submit.mutate() }} className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-body text-label-md">Salon name
              <input name="salonName" required maxLength="160" value={form.salonName} onChange={update}
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 font-body text-label-md">Salon phone
              <input name="salonPhone" type="tel" required minLength="10" maxLength="15"
                value={form.salonPhone} onChange={update}
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 font-body text-label-md">Contact person (whose number)
              <input name="contactName" maxLength="160" value={form.contactName} onChange={update}
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 font-body text-label-md">Location / address
              <input name="salonAddress" maxLength="500" value={form.salonAddress} onChange={update}
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 font-body text-label-md sm:col-span-2">Google Maps location link
              <input name="mapsUrl" type="url" required maxLength="2048" value={form.mapsUrl} onChange={update}
                placeholder="https://maps.app.goo.gl/..."
                className="rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
            </label>
            {error && <p className="font-body text-label-sm text-error sm:col-span-2" role="alert">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={submit.isPending}
                className="brass-gradient text-espresso font-body font-semibold px-6 py-2.5 rounded">
                {submit.isPending ? 'Submitting…' : 'Submit referral'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'referrals' && (
      <div>
        <h2 className="font-display text-headline-sm text-on-surface mb-4">Your referrals</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = history.filter((r) => col.statuses.includes(r.status))
            return (
              <div key={col.key} className="glass-panel rounded-xl p-4">
                <p className="font-body text-label-md text-secondary uppercase tracking-wider mb-3">
                  {col.title} ({items.length})
                </p>
                {items.length === 0 ? (
                  <p className="font-body text-label-sm text-on-surface-variant">None yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((r) => (
                      <div key={r.id} className="rounded-lg border border-outline-variant/20 p-3">
                        <p className="font-body text-on-surface font-medium">{r.salonName}</p>
                        <p className="font-body text-label-sm text-on-surface-variant">{r.salonPhone}{r.contactName ? ` · ${r.contactName}` : ''}</p>
                        {r.salonAddress && <p className="font-body text-label-sm text-on-surface-variant">{r.salonAddress}</p>}
                        {r.mapsUrl && (
                          <a href={r.mapsUrl} target="_blank" rel="noreferrer"
                            className="font-body text-label-sm text-secondary underline break-all">Map link</a>
                        )}
                        <p className="font-body text-label-sm text-on-surface-variant mt-1">{STATUS_LABEL[r.status] || r.status}</p>
                        {(r.status === 'PAID' || r.status === 'PENDING') && (
                          <p className="font-body text-on-surface">{money(r.amount)}</p>
                        )}
                        {r.status === 'REJECTED' && r.rejectReason && (
                          <p className="font-body text-label-sm text-error">{r.rejectReason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      )}

      {tab === 'followups' && (
        <div className="glass-panel rounded-xl p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-1">Follow-ups</h2>
          <p className="font-body text-label-md text-on-surface-variant mb-4">
            Contacted leads and their follow-up sequence. Send A, then B, then C — each opens
            WhatsApp with the message ready. If the next one is not sent within 24 hours the
            lead is marked not interested. After C the lead is closed as not interested.
          </p>
          {followupLeads.length === 0 ? (
            <p className="font-body text-on-surface-variant">No contacted leads to follow up yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {followupLeads.map((lead) => {
                const phoneUsable = lead.salonPhone && lead.salonPhone !== 'N/A'
                const stage = lead.followupStage || 0
                return (
                  <div key={lead.leadId} className="rounded-lg border border-outline-variant/20 p-3">
                    <p className="font-body text-on-surface font-medium">{lead.salonName || 'Unknown salon'}</p>
                    <p className="font-body text-label-sm text-on-surface-variant mb-2">
                      {stage}/3 sent{lead.lastScript ? ` · Last: ${lead.lastScript}` : ''}
                      {phoneUsable ? '' : ' · no phone'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {FOLLOWUP_KEYS.map((key, i) => {
                        const tpl = WA_TEMPLATES.find((t) => t.key === key)
                        const done = i < stage
                        const isNext = i === stage
                        return (
                          <button key={key} type="button"
                            disabled={!phoneUsable}
                            onClick={() => sendMessage(lead, tpl)}
                            className={`font-body text-label-sm px-4 py-2 rounded font-semibold transition-opacity disabled:opacity-50 ${
                              isNext ? 'bg-[#25D366] text-white hover:opacity-90'
                                : 'bg-transparent border border-[#25D366]/60 text-[#1a9c4c] hover:bg-[#25D366]/10'}`}>
                            {done ? `Resend ${FOLLOWUP_LABELS[i]}` : `Send ${FOLLOWUP_LABELS[i]}`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'sites' && (
        <div className="glass-panel rounded-xl p-6">
          <h2 className="font-display text-headline-sm text-on-surface mb-1">Trial sites</h2>
          <p className="font-body text-label-md text-on-surface-variant mb-4">
            Salons you have created a preview site for, newest first.
          </p>
          {trialSiteLeads.length === 0 ? (
            <p className="font-body text-on-surface-variant">No trial sites yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {trialSiteLeads.map((l) => (
                <div key={l.leadId} className="rounded-lg border border-outline-variant/20 p-3">
                  <p className="font-body text-on-surface font-medium">{l.salonName || 'Unknown salon'}</p>
                  {l.siteUrl && <a href={l.siteUrl} target="_blank" rel="noreferrer"
                    className="font-body text-label-sm text-secondary underline break-all">{l.siteUrl}</a>}
                  <p className="font-body text-label-sm text-on-surface-variant mt-1">
                    {LEAD_STATUS_LABEL[l.contactStatus] || l.contactStatus}
                    {l.contactedAt && ` · Contacted ${fmtDate(l.contactedAt)}`}
                    {l.lastFollowupAt && ` · Last follow-up ${fmtDateTime(l.lastFollowupAt)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'account' && (
        <DeleteAccount note="This permanently closes your referrer account. Your referral history stays on record but you won't be able to sign in again." />
      )}
    </div>
  )
}

export default function ReferEarn() {
  const { user, loading } = useAuth()
  const isReferrer = user?.role === 'REFERRER'

  // Avoid flashing the logged-out form before the session resolves.
  if (loading) return <PageLoader />

  if (isReferrer) {
    return (
      <main className="max-w-[900px] mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Groomit</p>
          <h1 className="font-display text-headline-md text-on-surface">Refer &amp; Earn</h1>
          <p className="font-body text-on-surface-variant mt-2">
            Refer salons to Groomit and earn a reward for every one that joins.
          </p>
        </div>
        <ReferrerDashboard />
      </main>
    )
  }

  // Logged-out: vintage plate on the Groomit backdrop, matching the login pages.
  return (
    <main className="relative flex flex-col min-h-[90vh] justify-center overflow-hidden -mt-12 pt-12">
      <div className="absolute inset-0 z-0 bg-cover bg-top md:hidden" style={{ backgroundImage: "url('/background-img-mobile.jpg')" }} />
      <div className="absolute inset-0 z-0 bg-cover bg-top hidden md:block" style={{ backgroundImage: "url('/background-windows-img.png')" }} />
      <div className="absolute inset-0 z-0 bg-black/60" />
      <section className="relative z-10 py-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto">
        <AuthForm />
      </section>
    </main>
  )
}
