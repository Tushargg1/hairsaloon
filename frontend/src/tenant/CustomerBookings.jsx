import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  cancelMyBooking, createReview, errorMessage, getAvailability, getMyBookings,
  rescheduleMyBooking, tenantKeys,
} from './tenant-api.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import Icon from '../shared/components/Icon.jsx'
import StatusChip from '../shared/components/StatusChip.jsx'
import StarRating from '../shared/components/StarRating.jsx'

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }
const formatWhen = (v) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v))

function BookingCard({ booking, onCancel, onReschedule, onReview, busy, reviewSuccess }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-4 px-4 bg-surface-container/50 rounded-lg border border-outline-variant/20">
      <div className="flex-grow">
        <div className="flex items-center gap-2 mb-1">
          <StatusChip status={booking.status} />
        </div>
        <h3 className="font-body text-title-lg text-on-surface text-base">{booking.serviceName}</h3>
        <p className="font-body text-body-md text-on-surface-variant">{formatWhen(booking.startDatetime)} · {booking.staffName}</p>
        {reviewSuccess && <p className="text-[#A89048] text-label-sm mt-1">Thank you for your review!</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {booking.status === 'CONFIRMED' && (
          <>
            <button onClick={() => onReschedule(booking)} className="border border-secondary text-secondary px-3 py-1.5 rounded font-body text-label-sm hover:bg-secondary/10 transition-colors">Reschedule</button>
            <button onClick={() => onCancel(booking.id)} disabled={busy} className="border border-outline-variant text-on-surface-variant px-3 py-1.5 rounded font-body text-label-sm hover:text-error hover:border-error transition-colors disabled:opacity-50">Cancel</button>
          </>
        )}
        {booking.status === 'COMPLETED' && !booking.reviewed && (
          <button onClick={() => onReview(booking)} className="border border-secondary text-secondary px-3 py-1.5 rounded font-body text-label-sm hover:bg-secondary/10 transition-colors">Write review</button>
        )}
        {booking.status === 'COMPLETED' && booking.reviewed && (
          <span className="font-body text-label-sm text-[#A89048] flex items-center gap-1"><Icon name="check_circle" filled className="text-[14px]" /> Reviewed</span>
        )}
      </div>
    </div>
  )
}

