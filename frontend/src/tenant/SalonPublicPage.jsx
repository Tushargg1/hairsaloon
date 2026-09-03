import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import SlotBookingWidget from './SlotBookingWidget.jsx'
import VintageReviews from './VintageReviews.jsx'
import Icon from '../shared/components/Icon.jsx'
import ThemeSwitch from '../shared/components/ThemeSwitch.jsx'
import VideoHero from '../shared/components/VideoHero.jsx'
import DepthCarousel from '../shared/components/DepthCarousel.jsx'
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
    <svg className="booking-scissors" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="6" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" />
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

// Shrinks the hero heading until it fits on (at most) two lines, so a long salon
// name never spills to three. Re-runs on resize and when the name changes.
function useFitToTwoLines(text) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const fit = () => {
      const style = window.getComputedStyle(el)
      const lineHeight = parseFloat(style.lineHeight) || 1
      let size = parseFloat(el.dataset.baseSize || style.fontSize)
      if (!el.dataset.baseSize) el.dataset.baseSize = String(size)
      size = parseFloat(el.dataset.baseSize)
      el.style.fontSize = `${size}px`
      // Reduce until the text occupies two lines or fewer (min 20px).
      let guard = 40
      while (el.scrollHeight > lineHeight * 2.2 && size > 20 && guard-- > 0) {
        size -= 2
        el.style.fontSize = `${size}px`
      }
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [text])
  return ref
}

