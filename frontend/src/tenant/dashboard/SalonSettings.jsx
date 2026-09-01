import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import MediaManager from './MediaManager.jsx'
import GoogleProfileConnect from './GoogleProfileConnect.jsx'
import {
  errorMessage, getDashboardMedia, getDashboardProfile, tenantKeys, updateDashboardProfile,
  uploadSalonImage,
} from '../tenant-api.js'

const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_LOGO_BYTES = 5 * 1024 * 1024

const imageUrl = (item) => (typeof item === 'string'
  ? item
  : item?.url || item?.mediaUrl || item?.imageUrl || item?.publicUrl || item?.photoUrl)

const SOCIAL_FIELDS = [
  { name: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/yoursalon' },
  { name: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/yoursalon' },
  { name: 'whatsappUrl', label: 'WhatsApp', placeholder: 'https://wa.me/919000000000' },
  { name: 'youtubeUrl', label: 'YouTube', placeholder: 'https://youtube.com/@yoursalon' },
  { name: 'mapsUrl', label: 'Google location', placeholder: 'https://maps.app.goo.gl/...' },
]

const emptyForm = {
  name: '', description: '', address: '', city: '', phone: '', email: '', logoUrl: '',
  timezone: 'Asia/Kolkata', cancellationWindowMinutes: 120, subdomain: '',
  instagramUrl: '', facebookUrl: '', whatsappUrl: '', youtubeUrl: '', mapsUrl: '',
}

function toForm(profile) {
  const form = { ...emptyForm }
  for (const key of Object.keys(emptyForm)) {
    if (profile[key] !== null && profile[key] !== undefined) form[key] = profile[key]
  }
  return form
}

export default function SalonSettings() {
  const client = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [saved, setSaved] = useState('')
  const [logoError, setLogoError] = useState('')
  const profile = useQuery({ queryKey: tenantKeys.dashboardProfile, queryFn: getDashboardProfile })
  // Uploaded images double as logo candidates, so the owner can pick one
  // instead of pasting a URL. Media may be unavailable, so failures are ignored.
  const media = useQuery({ queryKey: tenantKeys.dashboardMedia, queryFn: getDashboardMedia, retry: false })
  const gallery = (media.data || []).map(imageUrl).filter(Boolean)

  const logoUpload = useMutation({
    mutationFn: (file) => uploadSalonImage({ type: 'LOGO', file }),
    onSuccess: (asset) => {
      const url = imageUrl(asset)
      if (url) setForm((current) => ({ ...current, logoUrl: url }))
      setSaved(url ? 'Logo uploaded. Save details to apply it.' : '')
      client.invalidateQueries({ queryKey: tenantKeys.dashboardMedia })
    },
  })

  function chooseLogoFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!ACCEPTED_IMAGES.includes(file.type)) {
      setLogoError('Use a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('The logo must be 5 MB or smaller.')
      return
    }
    setLogoError('')
    setSaved('')
    logoUpload.mutate(file)
  }

  useEffect(() => {
    if (profile.data) setForm(toForm(profile.data))
  }, [profile.data])

  const save = useMutation({
    mutationFn: updateDashboardProfile,
    onSuccess: () => {
      setSaved('Salon details saved.')
      client.invalidateQueries({ queryKey: tenantKeys.dashboardProfile })
      client.invalidateQueries({ queryKey: tenantKeys.profile })
    },
    onError: () => setSaved(''),
  })

  function update(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setSaved('')
    save.reset()
  }

  function submit(event) {
    event.preventDefault()
    save.mutate({
      ...form,
      cancellationWindowMinutes: Number(form.cancellationWindowMinutes),
      subdomain: form.subdomain.trim().toLowerCase() || null,
      // The API rejects blank strings for optional URLs, so clear them to null.
      ...Object.fromEntries(SOCIAL_FIELDS.map(({ name }) => [name, form[name].trim() || null])),
      logoUrl: form.logoUrl.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      description: form.description.trim() || null,
    })
  }

  if (profile.isLoading) return <div className="manager-loading" aria-live="polite">Loading salon details…</div>
  if (profile.isError) {
    return <div className="state-card dashboard-state"><h2>Could not load details</h2>
      <p>{errorMessage(profile.error)}</p></div>
  }

  return <section className="manager-section" aria-labelledby="settings-heading">
    <header className="manager-heading">
      <p className="eyebrow">Salon profile</p>
      <h2 id="settings-heading">Salon details</h2>
      <p>Your About Us text, contact details and social links, as shown on the public page.</p>
    </header>

    <form className="manager-create-card" onSubmit={submit}>
      <h3>About us and contact</h3>
      <div className="manager-form-grid">
        <label htmlFor="settings-name">Salon name<input id="settings-name" name="name" required maxLength="160" value={form.name} onChange={update} /></label>
        <label htmlFor="settings-city">City<input id="settings-city" name="city" required maxLength="120" value={form.city} onChange={update} /></label>
        <label className="span-2" htmlFor="settings-subdomain">Site URL
          <input id="settings-subdomain" name="subdomain" maxLength="30" pattern="[a-z0-9-]+"
            placeholder="yoursalon" value={form.subdomain} onChange={update} />
          <span className="card-kicker">yoursalon.groomit.in — changing this changes your public link.</span>
        </label>
        <label className="span-2" htmlFor="settings-description">About us<textarea id="settings-description" name="description" rows="4" maxLength="5000" placeholder="Shown on the About page and in the footer" value={form.description} onChange={update} /></label>
        <label className="span-2" htmlFor="settings-address">Address<input id="settings-address" name="address" required maxLength="500" value={form.address} onChange={update} /></label>
        <div className="span-2 contact-row">
          <label htmlFor="settings-phone">Phone<input id="settings-phone" name="phone" type="tel" maxLength="32" placeholder="Optional" value={form.phone} onChange={update} /></label>
          <label htmlFor="settings-email">Email<input id="settings-email" name="email" type="email" maxLength="320" placeholder="Optional" value={form.email} onChange={update} /></label>
          <label htmlFor="settings-logo-file">Logo
            <span className="logo-field">
              {form.logoUrl && <img className="logo-preview" src={form.logoUrl} alt="Current salon logo" />}
              <input id="settings-logo-file" type="file" accept={ACCEPTED_IMAGES.join(',')}
                disabled={logoUpload.isPending} onChange={chooseLogoFile} />
            </span>
          </label>
        </div>

        {(logoUpload.isPending || logoError || logoUpload.isError) && (
          <div className="span-2">
            {logoUpload.isPending && <p className="muted" aria-live="polite">Uploading logo…</p>}
            {logoError && <p className="form-status error" role="alert">{logoError}</p>}
            {logoUpload.isError && (
              <p className="form-status error" role="alert">{errorMessage(logoUpload.error, 'Unable to upload the logo.')}</p>
            )}
          </div>
        )}

        {gallery.length > 0 && (
          <div className="span-2">
            <p className="card-kicker">Or choose a logo from your salon photos</p>
            <div className="logo-picker">
              {gallery.map((url) => (
                <button type="button" key={url} aria-label="Use this image as the logo"
                  aria-pressed={form.logoUrl === url}
                  className={`logo-choice ${form.logoUrl === url ? 'is-selected' : ''}`}
                  onClick={() => { setForm((current) => ({ ...current, logoUrl: url })); setSaved(''); save.reset() }}>
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          </div>
        )}
        <label htmlFor="settings-window">Cancellation window (minutes)<input id="settings-window" name="cancellationWindowMinutes" type="number" min="0" max="525600" step="1" required value={form.cancellationWindowMinutes} onChange={update} /></label>
      </div>

      <h3>Social and location links</h3>
      <div className="manager-form-grid">
        {SOCIAL_FIELDS.map((field) => (
          <label htmlFor={`settings-${field.name}`} key={field.name}>
            {field.label}
            <input id={`settings-${field.name}`} name={field.name} type="url" maxLength="2048"
              placeholder={field.placeholder} value={form[field.name]} onChange={update} />
          </label>
        ))}
      </div>

      {save.isError && <p className="form-status error" role="alert">{errorMessage(save.error)}</p>}
      {saved && <p className="form-status success" role="status">{saved}</p>}
      <button className="button" type="submit" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save details'}
      </button>
    </form>

    <GoogleProfileConnect />

    <MediaManager />
  </section>
}
