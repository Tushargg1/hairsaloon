import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import PublicReviews from './PublicReviews.jsx'
import {
  errorMessage,
  getPublicServices,
  getPublicStaff,
  getSalonProfile,
  tenantKeys,
  unwrapCollection,
} from './tenant-api.js'
import { tenantNameFallback } from './tenant-host.js'

function imageUrl(item) {
  return typeof item === 'string' ? item : item?.url || item?.photoUrl || item?.imageUrl
}

function formatPrice(value, currency = 'USD') {
  if (value == null || value === '') return 'Price on request'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function staffServices(staff) {
  const supplied = staff?.services || staff?.assignedServices || staff?.serviceNames
  const list = unwrapCollection(supplied, ['services'])
  if (list.length) return list.map((service) => typeof service === 'string' ? service : service.name).filter(Boolean)
  return Array.isArray(staff?.serviceIds) ? staff.serviceIds.map(String) : []
}

function QueryState({ query, data = query.data, loading, errorTitle, emptyTitle, emptyText, children }) {
  if (query.isLoading) return <div className="public-loading" aria-live="polite">{loading}</div>
  if (query.isError) return <div className="public-state" role="alert"><h3>{errorTitle}</h3><p>{errorMessage(query.error)}</p><button className="button button-secondary button-small" onClick={() => query.refetch()}>Try again</button></div>
  if (!data?.length) return <div className="public-state"><h3>{emptyTitle}</h3><p>{emptyText}</p></div>
  return children
}

export default function SalonPublicPage() {
  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const servicesQuery = useQuery({ queryKey: tenantKeys.publicServices, queryFn: getPublicServices })
  const staffQuery = useQuery({ queryKey: tenantKeys.publicStaff, queryFn: getPublicStaff })
  const profile = profileQuery.data || {}
  const photos = unwrapCollection(profile.photos, ['photos'])
  const profileEmpty = profileQuery.isSuccess && Object.keys(profile).length === 0
  const salonName = profile.name || profile.salonName || tenantNameFallback()
  const heroPhoto = imageUrl(profile.heroPhoto || profile.coverPhoto) || imageUrl(photos[0])

  return (
    <main className="salon-public">
      <section className="tenant-hero" style={heroPhoto ? { backgroundImage: `linear-gradient(90deg, rgba(25,31,25,.86), rgba(25,31,25,.28)), url(${heroPhoto})` } : undefined}>
        <div className="page-width tenant-hero-content">
          {profileQuery.isLoading ? <p className="hero-loading">Loading salon profile…</p> : profileQuery.isError ? (
            <div className="hero-error" role="alert"><p>{errorMessage(profileQuery.error, 'We couldn’t load this salon profile.')}</p><button className="button button-light button-small" onClick={() => profileQuery.refetch()}>Try again</button></div>
          ) : (
            <>
              <p className="eyebrow">Welcome to</p>
              <h1>{salonName}</h1>
              {profileEmpty && <p className="hero-empty">Salon profile details have not been published yet.</p>}
              <p>{profile.description || profile.tagline || 'Personal care, thoughtful service, and a warm welcome.'}</p>
              <div className="button-row"><Link className="button button-light" to="/book">Book an appointment</Link></div>
              <div className="tenant-contact-line">
                {(profile.address || profile.city) && <span>{[profile.address, profile.city].filter(Boolean).join(', ')}</span>}
                {profile.phone && <a href={`tel:${profile.phone}`}>{profile.phone}</a>}
                {profile.email && <a href={`mailto:${profile.email}`}>{profile.email}</a>}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="public-section page-width" id="services">
        <header className="public-section-heading"><p className="eyebrow">What we offer</p><h2>Salon services</h2></header>
        <QueryState query={servicesQuery} loading="Loading services…" errorTitle="Services are unavailable" emptyTitle="Services coming soon" emptyText="This salon has not published its service menu yet.">
          <div className="service-public-grid">
            {servicesQuery.data?.map((service, index) => (
              <article className="public-card service-public-card" key={service.id || `${service.name}-${index}`}>
                <p className="card-kicker">{service.category || 'Salon service'}</p>
                <h3>{service.name || 'Unnamed service'}</h3>
                {service.description && <p>{service.description}</p>}
                <div className="service-meta"><span>{service.durationMinutes ? `${service.durationMinutes} min` : 'Duration varies'}</span><strong>{formatPrice(service.price, profile.currency || 'USD')}</strong></div>
              </article>
            ))}
          </div>
        </QueryState>
      </section>

      <section className="public-section public-section-tint" id="team">
        <div className="page-width">
          <header className="public-section-heading"><p className="eyebrow">Meet the team</p><h2>Our stylists</h2></header>
          <QueryState query={staffQuery} loading="Loading team…" errorTitle="Team details are unavailable" emptyTitle="Team profiles coming soon" emptyText="This salon has not published staff profiles yet.">
            <div className="staff-public-grid">
              {staffQuery.data?.map((staff, index) => (
                <article className="public-card staff-public-card" key={staff.id || `${staff.name}-${index}`}>
                  <div className="staff-photo">{imageUrl(staff) ? <img src={imageUrl(staff)} alt={`${staff.name || 'Staff member'} portrait`} /> : <span aria-hidden="true">{staff.name?.charAt(0) || 'S'}</span>}</div>
                  <div><h3>{staff.name || 'Salon professional'}</h3><p>{staff.title || staff.bio || 'Salon team member'}</p>{staffServices(staff).length > 0 && <p className="staff-specialties"><strong>Services:</strong> {staffServices(staff).join(', ')}</p>}</div>
                </article>
              ))}
            </div>
          </QueryState>
        </div>
      </section>

      <section className="public-section page-width" id="gallery">
        <header className="public-section-heading"><p className="eyebrow">Inside the salon</p><h2>Gallery</h2></header>
        <QueryState query={profileQuery} data={photos} loading="Loading photos…" errorTitle="Photos are unavailable" emptyTitle="Photos coming soon" emptyText="This salon has not published gallery photos yet.">
          <div className="photo-grid">
            {photos.map((photo, index) => imageUrl(photo) && <img key={photo.id || imageUrl(photo)} src={imageUrl(photo)} alt={photo.altText || photo.caption || `${salonName} gallery photo ${index + 1}`} />)}
          </div>
        </QueryState>
      </section>

      <PublicReviews />

      <section className="public-section page-width" id="contact">
        <div className="contact-panel">
          <div><p className="eyebrow">Visit us</p><h2>Contact {salonName}</h2><p>{profile.description || 'Get in touch with the salon for service information.'}</p></div>
          <address>
            {(profile.address || profile.city) && <span>{[profile.address, profile.city, profile.postalCode].filter(Boolean).join(', ')}</span>}
            {profile.phone && <a href={`tel:${profile.phone}`}>{profile.phone}</a>}
            {profile.email && <a href={`mailto:${profile.email}`}>{profile.email}</a>}
          </address>
        </div>
      </section>
    </main>
  )
}