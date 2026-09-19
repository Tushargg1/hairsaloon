import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage, getAllSalons, setSalonActive, setSalonMembership } from './salon-api.js'
import { salonUrl } from './platform-config.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import Icon from '../shared/components/Icon.jsx'
import AdminNav from './AdminNav.jsx'

// Sub-category tabs over the flat salon list. Category is computed on the backend.
const CATEGORIES = [
  { key: 'ACTIVE', label: 'Active / onboarded' },
  { key: 'TRIAL', label: 'Trial sites' },
  { key: 'PENDING_PAYMENT', label: 'Pending payment' },
  { key: 'DEACTIVATED', label: 'Deactivated' },
  { key: 'PENDING', label: 'Pending approval' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
}

export default function AdminSalons() {
  const salonsQuery = useQuery({ queryKey: ['admin-salons'], queryFn: getAllSalons })
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('ACTIVE')

  const statusMutation = useMutation({
    mutationFn: ({ id, active }) => setSalonActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-salons'] }),
  })
  const membershipMutation = useMutation({
    mutationFn: ({ id, expiresAt }) => setSalonMembership(id, expiresAt),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-salons'] }),
  })

  const all = salonsQuery.data || []
  const countFor = (key) => all.filter((s) => s.category === key).length
  const visible = all.filter((s) => s.category === tab)

  // Extend membership by one month from today (used on Pending payment / Active).
  const extendOneMonth = (id) => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    membershipMutation.mutate({ id, expiresAt: d.toISOString() })
  }

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <AdminNav />
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Platform administration</p>
          <h1 className="font-display text-headline-md text-on-surface">All Salons</h1>
        </div>
        <div className="glass-panel rounded-lg px-6 py-4 text-center amber-glow">
          <strong className="font-display text-headline-md text-secondary-fixed block">{all.length || '—'}</strong>
          <span className="font-body text-label-sm text-on-surface-variant">Total salons</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button key={c.key} type="button" onClick={() => setTab(c.key)}
            className={`font-body text-label-md px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              tab === c.key
                ? 'bg-secondary text-on-secondary font-semibold'
                : 'text-on-surface-variant hover:bg-secondary/10 hover:text-secondary-fixed'}`}>
            {c.label}{countFor(c.key) ? ` (${countFor(c.key)})` : ''}
          </button>
        ))}
      </div>

      {(statusMutation.isError || membershipMutation.isError) && (
        <p className="font-body text-body-sm text-error mb-4" role="alert">
          {errorMessage(statusMutation.error || membershipMutation.error)}
        </p>
      )}

      {salonsQuery.isLoading ? (
        <div className="flex flex-col gap-4">{[1, 2, 3].map((i) => <div key={i} className="glass-surface metallic-border rounded-lg h-20 animate-pulse" />)}</div>
      ) : salonsQuery.isError ? (
        <GlassPanel className="text-center"><p className="text-error">Failed to load salons.</p></GlassPanel>
      ) : visible.length === 0 ? (
        <GlassPanel className="text-center"><p className="text-on-surface-variant">No salons in this category.</p></GlassPanel>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((salon) => (
            <div key={salon.id} className="glass-surface metallic-border rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50 flex-shrink-0">
                <span className="font-display text-secondary text-sm">{salon.name?.[0] || 'S'}</span>
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-title-md text-on-surface truncate">{salon.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full font-body text-[10px] uppercase ${salon.status === 'ACTIVE' ? 'bg-[rgba(52,211,153,0.15)] text-[#34d399]' : 'bg-[rgba(168,144,72,0.15)] text-[#A89048]'}`}>
                    {salon.status}
                  </span>
                  {salon.trial && (
                    <span className="px-2 py-0.5 rounded-full font-body text-[10px] uppercase bg-[rgba(96,165,250,0.15)] text-[#60a5fa]">Trial</span>
                  )}
                </div>
                <p className="font-body text-label-sm text-on-surface-variant truncate">
                  {salon.city || '—'} · {salon.ownerPhone || salon.phone || '—'}
                </p>
                <p className="font-body text-label-sm text-on-surface-variant truncate">
                  {salon.ownerEmail || salon.email || 'No email'}
                </p>
                {salon.membershipExpiresAt && (
                  <p className={`font-body text-label-sm ${salon.category === 'PENDING_PAYMENT' ? 'text-error' : 'text-on-surface-variant'}`}>
                    Membership {salon.category === 'PENDING_PAYMENT' ? 'ended' : 'until'} {formatDate(salon.membershipExpiresAt)}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-body text-label-sm text-on-surface-variant">Registered</p>
                <p className="font-body text-body-sm text-on-surface">{formatDate(salon.createdAt)}</p>
              </div>
              {!salon.trial && (salon.category === 'PENDING_PAYMENT' || salon.category === 'ACTIVE') && (
                <button type="button" onClick={() => extendOneMonth(salon.id)}
                  disabled={membershipMutation.isPending && membershipMutation.variables?.id === salon.id}
                  className="flex-shrink-0 font-body text-label-sm px-3 py-1.5 rounded border border-outline-variant/50 text-on-surface-variant hover:text-secondary-fixed hover:border-secondary/50 transition-colors disabled:opacity-50">
                  +1 month
                </button>
              )}
              {salon.status !== 'PENDING' && (
                <button type="button"
                  onClick={() => statusMutation.mutate({ id: salon.id, active: salon.status !== 'ACTIVE' })}
                  disabled={statusMutation.isPending && statusMutation.variables?.id === salon.id}
                  className="flex-shrink-0 font-body text-label-sm px-3 py-1.5 rounded border border-outline-variant/50 text-on-surface-variant hover:text-secondary-fixed hover:border-secondary/50 transition-colors disabled:opacity-50">
                  {salon.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              )}
              <a href={salonUrl(salon.subdomain)} target="_blank" rel="noreferrer"
                className="flex-shrink-0 text-secondary hover:text-secondary-fixed transition-colors">
                <Icon name="open_in_new" className="text-[18px]" />
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
