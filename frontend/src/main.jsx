import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import { AuthProvider } from './shared/auth/AuthContext.jsx'
import ErrorBoundary from './shared/components/ErrorBoundary.jsx'
import './styles.css'

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
