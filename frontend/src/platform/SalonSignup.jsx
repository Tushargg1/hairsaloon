import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { checkSubdomain, createSalon, errorMessage, salonKeys } from './salon-api.js'
import { baseDomain, salonUrl } from './platform-config.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import InputField from '../shared/components/InputField.jsx'
import Icon from '../shared/components/Icon.jsx'

const initialForm = { subdomain: '', name: '', description: '', address: '', city: '', phone: '', email: '', logoUrl: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }
const STEPS = ['Identity', 'Details', 'Review']

export default function SalonSignup() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [createdSalon, setCreatedSalon] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
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
  function submit(e) { e.preventDefault(); createMutation.mutate(form) }

  if (createdSalon) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 py-20">
        <GlassPanel className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full brass-gradient flex items-center justify-center mx-auto mb-6">
            <Icon name="check" className="text-espresso text-3xl" />
          </div>
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Application received</p>
          <h1 className="font-display text-headline-md text-on-surface mb-4">{createdSalon.name || form.name}</h1>
          <p className="font-body text-body-lg text-on-surface-variant mb-6">Our team will review your details. Your salon will be live after approval.</p>
          <div className="bg-surface-container rounded-lg p-4 border border-bronze-muted/50 mb-6">
            <div className="flex justify-between text-body-md mb-2"><span className="text-on-surface-variant">Address</span><span className="text-secondary font-medium">{salonUrl(createdSalon.subdomain || form.subdomain)}</span></div>
            <div className="flex justify-between text-body-md"><span className="text-on-surface-variant">Status</span><span className="text-[#A89048] font-medium">{createdSalon.status || 'PENDING'}</span></div>
          </div>
          <BrassButton to="/">Return Home</BrassButton>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="City" icon="location_city" name="city" value={form.city} onChange={update} required maxLength={100} />
              <InputField label="Phone" icon="phone" type="tel" name="phone" value={form.phone} onChange={update} required maxLength={40} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Email" icon="mail" type="email" name="email" value={form.email} onChange={update} required maxLength={320} />
              <InputField label="Timezone" icon="schedule" name="timezone" value={form.timezone} onChange={update} required maxLength={80} />
            </div>
            <InputField label="Logo URL (optional)" icon="image" type="url" name="logoUrl" value={form.logoUrl} onChange={update} maxLength={500} placeholder="https://..." />
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
              {[['Salon', form.name], ['Address', `${form.subdomain}.${baseDomain}`], ['Location', `${form.address}, ${form.city}`], ['Contact', `${form.email} / ${form.phone}`], ['Timezone', form.timezone]].map(([k, v]) => (
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
