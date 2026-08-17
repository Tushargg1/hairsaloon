import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import {
  createBooking, errorMessage, getAvailability, getPublicServices, getPublicStaff,
  tenantKeys,
} from './tenant-api.js'

const tomorrow = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}
const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value))
const when = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function BookingFlow() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const requestKey = useRef('')
  const [step, setStep] = useState(1)
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('any')
  const [date, setDate] = useState(tomorrow)
  const [slot, setSlot] = useState(null)
  const [conflict, setConflict] = useState('')
  const services = useQuery({ queryKey: tenantKeys.publicServices, queryFn: getPublicServices })
  const staff = useQuery({ queryKey: tenantKeys.publicStaff, queryFn: getPublicStaff })
  const availability = useQuery({
    queryKey: tenantKeys.availability(serviceId, date, staffId),
    queryFn: () => getAvailability({ serviceId, date, staffId: staffId === 'any' ? null : staffId }),
    enabled: step >= 4 && Boolean(serviceId && date),
  })
  const service = services.data?.find((item) => String(item.id) === String(serviceId))
  const eligibleStaff = staff.data?.filter((member) => member.serviceIds?.some((id) => String(id) === String(serviceId))) || []
  const selectedStaff = staff.data?.find((member) => String(member.id) === String(slot?.staffId))
  const create = useMutation({
    mutationFn: () => createBooking({
      payload: { staffId: slot.staffId, serviceId: Number(serviceId), startDatetime: slot.startDatetime },
      idempotencyKey: requestKey.current || (requestKey.current = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`),
    }),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.myBookings })
      setStep(6)
      setSlot(booking)
    },
    onError: (error) => {
      if (error?.response?.status === 409) {
        requestKey.current = ''
        setConflict(errorMessage(error))
        setSlot(null)
        setStep(4)
        availability.refetch()
      }
    },
  })

  function chooseService(id) { setServiceId(String(id)); setStaffId('any'); setSlot(null); setStep(2) }
  function chooseStaff(id) { setStaffId(String(id)); setSlot(null); setStep(3) }
  function chooseSlot(value) { requestKey.current = ''; setConflict(''); setSlot(value); setStep(5) }
  function confirm() {
    if (!user) return navigate('/login', { state: { from: location } })
    if (user.role !== 'CUSTOMER') return setConflict('A customer account is required to book.')
    create.mutate()
  }

  if (step === 6) return <main className="page-width booking-page"><section className="success-card"><div className="success-icon">✓</div><p className="eyebrow">Booking confirmed</p><h1>We’ll see you soon.</h1><p>{service?.name} with {slot.staffName || selectedStaff?.name} on {when(slot.startDatetime)}.</p><div className="button-row"><Link className="button" to="/bookings">View my bookings</Link><Link className="button button-secondary" to="/">Salon home</Link></div></section></main>

  return (
    <main className="page-width booking-page">
      <header className="page-heading compact"><p className="eyebrow">Book online</p><h1>Choose your appointment.</h1></header>
      <ol className="booking-stepper" aria-label="Booking progress">{['Service', 'Staff', 'Date', 'Time', 'Confirm'].map((label, index) => <li className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} key={label}>{index + 1}. {label}</li>)}</ol>
      <section className="booking-panel">
        {conflict && <p className="form-status error" role="alert">{conflict} Available times have been refreshed.</p>}
        {step === 1 && <><h2>Select a service</h2>{services.isLoading ? <p>Loading services…</p> : services.isError ? <p role="alert">{errorMessage(services.error)}</p> : <div className="booking-choice-grid">{services.data?.map((item) => <button className="booking-choice" key={item.id} onClick={() => chooseService(item.id)}><strong>{item.name}</strong><span>{item.durationMinutes} min · {money(item.price)}</span></button>)}</div>}</>}
        {step === 2 && <><h2>Choose a stylist</h2><div className="booking-choice-grid"><button className="booking-choice" onClick={() => chooseStaff('any')}><strong>Any available stylist</strong><span>Show the widest choice of times</span></button>{eligibleStaff.map((member) => <button className="booking-choice" key={member.id} onClick={() => chooseStaff(member.id)}><strong>{member.name}</strong><span>Book with this stylist</span></button>)}</div></>}
        {step === 3 && <><h2>Choose a date</h2><label>Appointment date<input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></label><button className="button" disabled={!date} onClick={() => setStep(4)}>See available times</button></>}
        {step === 4 && <><h2>Available times</h2>{availability.isLoading ? <p>Finding open appointments…</p> : availability.isError ? <p role="alert">{errorMessage(availability.error)}</p> : availability.data?.length ? <div className="slot-grid">{availability.data.map((item) => <button key={`${item.staffId}-${item.startDatetime}`} onClick={() => chooseSlot(item)}><strong>{new Date(item.startDatetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong><span>{item.staffName}</span></button>)}</div> : <div className="public-state"><h3>No times available</h3><p>Try another date or stylist.</p></div>}</>}
        {step === 5 && <><h2>Confirm your appointment</h2><dl className="booking-summary"><div><dt>Service</dt><dd>{service?.name}</dd></div><div><dt>Stylist</dt><dd>{slot?.staffName || selectedStaff?.name}</dd></div><div><dt>Time</dt><dd>{when(slot?.startDatetime)}</dd></div><div><dt>Price</dt><dd>{money(service?.price)}</dd></div></dl>{!user && <p className="review-note">You’ll be asked to log in before confirming.</p>}<button className="button" disabled={create.isPending} onClick={confirm}>{create.isPending ? 'Confirming…' : 'Confirm booking'}</button>{create.isError && create.error?.response?.status !== 409 && <p className="form-status error" role="alert">{errorMessage(create.error)}</p>}</>}
        {step > 1 && step < 6 && <button className="button button-ghost booking-back" onClick={() => { setConflict(''); setStep((current) => current - 1) }}>Back</button>}
      </section>
    </main>
  )
}
