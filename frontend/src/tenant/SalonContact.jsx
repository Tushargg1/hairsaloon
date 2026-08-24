import { useOutletContext } from 'react-router-dom'
import Icon from '../shared/components/Icon.jsx'
import { mapsUrl } from './tenant-api.js'

export default function SalonContact() {
  const { profile = {}, salonName } = useOutletContext() || {}
  const addressLine = [profile.address, profile.city].filter(Boolean).join(', ')
  const hasDetails = addressLine || profile.phone || profile.email

  return (
    <main className="py-12 px-4 lg:px-6">
      <div className="booking-frame">
        <div className="booking-plate">
          <div className="booking-texture" />

          <div className="vintage-heading-row relative z-10">
            <span className="vintage-heading-rule" />
            <h1 className="vintage-heading gold-gradient-text">Contact Us</h1>
            <span className="vintage-heading-rule" />
          </div>

          <div className="relative z-10">
            {hasDetails ? (
              <>
                {addressLine && (
                  <article className="review-plate-item">
                    <span className="review-plate-item-date">Address</span>
                    <p className="review-plate-item-body">
                      <a href={mapsUrl(profile)} target="_blank" rel="noreferrer">{addressLine}</a>
                    </p>
                  </article>
                )}
                {profile.phone && (
                  <article className="review-plate-item">
                    <span className="review-plate-item-date">Phone</span>
                    <p className="review-plate-item-body">
                      <a href={`tel:${profile.phone}`}>{profile.phone}</a>
                    </p>
                  </article>
                )}
                {profile.email && (
                  <article className="review-plate-item">
                    <span className="review-plate-item-date">Email</span>
                    <p className="review-plate-item-body">
                      <a href={`mailto:${profile.email}`}>{profile.email}</a>
                    </p>
                  </article>
                )}
              </>
            ) : (
              <p className="booking-note">Contact details coming soon.</p>
            )}

            <div className="flex justify-center mt-8">
              <a href="/#book-slot" className="vintage-cta">
                <Icon name="event_available" className="text-[18px]" />
                Book a Slot
              </a>
            </div>
          </div>

          <p className="price-mark mt-auto pt-6">&mdash; {salonName} &mdash;</p>
        </div>
      </div>
    </main>
  )
}
