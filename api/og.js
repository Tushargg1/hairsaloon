// Vercel serverless function: injects per-salon Open Graph tags into index.html
// so WhatsApp/social link previews show the salon's own name and description.
//
// It is invoked for HTML page requests on tenant subdomains (see vercel.json
// rewrites). For the apex/platform host it returns the default index.html.
//
// Configure the backend origin in Vercel env as BACKEND_ORIGIN
// (e.g. https://groomit-backend.onrender.com). Falls back to the known default.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'https://groomit-backend.onrender.com'
const BASE_DOMAIN = process.env.OG_BASE_DOMAIN || 'groomit.in'
const PLATFORM_HOSTS = new Set(['groomit.in', 'www.groomit.in'])

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Turn "the-gentlemens-chair" into "The Gentlemens Chair" as a fallback title.
function nameFromSubdomain(subdomain) {
  return String(subdomain || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Groomit'
}

function subdomainOf(host) {
  const clean = String(host || '').toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '')
  if (PLATFORM_HOSTS.has(clean) || clean === BASE_DOMAIN) return null
  if (clean.endsWith(`.${BASE_DOMAIN}`)) {
    return clean.slice(0, -(BASE_DOMAIN.length + 1)).split('.')[0]
  }
  return null
}

async function fetchSalon(host) {
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/api/salon/profile`, {
      headers: { 'X-Tenant-Host': host, Accept: 'application/json' },
      // Keep the preview snappy; social crawlers time out fast.
      signal: AbortSignal.timeout(3500),
    })
    if (!res.ok) return null
    const data = await res.json()
    const salon = data?.profile || data?.salon || data
    return salon && (salon.name || salon.salonName) ? salon : null
  } catch {
    return null
  }
}

function readTemplate() {
  // The built index.html is emitted to frontend/dist by the Vite build.
  const candidates = [
    join(process.cwd(), 'frontend', 'dist', 'index.html'),
    join(process.cwd(), 'dist', 'index.html'),
    join(process.cwd(), 'index.html'),
  ]
  for (const path of candidates) {
    try {
      return readFileSync(path, 'utf8')
    } catch {
      // try next candidate
    }
  }
  return null
}

function injectTags(html, { title, description, url, image }) {
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : '',
  ].filter(Boolean).join('\n    ')

  let out = html
  // Replace the document <title> with the salon name.
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
  // Replace the default description meta.
  out = out.replace(/<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`)
  // Insert the OG/Twitter tags just before </head>.
  out = out.replace(/<\/head>/i, `    ${tags}\n  </head>`)
  return out
}

export default async function handler(req, res) {
  const html = readTemplate()
  if (!html) {
    res.status(500).send('index.html not found')
    return
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || ''
  const subdomain = subdomainOf(host)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  // Platform/apex host: serve the default document unchanged.
  if (!subdomain) {
    res.status(200).send(html)
    return
  }

  const salon = await fetchSalon(host)
  const name = salon?.name || salon?.salonName || nameFromSubdomain(subdomain)
  const description = salon?.description
    || `Book an appointment at ${name} on Groomit. Premium grooming, online booking, no calls.`
  const url = `https://${String(host).replace(/^www\./, '')}`
  const image = salon?.logoUrl || salon?.heroPhoto || salon?.coverPhoto || undefined

  const rendered = injectTags(html, { title: name, description, url, image })
  // Let CDNs cache the rendered document briefly so crawlers get it fast.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  res.status(200).send(rendered)
}
