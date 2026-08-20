import { useCallback, useEffect, useState } from 'react'
import apiClient, { apiErrorMessage } from '../shared/api/client.js'
import useAuth from '../shared/auth/useAuth.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import InputField from '../shared/components/InputField.jsx'
import Icon from '../shared/components/Icon.jsx'
import StatusChip from '../shared/components/StatusChip.jsx'

function ProfileForm() {
  const { refreshSession } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [status, setStatus] = useState({ loading: true, saving: false, error: '', success: '' })

  useEffect(() => {
    apiClient.get('/api/platform/profile').then(({ data }) => {
      setForm({ name: data.name || '', phone: data.phone || '', email: data.email || '' })
      setStatus((s) => ({ ...s, loading: false }))
    }).catch(() => setStatus((s) => ({ ...s, loading: false, error: 'Failed to load profile' })))
  }, [])

  function update(e) { setForm((f) => ({ ...f, [e.target.name]: e.target.value })) }
  async function submit(e) {
    e.preventDefault()
    setStatus({ loading: false, saving: true, error: '', success: '' })
    try {
      const { data } = await apiClient.put('/api/platform/profile', form)
      setForm({ name: data.name || '', phone: data.phone || '', email: data.email || '' })
      await refreshSession()
      setStatus({ loading: false, saving: false, error: '', success: 'Profile updated!' })
    } catch (err) { setStatus({ loading: false, saving: false, error: apiErrorMessage(err), success: '' }) }
  }

  if (status.loading) return <p className="text-on-surface-variant">Loading profile...</p>
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <InputField label="Name" icon="person" name="name" value={form.name} onChange={update} placeholder="Your name" maxLength={160} />
      <InputField label="Phone number" icon="phone_iphone" type="tel" name="phone" value={form.phone} onChange={update} required minLength={10} maxLength={15} />
      <InputField label="Email (optional)" icon="mail" type="email" name="email" value={form.email} onChange={update} />
      {status.error && <p className="text-error bg-error-container/20 rounded px-3 py-2 text-body-md">{status.error}</p>}
      {status.success && <p className="text-[#A89048] bg-[rgba(168,144,72,0.1)] rounded px-3 py-2 text-body-md">{status.success}</p>}
      <BrassButton type="submit" disabled={status.saving} className="w-full">{status.saving ? 'Saving...' : 'Save changes'}</BrassButton>
    </form>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [status, setStatus] = useState({ saving: false, error: '', success: '' })
  function update(e) { setForm((f) => ({ ...f, [e.target.name]: e.target.value })) }
  async function submit(e) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) { setStatus({ saving: false, error: 'Passwords do not match', success: '' }); return }
    setStatus({ saving: true, error: '', success: '' })
    try {
      await apiClient.put('/api/platform/profile/password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setStatus({ saving: false, error: '', success: 'Password changed!' })
    } catch (err) { setStatus({ saving: false, error: apiErrorMessage(err), success: '' }) }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <InputField label="Current password" icon="lock" type="password" name="currentPassword" value={form.currentPassword} onChange={update} required />
      <InputField label="New password" icon="lock" type="password" name="newPassword" value={form.newPassword} onChange={update} required minLength={8} maxLength={72} />
      <InputField label="Confirm new password" icon="lock" type="password" name="confirmPassword" value={form.confirmPassword} onChange={update} required minLength={8} />
      {status.error && <p className="text-error bg-error-container/20 rounded px-3 py-2 text-body-md">{status.error}</p>}
      {status.success && <p className="text-[#A89048] bg-[rgba(168,144,72,0.1)] rounded px-3 py-2 text-body-md">{status.success}</p>}
      <BrassButton type="submit" disabled={status.saving} className="w-full">{status.saving ? 'Changing...' : 'Change password'}</BrassButton>
    </form>
  )
}

