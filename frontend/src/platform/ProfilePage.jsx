import { useEffect, useState } from 'react'
import apiClient, { apiErrorMessage } from '../shared/api/client.js'

export default function ProfilePage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [status, setStatus] = useState({ loading: true, saving: false, error: '', success: '' })

  useEffect(() => {
    apiClient.get('/api/platform/profile').then(({ data }) => {
      setForm({ name: data.name || '', phone: data.phone || '', email: data.email || '' })
      setStatus((s) => ({ ...s, loading: false }))
    }).catch(() => setStatus((s) => ({ ...s, loading: false, error: 'Failed to load profile' })))
  }, [])

  function update(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function submit(e) {
    e.preventDefault()
    setStatus({ loading: false, saving: true, error: '', success: '' })
    try {
      const { data } = await apiClient.put('/api/platform/profile', form)
      setForm({ name: data.name || '', phone: data.phone || '', email: data.email || '' })
      setStatus({ loading: false, saving: false, error: '', success: 'Profile updated!' })
    } catch (err) {
      setStatus({ loading: false, saving: false, error: apiErrorMessage(err), success: '' })
    }
  }

  if (status.loading) return <main className="state-page">Loading profile…</main>

  return (
    <main className="auth-page page-width">
      <section className="auth-intro">
        <p className="eyebrow">Your account</p>
        <h1>Edit profile</h1>
        <p>Keep your details up to date.</p>
      </section>
      <section className="form-card" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Profile details</h2>
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
      </section>
    </main>
  )
}