export default function SalonPublicPage() {
  const { siteLight, toggleSiteTheme } = useOutletContext() || {}
  // Service selection is shared: the price list and the booking widget both
  // toggle the same chain, in the order the customer picked them.
  const [selectedIds, setSelectedIds] = useState([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [typedHint, setTypedHint] = useState('')
  const toggleService = (id) => setSelectedIds((current) => (
    current.includes(String(id))
      ? current.filter((value) => value !== String(id))
      : [...current, String(id)]
  ))

  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const servicesQuery = useQuery({ queryKey: tenantKeys.publicServices, queryFn: getPublicServices })
  const promotionsQuery = useQuery({ queryKey: tenantKeys.publicPromotions, queryFn: getPublicPromotions })

  // Typewriter placeholder: types then deletes each of the salon's service names.
  const searchHints = (servicesQuery.data || []).map((s) => s.name)
  const searchHintsKey = searchHints.join('|')
  useEffect(() => {
    const words = searchHintsKey ? searchHintsKey.split('|') : []
    if (!words.length) return
    let word = 0
    let char = 0
    let deleting = false
    let timer
    const tick = () => {
      const current = words[word]
      if (!deleting) {
        char++
        setTypedHint(current.slice(0, char))
        if (char === current.length) { deleting = true; timer = setTimeout(tick, 1500); return }
        timer = setTimeout(tick, 45)
      } else {
        char--
        setTypedHint(current.slice(0, char))
        if (char === 0) { deleting = false; word = (word + 1) % words.length }
        timer = setTimeout(tick, 25)
      }
    }
    timer = setTimeout(tick, 45)
    return () => clearTimeout(timer)
  }, [searchHintsKey])

  // Progressive load for a snappy first paint:
  //  1: Groomit backdrop + salon name + Book/Contact button (needs the profile only)
  //  2: background video + offers/price/booking (once the profile has resolved)
  //  3: barber avatars, salon photos, reviews (after the core data settles)
  const [stage, setStage] = useState(1)
  useEffect(() => {
    if (stage < 2 && !profileQuery.isLoading) setStage(2)
  }, [stage, profileQuery.isLoading])
  useEffect(() => {
    if (stage < 3 && !servicesQuery.isLoading && !promotionsQuery.isLoading) {
      const t = setTimeout(() => setStage(3), 200)
      return () => clearTimeout(t)
    }
    return undefined
  }, [stage, servicesQuery.isLoading, promotionsQuery.isLoading])

  const profile = profileQuery.data || {}
  const photos = unwrapCollection(profile.photos, ['photos'])
  const galleryItems = photos
    .map((photo, i) => {
      const url = imageUrl(photo)
      return url ? { image: url, alt: photo.altText || `${profile.name || 'Salon'} photo ${i + 1}` } : null
    })
    .filter(Boolean)
  const salonName = profile.name || profile.salonName || tenantNameFallback()
  const heroTitleRef = useFitToTwoLines(salonName)
  const isActive = profile.status ? profile.status === 'ACTIVE' : true
  const contactPhone = (() => {
    const raw = String(profile.phone || '').replace(/[^\d]/g, '')
    return raw.length === 10 ? `91${raw}` : raw
  })()
  const contactUrl = contactPhone
    ? `https://wa.me/${contactPhone}?text=${encodeURIComponent(`Hi ${salonName}, I'd like to book an appointment via Groomit.`)}`
    : null

  return (
    <main className="flex flex-col">
      {/* Hero is fixed to the viewport; the sections below scroll up and over it. */}
      <section className="fixed top-0 left-0 right-0 w-full h-[85vh] md:h-[92vh] flex items-end overflow-hidden z-0">
        <VideoHero alt={salonName} loadVideo={stage >= 2} />
        {toggleSiteTheme && (
          <ThemeSwitch checked={!siteLight} onChange={toggleSiteTheme}
            className="absolute top-[67px] right-4 lg:right-6 z-20 drop-shadow-lg" style={{ '--toggle-size': '8px' }} />
        )}
        <div className="hero-content relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-6 pb-[5vh]">
          {profileQuery.isLoading ? <p className="text-on-surface-variant">Loading...</p> : (
            <>
              <h1 ref={heroTitleRef} className="font-display text-display-lg-mobile md:text-display-lg text-white mb-6">{salonName}</h1>
              {isActive ? (
                <a href="#book-slot" className="vintage-cta">
                  <Icon name="event_available" className="text-[18px]" />
                  Book an Appointment
                </a>
              ) : contactUrl ? (
                <a href={contactUrl} target="_blank" rel="noreferrer" className="vintage-cta">
                  <Icon name="chat" className="text-[18px]" />
                  Contact the salon
                </a>
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* Transparent spacer the height of the fixed hero, so the hero shows through
          at the top and the content below scrolls up over it. */}
      <div className="h-[calc(85vh-3rem)] md:h-[calc(92vh-3rem)] pointer-events-none bg-transparent" aria-hidden="true" />

      <div className="site-content-top flex flex-col relative z-10">
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
      {/* Price list — same plate/frame/heading as the booking slot */}
      <section className="pb-12 px-4 lg:px-0 w-full md:pt-12" id="services">
        <div className="booking-frame">
          <div className="booking-plate">
            <div className="booking-texture" />

          <header className="booking-head">
            <ScissorsMark />
            <div className="booking-title-row">
              <span className="booking-title-rule" />
              <h2 className="booking-title gold-gradient-text">Price List</h2>
              <span className="booking-title-rule" />
            </div>
          </header>

          <div className="price-search relative z-10">
            <input
              type="text"
              placeholder={searchHints.length ? `Search for ${typedHint}` : 'Search services...'}
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              className="price-search-input"
            />
            <p className="price-search-note">Tap a service to add it to your booking.</p>
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

          <p className="price-mark relative z-10">&mdash; {salonName} &mdash;</p>
          </div>
        </div>
      </section>

      {/* Slot booking */}
      <section className="pb-12 px-4 lg:px-0 w-full md:pt-12" id="book-slot">
        <SlotBookingWidget selectedIds={selectedIds} onToggleService={toggleService}
          salonName={salonName} />
      </section>
      </div>

      {/* Gallery (deferred to stage 3 so photos load after the core page) */}
      {stage >= 3 && galleryItems.length > 0 && (
        <section className="pt-8 pb-4 px-4 lg:px-6 w-full" id="gallery">
          <div className="vintage-heading-row mb-2">
            <span className="vintage-heading-rule" />
            <h2 className="vintage-heading gold-gradient-text">Gallery</h2>
            <span className="vintage-heading-rule" />
          </div>
          <div className="relative w-full h-[260px] sm:h-[320px]">
            <DepthCarousel
              items={galleryItems}
              depth={160}
              spread={125}
              tilt={6}
              tiltDirection="right"
              perspective={1500}
              visibleCards={4}
              falloff={0.11}
              autoplay
              loop
              cardWidth={280}
              cardHeight={260}
              radius={16}
              tint="#1a1206"
              duration={1150}
              ease="back.out(1.4)"
              autoplayDelay={4000}
              showControls
              showIndicators
            />
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="pt-4 pb-12 px-4 lg:px-6 w-full md:max-w-2xl md:mx-auto" id="reviews">
        <VintageReviews salonName={salonName} />
      </section>
      </div>

    </main>
  )
}
