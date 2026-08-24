import axios from 'axios'

function apiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configured) return configured
  const protocol = import.meta.env.VITE_API_PROTOCOL || window.location.protocol.replace(':', '')
  const port = import.meta.env.VITE_API_PORT || '8080'
  return `${protocol}://${window.location.hostname}:${port}`
}

export function classifyApiError(error) {
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return 'timeout'
  if (!error?.response) return 'network'
  return Number(error.response.status) >= 500 ? 'server' : 'api'
}

export function isConnectivityError(error) {
  const category = error?.groomitErrorType || classifyApiError(error)
  return category === 'network' || category === 'timeout'
}

export function retryAfterSeconds(error) {
  const value = Number(error?.response?.headers?.['retry-after'])
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 0
}

export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const category = error?.groomitErrorType || classifyApiError(error)
  if (error?.response?.status === 429) {
    const seconds = retryAfterSeconds(error)
    return seconds
      ? `Too many login attempts. Try again in ${seconds} seconds.`
      : 'Too many login attempts. Please wait a few minutes and try again.'
  }
  if (category === 'timeout') return 'The server is taking too long to respond. Please try again.'
  if (category === 'network') {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'You appear to be offline. Check your internet connection and try again.'
    }
    return import.meta.env.DEV
      ? "Groomit can\u2019t reach the backend. Make sure the server is running on port 8080, then try again."
      : "Groomit can\u2019t reach the server right now. Check your connection and try again."
  }
  if (category === 'server') return error?.response?.data?.message || 'The server encountered a problem. Please try again shortly.'
  const data = error?.response?.data
  if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
    const entries = Object.entries(data.fieldErrors)
    if (entries.length > 0) {
      return entries.map(([field, msg]) => `${field}: ${msg}`).join('. ') + '.'
    }
  }
  return data?.message || fallback
}

const apiClient = axios.create({
  baseURL: apiBaseUrl(),
  withCredentials: true,
  timeout: 12000,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    error.groomitErrorType = classifyApiError(error)
    return Promise.reject(error)
  },
)

export default apiClient
