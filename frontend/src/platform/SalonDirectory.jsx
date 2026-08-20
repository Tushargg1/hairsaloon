import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { errorMessage, getSalons, salonKeys } from './salon-api.js'
import { salonUrl } from './platform-config.js'
import useAuth from '../shared/auth/useAuth.js'
import apiClient, { apiErrorMessage } from '../shared/api/client.js'
import Icon from '../shared/components/Icon.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import StarRating from '../shared/components/StarRating.jsx'

const defaults = {
  city: '', service: '', rating: '', search: '', page: '0',
  latitude: '', longitude: '', radiusKm: '',
}

const RADIUS_OPTIONS = [2, 5, 10, 25, 50]

function salonInitials(name = 'Salon') {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function normalizePage(data, requestedPage) {
  if (Array.isArray(data)) {
    return { content: data, page: 0, size: data.length, totalElements: data.length, totalPages: data.length ? 1 : 0 }
  }
  return {
    content: data?.content || [],
    page: Number(data?.page ?? requestedPage),
    size: Number(data?.size ?? 12),
    totalElements: Number(data?.totalElements ?? data?.content?.length ?? 0),
    totalPages: Number(data?.totalPages ?? (data?.content?.length ? 1 : 0)),
  }
}

export default function SalonDirectory() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [favorites, setFavorites] = useState(new Set())
  const [favoriteStatus, setFavoriteStatus] = useState({ pendingId: null, error: '' })
  const [geoStatus, setGeoStatus] = useState({ pending: false, error: '' })
  const urlFilters = Object.fromEntries(
    Object.keys(defaults).map((key) => [key, searchParams.get(key) || defaults[key]]),
  )
  const [form, setForm] = useState(urlFilters)
  const serializedParams = searchParams.toString()

  useEffect(() => {
    if (user?.role === 'CUSTOMER') {
      apiClient.get('/api/platform/favorites').then(({ data }) => {
        setFavorites(new Set(data.map((f) => f.salonId)))
      }).catch(() => {})
    } else { setFavorites(new Set()) }
  }, [user])

  async function toggleFavorite(salonId) {
    setFavoriteStatus({ pendingId: salonId, error: '' })
    try {
      if (favorites.has(salonId)) {
        await apiClient.delete(`/api/platform/favorites/${salonId}`)
        setFavorites((prev) => { const n = new Set(prev); n.delete(salonId); return n })
      } else {
        await apiClient.post(`/api/platform/favorites/${salonId}`)
        setFavorites((prev) => new Set(prev).add(salonId))
      }
      setFavoriteStatus({ pendingId: null, error: '' })
    } catch (error) {
      setFavoriteStatus({ pendingId: null, error: apiErrorMessage(error, 'Could not update favorite.') })
    }
  }

  useEffect(() => {
    const p = new URLSearchParams(serializedParams)
    setForm(Object.fromEntries(Object.keys(defaults).map((k) => [k, p.get(k) || defaults[k]])))
  }, [serializedParams])

  const queryFilters = { ...urlFilters, page: Math.max(0, Number(urlFilters.page) || 0), size: 12 }
  const salonsQuery = useQuery({
    queryKey: salonKeys.list(queryFilters),
    queryFn: () => getSalons(queryFilters),
    placeholderData: keepPreviousData,
  })
  const page = normalizePage(salonsQuery.data, queryFilters.page)
  const nearbyActive = Boolean(urlFilters.latitude && urlFilters.longitude)

  function update(e) { setForm((c) => ({ ...c, [e.target.name]: e.target.value })) }

  function commit(values) {
    const next = new URLSearchParams()
    Object.entries({ ...values, page: '0' }).forEach(([k, v]) => { if (v) next.set(k, v) })
    setSearchParams(next)
  }

  // Refs keep the latest form and commit available to the mount-time effect below
  // without making requestLocation depend on every render.
  const formRef = useRef(form)
  const commitRef = useRef(commit)
  formRef.current = form
  commitRef.current = commit

  function applyFilters(e) {
    e.preventDefault()
    commit(form)
  }

  /**
   * Asks the browser for coordinates and immediately runs a proximity search.
   * Reads the form through a ref so it stays correct when called from an effect.
   * Coordinates live only in the URL for this search; we never persist them.
   */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus({ pending: false, error: 'Your browser does not support location search.' })
      return
    }
    setGeoStatus({ pending: true, error: '' })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          ...formRef.current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          radiusKm: formRef.current.radiusKm || '10',
          city: '',
        }
        setForm(next)
        setGeoStatus({ pending: false, error: '' })
        commitRef.current(next)
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission denied. Search by city instead.'
          : 'Could not determine your location. Search by city instead.'
        setGeoStatus({ pending: false, error: message })
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  // Arriving with ?nearby=1 (from the home page CTA) prompts for location once.
  useEffect(() => {
    if (!searchParams.get('nearby')) return
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('nearby')
      return next
    }, { replace: true })
    requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clearLocation() {
    const next = { ...form, latitude: '', longitude: '', radiusKm: '' }
    setForm(next)
    setGeoStatus({ pending: false, error: '' })
    commit(next)
  }
  function changePage(p) {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function clearFilters() { setSearchParams({}) }

  return (
    <main className="flex flex-col md:flex-row max-w-[1280px] mx-auto w-full px-4 md:px-6 py-12 gap-8">
      {/* Sidebar Filter */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <form onSubmit={applyFilters} className="glass-surface metallic-border rounded-lg p-6 sticky top-24">
          <h2 className="font-display text-headline-sm text-secondary mb-6 border-b border-outline-variant/50 pb-3">Refine Search</h2>

          {/* Nearby search */}
          <div className="mb-6">
            <label className="font-body text-label-md text-on-surface mb-1 block">Near me</label>
            {nearbyActive ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-[rgba(168,144,72,0.12)] border border-secondary/40 rounded px-3 py-2">
                  <Icon name="my_location" filled className="text-secondary text-[18px]" />
                  <span className="font-body text-label-sm text-secondary flex-grow">
                    Within {form.radiusKm || 10} km
                  </span>
                  <button type="button" onClick={clearLocation} aria-label="Clear location filter"
                    className="text-on-surface-variant hover:text-error transition-colors">
                    <Icon name="close" className="text-[18px]" />
                  </button>
                </div>
                <select name="radiusKm" value={form.radiusKm || '10'}
                  onChange={(e) => { const next = { ...form, radiusKm: e.target.value }; setForm(next); commit(next) }}
                  className="w-full bg-espresso metallic-border rounded text-on-surface px-3 py-2 focus:outline-none focus:border-brass-light text-body-md">
                  {RADIUS_OPTIONS.map((r) => <option key={r} value={r}>Within {r} km</option>)}
                </select>
              </div>
            ) : (
              <button type="button" onClick={requestLocation} disabled={geoStatus.pending}
                className="w-full flex items-center justify-center gap-2 border border-secondary text-secondary py-2 rounded font-body text-label-md hover:bg-secondary/10 transition-colors disabled:opacity-50">
                <Icon name="my_location" className="text-[18px]" />
                {geoStatus.pending ? 'Locating...' : 'Use my location'}
              </button>
            )}
            {geoStatus.error && (
              <p className="font-body text-label-sm text-error mt-1">{geoStatus.error}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="font-body text-label-md text-on-surface mb-1 block">Search</label>
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
              <input name="search" type="text" value={form.search} onChange={update} placeholder="Salon name or keyword..."
                className="w-full bg-espresso metallic-border rounded text-on-surface pl-10 pr-3 py-2 focus:outline-none focus:border-brass-light focus:ring-1 focus:ring-brass-light transition-colors placeholder-outline-variant text-body-md" />
            </div>
          </div>

          <div className="mb-6">
            <label className="font-body text-label-md text-on-surface mb-1 block">City</label>
            <input name="city" value={form.city} onChange={update} placeholder="e.g. Mumbai"
              disabled={nearbyActive}
              className="w-full bg-espresso metallic-border rounded text-on-surface px-3 py-2 focus:outline-none focus:border-brass-light focus:ring-1 focus:ring-brass-light transition-colors placeholder-outline-variant text-body-md disabled:opacity-40 disabled:cursor-not-allowed" />
            {nearbyActive && (
              <p className="font-body text-label-sm text-outline mt-1">
                Disabled while searching by distance.
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="font-body text-label-md text-on-surface mb-1 block">Service</label>
            <input name="service" value={form.service} onChange={update} placeholder="e.g. Haircut"
              className="w-full bg-espresso metallic-border rounded text-on-surface px-3 py-2 focus:outline-none focus:border-brass-light focus:ring-1 focus:ring-brass-light transition-colors placeholder-outline-variant text-body-md" />
          </div>

          <div className="mb-6">
            <label className="font-body text-label-md text-on-surface mb-1 block">Minimum Rating</label>
            <select name="rating" value={form.rating} onChange={update}
              className="w-full bg-espresso metallic-border rounded text-on-surface px-3 py-2 focus:outline-none focus:border-brass-light focus:ring-1 focus:ring-brass-light text-body-md">
              <option value="">Any rating</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </div>

          <BrassButton type="submit" size="md" className="w-full mb-3">Search</BrassButton>
          <button type="button" onClick={clearFilters} className="w-full border border-outline-variant text-on-surface-variant py-2 rounded hover:bg-surface-container-high transition-colors font-body text-label-md">
            Clear Filters
          </button>
        </form>
      </aside>

      {/* Main Content */}
      <section className="flex-grow">
        <div className="mb-6 flex justify-between items-end border-b border-outline-variant/30 pb-3">
          <div>
            <h1 className="font-display text-headline-md text-on-surface">
              {nearbyActive ? 'Salons Near You' : 'Discover Premium Salons'}
            </h1>
            <p className="font-body text-body-lg text-on-surface-variant mt-1">
              {salonsQuery.isLoading
                ? 'Searching...'
                : `${page.totalElements} salon${page.totalElements === 1 ? '' : 's'} found`
                  + (nearbyActive ? ` within ${urlFilters.radiusKm || 10} km` : '')}
            </p>
          </div>
        </div>

        {favoriteStatus.error && (
          <p className="font-body text-body-md text-error bg-error-container/20 rounded px-3 py-2 mb-4" role="alert">{favoriteStatus.error}</p>
        )}

        {salonsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-surface metallic-border rounded-lg h-72 animate-pulse" />
            ))}
          </div>
        ) : salonsQuery.isError ? (
          <div className="glass-panel rounded-lg p-8 text-center">
            <Icon name="error" className="text-error text-4xl mb-4" />
            <h2 className="font-display text-headline-sm text-on-surface mb-2">Couldn't load salons</h2>
            <p className="font-body text-body-md text-on-surface-variant mb-4">{errorMessage(salonsQuery.error)}</p>
            <BrassButton onClick={() => salonsQuery.refetch()} variant="outline">Try again</BrassButton>
          </div>
        ) : page.content.length === 0 ? (
          <div className="glass-panel rounded-lg p-8 text-center">
            <Icon name="search_off" className="text-on-surface-variant text-4xl mb-4" />
            <h2 className="font-display text-headline-sm text-on-surface mb-2">No salons match</h2>
            <p className="font-body text-body-md text-on-surface-variant mb-4">Try a broader city, service, or keyword.</p>
            <BrassButton onClick={clearFilters} variant="outline">Clear all filters</BrassButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {page.content.map((salon) => (
              <article key={salon.id || salon.subdomain} className="glass-surface metallic-border rounded-lg overflow-hidden group cursor-pointer transition-transform duration-300 hover:-translate-y-1">
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-surface-container-high">
                  {salon.logoUrl ? (
                    <img src={salon.logoUrl} alt={`${salon.name}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display text-4xl text-secondary/50">{salonInitials(salon.name)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-80" />
                  {salon.city && (
                    <div className="absolute bottom-3 left-3 flex gap-1">
                      <span className="bg-background/80 text-secondary border border-secondary/50 px-2 py-0.5 rounded text-label-sm font-body backdrop-blur-md">
                        {salon.city}
                      </span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-display text-headline-sm text-on-surface group-hover:text-secondary-fixed transition-colors" style={{ fontSize: '20px', lineHeight: '28px' }}>
                      {salon.name}
                    </h3>
                    {salon.rating != null && <StarRating rating={Number(salon.rating)} size={16} />}
                  </div>
                  <p className="font-body text-body-md text-on-surface-variant line-clamp-2">
                    {salon.description || 'A premium grooming establishment ready to serve you.'}
                  </p>
                  <div className="mt-3 flex justify-between items-center border-t border-outline-variant/30 pt-3">
                    <div className="flex items-center gap-3">
                      {salon.distanceKm != null && (
                        <span className="font-body text-label-sm text-secondary flex items-center gap-1">
                          <Icon name="near_me" filled className="text-[14px]" />
                          {Number(salon.distanceKm).toFixed(1)} km
                        </span>
                      )}
                      {salon.reviewCount != null && (
                        <span className="font-body text-label-sm text-on-surface-variant">{salon.reviewCount} reviews</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.role === 'CUSTOMER' && (
                        <button type="button" onClick={(e) => { e.preventDefault(); toggleFavorite(salon.id) }}
                          disabled={favoriteStatus.pendingId === salon.id}
                          className="text-secondary hover:text-primary transition-colors disabled:opacity-50">
                          <Icon name={favorites.has(salon.id) ? 'favorite' : 'favorite_border'} filled={favorites.has(salon.id)} />
                        </button>
                      )}
                      <a href={salonUrl(salon.subdomain)} className="brass-gradient text-espresso font-body text-label-sm px-3 py-1.5 rounded amber-glow-hover transition-shadow duration-300">
                        Book Now
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {page.totalPages > 1 && (
          <nav className="mt-8 flex justify-center items-center gap-4" aria-label="Salon results pages">
            <button disabled={page.page <= 0} onClick={() => changePage(page.page - 1)}
              className="border border-outline-variant text-on-surface-variant px-4 py-2 rounded hover:bg-surface-container-high transition-colors font-body text-label-md disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <span className="font-body text-body-md text-on-surface-variant">
              Page {page.page + 1} of {page.totalPages}
            </span>
            <button disabled={page.page >= page.totalPages - 1} onClick={() => changePage(page.page + 1)}
              className="border border-outline-variant text-on-surface-variant px-4 py-2 rounded hover:bg-surface-container-high transition-colors font-body text-label-md disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </nav>
        )}
      </section>
    </main>
  )
}
