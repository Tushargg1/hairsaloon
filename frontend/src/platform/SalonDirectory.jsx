import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { errorMessage, getSalons, salonKeys } from './salon-api.js'
import { salonUrl } from './platform-config.js'
import useAuth from '../shared/auth/useAuth.js'
import apiClient, { apiErrorMessage } from '../shared/api/client.js'

const defaults = { city: '', service: '', rating: '', search: '', page: '0' }

function salonInitials(name = 'Salon') {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
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
  const urlFilters = Object.fromEntries(
    Object.keys(defaults).map((key) => [key, searchParams.get(key) || defaults[key]]),
  )
  const [form, setForm] = useState(urlFilters)
  const serializedParams = searchParams.toString()

  useEffect(() => {
    if (user?.role === 'CUSTOMER') {
      apiClient.get('/api/platform/favorites').then(({ data }) => {
        setFavorites(new Set(data.map((f) => f.salonId)))
      }).catch((error) => {
        setFavoriteStatus((current) => ({
          ...current, error: apiErrorMessage(error, 'Could not load saved salons.'),
        }))
      })
    } else {
      setFavorites(new Set())
    }
  }, [user])

  async function toggleFavorite(salonId) {
    setFavoriteStatus({ pendingId: salonId, error: '' })
    try {
      if (favorites.has(salonId)) {
        await apiClient.delete(`/api/platform/favorites/${salonId}`)
        setFavorites((previous) => {
          const next = new Set(previous)
          next.delete(salonId)
          return next
        })
      } else {
        await apiClient.post(`/api/platform/favorites/${salonId}`)
        setFavorites((previous) => new Set(previous).add(salonId))
      }
      setFavoriteStatus({ pendingId: null, error: '' })
    } catch (error) {
      setFavoriteStatus({
        pendingId: null,
        error: apiErrorMessage(error, 'Could not update this saved salon.'),
      })
    }
  }

  useEffect(() => {
    const currentParams = new URLSearchParams(serializedParams)
    setForm(Object.fromEntries(
      Object.keys(defaults).map((key) => [key, currentParams.get(key) || defaults[key]]),
    ))
  }, [serializedParams])

  const queryFilters = { ...urlFilters, page: Math.max(0, Number(urlFilters.page) || 0), size: 12 }
  const salonsQuery = useQuery({
    queryKey: salonKeys.list(queryFilters),
    queryFn: () => getSalons(queryFilters),
    placeholderData: keepPreviousData,
  })
  const page = normalizePage(salonsQuery.data, queryFilters.page)

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function applyFilters(event) {
    event.preventDefault()
    const next = new URLSearchParams()
    Object.entries({ ...form, page: '0' }).forEach(([key, value]) => {
      if (value) next.set(key, value)
    })
    setSearchParams(next)
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearFilters() {
    setSearchParams({})
  }

  return (
    <main className="directory-page page-width">
      <header className="page-heading">
        <p className="eyebrow">Salon directory</p>
        <h1>Find a salon that<br /><em>feels like you.</em></h1>
        <p>Search trusted salons by location, service, reputation, or name.</p>
      </header>

      <form className="filter-panel" onSubmit={applyFilters} aria-label="Filter salons">
        <label>Search<input name="search" type="search" placeholder="Salon name or keyword" value={form.search} onChange={update} /></label>
        <label>City<input name="city" placeholder="e.g. Austin" value={form.city} onChange={update} /></label>
        <label>Service<input name="service" placeholder="e.g. Balayage" value={form.service} onChange={update} /></label>
        <label>Minimum rating<select name="rating" value={form.rating} onChange={update}><option value="">Any rating</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option></select></label>
        <button className="button" type="submit">Search</button>
        <button className="button button-ghost" type="button" onClick={clearFilters}>Clear</button>
      </form>
      <div className="results-bar" aria-live="polite">
        <strong>{salonsQuery.isLoading ? 'Searching…' : `${page.totalElements} salon${page.totalElements === 1 ? '' : 's'} found`}</strong>
        {salonsQuery.isFetching && !salonsQuery.isLoading && <span>Updating results…</span>}
      </div>
      {favoriteStatus.error && <p className="form-status error" role="alert">{favoriteStatus.error}</p>}

      {salonsQuery.isLoading ? (
        <div className="card-grid" aria-label="Loading salons">
          {[1, 2, 3, 4, 5, 6].map((item) => <div className="salon-card skeleton" key={item} />)}
        </div>
      ) : salonsQuery.isError ? (
        <section className="state-card" role="alert">
          <h2>We couldn’t load salons</h2>
          <p>{errorMessage(salonsQuery.error)}</p>
          <button className="button button-secondary" onClick={() => salonsQuery.refetch()}>Try again</button>
        </section>
      ) : page.content.length === 0 ? (
        <section className="state-card">
          <h2>No salons match those filters</h2>
          <p>Try a broader city, service, rating, or search term.</p>
          <button className="button button-secondary" onClick={clearFilters}>Clear all filters</button>
        </section>
      ) : (
        <div className="card-grid">
          {page.content.map((salon) => (
            <article className="salon-card" key={salon.id || salon.subdomain}>
              <div className="salon-image">
                {salon.logoUrl ? <img src={salon.logoUrl} alt={`${salon.name} logo`} /> : <span>{salonInitials(salon.name)}</span>}
                {salon.status && <span className="status-pill">{salon.status}</span>}
              </div>
              <div className="salon-card-body">
                <div className="salon-title-row">
                  <div><p className="card-kicker">{salon.city || 'Independent salon'}</p><h2>{salon.name}</h2></div>
                  {salon.rating != null && <span className="rating" aria-label={`${salon.rating} out of 5 stars`}>★ {Number(salon.rating).toFixed(1)}</span>}
                </div>
                <p>{salon.description || 'A local salon ready to help you find your next look.'}</p>
                {salon.address && <address>{salon.address}{salon.city ? `, ${salon.city}` : ''}</address>}
                {salon.reviewCount != null && <small>{salon.reviewCount} review{salon.reviewCount === 1 ? '' : 's'}</small>}
                <a className="arrow-link" href={salonUrl(salon.subdomain)}>Visit salon <span aria-hidden="true">→</span></a>
                {user?.role === 'CUSTOMER' && (
                  <button className="button button-ghost button-small" type="button"
                    style={{ marginTop: '.5rem', width: '100%' }}
                    disabled={favoriteStatus.pendingId === salon.id}
                    onClick={() => toggleFavorite(salon.id)}>
                    {favoriteStatus.pendingId === salon.id
                      ? 'Saving…'
                      : favorites.has(salon.id) ? '♥ Saved' : '♡ Save salon'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {page.totalPages > 1 && (
        <nav className="pagination" aria-label="Salon results pages">
          <button className="button button-ghost" disabled={page.page <= 0} onClick={() => changePage(page.page - 1)}>Previous</button>
          <span>Page {page.page + 1} of {page.totalPages}</span>
          <button className="button button-ghost" disabled={page.page >= page.totalPages - 1} onClick={() => changePage(page.page + 1)}>Next</button>
        </nav>
      )}
    </main>
  )
}
