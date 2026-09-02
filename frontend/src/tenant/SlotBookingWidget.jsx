import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import { characterVideo } from '../shared/characters.js'
import {
  createBooking, errorMessage, getAvailability, getPublicServices, getPublicStaff, tenantKeys,
} from './tenant-api.js'
import BookingTicket from './BookingTicket.jsx'

// Local calendar date. toISOString() would shift the day for anyone east or
// west of UTC, which broke the arrows entirely in IST.
const isoDay = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-')
const today = () => isoDay(new Date())
const shiftDay = (day, days) => {
  const date = new Date(`${day}T00:00:00`)
  date.setDate(date.getDate() + days)
  return isoDay(date)
}
const dayLabel = (day) => {
  const date = new Date(`${day}T00:00:00`)
  const part = (options) => new Intl.DateTimeFormat(undefined, options).format(date)
  return `${part({ weekday: 'long' })}, ${part({ day: 'numeric' })} ${part({ month: 'long' })}`
}
const clockLabel = (value) => new Date(value)
  .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function ScissorsMark() {
  return (
    <svg className="booking-scissors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.348 5.656a4.5 4.5 0 015.656 5.656l-9.9 9.9a4.5 4.5 0 01-5.656-5.656l9.9-9.9z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.348 5.656L9.656 10.348M19.004 10.348l-4.692 4.692" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M7.5 16.5L16.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Chevron({ back }) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d={back ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SlotBookingWidget({ selectedIds, onToggleService, salonName }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const requestKey = useRef('')

  const [day, setDay] = useState(today)
  const [startAt, setStartAt] = useState('')
  const [staffId, setStaffId] = useState('any')
  const [notice, setNotice] = useState('')
  const [booked, setBooked] = useState(null)

  const services = useQuery({ queryKey: tenantKeys.publicServices, queryFn: getPublicServices })
  const staff = useQuery({ queryKey: tenantKeys.publicStaff, queryFn: getPublicStaff })

  const chainKey = selectedIds.join(',')

  // Clear a chosen time whenever the service chain changes, since the grid can
  // move when the longest service changes.
  useEffect(() => {
    setStartAt('')
    setStaffId('any')
    setNotice('')
  }, [chainKey])

  // Every barber's openings are fetched at once so the barber list can be
  // narrowed to whoever is actually free at the time the customer picks. With
  // no service chosen the backend falls back to the longest service, so the
  // board is never empty.
  const availability = useQuery({
    queryKey: tenantKeys.availability(chainKey, day, 'all'),
    queryFn: () => getAvailability({ serviceIds: selectedIds, date: day, includeUnavailable: true }),
    enabled: Boolean(day),
  })

  // One entry per clock time. A time is bookable when at least one barber is
  // free; otherwise it still shows, marked unavailable.
  const timeSlots = useMemo(() => {
    const byTime = new Map()
    for (const slot of availability.data || []) {
      if (!byTime.has(slot.startDatetime)) byTime.set(slot.startDatetime, [])
      byTime.get(slot.startDatetime).push(slot)
    }
    return [...byTime.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([start, options]) => ({
        start,
        free: options.filter((option) => option.available),
      }))
  }, [availability.data])

  // Land on the first open time so the barber list is visible straight away.
  useEffect(() => {
    if (startAt) return
    const firstFree = timeSlots.find((entry) => entry.free.length)
    if (firstFree) setStartAt(firstFree.start)
  }, [startAt, timeSlots])

  const freeBarbers = timeSlots.find((entry) => entry.start === startAt)?.free || []
  const chosen = staffId === 'any'
    ? freeBarbers[0]
    : freeBarbers.find((option) => String(option.staffId) === String(staffId))
  const chosenProfile = staff.data?.find((member) => String(member.id) === String(chosen?.staffId))
  // For "Any Barber", use the 2nd-to-last barber's character
  const anyCharacterProfile = freeBarbers.length >= 2
    ? staff.data?.find((member) => String(member.id) === String(freeBarbers[freeBarbers.length - 2]?.staffId))
    : chosenProfile
  const activeProfile = staffId === 'any' ? anyCharacterProfile : chosenProfile
  const characterClip = characterVideo(activeProfile?.characterKey)
  const shouldLoop = staffId !== 'any'
  // Chosen services move to the front of the scrolling pill row so they stay in
  // view; the rest keep their menu order behind them.
  const pillOrder = useMemo(() => {
    const picked = (item) => selectedIds.includes(String(item.id))
    return [...(services.data || [])].sort((left, right) => picked(right) - picked(left))
  }, [services.data, selectedIds])

  const chosenServices = (services.data || [])
    .filter((item) => selectedIds.includes(String(item.id)))
  const totalMinutes = chosenServices.reduce((sum, item) => sum + item.durationMinutes, 0)
  const totalPrice = chosenServices.reduce((sum, item) => sum + Number(item.price), 0)

  const create = useMutation({
    mutationFn: () => createBooking({
      payload: {
        staffId: chosen.staffId,
        serviceIds: selectedIds.map(Number),
        startDatetime: startAt,
      },
      idempotencyKey: requestKey.current
        || (requestKey.current = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`),
    }),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.myBookings })
      setBooked(booking)
    },
    onError: (error) => {
      requestKey.current = ''
      setNotice(errorMessage(error, 'That slot could not be reserved.'))
      setStartAt('')
      availability.refetch()
    },
  })

  function pickTime(start) {
    setStartAt(start)
    setStaffId('any')
    setNotice('')
  }

  function moveDay(days) {
    const next = shiftDay(day, days)
    if (next < today()) return
    setDay(next)
    setStartAt('')
    setStaffId('any')
    setNotice('')
  }

  function confirm() {
    if (!chosen) return
    // Times are shown before anything is picked, so the service is checked here.
    if (!selectedIds.length) return setNotice('Pick a service from the price list first.')
    if (!user) return navigate('/login', { state: { from: location } })
    if (user.role !== 'CUSTOMER') return setNotice('A customer account is required to book.')
    setNotice('')
    create.mutate()
  }

  return (
    <div className="booking-frame">
      <div className="booking-plate">
        <div className="booking-texture" />
        {startAt && <span className="booking-stamp gold-gradient-text">{clockLabel(startAt)}</span>}

        <header className="booking-head">
          <ScissorsMark />
          <div className="booking-title-row">
            <span className="booking-title-rule" />
            <h2 className="booking-title gold-gradient-text">Book An<br />Appointment</h2>
            <span className="booking-title-rule" />
          </div>
        </header>

        {booked ? (
          <div className="booking-body items-center">
            <BookingTicket
              salonName={salonName}
              services={chosenServices.map((item) => item.name).join(' + ')}
              staffName={booked.staffName || chosen?.staffName}
              dateLabel={dayLabel(day)}
              timeLabel={clockLabel(booked.startDatetime || startAt)}
              price={totalPrice ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalPrice) : null}
              minutes={totalMinutes || null}
            />
          </div>
        ) : (
          <>
            <div className="booking-datenav">
              <button type="button" className="booking-nav-btn" onClick={() => moveDay(-1)}
                disabled={day <= today()} aria-label="Previous day">
                <Chevron back />
              </button>
              <h3 className="booking-date-label gold-gradient-text">{dayLabel(day)}</h3>
              <button type="button" className="booking-nav-btn" onClick={() => moveDay(1)} aria-label="Next day">
                <Chevron />
              </button>
            </div>

            <div className="booking-body">
              {services.data?.length > 1 && (
                <div className="booking-pill-row" role="group" aria-label="Services">
                  {pillOrder.map((item) => {
                    const on = selectedIds.includes(String(item.id))
                    return (
                      <button key={item.id} type="button"
                        className={`booking-pill ${on ? 'is-selected' : ''}`}
                        aria-pressed={on} onClick={() => onToggleService(item.id)}>
                        {item.name}
                      </button>
                    )
                  })}
                </div>
              )}

              {chosenServices.length > 0 && (
                <p className="booking-chain">
                  {chosenServices.length} {chosenServices.length === 1 ? 'service' : 'services'}
                  {' \u00b7 '}{totalMinutes} min
                  {' \u00b7 '}{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(totalPrice)}
                </p>
              )}

              <div className="booking-slot-grid" role="group" aria-label="Available times">
                {availability.isLoading ? (
                  <span className="booking-note">Finding open times...</span>
                ) : availability.isError ? (
                  <span className="booking-note is-error">{errorMessage(availability.error)}</span>
                ) : timeSlots.length ? (
                  timeSlots.map((entry) => {
                    const taken = entry.free.length === 0
                    return (
                      <button key={entry.start} type="button" disabled={taken}
                        className={`booking-slot ${taken ? 'is-unavailable' : ''} ${entry.start === startAt ? 'is-selected' : ''}`}
                        aria-pressed={entry.start === startAt}
                        onClick={() => pickTime(entry.start)}>
                        {clockLabel(entry.start)}
                        {taken && <span className="booking-slot-note">Not available</span>}
                      </button>
                    )
                  })
                ) : (
                  <span className="booking-note">No times left on this day.</span>
                )}
              </div>

              <div className="booking-roster">
                <div className="booking-staff-list" role="group" aria-label="Barber">
                  {!startAt ? (
                    <span className="booking-note">Pick a time to see free barbers.</span>
                  ) : (
                    <>
                      <button type="button"
                        className={`booking-staff-name gold-gradient-text ${staffId === 'any' ? 'is-selected' : ''}`}
                        aria-pressed={staffId === 'any'} onClick={() => setStaffId('any')}>
                        Any Barber
                      </button>
                      {freeBarbers.map((option) => (
                        <button key={option.staffId} type="button"
                          className={`booking-staff-name gold-gradient-text ${String(option.staffId) === String(staffId) ? 'is-selected' : ''}`}
                          aria-pressed={String(option.staffId) === String(staffId)}
                          onClick={() => setStaffId(option.staffId)}>
                          {option.staffName}
                        </button>
                      ))}
                    </>
                  )}
                </div>

                <div className="booking-avatar">
                  <div>
                    {characterClip ? (
                      <video key={characterClip + shouldLoop} src={characterClip} autoPlay loop={shouldLoop} muted
                        playsInline aria-hidden="true" tabIndex={-1} />
                    ) : chosenProfile?.photoUrl ? (
                      <img src={chosenProfile.photoUrl} alt="" />
                    ) : (
                      <span className="booking-avatar-initial">{chosen?.staffName?.[0] || '\u2702'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <button type="button" className="booking-confirm" onClick={confirm}
                  disabled={!chosen || create.isPending}>
                  {create.isPending ? 'Reserving...' : 'Confirm Slot'}
                </button>
                {notice && <p className="booking-note is-error">{notice}</p>}
                {!notice && !user && startAt && <p className="booking-note">You'll be asked to log in first.</p>}
              </div>
            </div>
          </>
        )}

        <p className="price-mark mt-auto pt-6">&mdash; {salonName} &mdash;</p>
      </div>
    </div>
  )
}
