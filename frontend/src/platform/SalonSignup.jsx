import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import useAuth from '../shared/auth/useAuth.js'
import { checkSubdomain, createSalon, errorMessage, getMySalon, salonKeys } from './salon-api.js'
import { baseDomain, salonUrl } from './platform-config.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import InputField from '../shared/components/InputField.jsx'
import Icon from '../shared/components/Icon.jsx'

const initialForm = {
  subdomain: '', name: '', description: '', address: '', city: '', phone: '', email: '',
  logoUrl: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  latitude: '', longitude: '',
}
const STEPS = ['Identity', 'Details', 'Review']

export default function SalonSignup() {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)

  // Contact details come from the owner account created at signup.
  useEffect(() => {
    if (!user) return
    setForm((c) => ({ ...c, phone: c.phone || user.phone || '', email: c.email || user.email || '' }))
  }, [user])

  const [createdSalon, setCreatedSalon] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [geoStatus, setGeoStatus] = useState({ pending: false, error: '' })
  const [placeName, setPlaceName] = useState('')
  const [mapsLink, setMapsLink] = useState('')

  // Turns the captured point into a readable place name. OpenStreetMap needs no
  // API key; a failure just leaves the coordinates showing.
  useEffect(() => {
    if (!form.latitude || !form.longitude) return
    const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2'
      + `&lat=${form.latitude}&lon=${form.longitude}`
    fetch(url, { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.display_name) setPlaceName(data.display_name) })
      .catch(() => {})
  }, [form.latitude, form.longitude])
  const mineQuery = useQuery({ queryKey: salonKeys.mine, queryFn: getMySalon, retry: false })
  const validSubdomain = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(form.subdomain)
  const availability = useQuery({ queryKey: salonKeys.availability(form.subdomain), queryFn: () => checkSubdomain(form.subdomain), enabled: validSubdomain, staleTime: 30_000, retry: false })
  const createMutation = useMutation({
    mutationFn: createSalon,
    onSuccess: (salon) => setCreatedSalon(salon),
    onError: (error) => { const f = error?.response?.data?.fieldErrors; if (f && Object.keys(f).length) { setFieldErrors(f); setStep(2) } },
  })

  function update(e) {
    let value = e.target.value
    if (e.target.name === 'subdomain') value = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setForm((c) => ({ ...c, [e.target.name]: value }))
    setFieldErrors((c) => { if (c[e.target.name]) { const n = { ...c }; delete n[e.target.name]; return n } return c })
  }
  function next(e) { e.preventDefault(); if (step === 1 && (!availability.data?.available || !validSubdomain)) return; setStep((c) => Math.min(3, c + 1)) }

  function submit(e) {
    e.preventDefault()
    // Coordinates are optional; send null rather than empty strings so the API
    // treats them as absent instead of failing numeric parsing.
    createMutation.mutate({
      ...form,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
    })
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setGeoStatus({ pending: false, error: 'Your browser does not support location.' })
      return
    }
    setGeoStatus({ pending: true, error: '' })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((c) => ({
          ...c,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }))
        setGeoStatus({ pending: false, error: '' })
      },
      (error) => setGeoStatus({
        pending: false,
        error: error.code === error.PERMISSION_DENIED
          ? 'Permission denied. You can add your location later.'
          : 'Could not get your location. You can add it later.',
      }),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  function clearLocation() {
    setForm((c) => ({ ...c, latitude: '', longitude: '' }))
    setPlaceName('')
    setMapsLink('')
    setGeoStatus({ pending: false, error: '' })
  }

  // Accepts a Google Maps URL (…/@lat,lng…, ?q=lat,lng, !3dlat!4dlng) or a
  // plain "lat, lng" pair.
  function applyMapsLink(value) {
    setMapsLink(value)
    const match = value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      || value.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
      || value.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
      || value.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/)
    if (!match) return
    setForm((c) => ({ ...c, latitude: Number(match[1]).toFixed(6), longitude: Number(match[2]).toFixed(6) }))
    setGeoStatus({ pending: false, error: '' })
  }

  if (mineQuery.isLoading) {
    return <main className="state-page" aria-live="polite">Loading your salon…</main>
  }

  // An owner has at most one salon, so an existing application replaces the
  // registration wizard.
  const existing = createdSalon || mineQuery.data
  if (existing) {
    const approved = existing.status === 'ACTIVE'
    const address = salonUrl(existing.subdomain)
    return (
      <main className="max-w-[1280px] mx-auto px-4 py-20">
        <GlassPanel className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full brass-gradient flex items-center justify-center mx-auto mb-6">
            <Icon name={approved ? 'storefront' : 'schedule'} className="text-espresso text-3xl" />
          </div>
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">
            {approved ? 'Your salon is live' : 'Application received'}
          </p>
          <h1 className="font-display text-headline-md text-on-surface mb-4">{existing.name}</h1>
          <p className="font-body text-body-lg text-on-surface-variant mb-6">
            {approved
              ? 'Customers can book you online now.'
              : 'Our team will review your details. Your salon will be live after approval.'}
          </p>
          <div className="bg-surface-container rounded-lg p-4 border border-bronze-muted/50 mb-6 text-left">
            <div className="flex justify-between text-body-md mb-2"><span className="text-on-surface-variant">Address</span><span className="text-secondary font-medium">{address}</span></div>
            <div className="flex justify-between text-body-md mb-2"><span className="text-on-surface-variant">City</span><span className="text-on-surface">{existing.city}</span></div>
            <div className="flex justify-between text-body-md"><span className="text-on-surface-variant">Status</span><span className="text-[#A89048] font-medium">{existing.status}</span></div>
          </div>
          {approved
            ? <a href={`${address}/dashboard`} className="button">Open dashboard</a>
            : <BrassButton to="/">Return Home</BrassButton>}
        </GlassPanel>
      </main>
    )
  }

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">For salon owners</p>
        <h1 className="font-display text-headline-md text-on-surface">Register Your Salon</h1>
        <p className="font-body text-body-lg text-on-surface-variant mt-2">Tell us about your business. Applications are reviewed before publishing.</p>
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
        {/* Step 1: Identity */}
        {step === 1 && (
          <form onSubmit={next} className="flex flex-col gap-5">
            <h2 className="font-display text-headline-sm text-on-surface mb-2">Name your salon</h2>
            <p className="font-body text-body-md text-on-surface-variant mb-4">Choose your business name and unique web address.</p>
            <InputField label="Salon name" icon="storefront" name="name" value={form.name} onChange={update} required maxLength={160} placeholder="e.g. Glamour Studio" />
            <div>
              <label className="block font-body text-label-sm text-on-surface-variant mb-1">Salon web address</label>
              <div className="flex">
                <input name="subdomain" value={form.subdomain} onChange={update} required minLength={3} maxLength={30} placeholder="glamour-studio"
                  className="input-glass flex-grow rounded-l py-2.5 px-3 text-body-md rounded-r-none" />
                <span className="bg-surface-container-high border border-outline-variant/40 border-l-0 rounded-r px-3 py-2.5 font-body text-label-md text-on-surface-variant">.{baseDomain}</span>
              </div>
              <p className="font-body text-label-sm text-outline mt-1">3–30 lowercase letters, numbers, or hyphens.</p>
              <div className="mt-2 font-body text-label-sm" aria-live="polite">
                {!form.subdomain ? <span className="text-on-surface-variant">Enter an address to check.</span>
                  : !validSubdomain ? <span className="text-error">Use at least 3 valid characters.</span>
                  : availability.isFetching ? <span className="text-on-surface-variant">Checking...</span>
                  : availability.isError ? <span className="text-error">{errorMessage(availability.error)}</span>
                  : availability.data?.available ? <span className="text-[#A89048] flex items-center gap-1"><Icon name="check_circle" filled className="text-[14px]" /> Available</span>
                  : <span className="text-error">{availability.data?.reason || 'Not available.'}</span>}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <BrassButton type="submit" disabled={!availability.data?.available}>Continue</BrassButton>
            </div>
          </form>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <form onSubmit={next} className="flex flex-col gap-5">
            <h2 className="font-display text-headline-sm text-on-surface mb-2">Business details</h2>
            <p className="font-body text-body-md text-on-surface-variant mb-4">Information for your customers.</p>
            {Object.keys(fieldErrors).length > 0 && <p className="text-error bg-error-container/20 rounded px-3 py-2 text-body-md">Please fix highlighted fields.</p>}
            <div>
              <label className="font-body text-label-sm text-on-surface-variant block mb-1">Description</label>
              <textarea name="description" rows={3} maxLength={1000} value={form.description} onChange={update} placeholder="What makes your salon special?"
                className="input-glass w-full rounded py-2 px-3 text-body-md resize-none" />
            </div>
            <InputField label="Street address" icon="location_on" name="address" value={form.address} onChange={update} required maxLength={255} autoComplete="street-address" />
            <InputField label="City" icon="location_city" name="city" value={form.city} onChange={update} required maxLength={100} />
            <p className="font-body text-label-sm text-outline">
              Customers will see {form.phone || 'your account phone'} and {form.email || 'your account email'}.
              You can add a logo later in Salon details.
            </p>

            {/* Map location so customers can find the salon by distance */}
            <div>
              <label className="font-body text-label-sm text-on-surface-variant block mb-1">
                Map location <span className="text-outline">(optional but recommended)</span>
              </label>
              {form.latitude && form.longitude ? (
                <div className="flex items-center gap-2 bg-[rgba(168,144,72,0.12)] border border-secondary/40 rounded px-3 py-2.5">
                  <Icon name="place" filled className="text-secondary text-[18px]" />
                  <span className="font-body text-label-sm text-secondary flex-grow">
                    {placeName || `${form.latitude}, ${form.longitude}`}
                  </span>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`}
                    target="_blank" rel="noreferrer" aria-label="Open in Google Maps"
                    className="text-on-surface-variant hover:text-secondary transition-colors">
                    <Icon name="map" className="text-[18px]" />
                  </a>
                  <button type="button" onClick={clearLocation} aria-label="Clear location"
                    className="text-on-surface-variant hover:text-error transition-colors">
                    <Icon name="close" className="text-[18px]" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={captureLocation} disabled={geoStatus.pending}
                  className="w-full flex items-center justify-center gap-2 border border-secondary text-secondary py-2.5 rounded font-body text-label-md hover:bg-secondary/10 transition-colors disabled:opacity-50">
                  <Icon name="my_location" className="text-[18px]" />
                  {geoStatus.pending ? 'Getting location...' : 'Use my current location'}
                </button>
              )}
              <div className="mt-2">
                <label className="font-body text-label-sm text-on-surface-variant block mb-1">
                  Or paste a Google Maps link
                </label>
                <input value={mapsLink} onChange={(e) => applyMapsLink(e.target.value)}
                  placeholder="https://maps.google.com/...  or  28.6451, 77.1183"
                  className="input-glass w-full rounded py-2 px-3 text-body-md" />
              </div>
              <p className="font-body text-label-sm text-outline mt-1">
                Stand at your salon and tap this so nearby customers can find you.
              </p>
              {geoStatus.error && (
                <p className="font-body text-label-sm text-error mt-1">{geoStatus.error}</p>
              )}
            </div>

            <div className="flex justify-between mt-4">
              <button type="button" onClick={() => setStep(1)} className="font-body text-label-md text-on-surface-variant hover:text-secondary transition-colors flex items-center gap-1"><Icon name="arrow_back" className="text-[18px]" /> Back</button>
              <BrassButton type="submit">Review</BrassButton>
            </div>
          </form>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <h2 className="font-display text-headline-sm text-on-surface mb-2">Review & Submit</h2>
            <div className="bg-surface-container rounded-lg p-4 border border-bronze-muted/50 flex flex-col gap-2">
              {[
                ['Salon', form.name],
                ['Web address', `${form.subdomain}.${baseDomain}`],
                ['Address', `${form.address}, ${form.city}`],
                ['Contact', `${form.email} / ${form.phone}`],
                ['Map location', form.latitude && form.longitude
                  ? `${form.latitude}, ${form.longitude}`
                  : 'Not set — you can add it later'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-body-md"><span className="text-on-surface-variant">{k}</span><span className="text-on-surface font-medium text-right">{v}</span></div>
              ))}
            </div>
            <p className="font-body text-label-sm text-on-surface-variant">By submitting, you confirm these details are accurate and you are authorized to represent this salon.</p>
            {createMutation.isError && <p className="text-error bg-error-container/20 rounded px-3 py-2 text-body-md">{errorMessage(createMutation.error)}</p>}
            <div className="flex justify-between mt-4">
              <button type="button" onClick={() => setStep(2)} className="font-body text-label-md text-on-surface-variant hover:text-secondary transition-colors flex items-center gap-1"><Icon name="arrow_back" className="text-[18px]" /> Back</button>
              <BrassButton type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Submitting...' : 'Submit for Approval'}</BrassButton>
            </div>
          </form>
        )}
      </GlassPanel>
    </main>
  )
}
