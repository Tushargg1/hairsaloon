import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { AuthProvider } from './shared/auth/AuthContext.jsx'
import ErrorBoundary from './shared/components/ErrorBoundary.jsx'
import './index.css'

const queryClient = new QueryClient()

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

if (canRegisterServiceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // The app remains fully usable when service workers are unavailable.
    })
  })
}
