import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { errorMessage, getDashboardProfile, tenantKeys, updateDashboardProfile } from '../tenant-api.js'

// The WhatsApp number is stored for real on the salon profile (whatsappUrl as a
// wa.me link). The AI reply bot itself needs the Meta Cloud API + webhook backend,
// which is not built yet; the on/off preference is kept locally until then.
const BOT_KEY = 'groomit-wa-bot-enabled'

// Keep only digits; a bare 10-digit Indian number gets the 91 country code.
function toDigits(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}
function numberFromUrl(url) {
  const match = String(url || '').match(/wa\.me\/(\d+)/)
  return match ? match[1] : ''
}

export default function WhatsappConnect() {
  const client = useQueryClient()
  const profile = useQuery({ queryKey: tenantKeys.dashboardProfile, queryFn: getDashboardProfile })
  const salonId = profile.data?.id ?? 'x'
  const botKey = `${BOT_KEY}:${salonId}`

  const savedNumber = numberFromUrl(profile.data?.whatsappUrl)
  const connected = Boolean(savedNumber)

  const [number, setNumber] = useState('')
  const [editing, setEditing] = useState(false)
  const [botOn, setBotOn] = useState(true)

  useEffect(() => { setBotOn(localStorage.getItem(botKey) !== 'false') }, [botKey])
  useEffect(() => { setNumber(savedNumber) }, [savedNumber])

  const save = useMutation({
    mutationFn: (waUrl) => updateDashboardProfile({ ...profile.data, whatsappUrl: waUrl }),
    onSuccess: () => {
      setEditing(false)
      client.invalidateQueries({ queryKey: tenantKeys.dashboardProfile })
      client.invalidateQueries({ queryKey: tenantKeys.profile })
    },
  })

  function connect(event) {
    event.preventDefault()
    const digits = toDigits(number)
    if (digits.length < 10) return
    save.mutate(`https://wa.me/${digits}`)
  }

  function disconnect() {
    save.mutate('')
    setNumber('')
  }

  function toggleBot() {
    const next = !botOn
    setBotOn(next)
    localStorage.setItem(botKey, String(next))
  }

  const showForm = !connected || editing

  return (
    <div className="flex flex-col gap-6">
      <section className="manager-create-card" aria-labelledby="wa-heading">
        <h3 id="wa-heading">Connect WhatsApp</h3>
        <p className="muted">
          Add the WhatsApp number customers should reach you on. It is saved to your salon and
          used for the &quot;Contact on WhatsApp&quot; buttons on your public page.
        </p>

        {connected && !editing && (
          <div className="flex flex-col gap-3">
            <p className="wa-status">
              <span className="wa-dot is-on" aria-hidden="true" />
              WhatsApp connected — +{savedNumber}
            </p>
            <div className="flex gap-3">
              <button className="button button-secondary" type="button" onClick={() => setEditing(true)}>
                Change number
              </button>
              <button className="button button-secondary" type="button"
                onClick={disconnect} disabled={save.isPending}>
                Disconnect
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <form onSubmit={connect} className="manager-form-grid">
            <label className="span-2" htmlFor="wa-number">WhatsApp number
              <input id="wa-number" name="whatsappNumber" type="tel" inputMode="tel"
                placeholder="e.g. 9876543210" maxLength="15"
                value={number} onChange={(e) => setNumber(e.target.value)} />
            </label>
            <div className="google-preview-actions span-2">
              <button className="button" type="submit" disabled={save.isPending || toDigits(number).length < 10}>
                {save.isPending ? 'Saving…' : connected ? 'Save number' : 'Connect'}
              </button>
              {connected && (
                <button className="button button-secondary" type="button" onClick={() => { setEditing(false); setNumber(savedNumber) }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {save.isError && <p className="form-status error" role="alert">{errorMessage(save.error, 'Could not save the number.')}</p>}
      </section>

      {connected && (
        <section className="manager-create-card" aria-labelledby="wa-bot-heading">
          <h3 id="wa-bot-heading">AI assistant</h3>
          <p className="muted">
            When live, the bot replies to customer WhatsApp messages automatically; turn it off
            to reply yourself. Automated replies require the WhatsApp Cloud API setup and are not
            active yet — this switch saves your preference for when it goes live.
          </p>

          <div className="wa-bot-row">
            <p className="wa-status">
              <span className={`wa-dot ${botOn ? 'is-on' : 'is-off'}`} aria-hidden="true" />
              Bot is {botOn ? 'ONLINE' : 'OFFLINE'}
            </p>
            <button className={`button ${botOn ? 'button-secondary' : ''}`} type="button" onClick={toggleBot}>
              {botOn ? 'Turn Bot OFF' : 'Turn Bot ON'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
