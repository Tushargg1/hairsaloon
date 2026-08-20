import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage, getDashboardAnalytics, tenantKeys } from '../tenant-api.js'
import GlassPanel from '../../shared/components/GlassPanel.jsx'
import BrassButton from '../../shared/components/BrassButton.jsx'
import Icon from '../../shared/components/Icon.jsx'

const number = (v) => new Intl.NumberFormat().format(Number(v || 0))
const percent = (v) => `${Number(v || 0).toFixed(1)}%`
const money = (v, c) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'INR' }).format(Number(v || 0)) } catch { return `${Number(v || 0).toFixed(2)}` } }
const fmtDate = (v) => v ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${v}T00:00:00Z`)) : '—'
function localDate(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10) }
function analyticsKey(filters) { const k = tenantKeys.dashboardAnalytics; return typeof k === 'function' ? k(filters) : [...(Array.isArray(k) ? k : ['tenant', 'dashboard-analytics']), filters] }
function daysInRange(s, e) { if (!s || !e) return 0; return Math.floor((Date.parse(`${e}T00:00:00Z`) - Date.parse(`${s}T00:00:00Z`)) / 86_400_000) + 1 }
function maxEnd(s) { if (!s) return undefined; const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 365); return d.toISOString().slice(0, 10) }

function normalizeStatuses(data) {
  if (Array.isArray(data.statusBreakdown)) return data.statusBreakdown.map((i) => ({ name: i.name || i.status || 'Unknown', bookings: i.bookings ?? i.count ?? 0, revenue: i.revenue }))
  if (data.statusBreakdown && typeof data.statusBreakdown === 'object') return Object.entries(data.statusBreakdown).map(([n, v]) => ({ name: n, bookings: typeof v === 'object' ? v.bookings ?? v.count ?? 0 : v, revenue: typeof v === 'object' ? v.revenue : undefined }))
  return [['Confirmed', data.confirmedBookings], ['Completed', data.completedBookings], ['Cancelled', data.cancelledBookings], ['No-show', data.noShowBookings]].map(([n, b]) => ({ name: n, bookings: b || 0 }))
}

export default function DashboardOverview() {
  const [draft, setDraft] = useState({ startDate: localDate(-6), endDate: localDate() })
  const [filters, setFilters] = useState(draft)
  const [filterError, setFilterError] = useState('')
  const analytics = useQuery({ queryKey: analyticsKey(filters), queryFn: () => getDashboardAnalytics(filters) })
  const data = analytics.data || {}
  const currency = data.currency || 'INR'
  const dailySeries = Array.isArray(data.dailySeries) ? data.dailySeries : []
  const serviceBreakdown = Array.isArray(data.serviceBreakdown) ? data.serviceBreakdown : []
  const staffBreakdown = Array.isArray(data.staffBreakdown) ? data.staffBreakdown : []
  const statuses = normalizeStatuses(data)

  function applyFilters(e) {
    e.preventDefault()
    if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) { setFilterError('Start must be before end.'); return }
    if (daysInRange(draft.startDate, draft.endDate) > 366) { setFilterError('Max 366 days.'); return }
    setFilterError(''); setFilters({ startDate: draft.startDate, endDate: draft.endDate })
  }

  const widgets = [
    { label: 'Total Bookings', value: number(data.totalBookings ?? data.bookings), icon: 'event_available' },
    { label: 'Revenue', value: money(data.totalRevenue ?? data.revenue, currency), icon: 'payments' },
    { label: 'No-show Rate', value: percent(data.noShowRate), icon: 'person_off' },
  ]

  return (
    <section aria-busy={analytics.isFetching}>
      {/* Date Filters */}
      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-4 mb-8">
        <div>
          <label className="font-body text-label-sm text-on-surface-variant block mb-1">Start</label>
          <input type="date" value={draft.startDate} max={draft.endDate || undefined} onChange={(e) => setDraft((c) => ({ ...c, startDate: e.target.value }))}
            className="input-glass rounded py-2 px-3 text-body-md" />
        </div>
        <div>
          <label className="font-body text-label-sm text-on-surface-variant block mb-1">End</label>
          <input type="date" value={draft.endDate} min={draft.startDate || undefined} max={maxEnd(draft.startDate)} onChange={(e) => setDraft((c) => ({ ...c, endDate: e.target.value }))}
            className="input-glass rounded py-2 px-3 text-body-md" />
        </div>
        <BrassButton type="submit" disabled={analytics.isFetching} size="sm">{analytics.isFetching ? 'Loading...' : 'Apply'}</BrassButton>
        {filterError && <p className="text-error text-label-sm">{filterError}</p>}
      </form>

      {analytics.isLoading ? <p className="text-on-surface-variant">Loading analytics...</p> : analytics.isError ? (
        <GlassPanel className="text-center"><p className="text-error mb-4">{errorMessage(analytics.error)}</p><BrassButton onClick={() => analytics.refetch()} variant="outline">Try again</BrassButton></GlassPanel>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {widgets.map((w) => (
              <div key={w.label} className="glass-panel rounded-lg p-6 flex items-center gap-4 amber-glow">
                <div className="w-12 h-12 rounded-full bg-secondary-container/50 flex items-center justify-center flex-shrink-0">
                  <Icon name={w.icon} filled className="text-secondary text-2xl" />
                </div>
                <div>
                  <p className="font-body text-label-sm text-on-surface-variant">{w.label}</p>
                  <p className="font-display text-headline-sm text-secondary-fixed">{w.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Status Breakdown */}
          <GlassPanel className="mb-8">
            <h3 className="font-display text-title-lg text-on-surface mb-4">Booking Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statuses.map((s) => (
                <div key={s.name} className="bg-surface-container/50 rounded-lg p-4 text-center border border-outline-variant/20">
                  <p className="font-body text-label-sm text-on-surface-variant uppercase tracking-wider">{s.name.replace('_', ' ')}</p>
                  <p className="font-display text-headline-sm text-on-surface">{number(s.bookings)}</p>
                  {s.revenue !== undefined && <p className="font-body text-label-sm text-secondary">{money(s.revenue, currency)}</p>}
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Daily Chart (simplified bar representation) */}
          {dailySeries.length > 0 && (
            <GlassPanel className="mb-8">
              <h3 className="font-display text-title-lg text-on-surface mb-4">Daily Bookings</h3>
              <div className="flex items-end gap-1 h-32">
                {dailySeries.map((d) => {
                  const max = Math.max(1, ...dailySeries.map((x) => Number(x.bookings || 0)))
                  const h = `${(Number(d.bookings || 0) / max) * 100}%`
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${fmtDate(d.date)}: ${d.bookings} bookings`}>
                      <div className="w-full brass-gradient rounded-t-sm transition-all" style={{ height: h, minHeight: '2px' }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-body text-label-sm text-outline">{fmtDate(dailySeries[0]?.date)}</span>
                <span className="font-body text-label-sm text-outline">{fmtDate(dailySeries[dailySeries.length - 1]?.date)}</span>
              </div>
            </GlassPanel>
          )}

          {/* Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[{ title: 'By Service', rows: serviceBreakdown }, { title: 'By Staff', rows: staffBreakdown }].map((section) => (
              <GlassPanel key={section.title}>
                <h3 className="font-display text-title-lg text-on-surface mb-4">{section.title}</h3>
                {section.rows.length ? (
                  <div className="flex flex-col">
                    {section.rows.map((r, i) => (
                      <div key={r.id ?? i} className="flex justify-between items-center py-2 border-b border-outline-variant/20 last:border-0">
                        <span className="font-body text-body-md text-on-surface">{r.name || 'Unassigned'}</span>
                        <div className="flex gap-4">
                          <span className="font-body text-label-sm text-on-surface-variant">{number(r.bookings)} bookings</span>
                          {r.revenue !== undefined && <span className="font-body text-label-sm text-secondary">{money(r.revenue, currency)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-on-surface-variant text-body-md">No data for this period.</p>}
              </GlassPanel>
            ))}
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-3">
            <BrassButton to="/dashboard/bookings" icon={<Icon name="calendar_month" className="text-[18px]" />}>Bookings Calendar</BrassButton>
            <BrassButton to="/dashboard/staff" variant="outline">Manage Staff</BrassButton>
            <BrassButton to="/dashboard/services" variant="outline">Manage Services</BrassButton>
          </div>
        </>
      )}
    </section>
  )
}
