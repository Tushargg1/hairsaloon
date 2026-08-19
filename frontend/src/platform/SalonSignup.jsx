import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { checkSubdomain, createSalon, errorMessage, salonKeys } from './salon-api.js'
import { baseDomain, salonUrl } from './platform-config.js'

const initialForm = {
  subdomain: '', name: '', description: '', address: '', city: '', phone: '',
  email: '', logoUrl: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
}

export default function SalonSignup() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [createdSalon, setCreatedSalon] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const validSubdomain = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(form.subdomain)
  const availability = useQuery({

    queryKey: salonKeys.availability(form.subdomain),
    queryFn: () => checkSubdomain(form.subdomain),
    enabled: validSubdomain,
    staleTime: 30_000,
    retry: false,
  })
  const createMutation = useMutation({
    mutationFn: createSalon,
    onSuccess: (salon) => setCreatedSalon(salon),
    onError: (error) => {
      const fields = error?.response?.data?.fieldErrors
      if (fields && typeof fields === 'object' && Object.keys(fields).length > 0) {
        setFieldErrors(fields)
        setStep(2)
      }
    },
  })

  function update(event) {
    let value = event.target.value
    if (event.target.name === 'subdomain') {
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    }
    setForm((current) => ({ ...current, [event.target.name]: value }))
    setFieldErrors((current) => {
      if (current[event.target.name]) {
        const next = { ...current }
        delete next[event.target.name]
        return next
      }
      return current
    })
  }

  function next(event) {
    event.preventDefault()
    if (step === 1 && (!availability.data?.available || !validSubdomain)) return
    setStep((current) => Math.min(3, current + 1))
  }

  function submit(event) {
    event.preventDefault()
    createMutation.mutate(form)
  }

  if (createdSalon) {
    return (
      <main className="wizard-page page-width">
        <section className="success-card" role="status">
          <span className="success-icon" aria-hidden="true">✓</span>
          <p className="eyebrow">Application received</p>
          <h1>{createdSalon.name || form.name} is awaiting review.</h1>
          <p>Our platform team will review your details. Your salon site will become available after approval.</p>
          <div className="submission-details"><span>Future address</span><strong>{salonUrl(createdSalon.subdomain || form.subdomain)}</strong><span>Status</span><strong>{createdSalon.status || 'PENDING'}</strong></div>
          <Link className="button" to="/">Return home</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="wizard-page page-width">
      <header className="page-heading compact">
        <p className="eyebrow">For salon owners</p>
        <h1>Put your salon<br /><em>on the map.</em></h1>
        <p>Tell us about your business. Applications are reviewed before publishing.</p>
      </header>
      <ol className="stepper" aria-label="Application progress">
        {['Identity', 'Details', 'Review'].map((label, index) => (
          <li className={step >= index + 1 ? 'active' : ''} key={label} aria-current={step === index + 1 ? 'step' : undefined}>
            <span>{index + 1}</span>{label}
          </li>
        ))}
      </ol>
      <section className="wizard-card">
        {step === 1 && (
          <form onSubmit={next}>
            <div className="form-heading"><span>01</span><div><h2>Name your salon</h2><p>Choose your business name and unique web address.</p></div></div>
            <label>Salon name<input name="name" required maxLength="160" placeholder="e.g. The Curl Room" value={form.name} onChange={update} /></label>
            <label>Salon web address
              <div className="domain-input"><input name="subdomain" required minLength="3" maxLength="30" pattern="[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?" aria-describedby="subdomain-help subdomain-status" placeholder="the-curl-room" value={form.subdomain} onChange={update} /><span>.{baseDomain}</span></div>
            </label>
            <small id="subdomain-help" className="field-help">3–30 lowercase letters, numbers, or hyphens; no leading or trailing hyphen.</small>
            <div id="subdomain-status" className={`availability ${availability.data?.available ? 'available' : ''}`} aria-live="polite">
              {!form.subdomain ? 'Enter an address to check availability.'
                : !validSubdomain ? 'Use at least 3 valid characters.'
                : availability.isFetching ? 'Checking availability…'
                : availability.isError ? errorMessage(availability.error, 'Could not check this address.')
                : availability.data?.available ? `✓ ${availability.data.name || form.subdomain} is available`
                : availability.data ? availability.data.reason || 'That address is not available.' : ''}
            </div>
            <div className="wizard-actions"><span /><button className="button" disabled={!availability.data?.available} type="submit">Continue <span aria-hidden="true">→</span></button></div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={next}>
            <div className="form-heading"><span>02</span><div><h2>Business details</h2><p>Give future clients the information they need.</p></div></div>
            {Object.keys(fieldErrors).length > 0 && <p className="form-status error" role="alert">Please fix the highlighted fields below.</p>}
            <div className="form-grid">
              <label className="span-2">Description<textarea name="description" rows="4" maxLength="1000" placeholder="What makes your salon special?" value={form.description} onChange={update} /></label>
              <label className={`span-2 ${fieldErrors.address ? 'field-invalid' : ''}`}>Street address<input name="address" required maxLength="255" autoComplete="street-address" value={form.address} onChange={update} />{fieldErrors.address && <small className="field-error">{fieldErrors.address}</small>}</label>
              <label className={fieldErrors.city ? 'field-invalid' : ''}>City<input name="city" required maxLength="100" autoComplete="address-level2" value={form.city} onChange={update} />{fieldErrors.city && <small className="field-error">{fieldErrors.city}</small>}</label>
              <label className={fieldErrors.phone ? 'field-invalid' : ''}>Phone<input name="phone" required type="tel" maxLength="40" autoComplete="tel" value={form.phone} onChange={update} />{fieldErrors.phone && <small className="field-error">{fieldErrors.phone}</small>}</label>
              <label className={fieldErrors.email ? 'field-invalid' : ''}>Email<input name="email" required type="email" maxLength="320" autoComplete="email" value={form.email} onChange={update} />{fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}</label>
              <label className={fieldErrors.timezone ? 'field-invalid' : ''}>Timezone<input name="timezone" required maxLength="80" placeholder="America/New_York" value={form.timezone} onChange={update} />{fieldErrors.timezone && <small className="field-error">{fieldErrors.timezone}</small>}</label>
              <label className={`span-2 ${fieldErrors.logoUrl ? 'field-invalid' : ''}`}>Logo URL <span className="optional">Optional</span><input name="logoUrl" type="url" maxLength="500" placeholder="https://…" value={form.logoUrl} onChange={update} />{fieldErrors.logoUrl && <small className="field-error">{fieldErrors.logoUrl}</small>}</label>
            </div>
            <div className="wizard-actions"><button className="button button-ghost" type="button" onClick={() => setStep(1)}>Back</button><button className="button" type="submit">Review application <span aria-hidden="true">→</span></button></div>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={submit}>
            <div className="form-heading"><span>03</span><div><h2>Review and submit</h2><p>Make sure everything looks right before sending.</p></div></div>
            <dl className="review-list">
              <div><dt>Salon</dt><dd>{form.name}</dd></div>
              <div><dt>Web address</dt><dd>{form.subdomain}.{baseDomain}</dd></div>
              <div><dt>Location</dt><dd>{form.address}, {form.city}</dd></div>
              <div><dt>Contact</dt><dd>{form.email}<br />{form.phone}</dd></div>
              <div><dt>Timezone</dt><dd>{form.timezone}</dd></div>
              <div><dt>Description</dt><dd>{form.description || 'Not provided'}</dd></div>
            </dl>
            <p className="review-note">By submitting, you confirm these details are accurate and that you are authorized to represent this salon.</p>
            {createMutation.isError && <p className="form-status error" role="alert">{errorMessage(createMutation.error, 'We could not submit your salon.')}</p>}
            <div className="wizard-actions"><button className="button button-ghost" type="button" onClick={() => setStep(2)}>Back</button><button className="button" disabled={createMutation.isPending} type="submit">{createMutation.isPending ? 'Submitting…' : 'Submit for approval'}</button></div>
          </form>
        )}
      </section>
    </main>
  )
}
