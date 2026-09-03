import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import {
  connectWhatsapp, disconnectWhatsapp, errorMessage, getWhatsappStatus,
  setWhatsappBot, tenantKeys, tenantWhatsappKey,
} from '../tenant-api.js'

// Loads the Facebook JS SDK once (needed for Meta Embedded Signup).
function loadFacebookSdk(appId) {
  return new Promise((resolve, reject) => {
    if (window.FB) return resolve(window.FB)
    window.fbAsyncInit = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: 'v21.0' })
      resolve(window.FB)
    }
    const existing = document.getElementById('facebook-jssdk')
    if (existing) return
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.onerror = () => reject(new Error('Could not load the Facebook SDK.'))
    document.body.appendChild(script)
  })
}

export default function WhatsappConnect() {
  const client = useQueryClient()
  const status = useQuery({ queryKey: tenantWhatsappKey, queryFn: getWhatsappStatus })
  const [error, setError] = useState('')
  const wabaRef = useRef(null)

  const data = status.data || {}
  const { connected, displayNumber, botEnabled, available, appId, configId } = data

  const invalidate = () => {
    client.invalidateQueries({ queryKey: tenantWhatsappKey })
    client.invalidateQueries({ queryKey: tenantKeys.dashboardProfile })
    client.invalidateQueries({ queryKey: tenantKeys.profile })
  }

  const connect = useMutation({
    mutationFn: ({ code, wabaId }) => connectWhatsapp({ code, wabaId }),
    onSuccess: invalidate,
    onError: (e) => setError(errorMessage(e, 'Could not connect WhatsApp.')),
  })
  const disconnect = useMutation({ mutationFn: disconnectWhatsapp, onSuccess: invalidate })
  const bot = useMutation({ mutationFn: setWhatsappBot, onSuccess: invalidate })

  // Embedded Signup returns the WABA/phone ids via a postMessage; capture them so
  // they can be paired with the auth code from FB.login.
  useEffect(() => {
    function onMessage(event) {
      if (!/^https:\/\/www\.facebook\.com$/.test(event.origin)
        && !/^https:\/\/web\.facebook\.com$/.test(event.origin)) return
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (payload?.type === 'WA_EMBEDDED_SIGNUP' && payload?.data?.waba_id) {
          wabaRef.current = payload.data.waba_id
        }
      } catch { /* non-JSON messages are ignored */ }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function startSignup() {
    setError('')
    if (!available || !appId || !configId) {
      setError('WhatsApp is not configured yet. Please try again later.')
      return
    }
    try {
      const FB = await loadFacebookSdk(appId)
      FB.login((response) => {
        const code = response?.authResponse?.code
        if (!code) { setError('WhatsApp connection was cancelled.'); return }
        connect.mutate({ code, wabaId: wabaRef.current })
      }, {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding' },
      })
    } catch (e) {
      setError(e.message || 'Could not start WhatsApp connection.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="manager-create-card" aria-labelledby="wa-heading">
        <h3 id="wa-heading">Connect WhatsApp</h3>
        <p className="muted">
          Connect your salon&apos;s WhatsApp Business number through Meta so the Groomit AI can
          reply to customers automatically. You keep using WhatsApp on your phone; the bot works
          on the same number and you can turn it off any time to reply yourself.
        </p>

        {status.isLoading ? (
          <p className="muted">Loading…</p>
        ) : connected ? (
          <div className="flex flex-col gap-3">
            <p className="wa-status">
              <span className="wa-dot is-on" aria-hidden="true" />
              WhatsApp connected{displayNumber ? ` — ${displayNumber}` : ''}
            </p>
            <button className="button button-secondary self-start" type="button"
              onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
              {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <>
            <button className="button" type="button" onClick={startSignup}
              disabled={connect.isPending || !available}>
              {connect.isPending ? 'Connecting…' : 'Connect WhatsApp'}
            </button>
            {!available && (
              <p className="muted">WhatsApp connection isn&apos;t enabled on the server yet.</p>
            )}
          </>
        )}

        {(error || connect.isError) && (
          <p className="form-status error" role="alert">{error || errorMessage(connect.error, 'Could not connect WhatsApp.')}</p>
        )}
      </section>

      {connected && (
        <section className="manager-create-card" aria-labelledby="wa-bot-heading">
          <h3 id="wa-bot-heading">AI assistant</h3>
          <p className="muted">
            When the bot is online it replies to customer WhatsApp messages automatically. Turn it
            off to handle conversations yourself from your WhatsApp Business app.
          </p>
          <div className="wa-bot-row">
            <p className="wa-status">
              <span className={`wa-dot ${botEnabled ? 'is-on' : 'is-off'}`} aria-hidden="true" />
              Bot is {botEnabled ? 'ONLINE' : 'OFFLINE'}
            </p>
            <button className={`button ${botEnabled ? 'button-secondary' : ''}`} type="button"
              onClick={() => bot.mutate(!botEnabled)} disabled={bot.isPending}>
              {botEnabled ? 'Turn Bot OFF' : 'Turn Bot ON'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
