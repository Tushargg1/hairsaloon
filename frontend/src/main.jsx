import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { AuthProvider } from './shared/auth/AuthContext.jsx'
import ErrorBoundary from './shared/components/ErrorBoundary.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reuse cached data across remounts/route revisits instead of refetching.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  </ErrorBoundary>,
)

const localHostnames = ['localhost', '127.0.0.1', '[::1]']
const canRegisterServiceWorker = 'serviceWorker' in navigator
  && (window.isSecureContext || localHostnames.includes(window.location.hostname))

if (canRegisterServiceWorker && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // The app remains fully usable when service workers are unavailable.
    })
  })
} else if ('serviceWorker' in navigator) {
  // In development the worker would serve Vite's /src modules cache-first, which
  // hides every code change until the cache is cleared by hand. Tear down any
  // worker left over from a production visit or an earlier build.
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
    .catch(() => {})
  if (window.caches) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {})
  }
}
