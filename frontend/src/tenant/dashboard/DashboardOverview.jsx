import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage, getDashboardAnalytics, tenantKeys } from '../tenant-api.js'

const number = (value) => new Intl.NumberFormat().format(Number(value || 0))
const percent = (value) => `${Number(value || 0).toFixed(2)}%`
const money = (value, currency) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0))
  } catch {
    return `${Number(value || 0).toFixed(2)} ${currency || 'USD'}`
  }
}
const date = (value) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
  : '—'
function localDate(offset = 0) {
  const value = new Date()
  value.setDate(value.getDate() + offset)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
function analyticsKey(filters) {
  const key = tenantKeys.dashboardAnalytics
  if (typeof key === 'function') return key(filters)
  return [...(Array.isArray(key) ? key : ['tenant', 'dashboard-analytics']), filters]
}
function daysInRange(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  return Math.floor((end - start) / 86_400_000) + 1
}
function maxEndDate(startDate) {
  if (!startDate) return undefined
  const value = new Date(`${startDate}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 365)
  return value.toISOString().slice(0, 10)
}

function normalizeStatuses(data) {
  if (Array.isArray(data.statusBreakdown)) return data.statusBreakdown.map((item) => ({
    name: item.name || item.status || 'Unknown',
    bookings: item.bookings ?? item.count ?? 0,
    revenue: item.revenue,
  }))
  if (data.statusBreakdown && typeof data.statusBreakdown === 'object') return Object.entries(data.statusBreakdown).map(([name, value]) => ({
    name,
    bookings: typeof value === 'object' ? value.bookings ?? value.count ?? 0 : value,
    revenue: typeof value === 'object' ? value.revenue : undefined,
  }))
  return [
    ['Confirmed', data.confirmedBookings], ['Completed', data.completedBookings],
    ['Cancelled', data.cancelledBookings], ['No-show', data.noShowBookings],
  ].map(([name, bookings]) => ({ name, bookings: bookings || 0 }))
}

function BreakdownTable({ heading, rows, currency }) {
  return <section className="analytics-table-card" aria-labelledby={`${heading.toLowerCase()}-breakdown-heading`}>
    <h3 id={`${heading.toLowerCase()}-breakdown-heading`}>{heading} breakdown</h3>
    {rows.length ? <div className="table-scroll"><table><caption className="sr-only">Bookings and revenue by {heading.toLowerCase()}</caption><thead><tr><th scope="col">{heading}</th><th scope="col">Bookings</th><th scope="col">Revenue</th></tr></thead><tbody>{rows.map((item, index) => <tr key={item.id ?? `${item.name}-${index}`}><th scope="row">{item.name || 'Unassigned'}</th><td>{number(item.bookings)}</td><td>{money(item.revenue, currency)}</td></tr>)}</tbody></table></div> : <p className="muted">No {heading.toLowerCase()} data for this period.</p>}
  </section>
}

function BarChart({ heading, series, valueKey, formatValue }) {
  const max = Math.max(0, ...series.map((item) => Number(item[valueKey] || 0)))
  const total = series.reduce((sum, item) => sum + Number(item[valueKey] || 0), 0)
  return <section className="analytics-chart" aria-labelledby={`${valueKey}-chart-heading`}>
    <div><h3 id={`${valueKey}-chart-heading`}>{heading}</h3><p>{formatValue(total)} across {number(series.length)} days.</p></div>
    {series.length ? <ol className="analytics-bars" aria-label={`${heading} by day`}>{series.map((item) => {
      const value = Number(item[valueKey] || 0)
      const size = max > 0 ? `${(value / max) * 100}%` : '0%'
      return <li key={`${valueKey}-${item.date}`} title={`${date(item.date)}: ${formatValue(value)}`}><span className="analytics-bar-track" aria-hidden="true"><span style={{ '--bar-size': size }} /></span><span>{date(item.date)}</span><strong>{formatValue(value)}</strong></li>
    })}</ol> : <p className="muted">No daily data for this period.</p>}
  </section>
}

export default function DashboardOverview() {
  const [draft, setDraft] = useState({ startDate: localDate(-6), endDate: localDate() })
  const [filters, setFilters] = useState(draft)
  const [filterError, setFilterError] = useState('')
  const analytics = useQuery({
    queryKey: analyticsKey(filters),
    queryFn: () => getDashboardAnalytics(filters),
  })
  const data = analytics.data || {}
  const currency = data.currency || 'USD'
  const dailySeries = Array.isArray(data.dailySeries) ? data.dailySeries : []
  const serviceBreakdown = Array.isArray(data.serviceBreakdown) ? data.serviceBreakdown : []
  const staffBreakdown = Array.isArray(data.staffBreakdown) ? data.staffBreakdown : []
  const statuses = normalizeStatuses(data)
  const widgets = [
    ['Bookings', number(data.totalBookings ?? data.bookings ?? data.bookingsThisWeek)],
    ['Revenue', money(data.totalRevenue ?? data.revenue, currency)],
    ['No-show rate', percent(data.noShowRate)],
  ]

  function applyFilters(event) {
    event.preventDefault()
    if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
      setFilterError('Start date must be on or before end date.')
      return
    }
    if (daysInRange(draft.startDate, draft.endDate) > 366) {
      setFilterError('Choose a date range of 366 days or fewer.')
      return
    }
    setFilterError('')
    setFilters({ startDate: draft.startDate, endDate: draft.endDate })
  }

  return <section className="dashboard-overview" aria-labelledby="analytics-heading" aria-busy={analytics.isFetching}>
    <header className="manager-heading"><p className="eyebrow">Business performance</p><h2 id="analytics-heading">Analytics overview</h2><p>{date(data.rangeStart || filters.startDate)} – {date(data.rangeEnd || filters.endDate)} · Figures are shown in your salon timezone.</p></header>
    <form className="analytics-filters" onSubmit={applyFilters}>
      <label>Start date <span className="optional">Optional</span><input type="date" value={draft.startDate} max={draft.endDate || undefined} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} /></label>
      <label>End date <span className="optional">Optional</span><input type="date" value={draft.endDate} min={draft.startDate || undefined} max={maxEndDate(draft.startDate)} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} /></label>
      <button className="button" type="submit" disabled={analytics.isFetching}>{analytics.isFetching ? 'Updating…' : 'Apply dates'}</button>
      {filterError && <p className="form-status error" role="alert">{filterError}</p>}
    </form>
    {analytics.isLoading ? <section className="manager-loading" aria-live="polite">Loading dashboard analytics…</section> : analytics.isError ? <section className="public-state" role="alert"><h2>Analytics unavailable</h2><p>{errorMessage(analytics.error)}</p><button className="button button-small" type="button" onClick={() => analytics.refetch()}>Try again</button></section> : <>
      <div className="analytics-grid" aria-label="Key performance indicators">{widgets.map(([label, value]) => <article className="analytics-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <div className="analytics-chart-grid"><BarChart heading="Daily bookings" series={dailySeries} valueKey="bookings" formatValue={number} /><BarChart heading="Daily revenue" series={dailySeries} valueKey="revenue" formatValue={(value) => money(value, currency)} /></div>
      {dailySeries.length > 0 && <section className="analytics-table-card" aria-labelledby="daily-data-heading"><h3 id="daily-data-heading">Daily details</h3><div className="table-scroll"><table><caption className="sr-only">Daily bookings and revenue for the selected dates</caption><thead><tr><th scope="col">Date</th><th scope="col">Bookings</th><th scope="col">Revenue</th></tr></thead><tbody>{dailySeries.map((item) => <tr key={item.date}><th scope="row">{date(item.date)}</th><td>{number(item.bookings)}</td><td>{money(item.revenue, currency)}</td></tr>)}</tbody></table></div></section>}
      <section className="status-overview" aria-labelledby="status-heading"><div><p className="eyebrow">Booking outcomes</p><h3 id="status-heading">Status breakdown</h3></div><dl>{statuses.map((item) => <div key={item.name}><dt>{String(item.name).replaceAll('_', ' ')}</dt><dd>{number(item.bookings)}</dd>{item.revenue !== undefined && <small>{money(item.revenue, currency)}</small>}</div>)}</dl></section>
      <div className="analytics-breakdowns"><BreakdownTable heading="Service" rows={serviceBreakdown} currency={currency} /><BreakdownTable heading="Staff" rows={staffBreakdown} currency={currency} /></div>
    </>}
    <nav className="quick-links" aria-label="Dashboard quick links"><Link className="button" to="/dashboard/bookings">Open bookings calendar</Link><Link className="button button-secondary" to="/dashboard/staff">Manage staff</Link><Link className="button button-secondary" to="/dashboard/services">Manage services</Link></nav>
  </section>
}
