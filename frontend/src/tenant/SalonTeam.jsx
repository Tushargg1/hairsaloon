import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import Icon from '../shared/components/Icon.jsx'
import { errorMessage, getPublicStaff, tenantKeys } from './tenant-api.js'

function initial(name) {
  return String(name || '?').trim().charAt(0).toUpperCase()
}

export default function SalonTeam() {
  const { salonName } = useOutletContext() || {}
  const staffQuery = useQuery({ queryKey: tenantKeys.publicStaff, queryFn: getPublicStaff })
  const staff = staffQuery.data || []

  return (
    <main className="py-12 px-4 lg:px-6">
      <div className="booking-frame">
        <div className="booking-plate">
          <div className="booking-texture" />

          <div className="vintage-heading-row relative z-10">
            <span className="vintage-heading-rule" />
            <h1 className="vintage-heading gold-gradient-text">Our Team</h1>
            <span className="vintage-heading-rule" />
          </div>

          <div className="relative z-10">
            {staffQuery.isLoading ? (
              <p className="booking-note">Loading the team...</p>
            ) : staffQuery.isError ? (
              <p className="booking-note is-error">{errorMessage(staffQuery.error)}</p>
            ) : !staff.length ? (
              <p className="booking-note">Our barbers will be listed here soon.</p>
            ) : (
              staff.map((member) => (
                <article className="review-plate-item flex-row items-center gap-4" key={member.id}>
                  <span className="w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ border: '1px solid rgba(200, 176, 132, 0.5)', backgroundColor: '#151310' }}>
                    {member.photoUrl
                      ? <img src={member.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      : <span className="font-display text-lg" style={{ color: '#C8B084' }}>{initial(member.name)}</span>}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-display text-sm" style={{ color: '#C8B084', letterSpacing: '0.1em' }}>
                      {member.name}
                    </span>
                    <span className="review-plate-item-date">Barber</span>
                  </span>
                </article>
              ))
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
