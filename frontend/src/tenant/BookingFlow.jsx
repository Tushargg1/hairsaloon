import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import {
  createBooking, errorMessage, getAvailability, getPublicServices, getPublicStaff,
  tenantKeys, validatePromotion,
} from './tenant-api.js'

const tomorrow = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}
const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value))
const when = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const firstValue = (source, keys) => keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null)

function promotionQuote(response) {
  const source = response?.quote || response?.pricing || response || {}
  return {
    original: firstValue(source, ['originalPrice', 'original', 'subtotal', 'servicePrice']),
    discount: firstValue(source, ['discountAmount', 'discount', 'savings']),
    final: firstValue(source, ['finalPrice', 'final', 'total', 'discountedPrice']),
    message: firstValue(source, ['message', 'description', 'promotionMessage']) || firstValue(response, ['message']),
  }
}

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
  const [promoCode, setPromoCode] = useState('')
  const [promotion, setPromotion] = useState(null)
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
  const promotionMutation = useMutation({
    mutationFn: ({ code, selectedServiceId }) => validatePromotion({
      promoCode: code,
      serviceId: Number(selectedServiceId),
    }),
    onSuccess: (response, variables) => {
      const valid = response?.valid ?? response?.isValid ?? response?.applied ?? true
      requestKey.current = ''
      setPromotion({ code: variables.code, serviceId: String(variables.selectedServiceId), valid: Boolean(valid), response })
    },
    onError: () => setPromotion(null),
  })
  const trimmedPromoCode = promoCode.trim()
  const promotionIsValid = Boolean(
    promotion?.valid
      && promotion.code === trimmedPromoCode
      && promotion.serviceId === String(serviceId),
  )
  const quote = promotion ? promotionQuote(promotion.response) : null
  const create = useMutation({
    mutationFn: () => createBooking({
      payload: {
        staffId: slot.staffId,
        serviceId: Number(serviceId),
        startDatetime: slot.startDatetime,
        ...(promotionIsValid ? { promoCode: trimmedPromoCode } : {}),
      },
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

  function clearPromotion() {
    setPromotion(null)
    promotionMutation.reset()
  }
  function chooseService(id) {
    setServiceId(String(id))
    setStaffId('any')
    setSlot(null)
    setPromoCode('')
    clearPromotion()
    setStep(2)
  }
  function chooseStaff(id) { setStaffId(String(id)); setSlot(null); setStep(3) }
  function chooseSlot(value) { requestKey.current = ''; setConflict(''); setSlot(value); setStep(5) }
  function changePromoCode(event) {
    requestKey.current = ''
    setPromoCode(event.target.value)
    clearPromotion()
  }
  function validatePromo() {
    if (!trimmedPromoCode || !serviceId) return
    promotionMutation.mutate({ code: trimmedPromoCode, selectedServiceId: serviceId })
  }
  function confirm() {
    if (!user) return navigate('/login', { state: { from: location } })
    if (user.role !== 'CUSTOMER') return setConflict('A customer account is required to book.')
    create.mutate()
  }

  if (step === 6) return <main className="page-width booking-page"><section className="success-card"><div className="success-icon" aria-hidden="true">✓</div><p className="eyebrow">Booking confirmed</p><h1>We’ll see you soon.</h1><p>{service?.name} with {slot.staffName || selectedStaff?.name} on {when(slot.startDatetime)}.</p><div className="button-row"><Link className="button" to="/bookings">View my bookings</Link><Link className="button button-secondary" to="/">Salon home</Link></div></section></main>

  return (
    <main className="page-width booking-page">
      <header className="page-heading compact"><p className="eyebrow">Book online</p><h1>Choose your appointment.</h1></header>
      <ol className="booking-stepper" aria-label="Booking progress">{['Service', 'Staff', 'Date', 'Time', 'Confirm'].map((label, index) => <li className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} aria-current={step === index + 1 ? 'step' : undefined} key={label}>{index + 1}. {label}</li>)}</ol>
      <section className="booking-panel">
        {conflict && <p className="form-status error" role="alert">{conflict} Available times have been refreshed.</p>}
        {step === 1 && <><h2>Select a service</h2>{services.isLoading ? <p>Loading services…</p> : services.isError ? <p role="alert">{errorMessage(services.error)}</p> : <div className="booking-choice-grid">{services.data?.map((item) => <button className="booking-choice" type="button" key={item.id} onClick={() => chooseService(item.id)}><strong>{item.name}</strong><span>{item.durationMinutes} min · {money(item.price)}</span></button>)}</div>}</>}
        {step === 2 && <><h2>Choose a stylist</h2><div className="booking-choice-grid"><button className="booking-choice" type="button" onClick={() => chooseStaff('any')}><strong>Any available stylist</strong><span>Show the widest choice of times</span></button>{eligibleStaff.map((member) => <button className="booking-choice" type="button" key={member.id} onClick={() => chooseStaff(member.id)}><strong>{member.name}</strong><span>Book with this stylist</span></button>)}</div></>}
        {step === 3 && <><h2>Choose a date</h2><label>Appointment date<input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></label><button className="button" type="button" disabled={!date} onClick={() => setStep(4)}>See available times</button></>}
        {step === 4 && <><h2>Available times</h2>{availability.isLoading ? <p>Finding open appointments…</p> : availability.isError ? <p role="alert">{errorMessage(availability.error)}</p> : availability.data?.length ? <div className="slot-grid">{availability.data.map((item) => <button type="button" key={`${item.staffId}-${item.startDatetime}`} onClick={() => chooseSlot(item)}><strong>{new Date(item.startDatetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong><span>{item.staffName}</span></button>)}</div> : <div className="public-state"><h3>No times available</h3><p>Try another date or stylist.</p></div>}</>}
        {step === 5 && <>
          <h2>Confirm your appointment</h2>
          <dl className="booking-summary"><div><dt>Service</dt><dd>{service?.name}</dd></div><div><dt>Stylist</dt><dd>{slot?.staffName || selectedStaff?.name}</dd></div><div><dt>Time</dt><dd>{when(slot?.startDatetime)}</dd></div><div><dt>Price</dt><dd>{money(service?.price)}</dd></div></dl>
          <div className="promotion-panel">
            <div><h3>Promotion code</h3><p>Enter a code and validate it before confirming.</p></div>
            <div className="promotion-controls"><label htmlFor="promo-code">Promo code<input id="promo-code" autoComplete="off" value={promoCode} onChange={changePromoCode} /></label><button className="button button-secondary" type="button" disabled={!trimmedPromoCode || promotionMutation.isPending} onClick={validatePromo}>{promotionMutation.isPending ? 'Validating…' : 'Validate'}</button></div>
            <div className="promotion-feedback" aria-live="polite" aria-busy={promotionMutation.isPending}>
              {promotionMutation.isPending && <p className="form-status">Checking promotion code…</p>}
              {promotionMutation.isError && <p className="form-status error" role="alert">{errorMessage(promotionMutation.error)}</p>}
              {promotion && !promotion.valid && <p className="form-status error" role="alert">{quote?.message || 'This promotion code is not valid for the selected service.'}</p>}
              {promotionIsValid && <div className="promotion-quote form-status success" role="status"><strong>{quote?.message || 'Promotion applied.'}</strong>{[quote?.original, quote?.discount, quote?.final].some((value) => value !== undefined) && <dl>{quote.original !== undefined && <div><dt>Original</dt><dd>{money(quote.original)}</dd></div>}{quote.discount !== undefined && <div><dt>Discount</dt><dd>−{money(Math.abs(Number(quote.discount)))}</dd></div>}{quote.final !== undefined && <div><dt>Total</dt><dd>{money(quote.final)}</dd></div>}</dl>}</div>}
            </div>
          </div>
          {!user && <p className="review-note">You’ll be asked to log in before confirming.</p>}
          <button className="button" type="button" disabled={create.isPending || promotionMutation.isPending} onClick={confirm}>{create.isPending ? 'Confirming…' : 'Confirm booking'}</button>
          {create.isError && create.error?.response?.status !== 409 && <p className="form-status error" role="alert">{errorMessage(create.error)}</p>}
        </>}
        {step > 1 && step < 6 && <button className="button button-ghost booking-back" type="button" onClick={() => { setConflict(''); setStep((current) => current - 1) }}>Back</button>}
      </section>
    </main>
  )
}
