import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import SlotBookingWidget from './SlotBookingWidget.jsx'
import VintageReviews from './VintageReviews.jsx'
import Icon from '../shared/components/Icon.jsx'
import VideoHero from '../shared/components/VideoHero.jsx'
import {
  errorMessage, getPublicPromotions, getPublicServices, getSalonProfile,
  tenantKeys, unwrapCollection,
} from './tenant-api.js'
import { groupServicesByCategory } from './service-groups.js'
import { tenantNameFallback } from './tenant-host.js'

function imageUrl(item) { return typeof item === 'string' ? item : item?.url || item?.photoUrl || item?.imageUrl }
function formatPrice(value) {
  if (value == null) return 'Price on request'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(Number(value))
}
function discountLabel(promotion) {
  if (promotion.discountType === 'COMBO') return formatPrice(promotion.discountValue)
  return promotion.discountType === 'PERCENT'
    ? `${Number(promotion.discountValue)}% off`
    : `${formatPrice(promotion.discountValue)} off`
}

// Combos advertise the bundle itself, so list the services instead of the terms.
function comboServices(promotion, services) {
  return promotion.serviceIds
    .map((id) => services.find((service) => String(service.id) === String(id))?.name)
    .filter(Boolean)
    .join(' + ')
}

function offerTerms(promotion) {
  const parts = []
  if (promotion.minimumSpend != null) parts.push(`Min spend ${formatPrice(promotion.minimumSpend)}`)
  if (promotion.serviceIds?.length) parts.push('Selected services')
  if (promotion.endsAt) {
    const ends = new Date(promotion.endsAt)
    if (!Number.isNaN(ends.getTime())) {
      parts.push(`Until ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(ends)}`)
    }
  }
  return parts.join(' \u00b7 ') || 'All services'
}

function ScissorsMark() {
  return (
    <svg className="price-scissors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
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

export default function SalonPublicPage() {
  // Service selection is shared: the price list and the booking widget both
  // toggle the same chain, in the order the customer picked them.
  const [selectedIds, setSelectedIds] = useState([])
  const [serviceSearch, setServiceSearch] = useState('')
  const toggleService = (id) => setSelectedIds((current) => (
    current.includes(String(id))
      ? current.filter((value) => value !== String(id))
      : [...current, String(id)]
  ))

  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const servicesQuery = useQuery({ queryKey: tenantKeys.publicServices, queryFn: getPublicServices })
  const promotionsQuery = useQuery({ queryKey: tenantKeys.publicPromotions, queryFn: getPublicPromotions })
  const profile = profileQuery.data || {}
  const photos = unwrapCollection(profile.photos, ['photos'])
  const salonName = profile.name || profile.salonName || tenantNameFallback()
  const heroPhoto = imageUrl(profile.heroPhoto || profile.coverPhoto) || imageUrl(photos[0])

  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative w-full -mt-16 min-h-[85vh] md:min-h-[92vh] flex items-end overflow-hidden">
        <VideoHero poster={heroPhoto} alt={salonName} />
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-6 pb-[5vh]">
          {profileQuery.isLoading ? <p className="text-on-surface-variant">Loading...</p> : (
            <>
              <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface mb-6">{salonName}</h1>
              <a href="#book-slot" className="vintage-cta">
                <Icon name="event_available" className="text-[18px]" />
                Book an Appointment
              </a>
            </>
          )}
        </div>
      </section>

      {/* Offers */}
      {promotionsQuery.data?.length > 0 && (
        <section className="pt-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto" id="offers">
          <div className="booking-frame">
            <div className="booking-plate !min-h-0">
              <div className="booking-texture" />

              <div className="vintage-heading-row relative z-10">
                <span className="vintage-heading-rule" />
                <h2 className="vintage-heading gold-gradient-text">Offers</h2>
                <span className="vintage-heading-rule" />
              </div>

              <div className="relative z-10">
                {promotionsQuery.data.map((promotion) => {
                  const combo = promotion.discountType === 'COMBO'
                  return (
                    <article className="offer-row" key={promotion.code}>
                      {combo && (
                        <span className="offer-combo">
                          {comboServices(promotion, servicesQuery.data || [])}
                        </span>
                      )}
                      <span className="offer-amount gold-gradient-text">{discountLabel(promotion)}</span>
                      <span className="offer-code">{combo ? 'Combo' : promotion.code}</span>
                      {!combo && <span className="review-plate-item-date">{offerTerms(promotion)}</span>}
                    </article>
                  )
                })}
              </div>

              <p className="price-mark mt-auto pt-6">&mdash; {salonName} &mdash;</p>
            </div>
          </div>
        </section>
      )}

      {/* Price list + Booking side by side on desktop */}
      <div className="w-full md:grid md:grid-cols-2 md:gap-6 md:items-start md:max-w-[1280px] md:mx-auto md:px-6">
      {/* Price list */}
      <section className="py-12 px-4 lg:px-0 w-full" id="services">
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

          <div className="price-search">
            <input
              type="text"
              placeholder="Search services..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              className="price-search-input"
            />
          </div>

          {servicesQuery.isLoading ? (
            <p className="price-state">Loading services...</p>
          ) : servicesQuery.isError ? (
            <p className="price-state">{errorMessage(servicesQuery.error)}</p>
          ) : !servicesQuery.data?.length ? (
            <p className="price-state">Services coming soon.</p>
          ) : (
            <div className="price-groups">
              {groupServicesByCategory(
                servicesQuery.data.filter((s) =>
                  !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase())
                ),
                profile.categoryOrder,
              ).map(([category, items]) => (
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
      <section className="pb-12 px-4 lg:px-0 w-full md:pt-12" id="book-slot">
        <SlotBookingWidget selectedIds={selectedIds} onToggleService={toggleService}
          salonName={salonName} />
      </section>
      </div>

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
      <section className="pb-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto" id="reviews">
        <VintageReviews salonName={salonName} />
      </section>

    </main>
  )
}
