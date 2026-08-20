import { useQuery } from '@tanstack/react-query'
import PublicReviews from './PublicReviews.jsx'
import Icon from '../shared/components/Icon.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import StarRating from '../shared/components/StarRating.jsx'
import {
  errorMessage, getPublicServices, getPublicStaff, getSalonProfile,
  tenantKeys, unwrapCollection,
} from './tenant-api.js'
import { tenantNameFallback } from './tenant-host.js'

const SALON_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOsftqeEoCGqdWgFXmEqZA_lK61Ilr6o8q_rVp4iOYfXgsj4w3Noap0NyK4WlCLxl3axcwcAD5ITnIfPfjnM2-FRh-D_ycj1lNNtK79gSZyAUu6j-UNG6xv5J2J7lB8FLBjQf1z4-ZLrPO00buYTW1feAJyyufP0dm35U0updYgt1sJtiecNpJQrdO8SMmcZ7junisKy_gGUmsCutNZxS-oG_hbi2Px2Cv3eHLusd2CnJb7ZM_TOr2'

function imageUrl(item) { return typeof item === 'string' ? item : item?.url || item?.photoUrl || item?.imageUrl }
function formatPrice(value) {
  if (value == null) return 'Price on request'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(Number(value))
}
function staffServices(s) {
  const list = unwrapCollection(s?.services || s?.assignedServices || s?.serviceNames, ['services'])
  if (list.length) return list.map((svc) => typeof svc === 'string' ? svc : svc.name).filter(Boolean)
  return []
}

export default function SalonPublicPage() {
  const profileQuery = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const servicesQuery = useQuery({ queryKey: tenantKeys.publicServices, queryFn: getPublicServices })
  const staffQuery = useQuery({ queryKey: tenantKeys.publicStaff, queryFn: getPublicStaff })
  const profile = profileQuery.data || {}
  const photos = unwrapCollection(profile.photos, ['photos'])
  const salonName = profile.name || profile.salonName || tenantNameFallback()
  const heroPhoto = imageUrl(profile.heroPhoto || profile.coverPhoto) || imageUrl(photos[0]) || SALON_BG

  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative w-full min-h-[60vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroPhoto} alt={salonName} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-6 pb-12">
          {profileQuery.isLoading ? <p className="text-on-surface-variant">Loading...</p> : (
            <>
              <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface mb-2">{salonName}</h1>
              <p className="font-body text-body-lg text-on-surface-variant max-w-2xl mb-4">
                {profile.description || 'Experience premium grooming at its finest.'}
              </p>
              {profile.rating != null && (
                <div className="flex items-center gap-2 mb-6">
                  <StarRating rating={Number(profile.rating)} size={20} />
                  <span className="font-body text-label-md text-on-surface-variant">{Number(profile.rating).toFixed(1)} ({profile.reviewCount || 0} Reviews)</span>
                </div>
              )}
              <BrassButton to="/book" size="lg" icon={<Icon name="event_available" className="text-[20px]" />}>
                Book an Appointment
              </BrassButton>
              <div className="flex flex-wrap gap-4 mt-6 font-body text-body-md text-on-surface-variant">
                {(profile.address || profile.city) && <span className="flex items-center gap-1"><Icon name="location_on" className="text-secondary text-[18px]" />{[profile.address, profile.city].filter(Boolean).join(', ')}</span>}
                {profile.phone && <a href={`tel:${profile.phone}`} className="flex items-center gap-1 hover:text-secondary transition-colors"><Icon name="call" className="text-secondary text-[18px]" />{profile.phone}</a>}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Services */}
      <section className="py-12 px-4 lg:px-6 max-w-[1280px] mx-auto w-full" id="services">
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4 mb-6">
            <Icon name="content_cut" className="text-secondary text-2xl" />
            <h2 className="font-display text-headline-sm text-on-surface">Our Services</h2>
          </div>
          {servicesQuery.isLoading ? <p className="text-on-surface-variant">Loading services...</p> : servicesQuery.isError ? (
            <p className="text-error">{errorMessage(servicesQuery.error)}</p>
          ) : !servicesQuery.data?.length ? (
            <p className="text-on-surface-variant">Services coming soon.</p>
          ) : (
            <div className="flex flex-col">
              {servicesQuery.data.map((service) => (
                <div key={service.id} className="flex justify-between items-center py-4 border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-high/30 transition-colors px-2 group">
                  <div className="flex flex-col">
                    <span className="font-body text-title-lg text-on-surface group-hover:text-secondary transition-colors">{service.name}</span>
                    {service.description && <span className="font-body text-body-md text-on-surface-variant text-sm">{service.description}</span>}
                    <span className="font-body text-label-sm text-outline mt-1 flex items-center gap-1">
                      <Icon name="schedule" className="text-[14px]" /> {service.durationMinutes} min
                    </span>
                  </div>
                  <span className="font-display text-headline-sm text-secondary">{formatPrice(service.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Staff */}
      <section className="py-12 px-4 lg:px-6 max-w-[1280px] mx-auto w-full" id="team">
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-4 mb-6">
            <Icon name="group" className="text-secondary text-2xl" />
            <h2 className="font-display text-headline-sm text-on-surface">Our Team</h2>
          </div>
          {staffQuery.isLoading ? <p className="text-on-surface-variant">Loading team...</p> : staffQuery.isError ? (
            <p className="text-error">{errorMessage(staffQuery.error)}</p>
          ) : !staffQuery.data?.length ? (
            <p className="text-on-surface-variant">Team profiles coming soon.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {staffQuery.data.map((member) => (
                <div key={member.id} className="flex flex-col items-center gap-2 group">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-outline-variant/50 group-hover:border-secondary transition-colors p-1">
                    {imageUrl(member) ? (
                      <img src={imageUrl(member)} alt={member.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-surface-container-high flex items-center justify-center">
                        <span className="font-display text-secondary text-xl">{member.name?.[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className="font-body text-title-lg text-on-surface text-center text-base group-hover:text-secondary transition-colors">{member.name}</span>
                  {staffServices(member).length > 0 && (
                    <span className="font-body text-label-sm text-on-surface-variant text-center">{staffServices(member).slice(0, 2).join(', ')}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
      <section className="py-12 px-4 lg:px-6 max-w-[1280px] mx-auto w-full" id="reviews">
        <PublicReviews />
      </section>

      {/* Contact */}
      <section className="py-12 px-4 lg:px-6 max-w-[1280px] mx-auto w-full" id="contact">
        <div className="glass-panel rounded-xl p-8 flex flex-col md:flex-row justify-between gap-8">
          <div>
            <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-2">Visit us</p>
            <h2 className="font-display text-headline-sm text-on-surface mb-3">Contact {salonName}</h2>
            <p className="font-body text-body-md text-on-surface-variant">{profile.description || 'Get in touch for appointments and enquiries.'}</p>
          </div>
          <address className="not-italic flex flex-col gap-2 font-body text-body-md text-on-surface-variant">
            {(profile.address || profile.city) && <span className="flex items-center gap-2"><Icon name="location_on" className="text-secondary text-[18px]" />{[profile.address, profile.city].filter(Boolean).join(', ')}</span>}
            {profile.phone && <a href={`tel:${profile.phone}`} className="flex items-center gap-2 hover:text-secondary transition-colors"><Icon name="call" className="text-secondary text-[18px]" />{profile.phone}</a>}
            {profile.email && <a href={`mailto:${profile.email}`} className="flex items-center gap-2 hover:text-secondary transition-colors"><Icon name="mail" className="text-secondary text-[18px]" />{profile.email}</a>}
          </address>
        </div>
      </section>
    </main>
  )
}
