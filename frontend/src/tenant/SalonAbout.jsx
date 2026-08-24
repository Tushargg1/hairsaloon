import { useOutletContext } from 'react-router-dom'
import Icon from '../shared/components/Icon.jsx'
import { mapsUrl } from './tenant-api.js'

export default function SalonAbout() {
  const { profile = {}, salonName } = useOutletContext() || {}
  const addressLine = [profile.address, profile.city].filter(Boolean).join(', ')

  return (
    <main className="py-12 px-4 lg:px-6">
      <div className="booking-frame">
        <div className="booking-plate">
          <div className="booking-texture" />

          <div className="vintage-heading-row relative z-10">
            <span className="vintage-heading-rule" />
            <h1 className="vintage-heading gold-gradient-text">About Us</h1>
            <span className="vintage-heading-rule" />
          </div>

          <div className="relative z-10">
            <p className="review-plate-item-body text-center">
              {profile.description
                || `${salonName} is a classic grooming house where every cut is finished by hand. Walk in for a trim, leave with a look that keeps.`}
            </p>

            <div className="mt-6">
              {addressLine && (
                <p className="salon-footer-line">
                  <Icon name="location_on" className="text-[15px]" />
                  <a href={mapsUrl(profile)} target="_blank" rel="noreferrer">{addressLine}</a>
                </p>
              )}
              {profile.phone && (
                <p className="salon-footer-line">
                  <Icon name="call" className="text-[15px]" />
                  <a href={`tel:${profile.phone}`}>{profile.phone}</a>
                </p>
              )}
              {profile.email && (
                <p className="salon-footer-line">
                  <Icon name="mail" className="text-[15px]" />
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>
                </p>
              )}
            </div>

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
