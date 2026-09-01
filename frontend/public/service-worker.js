const CACHE_NAME = 'groomit-v5'
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-512.png',
]

self.addEventListener('install', (event) => {
  // Cached individually: addAll rejects the whole install if any single request
  // fails, which silently disabled the service worker and push notifications.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(
    APP_SHELL.map((url) => cache.add(url)),
  )))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  // Let the browser handle video/Range requests directly. Routing them through the
  // SW makes it re-fetch the whole file to satisfy 206 Range, doubling the download.
  if (request.destination === 'video' || /\.(mp4|webm|mov)$/i.test(url.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      // Only complete 200 responses are cacheable. Media served over Range
      // requests answers 206, which cache.put() rejects.
      if (response.status === 200) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
      }
      return response
    })),
  )
})

function safeClientUrl(value) {
  try {
    const url = new URL(value || '/', self.location.origin)
    return url.origin === self.location.origin ? url.href : `${self.location.origin}/`
  } catch {
    return `${self.location.origin}/`
  }
}

self.addEventListener('push', (event) => {
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      try {
        payload = { body: event.data.text() }
      } catch {
        payload = {}
      }
    }
  }
  if (!payload || typeof payload !== 'object') payload = {}
  const title = typeof payload.title === 'string' ? payload.title : 'Groomit update'
  const options = {
    body: typeof payload.body === 'string' ? payload.body : 'You have a new booking update.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: safeClientUrl(payload.url || payload.path || payload.data?.url) },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = safeClientUrl(event.notification.data?.url)
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
    const target = new URL(targetUrl)
    const matchingClient = clientList.find((client) => {
      const current = new URL(client.url)
      return current.origin === target.origin && current.pathname === target.pathname
    })
    if (matchingClient) return matchingClient.focus()
    const sameOriginClient = clientList.find((client) => new URL(client.url).origin === target.origin)
    if (sameOriginClient) {
      await sameOriginClient.navigate(targetUrl)
      return sameOriginClient.focus()
    }
    return self.clients.openWindow(targetUrl)
  }))
})
