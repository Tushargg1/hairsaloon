import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  cancelMyBooking, createReview, errorMessage, getAvailability, getMyBookings,
  rescheduleMyBooking, tenantKeys,
} from './tenant-api.js'

const tomorrow = () => {
  const value = new Date()
  value.setDate(value.getDate() + 1)
  return value.toISOString().slice(0, 10)
}
const formatWhen = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

function BookingCard({ booking, onCancel, onReschedule, onReview, busy, reviewSuccess }) {
  const completed = booking.status === 'COMPLETED'
  return <article className="booking-list-card"><div><span className={`booking-status ${booking.status.toLowerCase()}`}>{booking.status.replace('_', ' ')}</span><h3>{booking.serviceName}</h3><p>{formatWhen(booking.startDatetime)} · {booking.staffName}</p>{reviewSuccess && <p className="review-success" role="status">Thank you. Your review was submitted.</p>}</div>{booking.status === 'CONFIRMED' && <div className="button-row"><button className="button button-small button-secondary" onClick={() => onReschedule(booking)}>Reschedule</button><button className="button button-small button-ghost" disabled={busy} onClick={() => onCancel(booking.id)}>Cancel</button></div>}{completed && <div>{booking.reviewed ? <span className="reviewed-label">Reviewed</span> : <button className="button button-small button-secondary" onClick={() => onReview(booking)}>Write a review</button>}</div>}</article>
}

export default function CustomerBookings() {
  const queryClient = useQueryClient()
  const [reschedule, setReschedule] = useState(null)
  const [date, setDate] = useState(tomorrow)
  const [reviewing, setReviewing] = useState(null)
  const [rating, setRating] = useState('')
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
  const move = useMutation({
    mutationFn: rescheduleMyBooking,
    onSuccess: () => { setReschedule(null); refresh() },
    onError: (error) => { if (error?.response?.status === 409) slots.refetch() },
  })
  const review = useMutation({
    mutationFn: createReview,
    onSuccess: (_, payload) => {
      setReviewSuccess(payload.bookingId); setReviewing(null); setRating(''); setComment('')
      queryClient.invalidateQueries({ queryKey: tenantKeys.publicReviewsRoot })
      queryClient.invalidateQueries({ queryKey: tenantKeys.dashboardReviewsRoot })
      refresh()
    },
    onError: (error) => { if (error?.response?.status === 409) refresh() },
  })
  const now = new Date()
  const upcoming = bookings.data?.filter((item) => item.status === 'CONFIRMED' && new Date(item.startDatetime) >= now) || []
  const past = bookings.data?.filter((item) => !upcoming.includes(item)) || []
  const reviewConflict = review.error?.response?.status === 409 && review.error?.response?.data?.error === 'REVIEW_EXISTS'
  function requestCancel(id) { if (globalThis.confirm('Cancel this appointment?')) cancel.mutate(id) }
  function openReview(booking) { review.reset(); setReviewSuccess(null); setRating(''); setComment(''); setReviewing(booking) }
  function closeReview() { if (!review.isPending) { review.reset(); setReviewing(null); setRating(''); setComment('') } }
  function submitReview(event) { event.preventDefault(); review.mutate({ bookingId: reviewing.id, rating: Number(rating), comment: comment.trim() }) }

  if (bookings.isLoading) return <main className="page-width booking-page"><div className="manager-loading" aria-live="polite">Loading your bookings…</div></main>
  if (bookings.isError) return <main className="page-width booking-page"><div className="public-state" role="alert"><h3>Bookings unavailable</h3><p>{errorMessage(bookings.error)}</p><button className="button button-small" onClick={() => bookings.refetch()}>Try again</button></div></main>
  return <main className="page-width booking-page">
    <header className="page-heading compact"><p className="eyebrow">My account</p><h1>Your appointments.</h1><Link className="button" to="/book">Book another appointment</Link></header>
    {(cancel.isError || move.isError) && <p className="form-status error" role="alert">{errorMessage(cancel.error || move.error)}</p>}
    {reschedule && <section className="reschedule-panel"><div><h2>Reschedule {reschedule.serviceName}</h2><p>Your original appointment stays confirmed until a new time succeeds.</p></div><label>New date<input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></label>{slots.isLoading ? <p>Finding times…</p> : slots.data?.length ? <div className="slot-grid">{slots.data.map((slot) => <button disabled={move.isPending} key={slot.startDatetime} onClick={() => move.mutate({ id: reschedule.id, startDatetime: slot.startDatetime })}><strong>{new Date(slot.startDatetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong></button>)}</div> : <p>No available times on this date.</p>}<button className="button button-ghost button-small" onClick={() => setReschedule(null)}>Keep original</button></section>}
    {reviewing && <section className="review-form-panel" aria-labelledby={`review-title-${reviewing.id}`}><form onSubmit={submitReview}><div><p className="eyebrow">Completed appointment</p><h2 id={`review-title-${reviewing.id}`}>Review {reviewing.serviceName}</h2></div><fieldset><legend>Rating <span aria-hidden="true">*</span></legend><div className="rating-options">{[1, 2, 3, 4, 5].map((value) => <label key={value}><input type="radio" name="rating" value={value} checked={rating === String(value)} onChange={(event) => setRating(event.target.value)} required /><span aria-hidden="true">{value} ★</span><span className="sr-only">{value} out of 5 stars</span></label>)}</div></fieldset><label>Comment <span className="optional">(optional)</span><textarea maxLength="1000" rows="5" value={comment} onChange={(event) => setComment(event.target.value)} /></label><small className="character-count">{comment.length}/1000 characters</small>{review.isError && <p className="form-status error" role="alert">{reviewConflict ? 'You have already reviewed this appointment.' : errorMessage(review.error, 'Your review could not be submitted.')}</p>}<div className="button-row"><button className="button" type="submit" disabled={review.isPending}>{review.isPending ? 'Submitting review…' : 'Submit review'}</button><button className="button button-ghost" type="button" disabled={review.isPending} onClick={closeReview}>Cancel</button></div></form></section>}
    <section className="booking-group"><h2>Upcoming</h2>{upcoming.length ? upcoming.map((item) => <BookingCard booking={item} busy={cancel.isPending} key={item.id} onCancel={requestCancel} onReschedule={setReschedule} onReview={openReview} reviewSuccess={reviewSuccess === item.id} />) : <div className="public-state"><h3>No upcoming appointments</h3><p>Choose a service when you’re ready.</p></div>}</section>
    <section className="booking-group"><h2>Past and cancelled</h2>{past.length ? past.map((item) => <BookingCard booking={item} busy={cancel.isPending} key={item.id} onCancel={requestCancel} onReschedule={setReschedule} onReview={openReview} reviewSuccess={reviewSuccess === item.id} />) : <p className="muted">No past bookings yet.</p>}</section>
  </main>
}
