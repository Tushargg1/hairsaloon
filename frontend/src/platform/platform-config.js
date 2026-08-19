const configuredDomain = (import.meta.env.VITE_BASE_DOMAIN || 'yoursite.com')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')

const configuredProtocol = (import.meta.env.VITE_BASE_PROTOCOL || 'https')
  .trim()
  .toLowerCase()
  .replace(/:$/, '')
const configuredPort = (import.meta.env.VITE_BASE_PORT || '').trim()

export const baseDomain = configuredDomain || 'yoursite.com'
export const baseProtocol = configuredProtocol === 'http' ? 'http' : 'https'
export const basePort = /^\d{1,5}$/.test(configuredPort) ? configuredPort : ''

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isPlatformHost(hostname = window.location.hostname) {
  const host = hostname.toLowerCase()
  return localHosts.has(host) || host === baseDomain || host === `www.${baseDomain}`
}

export function platformUrl(path = '/') {
  const safePath = String(path || '/').startsWith('/') ? String(path || '/') : `/${path}`
  const currentHost = window.location.hostname.toLowerCase()
  if (currentHost.endsWith('.localhost')) {
    const port = window.location.port ? `:${window.location.port}` : ''
    return `${window.location.protocol}//localhost${port}${safePath}`
  }
  const port = basePort ? `:${basePort}` : ''
  return `${baseProtocol}://${baseDomain}${port}${safePath}`
}

export function salonUrl(subdomain) {
  const safeSubdomain = String(subdomain || '').trim().toLowerCase()
  if (!safeSubdomain) return '#'

  const currentHost = window.location.hostname.toLowerCase()
  if (localHosts.has(currentHost)) {
    const port = window.location.port ? `:${window.location.port}` : ''
    return `${window.location.protocol}//${safeSubdomain}.localhost${port}`
  }

  const port = basePort ? `:${basePort}` : ''
  return `${baseProtocol}://${safeSubdomain}.${baseDomain}${port}`
}
