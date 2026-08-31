import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  errorMessage, getPublicGoogleReviews, getSalonProfile, getPublicReviews, tenantKeys,
} from './tenant-api.js'

const PAGE_SIZE = 6
const READ_MORE_CHARS = 150

const stars = (rating) => {
  const score = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)))
  return '\u2605'.repeat(score) + '\u2606'.repeat(5 - score)
}

function ReviewCard({ review, ariaHidden }) {
  const [expanded, setExpanded] = useState(false)
  const long = (review.body || '').length > READ_MORE_CHARS
  return (
    <article className={`review-marquee-card ${expanded ? 'is-expanded' : ''}`} aria-hidden={ariaHidden}>
      <div className="review-plate-item-head">
        <span className="review-plate-item-stars" aria-label={`${review.rating} out of 5`}>
          {stars(review.rating)}
        </span>
        {review.meta && <span className="review-plate-item-date">{review.meta}</span>}
      </div>
      {review.body && (
        <p className={expanded ? 'review-plate-item-body' : 'review-marquee-body'}>
          &ldquo;{review.body}&rdquo;
        </p>
      )}
      {long && (
        <button type="button" className="review-read-more"
          onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
      <p className="review-plate-item-date">{review.author}</p>
    </article>
  )
}
const reviewDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}
const reviewerName = (reviewer) => (
  typeof reviewer === 'string' ? reviewer : reviewer?.name || 'Salon customer'
)

export default function VintageReviews({ salonName }) {
  const reviews = useQuery({
    queryKey: tenantKeys.publicReviews(0, PAGE_SIZE),
    queryFn: () => getPublicReviews({ page: 0, size: PAGE_SIZE }),
  })

  const profile = useQuery({ queryKey: tenantKeys.profile, queryFn: getSalonProfile })
  const googleReviews = useQuery({
    queryKey: tenantKeys.publicGoogleReviews,
    queryFn: getPublicGoogleReviews,
  })

  const list = reviews.data?.content || []
  const googleList = googleReviews.data || []
  const googleRating = Number(profile.data?.googleRating || 0)
  const googleCount = Number(profile.data?.googleReviewCount || 0)

  // One shape for the scrolling marquee: native reviews first, then Google ones.
  const allReviews = [
    ...list.map((review) => ({
      rating: review.rating,
      body: review.comment,
      author: reviewerName(review.reviewer),
      meta: reviewDate(review.createdAt),
    })),
    ...googleList.map((review) => ({
      rating: review.rating,
      body: review.text,
      author: review.authorName || 'Google user',
      meta: review.relativeTime,
    })),
  ]

  return (
    <div className="booking-frame">
      <div className="booking-plate !min-h-0">
        <div className="booking-texture" />

        <div className="vintage-heading-row relative z-10">
          <span className="vintage-heading-rule" />
          <h2 className="vintage-heading gold-gradient-text">Reviews</h2>
          <span className="vintage-heading-rule" />
        </div>

        <div className="relative z-10">
          {reviews.isLoading ? (
            <p className="booking-note">Loading reviews...</p>
          ) : reviews.isError ? (
            <p className="booking-note is-error">{errorMessage(reviews.error)}</p>
          ) : (
            <>
              {googleRating > 0 && (
                <div className="text-center mb-6">
                  <p className="card-kicker">From Google</p>
                  <p className="review-plate-score">{googleRating.toFixed(1)}</p>
                  <p className="review-plate-stars" aria-label={`${googleRating.toFixed(1)} out of 5 on Google`}>
                    {stars(googleRating)}
                  </p>
                  <p className="review-plate-count">
                    {googleCount} Google {googleCount === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              )}

              {allReviews.length ? (
                <div className="review-marquee">
                  {/* Track is duplicated so the left-to-right loop is seamless. */}
                  <div className="review-marquee-track">
                    {[...allReviews, ...allReviews].map((review, index) => (
                      <ReviewCard key={index} review={review} ariaHidden={index >= allReviews.length} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="booking-note">No reviews yet. They appear after completed appointments.</p>
              )}
            </>
          )}
        </div>

        <p className="price-mark mt-auto pt-6">&mdash; {salonName} &mdash;</p>
      </div>
    </div>
  )
}
