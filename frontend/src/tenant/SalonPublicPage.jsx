import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import SlotBookingWidget from './SlotBookingWidget.jsx'
import VintageReviews from './VintageReviews.jsx'
import Icon from '../shared/components/Icon.jsx'
import VideoHero from '../shared/components/VideoHero.jsx'
import {
  errorMessage, getPublicServices, getSalonProfile,
  tenantKeys, unwrapCollection,
} from './tenant-api.js'
import { tenantNameFallback } from './tenant-host.js'

function imageUrl(item) { return typeof item === 'string' ? item : item?.url || item?.photoUrl || item?.imageUrl }
function formatPrice(value) {
  if (value == null) return 'Price on request'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(Number(value))
}
const CATEGORY_ORDER = ['hair', 'beard', 'shave', 'colour', 'color', 'wellness']

function ScissorsMark() {
  return (
    <svg className="price-scissors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M14.121 14.121L19 19m-7-7l3-3m-3 3l-3-3m3 3L7 19m2.121-9.121l-3-3m0 0a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243zm9.193 9.193a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243zm-9.193-9.193L12 12m0 0l3-3m-3 3l-3-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ClockMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}

// Groups services under their category, listing the known grooming categories
// in a fixed order first so the board reads the same for every salon, then any
// custom categories the salon added, then anything uncategorised.
function groupByCategory(services) {
  const groups = new Map()
  for (const service of services) {
    const key = String(service.category || '').trim() || 'Other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(service)
  }
  const known = []
  for (const name of CATEGORY_ORDER) {
    for (const key of [...groups.keys()]) {
      if (key.toLowerCase() === name) {
        known.push([key, groups.get(key)])
        groups.delete(key)
      }
    }
  }
  const other = groups.has('Other') ? [['Other', groups.get('Other')]] : []
  groups.delete('Other')
  return [...known, ...groups, ...other]
}

export default function SalonPublicPage() {
  // Service selection is shared: the price list and the booking widget both
  // toggle the same chain, in the order the customer picked them.
  const [selectedIds, setSelectedIds] = useState([])
  const toggleService = (id) => setSelectedIds((current) => (
    current.includes(String(id))
      ? current.filter((value) => value !== String(id))
      : [...current, String(id)]
  ))

  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const servicesQuery = useQuery({ queryKey: tenantKeys.publicServices, queryFn: getPublicServices })
  const profile = profileQuery.data || {}
  const photos = unwrapCollection(profile.photos, ['photos'])
  const salonName = profile.name || profile.salonName || tenantNameFallback()
  const heroPhoto = imageUrl(profile.heroPhoto || profile.coverPhoto) || imageUrl(photos[0])

  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative w-full -mt-16 min-h-[85vh] md:min-h-[60vh] flex items-end overflow-hidden">
        <VideoHero poster={heroPhoto} alt={salonName} />
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-6 pb-12">
          {profileQuery.isLoading ? <p className="text-on-surface-variant">Loading...</p> : (
            <>
              <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface mb-6">{salonName}</h1>
              <Link to="/book" className="vintage-cta">
                <Icon name="event_available" className="text-[18px]" />
                Book an Appointment
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Price list */}
      <section className="py-12 px-4 lg:px-6 w-full" id="services">
        <div className="price-board">
          <div className="price-board-frame" />
          <span className="price-rivet top-3 left-3" />
          <span className="price-rivet top-3 right-3" />
          <span className="price-rivet bottom-3 left-3" />
          <span className="price-rivet bottom-3 right-3" />

          <header className="price-header">
            <ScissorsMark />
            <h1 className="price-title">Price List</h1>
            <div className="price-ornament">
              <span className="price-ornament-line" />
              <span className="price-ornament-diamond" />
              <span className="price-ornament-line is-flipped" />
            </div>
          </header>

          {servicesQuery.isLoading ? (
            <p className="price-state">Loading services...</p>
          ) : servicesQuery.isError ? (
            <p className="price-state">{errorMessage(servicesQuery.error)}</p>
          ) : !servicesQuery.data?.length ? (
            <p className="price-state">Services coming soon.</p>
          ) : (
            <div className="price-groups">
              {groupByCategory(servicesQuery.data).map(([category, items]) => (
                <section key={category}>
                  <div className="price-category">
                    <span className="price-category-line" />
                    <h3>{category}</h3>
                    <span className="price-category-line" />
                  </div>
                  {items.map((service) => {
                    const picked = selectedIds.includes(String(service.id))
                    return (
                      <button key={service.id} type="button" className="price-row"
                        aria-pressed={picked} onClick={() => toggleService(service.id)}>
                        <span className="price-details">
                          <span className="price-service-name">{service.name}</span>
                          {service.description && <span className="price-service-desc">{service.description}</span>}
                          {picked && (
                            <span className="price-picked">
                              <Icon name="check_circle" filled /> Added
                            </span>
                          )}
                        </span>
                        <span className="price-meta">
                          <span className="price-amount">{formatPrice(service.price)}</span>
                          <span className="price-duration">
                            <ClockMark />
                            {service.durationMinutes} min
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </section>
              ))}
            </div>
          )}

          <p className="price-mark">&mdash; {salonName} &mdash;</p>
        </div>
      </section>

      {/* Slot booking */}
      <section className="pb-12 px-4 lg:px-6 w-full" id="book-slot">
        <SlotBookingWidget selectedIds={selectedIds} onToggleService={toggleService}
          salonName={salonName} />
      </section>

      {/* Gallery */}
      {photos.length > 0 && (
        <section className="py-12 px-4 lg:px-6 max-w-[1280px] mx-auto w-full" id="gallery">
          <h2 className="font-display text-headline-sm text-on-surface mb-6 flex items-center gap-3">
            <Icon name="photo_library" className="text-secondary text-2xl" /> Gallery
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo, i) => imageUrl(photo) && (
              <img key={photo.id || i} src={imageUrl(photo)} alt={photo.altText || `${salonName} photo ${i + 1}`}
                className="w-full h-48 object-cover rounded-lg border border-outline-variant/30" />
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="pb-12 px-4 lg:px-6 w-full" id="reviews">
        <VintageReviews salonName={salonName} />
      </section>

    </main>
  )
}
