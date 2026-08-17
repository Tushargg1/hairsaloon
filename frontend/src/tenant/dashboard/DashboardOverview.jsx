import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { errorMessage, getDashboardAnalytics, tenantKeys } from '../tenant-api.js'

const number = (value) => new Intl.NumberFormat().format(Number(value || 0))
const percent = (value) => `${Number(value || 0).toFixed(2)}%`
const money = (value, currency) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency: currency || 'USD',
    }).format(Number(value || 0))
  } catch {
    return `${Number(value || 0).toFixed(2)} ${currency || 'USD'}`
  }
}
const date = (value) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' })
      .format(new Date(`${value}T00:00:00Z`))
  : '—'

export default function DashboardOverview() {
  const analytics = useQuery({
    queryKey: tenantKeys.dashboardAnalytics,
    queryFn: getDashboardAnalytics,
  })
  if (analytics.isLoading) return <section className="manager-loading" aria-live="polite">Loading dashboard analytics…</section>
  if (analytics.isError) return <section className="public-state" role="alert"><h2>Analytics unavailable</h2><p>{errorMessage(analytics.error)}</p><button className="button button-small" onClick={() => analytics.refetch()}>Try again</button></section>
  const data = analytics.data || {}
  const widgets = [
    ['Bookings this week', number(data.bookingsThisWeek)],
    ['Completed revenue', money(data.revenue, data.currency)],
    ['No-show rate', percent(data.noShowRate)],
  ]
  const statuses = [
    ['Confirmed', data.confirmedBookings], ['Completed', data.completedBookings],
    ['Cancelled', data.cancelledBookings], ['No-show', data.noShowBookings],
  ]
  return <section className="dashboard-overview">
    <header className="manager-heading"><p className="eyebrow">This week at a glance</p><h2>Overview</h2><p>{date(data.rangeStart)} – {date(data.rangeEnd)} · Monday through Sunday, in your salon timezone.</p></header>
    <div className="analytics-grid">{widgets.map(([label, value]) => <article className="analytics-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <section className="status-overview" aria-labelledby="status-heading"><div><p className="eyebrow">Booking outcomes</p><h3 id="status-heading">Status counts</h3></div><dl>{statuses.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl></section>
    <nav className="quick-links" aria-label="Dashboard quick links"><Link className="button" to="/dashboard/bookings">Open bookings calendar</Link><Link className="button button-secondary" to="/dashboard/staff">Manage staff</Link><Link className="button button-secondary" to="/dashboard/services">Manage services</Link></nav>
  </section>
}
