import { useEffect, useState } from 'react'
import {
  subscribePushSubscription,
  unsubscribePushSubscription,
} from '../../tenant/tenant-api.js'

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim()

function supported() {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

function vapidKeyBytes(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = window.atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function encodedKey(subscription, name) {
  const value = subscription.getKey?.(name)
  if (!value) return undefined
  const bytes = new Uint8Array(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function subscriptionDetails(subscription) {
  const serialized = subscription.toJSON()
  return {
    endpoint: subscription.endpoint,
    keys: serialized.keys || {
      p256dh: encodedKey(subscription, 'p256dh'),
      auth: encodedKey(subscription, 'auth'),
    },
  }
}

export default function PushOptIn({ role }) {
  const [status, setStatus] = useState('checking')
  const [message, setMessage] = useState('Checking notification settings…')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    async function inspect() {
      if (!supported()) {
        if (active) { setStatus('unsupported'); setMessage('Push notifications are not supported in this browser or connection.') }
        return
      }
      if (Notification.permission === 'denied') {
        if (active) { setStatus('denied'); setMessage('Notifications are blocked. Allow them in your browser settings to opt in.') }
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (!active) return
        if (subscription) {
          setStatus('enabled')
          setMessage('Notifications are enabled for this account.')
        } else if (!vapidPublicKey) {
          setStatus('config-missing')
          setMessage('Notifications are not configured for this salon yet.')
        } else {
          setStatus('disabled')
          setMessage('Notifications are off. Enable them to receive booking updates.')
        }
      } catch {
        if (active) { setStatus('unsupported'); setMessage('Notification settings could not be loaded in this browser.') }
      }
    }
    inspect()
    return () => { active = false }
  }, [role])

  async function enable() {
    setPending(true)
    setMessage('Enabling notifications…')
    let createdSubscription
    try {
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'disabled')
        setMessage(permission === 'denied'
          ? 'Notifications are blocked. Allow them in your browser settings to opt in.'
          : 'Notification permission was not granted.')
        return
      }
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyBytes(vapidPublicKey),
        })
        createdSubscription = subscription
      }
      await subscribePushSubscription({ role, ...subscriptionDetails(subscription) })
      setStatus('enabled')
      setMessage('Notifications are enabled for this account.')
    } catch {
      if (createdSubscription) await createdSubscription.unsubscribe().catch(() => {})
      setStatus('error')
      setMessage('Notifications could not be enabled. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function disable() {
    setPending(true)
    setMessage('Disabling notifications…')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        let backendFailed = false
        try {
          await unsubscribePushSubscription({ role, endpoint: subscription.endpoint })
        } catch {
          backendFailed = true
        }
        await subscription.unsubscribe()
        setMessage(backendFailed
          ? 'Notifications are disabled in this browser. Server cleanup could not be confirmed.'
          : 'Notifications are disabled.')
      } else {
        setMessage('Notifications are already disabled.')
      }
      setStatus('disabled')
    } catch {
      setStatus('error')
      setMessage('Notifications could not be disabled. Please try again.')
    } finally {
      setPending(false)
    }
  }


  const canEnable = status === 'disabled' || status === 'error'
  const canDisable = status === 'enabled'

  return <aside className="public-state page-width" aria-live="polite" aria-busy={pending}>
    <div>
      <strong>Booking notifications</strong>
      <p>{message}</p>
    </div>
    {canEnable && <button className="button button-small" type="button" disabled={pending || !vapidPublicKey} onClick={enable}>{pending ? 'Enabling…' : 'Enable notifications'}</button>}
    {canDisable && <button className="button button-ghost button-small" type="button" disabled={pending} onClick={disable}>{pending ? 'Disabling…' : 'Turn off notifications'}</button>}
  </aside>
}