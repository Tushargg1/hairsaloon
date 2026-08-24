import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  cancelDashboardBooking, createWalkIn, errorMessage, getDashboardBookings,
  getDashboardServices, getDashboardStaff, getSalonProfile, tenantKeys,
  transitionDashboardBooking,
} from '../tenant-api.js'

const browserToday = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function localDateTimeNow(timeZone) {
  if (!timeZone) {
    const date = new Date()
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0, 16)
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
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

// 'weekday' is not a valid dateStyle, so the column headings ask for the
// weekday component directly instead.
const displayDate = (value, dateStyle = 'full') => new Intl.DateTimeFormat(
  undefined,
  dateStyle === 'weekday'
    ? { weekday: 'short', timeZone: 'UTC' }
    : { dateStyle, timeZone: 'UTC' },
).format(new Date(`${value}T00:00:00Z`))
function localMinutes(value) {
  const time = value?.split('T')[1]?.slice(0, 5)
  if (!time) return null
  const [hour, minute] = time.split(':').map(Number)
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null
}
function displayTime(value) {
  const minutes = localMinutes(value)
  if (minutes === null) return 'Time unavailable'
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}
function displayHour(hour) {
  return `${hour % 12 || 12} ${hour < 12 || hour === 24 ? 'AM' : 'PM'}`
}
function analyticsRootMatches(query) {
  const key = query.queryKey || []
  return key.some((part) => part === 'dashboard-analytics')
}
const emptyWalkIn = () => ({ staffId: '', serviceId: '', startDatetime: '', guestName: '', guestPhone: '' })

function BookingCard({ booking, pending, onTransition, onCancel }) {
  const status = booking.status || 'CONFIRMED'
  const source = booking.source || booking.bookingSource || (booking.guestName ? 'WALK_IN' : 'ONLINE')
  const customer = booking.guestName || booking.customerName || (booking.customerId ? `Customer #${booking.customerId}` : 'Walk-in guest')
  return <article className="calendar-booking-card" tabIndex="0" aria-label={`${source.replaceAll('_', ' ')} ${booking.serviceName || 'appointment'} for ${customer}, ${displayTime(booking.startDatetime)} to ${displayTime(booking.endDatetime)}`}>
    <div className="booking-card-badges"><span className={`booking-status ${status.toLowerCase()}`}>{status.replaceAll('_', ' ')}</span><span className="booking-source">{source.replaceAll('_', ' ')}</span></div>
    <h4>{booking.serviceName || 'Appointment'}</h4>
    <p><strong>{displayTime(booking.startDatetime)}–{displayTime(booking.endDatetime)}</strong></p>
    <p>{customer} · {booking.staffName || 'Staff member'}</p>
    {status === 'CONFIRMED' && <div className="calendar-card-actions" aria-label={`Actions for ${booking.serviceName || 'appointment'} at ${displayTime(booking.startDatetime)}`}><button type="button" disabled={pending} onClick={() => onTransition({ id: booking.id, status: 'COMPLETED' })}>Complete</button><button type="button" disabled={pending} onClick={() => onTransition({ id: booking.id, status: 'NO_SHOW' })}>No-show</button><button type="button" disabled={pending} onClick={() => onCancel(booking.id)}>Cancel</button></div>}
  </article>
}

export default function BookingsCalendar() {
  const client = useQueryClient()
  const [mode, setMode] = useState('week')
  const [anchor, setAnchor] = useState(null)
  const [staffId, setStaffId] = useState('')
  const [walkInForm, setWalkInForm] = useState(emptyWalkIn)
  const [walkInFeedback, setWalkInFeedback] = useState('')
  const staff = useQuery({ queryKey: tenantKeys.dashboardStaff, queryFn: getDashboardStaff })
  const services = useQuery({ queryKey: tenantKeys.dashboardServices, queryFn: getDashboardServices })
  const profile = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const salonToday = dateInZone(profile.data?.timezone)
  const range = useMemo(() => {
    const focus = anchor || salonToday
    if (mode === 'day') return { startDate: focus, endDate: focus }
    const startDate = mondayOf(focus)
    return { startDate, endDate: addDays(startDate, 6) }
  }, [mode, anchor, salonToday])
  const filters = useMemo(() => ({ ...range, staffId }), [range, staffId])
  const bookings = useQuery({
    queryKey: tenantKeys.dashboardBookings(filters),
    queryFn: () => getDashboardBookings(filters),
  })
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['tenant', 'dashboard-bookings'] })
    client.invalidateQueries({ predicate: analyticsRootMatches })
  }
  const cancel = useMutation({ mutationFn: cancelDashboardBooking, onSuccess: refresh })
  const transition = useMutation({ mutationFn: transitionDashboardBooking, onSuccess: refresh })
  const walkIn = useMutation({
    mutationFn: createWalkIn,
    onSuccess: () => {
      setWalkInFeedback('Walk-in appointment created.')
      setWalkInForm(emptyWalkIn())
      refresh()
    },
    onError: () => setWalkInFeedback(''),
  })
  const dayDates = useMemo(() => {
    const count = mode === 'day' ? 1 : 7
    return Array.from({ length: count }, (_, index) => addDays(range.startDate, index))
  }, [mode, range.startDate])
  const bookingsByDay = useMemo(() => dayDates.reduce((result, day) => {
    result[day] = (bookings.data || [])
      .filter((booking) => booking.startDatetime?.slice(0, 10) === day)
      .sort((left, right) => (left.startDatetime || '').localeCompare(right.startDatetime || ''))
    return result
  }, {}), [bookings.data, dayDates])
  const timeBounds = useMemo(() => {
    const all = bookings.data || []
    const starts = all.map((item) => localMinutes(item.startDatetime)).filter(Number.isFinite)
    const ends = all.map((item) => localMinutes(item.endDatetime)).filter(Number.isFinite)
    const startHour = Math.max(0, Math.min(8, starts.length ? Math.floor(Math.min(...starts) / 60) : 8))
    const endHour = Math.min(24, Math.max(20, ends.length ? Math.ceil(Math.max(...ends) / 60) : 20))
    return { startHour, endHour: Math.max(startHour + 1, endHour) }
  }, [bookings.data])
  const hourLabels = Array.from({ length: timeBounds.endHour - timeBounds.startHour + 1 }, (_, index) => timeBounds.startHour + index)
  const failure = bookings.error || cancel.error || transition.error
  const pending = cancel.isPending || transition.isPending
  const rangeLabel = mode === 'day' ? displayDate(range.startDate) : `${displayDate(range.startDate)} – ${displayDate(range.endDate)}`

  function chooseMode(nextMode) {
    setMode(nextMode)
    setAnchor(nextMode === 'day' ? salonToday : null)
  }
  function navigate(direction) { setAnchor(addDays(range.startDate, direction * (mode === 'day' ? 1 : 7))) }
  function goToday() { setAnchor(mode === 'week' ? null : salonToday) }
  function cancelBooking(id) {
    if (globalThis.confirm('Cancel this customer booking?')) cancel.mutate(id)
  }
  function updateWalkIn(event) {
    setWalkInForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setWalkInFeedback('')
    walkIn.reset()
  }
  function submitWalkIn(event) {
    event.preventDefault()
    walkIn.mutate({
      staffId: Number(walkInForm.staffId),
      serviceId: Number(walkInForm.serviceId),
      startDatetime: walkInForm.startDatetime,
      guestName: walkInForm.guestName.trim(),
      guestPhone: walkInForm.guestPhone.trim(),
    })
  }

  return <section className="manager-section calendar-agenda" aria-busy={bookings.isFetching} aria-labelledby="calendar-heading">
    <header className="manager-heading"><p className="eyebrow">Booking lifecycle</p><h2 id="calendar-heading">Bookings calendar</h2><p>Salon-local day and Monday–Sunday week views. Appointment times are displayed exactly as scheduled.</p></header>
    <form className="manager-create-card walk-in-form" onSubmit={submitWalkIn}>
      <div><p className="eyebrow">Owner quick action</p><h3>Add a walk-in</h3><p className="muted">Create a guest appointment using the salon’s local date and time.</p></div>
      <div className="walk-in-fields">
        <label>Staff member<select name="staffId" required value={walkInForm.staffId} onChange={updateWalkIn} disabled={staff.isLoading}><option value="">Select staff</option>{staff.data?.filter((item) => item.active !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Service<select name="serviceId" required value={walkInForm.serviceId} onChange={updateWalkIn} disabled={services.isLoading}><option value="">Select service</option>{services.data?.filter((item) => item.active !== false).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Start date and time<input name="startDatetime" type="datetime-local" required min={localDateTimeNow(profile.data?.timezone)} value={walkInForm.startDatetime} onChange={updateWalkIn} /></label>
        <label>Guest name<input name="guestName" required minLength="2" maxLength="120" autoComplete="name" value={walkInForm.guestName} onChange={updateWalkIn} /></label>
        <label>Guest phone<input name="guestPhone" type="tel" required minLength="7" maxLength="30" pattern="[+0-9() .-]{7,30}" title="Use 7 to 30 digits and common phone punctuation" autoComplete="tel" value={walkInForm.guestPhone} onChange={updateWalkIn} /></label>
      </div>
      {(staff.isError || services.isError) && <p className="form-status error" role="alert">{errorMessage(staff.error || services.error)}</p>}
      {walkIn.isError && <p className="form-status error" role="alert">{errorMessage(walkIn.error)}</p>}
      {walkInFeedback && <p className="form-status success" role="status">{walkInFeedback}</p>}
      <button className="button" type="submit" disabled={walkIn.isPending || staff.isLoading || services.isLoading}>{walkIn.isPending ? 'Creating walk-in…' : 'Create walk-in'}</button>
    </form>
    <div className="calendar-toolbar">
      <div className="view-switcher" role="group" aria-label="Calendar view"><button type="button" aria-pressed={mode === 'day'} onClick={() => chooseMode('day')}>Day</button><button type="button" aria-pressed={mode === 'week'} onClick={() => chooseMode('week')}>Week</button></div>
      <div className="calendar-navigation" role="group" aria-label="Calendar navigation"><button className="button button-small button-secondary" type="button" onClick={() => navigate(-1)}>Previous</button><button className="button button-small button-secondary" type="button" onClick={goToday}>Today</button><button className="button button-small button-secondary" type="button" onClick={() => navigate(1)}>Next</button></div>
      <label>Filter by staff<select value={staffId} onChange={(event) => setStaffId(event.target.value)} disabled={staff.isLoading}><option value="">All staff</option>{staff.data?.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
    </div>
    <div className="calendar-range" aria-live="polite"><strong>{rangeLabel}</strong><span>{mode === 'week' ? 'Monday through Sunday' : 'Day schedule'}</span></div>
    {failure && <p className="form-status error" role="alert">{errorMessage(failure)}</p>}
    {bookings.isLoading ? <div className="manager-loading" aria-live="polite">Loading bookings…</div> : <div className={`calendar-grid-scroll ${mode === 'day' ? 'day-mode' : ''}`}>
      <div className="calendar-time-grid" style={{ '--calendar-days': dayDates.length, '--calendar-height': `${(timeBounds.endHour - timeBounds.startHour) * 60}px` }}>
        <div className="calendar-grid-corner" aria-hidden="true">Time</div>
        <div className="calendar-column-headings" aria-hidden="true">{dayDates.map((day) => <div key={day}><strong>{displayDate(day, 'weekday')}</strong><span>{displayDate(day, 'medium')}</span></div>)}</div>
        <div className="calendar-time-axis" aria-hidden="true">{hourLabels.map((hour) => <span style={{ top: `${(hour - timeBounds.startHour) * 60}px` }} key={hour}>{displayHour(hour)}</span>)}</div>
        <div className="calendar-day-columns">{dayDates.map((day) => <section className="calendar-day-column" aria-labelledby={`calendar-day-${day}`} key={day}>
          <h3 className="calendar-mobile-day-heading" id={`calendar-day-${day}`}>{displayDate(day)}</h3>
          {bookingsByDay[day].length ? <ol className="calendar-day-events">{bookingsByDay[day].map((booking) => {
            const start = localMinutes(booking.startDatetime) ?? timeBounds.startHour * 60
            const end = localMinutes(booking.endDatetime) ?? start + 60
            const top = Math.max(0, start - timeBounds.startHour * 60)
            const height = Math.max(24, end - start)
            return <li style={{ top: `${top}px`, height: `${height}px` }} key={booking.id}><BookingCard booking={booking} pending={pending} onTransition={transition.mutate} onCancel={cancelBooking} /></li>
          })}</ol> : <p className="calendar-empty-day">No bookings</p>}
        </section>)}</div>
      </div>
    </div>}
  </section>
}