export default function CustomerBookings() {
  const queryClient = useQueryClient()
  const [reschedule, setReschedule] = useState(null)
  const [date, setDate] = useState(tomorrow)
  const [reviewing, setReviewing] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(null)

  const bookings = useQuery({ queryKey: tenantKeys.myBookings, queryFn: getMyBookings })
  const slots = useQuery({
    queryKey: tenantKeys.availability(reschedule?.serviceId, date, reschedule?.staffId),
    queryFn: () => getAvailability({ serviceId: reschedule.serviceId, staffId: reschedule.staffId, date }),
    enabled: Boolean(reschedule && date),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: tenantKeys.myBookings })
  const cancel = useMutation({ mutationFn: cancelMyBooking, onSuccess: refresh })
  const move = useMutation({ mutationFn: rescheduleMyBooking, onSuccess: () => { setReschedule(null); refresh() }, onError: (e) => { if (e?.response?.status === 409) slots.refetch() } })
  const review = useMutation({
    mutationFn: createReview,
    onSuccess: (_, payload) => { setReviewSuccess(payload.bookingId); setReviewing(null); setRating(0); setComment(''); refresh() },
  })

  const now = new Date()
  const upcoming = bookings.data?.filter((i) => i.status === 'CONFIRMED' && new Date(i.startDatetime) >= now) || []
  const past = bookings.data?.filter((i) => !upcoming.includes(i)) || []

  function requestCancel(id) { if (globalThis.confirm('Cancel this appointment?')) cancel.mutate(id) }
  function submitReview(e) { e.preventDefault(); review.mutate({ bookingId: reviewing.id, rating, comment: comment.trim() }) }

  if (bookings.isLoading) return <main className="max-w-[1280px] mx-auto px-4 py-12"><p className="text-on-surface-variant">Loading bookings...</p></main>
  if (bookings.isError) return <main className="max-w-[1280px] mx-auto px-4 py-12"><GlassPanel className="text-center"><p className="text-error mb-4">{errorMessage(bookings.error)}</p><BrassButton onClick={() => bookings.refetch()} variant="outline">Try again</BrassButton></GlassPanel></main>

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">My account</p>
          <h1 className="font-display text-headline-md text-on-surface">Your Appointments</h1>
        </div>
        <BrassButton to="/book" icon={<Icon name="add" className="text-[18px]" />}>Book New</BrassButton>
      </div>

      {(cancel.isError || move.isError) && <p className="text-error bg-error-container/20 rounded px-3 py-2 mb-4">{errorMessage(cancel.error || move.error)}</p>}

      {/* Reschedule Panel */}
      {reschedule && (
        <GlassPanel className="mb-8">
          <h2 className="font-display text-headline-sm text-on-surface mb-4">Reschedule {reschedule.serviceName}</h2>
          <p className="font-body text-body-md text-on-surface-variant mb-4">Original appointment stays confirmed until a new time is selected.</p>
          <div className="mb-4">
            <label className="font-body text-label-md text-on-surface-variant block mb-2">New date</label>
            <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className="input-glass rounded py-2 px-3 text-body-md" />
          </div>
          {slots.isLoading ? <p className="text-on-surface-variant">Finding times...</p> : slots.data?.length ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {slots.data.map((s) => (
                <button key={s.startDatetime} disabled={move.isPending} onClick={() => move.mutate({ id: reschedule.id, startDatetime: s.startDatetime })}
                  className="barber-slot py-2 text-center font-body text-label-md">
                  {new Date(s.startDatetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </button>
              ))}
            </div>
          ) : <p className="text-on-surface-variant mb-4">No times available on this date.</p>}
          <button onClick={() => setReschedule(null)} className="font-body text-label-md text-on-surface-variant hover:text-secondary transition-colors">Keep original</button>
        </GlassPanel>
      )}

      {/* Review Modal */}
      {reviewing && (
        <GlassPanel className="mb-8">
          <form onSubmit={submitReview} className="flex flex-col gap-4">
            <h2 className="font-display text-headline-sm text-on-surface">Review {reviewing.serviceName}</h2>
            <div>
              <label className="font-body text-label-md text-on-surface-variant block mb-2">Rating</label>
              <StarRating rating={rating} interactive onChange={setRating} size={24} />
            </div>
            <div>
              <label className="font-body text-label-md text-on-surface-variant block mb-2">Comment (optional)</label>
              <textarea maxLength={1000} rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
                className="input-glass w-full rounded py-2 px-3 text-body-md resize-none" />
              <span className="font-body text-label-sm text-outline">{comment.length}/1000</span>
            </div>
            {review.isError && <p className="text-error text-body-md">{errorMessage(review.error)}</p>}
            <div className="flex gap-3">
              <BrassButton type="submit" disabled={review.isPending || !rating}>{review.isPending ? 'Submitting...' : 'Submit review'}</BrassButton>
              <button type="button" onClick={() => { setReviewing(null); setRating(0); setComment('') }} disabled={review.isPending}
                className="border border-outline-variant text-on-surface-variant px-4 py-2 rounded font-body text-label-md hover:bg-surface-container-high transition-colors">Cancel</button>
            </div>
          </form>
        </GlassPanel>
      )}

      {/* Upcoming */}
      <section className="mb-10">
        <h2 className="font-display text-headline-sm text-on-surface mb-4 flex items-center gap-2">
          <Icon name="upcoming" className="text-secondary" /> Upcoming
        </h2>
        {upcoming.length ? (
          <div className="flex flex-col gap-3">{upcoming.map((b) => <BookingCard key={b.id} booking={b} busy={cancel.isPending} onCancel={requestCancel} onReschedule={setReschedule} onReview={() => { setReviewing(b); setReviewSuccess(null); setRating(0); setComment('') }} reviewSuccess={reviewSuccess === b.id} />)}</div>
        ) : <p className="font-body text-body-md text-on-surface-variant">No upcoming appointments. Ready to book?</p>}
      </section>

      {/* Past */}
      <section>
        <h2 className="font-display text-headline-sm text-on-surface mb-4 flex items-center gap-2">
          <Icon name="history" className="text-secondary" /> Past & Cancelled
        </h2>
        {past.length ? (
          <div className="flex flex-col gap-3">{past.map((b) => <BookingCard key={b.id} booking={b} busy={cancel.isPending} onCancel={requestCancel} onReschedule={setReschedule} onReview={() => { setReviewing(b); setReviewSuccess(null); setRating(0); setComment('') }} reviewSuccess={reviewSuccess === b.id} />)}</div>
        ) : <p className="font-body text-body-md text-on-surface-variant">No past bookings yet.</p>}
      </section>
    </main>
  )
}
