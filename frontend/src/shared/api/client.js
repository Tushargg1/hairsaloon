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
  const category = error?.hairsaloonErrorType || classifyApiError(error)
  return category === 'network' || category === 'timeout'
}

export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const category = error?.hairsaloonErrorType || classifyApiError(error)
  if (category === 'timeout') return 'The server is taking too long to respond. Please try again.'
  if (category === 'network') {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'You appear to be offline. Check your internet connection and try again.'
    }
    return import.meta.env.DEV
      ? 'HairSaloon can’t reach the backend. Make sure the server is running on port 8080, then try again.'
      : 'HairSaloon can’t reach the server right now. Check your connection and try again.'
  }
  if (category === 'server') return error?.response?.data?.message || 'The server encountered a problem. Please try again shortly.'
  return error?.response?.data?.message || fallback
}

const apiClient = axios.create({
  baseURL: apiBaseUrl(),
  withCredentials: true,
  timeout: 12000,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    error.hairsaloonErrorType = classifyApiError(error)
    return Promise.reject(error)
  },
)

export default apiClient
