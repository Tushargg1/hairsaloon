import { useCallback, useEffect, useState } from 'react'
import apiClient, { apiErrorMessage } from '../shared/api/client.js'
import useAuth from '../shared/auth/useAuth.js'

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
    } catch (err) {
      setStatus({ loading: false, saving: false, error: apiErrorMessage(err), success: '' })
    }
  }

  if (status.loading) return <p className="muted">Loading profile…</p>

  return (
    <form onSubmit={submit}>
      <label>Name<input name="name" type="text" maxLength="160" placeholder="Your name" value={form.name} onChange={update} /></label>
      <label>Phone number<input name="phone" type="tel" required minLength="10" maxLength="15" value={form.phone} onChange={update} /></label>
      <label>Email <span className="optional">(optional)</span><input name="email" type="email" value={form.email} onChange={update} /></label>
      {status.error && <p className="form-status error" role="alert">{status.error}</p>}
      {status.success && <p className="form-status success" role="status">{status.success}</p>}
      <button className="button button-full" disabled={status.saving} type="submit">
        {status.saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [status, setStatus] = useState({ saving: false, error: '', success: '' })

  function update(e) { setForm((f) => ({ ...f, [e.target.name]: e.target.value })) }

  async function submit(e) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      setStatus({ saving: false, error: 'New passwords do not match', success: '' })
      return
    }
    setStatus({ saving: true, error: '', success: '' })
    try {
      await apiClient.put('/api/platform/profile/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setStatus({ saving: false, error: '', success: 'Password changed!' })
    } catch (err) {
      setStatus({ saving: false, error: apiErrorMessage(err), success: '' })
    }
  }

  return (
    <form onSubmit={submit}>
      <label>Current password<input name="currentPassword" type="password" required value={form.currentPassword} onChange={update} /></label>
      <label>New password<input name="newPassword" type="password" required minLength="8" maxLength="72" value={form.newPassword} onChange={update} /></label>
      <label>Confirm new password<input name="confirmPassword" type="password" required minLength="8" value={form.confirmPassword} onChange={update} /></label>
      {status.error && <p className="form-status error" role="alert">{status.error}</p>}
      {status.success && <p className="form-status success" role="status">{status.success}</p>}
      <button className="button button-full" disabled={status.saving} type="submit">
        {status.saving ? 'Changing…' : 'Change password'}
      </button>
    </form>
  )
}

function BookingHistory() {
  const [bookings, setBookings] = useState([])
  const [status, setStatus] = useState({ loading: true, error: '' })

  const loadBookings = useCallback(async () => {
    setStatus({ loading: true, error: '' })
    try {
      const { data } = await apiClient.get('/api/platform/my-bookings')
      setBookings(data)
      setStatus({ loading: false, error: '' })
    } catch (error) {
      setStatus({
        loading: false,
        error: apiErrorMessage(error, 'Could not load your booking history.'),
      })
    }
  }, [])

  useEffect(() => { loadBookings() }, [loadBookings])

  if (status.loading) return <p className="muted">Loading bookings…</p>
  if (status.error) return (
    <div className="state-card" role="alert">
      <p>{status.error}</p>
      <button className="button button-secondary" type="button" onClick={loadBookings}>Try again</button>
    </div>
  )
  if (bookings.length === 0) return <p className="muted">No bookings yet. Explore salons to book your first appointment!</p>

  return (
    <div className="manager-list">
      {bookings.map((booking) => (
        <div key={booking.id} className="manager-item">
          <div>
            <h3>{booking.serviceName}</h3>
            <p>{booking.salonName} · {booking.staffName}</p>
            <p className="muted">{new Date(booking.startDateTime).toLocaleDateString()} at {new Date(booking.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <span className={`manager-status ${booking.status === 'CONFIRMED' ? '' : 'inactive'}`}>{booking.status}</span>
        </div>
      ))}
    </div>
  )
}

function FavoritesList() {
  const [favorites, setFavorites] = useState([])
  const [status, setStatus] = useState({ loading: true, removingId: null, error: '' })

  const loadFavorites = useCallback(async () => {
    setStatus({ loading: true, removingId: null, error: '' })
    try {
      const { data } = await apiClient.get('/api/platform/favorites')
      setFavorites(data)
      setStatus({ loading: false, removingId: null, error: '' })
    } catch (error) {
      setStatus({
        loading: false, removingId: null,
        error: apiErrorMessage(error, 'Could not load your saved salons.'),
      })
    }
  }, [])

  useEffect(() => { loadFavorites() }, [loadFavorites])

  async function removeFavorite(salonId) {
    setStatus((current) => ({ ...current, removingId: salonId, error: '' }))
    try {
      await apiClient.delete(`/api/platform/favorites/${salonId}`)
      setFavorites((previous) => previous.filter((favorite) => favorite.salonId !== salonId))
      setStatus({ loading: false, removingId: null, error: '' })
    } catch (error) {
      setStatus({
        loading: false, removingId: null,
        error: apiErrorMessage(error, 'Could not remove this saved salon.'),
      })
    }
  }

  if (status.loading) return <p className="muted">Loading favorites…</p>
  if (status.error && favorites.length === 0) return (
    <div className="state-card" role="alert">
      <p>{status.error}</p>
      <button className="button button-secondary" type="button" onClick={loadFavorites}>Try again</button>
    </div>
  )
  if (favorites.length === 0) return <p className="muted">No saved salons yet. Browse salons and save your favorites!</p>

  return (
    <div className="manager-list">
      {status.error && <p className="form-status error" role="alert">{status.error}</p>}
      {favorites.map((favorite) => (
        <div key={favorite.salonId} className="manager-item">
          <div>
            <h3>{favorite.name}</h3>
            <p className="muted">{favorite.city}</p>
          </div>
          <button className="button button-ghost button-small" type="button"
            disabled={status.removingId === favorite.salonId}
            onClick={() => removeFavorite(favorite.salonId)}>
            {status.removingId === favorite.salonId ? 'Removing…' : 'Remove'}
          </button>
        </div>
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const [tab, setTab] = useState('profile')

  return (
    <main className="admin-page page-width">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>My Profile</h1>
        </div>
      </div>
      <nav className="dashboard-nav" aria-label="Profile sections">
        <button type="button" className={`dashboard-nav-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Details</button>
        <button type="button" className={`dashboard-nav-btn ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>Password</button>
        <button type="button" className={`dashboard-nav-btn ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}>My Bookings</button>
        <button type="button" className={`dashboard-nav-btn ${tab === 'favorites' ? 'active' : ''}`} onClick={() => setTab('favorites')}>Saved Salons</button>
      </nav>
      <section className="form-card" style={{ marginTop: '1.5rem' }}>
        {tab === 'profile' && <><h2>Profile details</h2><ProfileForm /></>}
        {tab === 'password' && <><h2>Change password</h2><PasswordForm /></>}
        {tab === 'bookings' && <><h2>Booking history</h2><BookingHistory /></>}
        {tab === 'favorites' && <><h2>Saved salons</h2><FavoritesList /></>}
      </section>
    </main>
  )
}
