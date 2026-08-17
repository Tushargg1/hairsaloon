import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  cancelDashboardBooking, errorMessage, getDashboardAnalytics, getDashboardBookings,
  getDashboardStaff, getSalonProfile, tenantKeys, transitionDashboardBooking,
} from '../tenant-api.js'

const browserToday = () => new Date().toISOString().slice(0, 10)
function dateInZone(timeZone) {
  if (!timeZone) return browserToday()
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
function addDays(value, amount) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}
function mondayOf(value) {
  const date = new Date(`${value}T00:00:00Z`)
  return addDays(value, -((date.getUTCDay() + 6) % 7))
}
const displayDate = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'full', timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`))
const displayTime = (value) => {
  const time = value?.split('T')[1]?.slice(0, 5)
  if (!time) return 'Time unavailable'
  const [hour, minute] = time.split(':').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, hour, minute)))
}

export default function BookingsCalendar() {
  const client = useQueryClient()
  const [mode, setMode] = useState('week')
  const [anchor, setAnchor] = useState(null)
  const [staffId, setStaffId] = useState('')
  const staff = useQuery({ queryKey: tenantKeys.dashboardStaff, queryFn: getDashboardStaff })
  const profile = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const analytics = useQuery({ queryKey: tenantKeys.dashboardAnalytics, queryFn: getDashboardAnalytics })
  const salonToday = dateInZone(profile.data?.timezone)
  const range = useMemo(() => {
    if (mode === 'week' && !anchor && analytics.data?.rangeStart && analytics.data?.rangeEnd) {
      return { startDate: analytics.data.rangeStart, endDate: analytics.data.rangeEnd }
    }
    const focus = anchor || salonToday
    if (mode === 'day') return { startDate: focus, endDate: focus }
    const startDate = mondayOf(focus)
    return { startDate, endDate: addDays(startDate, 6) }
  }, [mode, anchor, analytics.data?.rangeStart, analytics.data?.rangeEnd, salonToday])
  const filters = useMemo(() => ({ ...range, staffId }), [range, staffId])
  const bookings = useQuery({
    queryKey: tenantKeys.dashboardBookings(filters),
    queryFn: () => getDashboardBookings(filters),
  })
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['tenant', 'dashboard-bookings'] })
    client.invalidateQueries({ queryKey: tenantKeys.dashboardAnalytics })
  }
  const cancel = useMutation({ mutationFn: cancelDashboardBooking, onSuccess: refresh })
  const transition = useMutation({ mutationFn: transitionDashboardBooking, onSuccess: refresh })
  const days = useMemo(() => (bookings.data || []).reduce((result, booking) => {
    const day = booking.startDatetime.slice(0, 10)
    const staffKey = `${booking.staffId}:${booking.staffName || 'Staff member'}`
    result[day] ||= {}
    result[day][staffKey] ||= []
    result[day][staffKey].push(booking)
    return result
  }, {}), [bookings.data])
  const failure = bookings.error || staff.error || cancel.error || transition.error
  const pending = cancel.isPending || transition.isPending
  const rangeLabel = mode === 'day' ? displayDate(range.startDate)
    : `${displayDate(range.startDate)} – ${displayDate(range.endDate)}`

  function chooseMode(nextMode) {
    setMode(nextMode)
    setAnchor(nextMode === 'day' ? salonToday : null)
  }
  function navigate(direction) {
    setAnchor(addDays(range.startDate, direction * (mode === 'day' ? 1 : 7)))
  }
  function goToday() { setAnchor(mode === 'week' ? null : salonToday) }
  function cancelBooking(id) {
    if (globalThis.confirm('Cancel this customer booking?')) cancel.mutate(id)
  }

  return <section className="manager-section calendar-agenda" aria-busy={bookings.isFetching}>
    <header className="manager-heading"><p className="eyebrow">Booking lifecycle</p><h2>Bookings calendar</h2><p>Salon-local agenda with day and Monday–Sunday week views.</p></header>
    <div className="calendar-toolbar">
      <div className="view-switcher" role="group" aria-label="Calendar view">
        <button type="button" aria-pressed={mode === 'day'} onClick={() => chooseMode('day')}>Day</button>
        <button type="button" aria-pressed={mode === 'week'} onClick={() => chooseMode('week')}>Week</button>
      </div>
      <div className="calendar-navigation" role="group" aria-label="Calendar navigation">
        <button className="button button-small button-secondary" type="button" onClick={() => navigate(-1)}>Previous</button>
        <button className="button button-small button-secondary" type="button" onClick={goToday}>Today</button>
        <button className="button button-small button-secondary" type="button" onClick={() => navigate(1)}>Next</button>
      </div>
      <label>Staff member<select value={staffId} onChange={(event) => setStaffId(event.target.value)} disabled={staff.isLoading}><option value="">All staff</option>{staff.data?.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
    </div>
    <div className="calendar-range" aria-live="polite"><strong>{rangeLabel}</strong><span>{mode === 'week' ? 'Monday through Sunday' : 'Day agenda'}</span></div>
    {failure && <p className="form-status error" role="alert">{errorMessage(failure)}</p>}
    {bookings.isLoading ? <div className="manager-loading" aria-live="polite">Loading bookings…</div>
      : Object.keys(days).length ? Object.entries(days).map(([day, lanes]) => <section className="calendar-day" aria-labelledby={`day-${day}`} key={day}>
        <h3 id={`day-${day}`}>{displayDate(day)}</h3>
        <div className="staff-lanes">{Object.entries(lanes).map(([staffKey, items]) => <section className="staff-lane" aria-label={`${items[0].staffName || 'Staff member'} appointments`} key={staffKey}>
          <h4>{items[0].staffName || 'Staff member'} <span>{items.length} {items.length === 1 ? 'appointment' : 'appointments'}</span></h4>
          <div className="manager-list">{items.map((booking) => <article className="booking-list-card" key={booking.id}>
            <div><span className={`booking-status ${booking.status.toLowerCase()}`}>{booking.status.replace('_', ' ')}</span><h3>{displayTime(booking.startDatetime)} · {booking.serviceName}</h3><p>Customer #{booking.customerId} · {displayTime(booking.startDatetime)}–{displayTime(booking.endDatetime)}</p></div>
            {booking.status === 'CONFIRMED' && <div className="button-row" aria-label={`Actions for ${booking.serviceName} at ${displayTime(booking.startDatetime)}`}><button className="button button-small button-secondary" disabled={pending} onClick={() => transition.mutate({ id: booking.id, status: 'COMPLETED' })}>Complete</button><button className="button button-small button-secondary" disabled={pending} onClick={() => transition.mutate({ id: booking.id, status: 'NO_SHOW' })}>No-show</button><button className="button button-small button-ghost" disabled={pending} onClick={() => cancelBooking(booking.id)}>Cancel</button></div>}
          </article>)}</div>
        </section>)}</div>
      </section>) : <div className="public-state"><h3>No bookings for this {mode}</h3><p>Try another date or staff member. New appointments will appear here automatically.</p></div>}
  </section>
}
