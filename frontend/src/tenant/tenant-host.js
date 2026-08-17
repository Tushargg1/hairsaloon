import { baseDomain } from '../platform/platform-config.js'

export function tenantSlugFromHostname(hostname = window.location.hostname) {
  const host = String(hostname).trim().toLowerCase().replace(/^www\./, '')
  if (host.endsWith('.localhost')) return host.slice(0, -'.localhost'.length).split('.')[0]
  if (host.endsWith(`.${baseDomain}`)) return host.slice(0, -(baseDomain.length + 1)).split('.')[0]
  return host.split('.')[0] || 'salon'
}

export function tenantNameFallback(hostname) {
  return tenantSlugFromHostname(hostname)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ') || 'Salon'
}