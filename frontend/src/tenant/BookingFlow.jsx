import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../shared/auth/useAuth.js'
import Icon from '../shared/components/Icon.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import {
  createBooking, errorMessage, getAvailability, getPublicServices, getPublicStaff,
  tenantKeys, validatePromotion,
} from './tenant-api.js'

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }
const money = (v) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(Number(v))
const when = (v) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v))
const firstValue = (src, keys) => keys.map((k) => src?.[k]).find((v) => v !== undefined && v !== null)

function promotionQuote(response) {
  const s = response?.quote || response?.pricing || response || {}
  return {
    original: firstValue(s, ['originalPrice', 'original', 'subtotal', 'servicePrice']),
    discount: firstValue(s, ['discountAmount', 'discount', 'savings']),
    final: firstValue(s, ['finalPrice', 'final', 'total', 'discountedPrice']),
    message: firstValue(s, ['message', 'description', 'promotionMessage']) || firstValue(response, ['message']),
  }
}

const STEPS = ['Service', 'Staff', 'Date', 'Time', 'Confirm']

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

  const service = services.data?.find((i) => String(i.id) === String(serviceId))
  const eligibleStaff = staff.data?.filter((m) => m.serviceIds?.some((id) => String(id) === String(serviceId))) || []
  const selectedStaff = staff.data?.find((m) => String(m.id) === String(slot?.staffId))

  const promotionMutation = useMutation({
    mutationFn: ({ code, selectedServiceId }) => validatePromotion({ promoCode: code, serviceId: Number(selectedServiceId) }),
    onSuccess: (response, variables) => {
      const valid = response?.valid ?? response?.isValid ?? response?.applied ?? true
      requestKey.current = ''
      setPromotion({ code: variables.code, serviceId: String(variables.selectedServiceId), valid: Boolean(valid), response })
    },
    onError: () => setPromotion(null),
  })

  const trimmedPromo = promoCode.trim()
  const promoValid = Boolean(promotion?.valid && promotion.code === trimmedPromo && promotion.serviceId === String(serviceId))
  const quote = promotion ? promotionQuote(promotion.response) : null

  const create = useMutation({
    mutationFn: () => createBooking({
      payload: { staffId: slot.staffId, serviceId: Number(serviceId), startDatetime: slot.startDatetime, ...(promoValid ? { promoCode: trimmedPromo } : {}) },
      idempotencyKey: requestKey.current || (requestKey.current = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`),
    }),
    onSuccess: (booking) => { queryClient.invalidateQueries({ queryKey: tenantKeys.myBookings }); setStep(6); setSlot(booking) },
    onError: (error) => { if (error?.response?.status === 409) { requestKey.current = ''; setConflict(errorMessage(error)); setSlot(null); setStep(4); availability.refetch() } },
  })

  function clearPromo() { setPromotion(null); promotionMutation.reset() }
  function chooseService(id) { setServiceId(String(id)); setStaffId('any'); setSlot(null); setPromoCode(''); clearPromo(); setStep(2) }
  function chooseStaff(id) { setStaffId(String(id)); setSlot(null); setStep(3) }
  function chooseSlot(v) { requestKey.current = ''; setConflict(''); setSlot(v); setStep(5) }
  function confirm() {
    if (!user) return navigate('/login', { state: { from: location } })
    if (user.role !== 'CUSTOMER') return setConflict('A customer account is required to book.')
    create.mutate()
  }

  // Success state
  if (step === 6) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 py-20">
        <GlassPanel className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full brass-gradient flex items-center justify-center mx-auto mb-6">
            <Icon name="check" className="text-espresso text-3xl" />
          </div>
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Booking confirmed</p>
          <h1 className="font-display text-headline-md text-on-surface mb-4">We'll see you soon.</h1>
          <p className="font-body text-body-lg text-on-surface-variant mb-8">
            {service?.name} with {slot?.staffName || selectedStaff?.name} on {when(slot?.startDatetime)}.
          </p>
          <div className="flex gap-4 justify-center">
            <BrassButton to="/bookings">View my bookings</BrassButton>
            <BrassButton to="/" variant="outline">Salon home</BrassButton>
          </div>
        </GlassPanel>
      </main>
    )
  }

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Book online</p>
        <h1 className="font-display text-headline-md text-on-surface">Reserve a Chair</h1>
      </div>

      {/* Stepper */}
      <div className="flex justify-center gap-3 mb-10">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-body font-semibold transition-colors ${step > i + 1 ? 'brass-gradient' : step === i + 1 ? 'border-2 border-brass text-brass' : 'border border-outline-variant/50 text-outline-variant'}`}>
              {step > i + 1 ? <Icon name="check" className="text-espresso text-[14px]" /> : i + 1}
            </div>
            <span className={`hidden sm:inline font-body text-label-sm ${step === i + 1 ? 'text-secondary' : 'text-on-surface-variant'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`w-6 h-0.5 rounded ${step > i + 1 ? 'bg-brass' : 'bg-outline-variant/30'}`} />}
          </div>
        ))}
      </div>

      <GlassPanel className="max-w-2xl mx-auto">
        {conflict && <p className="font-body text-body-md text-error bg-error-container/20 rounded px-3 py-2 mb-4" role="alert">{conflict}</p>}

        {/* Step 1: Service */}
        {step === 1 && (
          <>
            <h2 className="font-display text-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <Icon name="content_cut" className="text-secondary" /> Select a Service
            </h2>
            {services.isLoading ? <p className="text-on-surface-variant">Loading services...</p> : services.isError ? <p className="text-error">{errorMessage(services.error)}</p> : (
              <div className="flex flex-col gap-2">
                {services.data?.map((item) => (
                  <button key={item.id} type="button" onClick={() => chooseService(item.id)}
                    className="flex justify-between items-center py-4 px-4 border border-outline-variant/20 rounded-lg hover:bg-surface-container-high/30 hover:border-secondary/50 transition-all group">
                    <div className="flex flex-col items-start">
                      <span className="font-body text-title-lg text-on-surface group-hover:text-secondary transition-colors">{item.name}</span>
                      <span className="font-body text-label-sm text-outline flex items-center gap-1">
                        <Icon name="schedule" className="text-[14px]" /> {item.durationMinutes} min
                      </span>
                    </div>
                    <span className="font-display text-headline-sm text-secondary">{money(item.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 2: Staff */}
        {step === 2 && (
          <>
            <h2 className="font-display text-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <Icon name="group" className="text-secondary" /> Choose a Stylist
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button type="button" onClick={() => chooseStaff('any')}
                className="flex flex-col items-center gap-2 p-4 border border-outline-variant/30 rounded-lg hover:border-secondary/50 hover:bg-surface-container-high/30 transition-all group">
                <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50 group-hover:border-secondary">
                  <Icon name="groups" className="text-secondary text-2xl" />
                </div>
                <span className="font-body text-title-lg text-on-surface text-sm group-hover:text-secondary">Any available</span>
              </button>
              {eligibleStaff.map((member) => (
                <button key={member.id} type="button" onClick={() => chooseStaff(member.id)}
                  className="flex flex-col items-center gap-2 p-4 border border-outline-variant/30 rounded-lg hover:border-secondary/50 hover:bg-surface-container-high/30 transition-all group">
                  <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50 group-hover:border-secondary overflow-hidden">
                    {member.photoUrl ? <img src={member.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="font-display text-secondary text-lg">{member.name?.[0]}</span>}
                  </div>
                  <span className="font-body text-title-lg text-on-surface text-sm group-hover:text-secondary">{member.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3: Date */}
        {step === 3 && (
          <>
            <h2 className="font-display text-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <Icon name="calendar_month" className="text-secondary" /> Choose a Date
            </h2>
            <div className="mb-6">
              <label className="font-body text-label-md text-on-surface-variant block mb-2">Appointment date</label>
              <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)}
                className="input-glass w-full rounded py-3 px-4 text-body-md" />
            </div>
            <BrassButton type="button" disabled={!date} onClick={() => setStep(4)} className="w-full">
              See available times
            </BrassButton>
          </>
        )}

        {/* Step 4: Time slots */}
        {step === 4 && (
          <>
            <h2 className="font-display text-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <Icon name="schedule" className="text-secondary" /> Select Time
            </h2>
            {availability.isLoading ? <p className="text-on-surface-variant">Finding open times...</p> : availability.isError ? <p className="text-error">{errorMessage(availability.error)}</p> : availability.data?.length ? (
              <div className="grid grid-cols-3 gap-2">
                {availability.data.map((item) => (
                  <button key={`${item.staffId}-${item.startDatetime}`} type="button" onClick={() => chooseSlot(item)}
                    className="barber-slot py-3 text-center font-body text-label-md">
                    <strong>{new Date(item.startDatetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong>
                    <br /><span className="text-label-sm opacity-70">{item.staffName}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Icon name="event_busy" className="text-on-surface-variant text-4xl mb-2" />
                <p className="font-body text-body-md text-on-surface-variant">No times available. Try another date.</p>
              </div>
            )}
          </>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <>
            <h2 className="font-display text-headline-sm text-on-surface mb-6 flex items-center gap-2">
              <Icon name="event_available" className="text-secondary" /> Confirm Booking
            </h2>
            {/* Summary */}
            <div className="bg-surface-container p-4 rounded-lg border border-bronze-muted/50 mb-6">
              <div className="flex justify-between text-body-md mb-2"><span className="text-on-surface-variant">Service</span><span className="text-on-surface font-medium">{service?.name}</span></div>
              <div className="flex justify-between text-body-md mb-2"><span className="text-on-surface-variant">Stylist</span><span className="text-on-surface font-medium">{slot?.staffName || selectedStaff?.name}</span></div>
              <div className="flex justify-between text-body-md mb-2"><span className="text-on-surface-variant">Time</span><span className="text-on-surface font-medium">{when(slot?.startDatetime)}</span></div>
              <div className="flex justify-between text-body-md border-t border-outline-variant/30 pt-2 mt-2">
                <span className="font-body text-title-lg text-on-surface">Total</span>
                <span className="font-display text-headline-sm text-secondary">{promoValid && quote?.final != null ? money(quote.final) : money(service?.price)}</span>
              </div>
            </div>

            {/* Promo code */}
            <div className="mb-6">
              <label className="font-body text-label-md text-on-surface-variant block mb-2">Promotion code</label>
              <div className="flex gap-2">
                <input value={promoCode} onChange={(e) => { setPromoCode(e.target.value); clearPromo() }} autoComplete="off" placeholder="Enter code"
                  className="input-glass flex-grow rounded py-2 px-3 text-body-md" />
                <button type="button" onClick={() => { if (trimmedPromo && serviceId) promotionMutation.mutate({ code: trimmedPromo, selectedServiceId: serviceId }) }}
                  disabled={!trimmedPromo || promotionMutation.isPending}
                  className="border border-secondary text-secondary px-4 py-2 rounded font-body text-label-md hover:bg-secondary/10 transition-colors disabled:opacity-50">
                  {promotionMutation.isPending ? '...' : 'Apply'}
                </button>
              </div>
              {promotionMutation.isError && <p className="text-error text-label-sm mt-1">{errorMessage(promotionMutation.error)}</p>}
              {promoValid && <p className="text-[#A89048] text-label-sm mt-1">{quote?.message || 'Promotion applied!'}</p>}
            </div>

            {!user && <p className="font-body text-body-md text-on-surface-variant mb-4">You'll need to log in before confirming.</p>}

            <BrassButton type="button" disabled={create.isPending || promotionMutation.isPending} onClick={confirm} size="lg" className="w-full uppercase tracking-wider">
              {create.isPending ? 'Confirming...' : 'Confirm Booking'}
            </BrassButton>
            {create.isError && create.error?.response?.status !== 409 && <p className="text-error text-body-md mt-2">{errorMessage(create.error)}</p>}
          </>
        )}

        {/* Back button */}
        {step > 1 && step < 6 && (
          <button type="button" onClick={() => { setConflict(''); setStep((s) => s - 1) }}
            className="mt-6 font-body text-label-md text-on-surface-variant hover:text-secondary transition-colors flex items-center gap-1">
            <Icon name="arrow_back" className="text-[18px]" /> Back
          </button>
        )}
      </GlassPanel>
    </main>
  )
}