function BookingHistory() {
  const [bookings, setBookings] = useState([])
  const [status, setStatus] = useState({ loading: true, error: '' })
  const load = useCallback(async () => {
    setStatus({ loading: true, error: '' })
    try { const { data } = await apiClient.get('/api/platform/my-bookings'); setBookings(data); setStatus({ loading: false, error: '' }) }
    catch (e) { setStatus({ loading: false, error: apiErrorMessage(e, 'Could not load bookings.') }) }
  }, [])
  useEffect(() => { load() }, [load])

  if (status.loading) return <p className="text-on-surface-variant">Loading bookings...</p>
  if (status.error) return <div className="text-center py-8"><p className="text-error mb-4">{status.error}</p><BrassButton onClick={load} variant="outline">Try again</BrassButton></div>
  if (!bookings.length) return <p className="text-on-surface-variant">No bookings yet. Explore salons to make your first appointment!</p>

  return (
    <div className="flex flex-col gap-3">
      {bookings.map((b) => (
        <div key={b.id} className="flex justify-between items-center py-3 px-4 bg-surface-container/50 rounded-lg border border-outline-variant/20">
          <div>
            <h3 className="font-body text-title-lg text-on-surface text-base">{b.serviceName}</h3>
            <p className="font-body text-body-md text-on-surface-variant">{b.salonName} · {b.staffName}</p>
            <p className="font-body text-label-sm text-outline">{new Date(b.startDateTime).toLocaleDateString()} at {new Date(b.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <StatusChip status={b.status} />
        </div>
      ))}
    </div>
  )
}

function FavoritesList() {
  const [favorites, setFavorites] = useState([])
  const [status, setStatus] = useState({ loading: true, removingId: null, error: '' })
  const load = useCallback(async () => {
    setStatus({ loading: true, removingId: null, error: '' })
    try { const { data } = await apiClient.get('/api/platform/favorites'); setFavorites(data); setStatus({ loading: false, removingId: null, error: '' }) }
    catch (e) { setStatus({ loading: false, removingId: null, error: apiErrorMessage(e, 'Could not load favorites.') }) }
  }, [])
  useEffect(() => { load() }, [load])

  async function remove(salonId) {
    setStatus((c) => ({ ...c, removingId: salonId, error: '' }))
    try { await apiClient.delete(`/api/platform/favorites/${salonId}`); setFavorites((p) => p.filter((f) => f.salonId !== salonId)); setStatus({ loading: false, removingId: null, error: '' }) }
    catch (e) { setStatus({ loading: false, removingId: null, error: apiErrorMessage(e) }) }
  }

  if (status.loading) return <p className="text-on-surface-variant">Loading favorites...</p>
  if (status.error && !favorites.length) return <div className="text-center py-8"><p className="text-error mb-4">{status.error}</p><BrassButton onClick={load} variant="outline">Try again</BrassButton></div>
  if (!favorites.length) return <p className="text-on-surface-variant">No saved salons yet.</p>

  return (
    <div className="flex flex-col gap-3">
      {status.error && <p className="text-error text-body-md mb-2">{status.error}</p>}
      {favorites.map((f) => (
        <div key={f.salonId} className="flex justify-between items-center py-3 px-4 bg-surface-container/50 rounded-lg border border-outline-variant/20">
          <div>
            <h3 className="font-body text-title-lg text-on-surface text-base">{f.name}</h3>
            <p className="font-body text-label-sm text-outline">{f.city}</p>
          </div>
          <button onClick={() => remove(f.salonId)} disabled={status.removingId === f.salonId}
            className="font-body text-label-sm text-error hover:text-on-error-container transition-colors disabled:opacity-50">
            {status.removingId === f.salonId ? '...' : 'Remove'}
          </button>
        </div>
      ))}
    </div>
  )
}

const TABS = [
  { key: 'profile', label: 'Details', icon: 'person' },
  { key: 'password', label: 'Password', icon: 'lock' },
  { key: 'bookings', label: 'My Bookings', icon: 'calendar_month' },
  { key: 'favorites', label: 'Saved Salons', icon: 'favorite' },
]

export default function ProfilePage() {
  const [tab, setTab] = useState('profile')

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <div className="mb-8">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Your account</p>
        <h1 className="font-display text-headline-md text-on-surface">My Profile</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-label-md transition-all whitespace-nowrap ${tab === t.key ? 'brass-gradient shadow-amber-glow' : 'border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-high'}`}>
            <Icon name={t.icon} className="text-[18px]" />
            {t.label}
          </button>
        ))}
      </div>

      <GlassPanel className="max-w-xl">
        <h2 className="font-display text-headline-sm text-on-surface mb-6">
          {TABS.find((t) => t.key === tab)?.label}
        </h2>
        {tab === 'profile' && <ProfileForm />}
        {tab === 'password' && <PasswordForm />}
        {tab === 'bookings' && <BookingHistory />}
        {tab === 'favorites' && <FavoritesList />}
      </GlassPanel>
    </main>
  )
}
