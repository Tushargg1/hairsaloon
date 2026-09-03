import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getDashboardProfile, tenantKeys } from '../tenant-api.js'

// Frontend scaffold for the WhatsApp bot integration. The Meta Embedded Signup
// flow, Cloud API webhook and per-conversation routing are handled server-side;
// until that backend is wired, the connection is simulated and the bot on/off
// preference is stored locally per salon so the owner-facing controls work.
const CONNECT_KEY = 'groomit-wa-connected'
const BOT_KEY = 'groomit-wa-bot-enabled'

export default function WhatsappConnect() {
  const profile = useQuery({ queryKey: tenantKeys.dashboardProfile, queryFn: getDashboardProfile })
  const salonId = profile.data?.id ?? 'x'
  const connectKey = `${CONNECT_KEY}:${salonId}`
  const botKey = `${BOT_KEY}:${salonId}`

  const [connected, setConnected] = useState(false)
  const [botOn, setBotOn] = useState(true)

  useEffect(() => {
    setConnected(localStorage.getItem(connectKey) === 'true')
    setBotOn(localStorage.getItem(botKey) !== 'false')
  }, [connectKey, botKey])

  const phone = profile.data?.phone || profile.data?.whatsappNumber || ''

  function connect() {
    // Placeholder for Meta Embedded Signup. Replace with the popup that returns
    // the connected WhatsApp Business number and stores the token server-side.
    localStorage.setItem(connectKey, 'true')
    setConnected(true)
  }

  function disconnect() {
    localStorage.removeItem(connectKey)
    setConnected(false)
  }

  function toggleBot() {
    const next = !botOn
    setBotOn(next)
    localStorage.setItem(botKey, String(next))
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="manager-create-card" aria-labelledby="wa-heading">
        <h3 id="wa-heading">Connect WhatsApp</h3>
        <p className="muted">
          Connect your salon&apos;s WhatsApp Business number so the Groomit AI can reply to
          customers and take bookings. You keep using WhatsApp on your phone; the bot works
          on the same number and you can turn it off any time to reply yourself.
        </p>

        {!connected ? (
          <button className="button" type="button" onClick={connect}>
            Connect WhatsApp
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="wa-status">
              <span className="wa-dot is-on" aria-hidden="true" />
              WhatsApp connected{phone ? ` — ${phone}` : ''}
            </p>
            <button className="button button-secondary self-start" type="button" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        )}
      </section>

      {connected && (
        <section className="manager-create-card" aria-labelledby="wa-bot-heading">
          <h3 id="wa-bot-heading">AI assistant</h3>
          <p className="muted">
            When the bot is online it replies to customer messages automatically. Turn it off
            to handle conversations yourself from your WhatsApp Business app.
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
