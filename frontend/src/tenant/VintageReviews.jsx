import { useQuery } from '@tanstack/react-query'
import {
  errorMessage, getPublicGoogleReviews, getSalonProfile, getPublicReviews, tenantKeys,
} from './tenant-api.js'

const PAGE_SIZE = 6

const stars = (rating) => {
  const score = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)))
  return '\u2605'.repeat(score) + '\u2606'.repeat(5 - score)
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
  const summary = reviews.data?.summary || {}
  const average = Number(summary.averageRating || 0)
  const count = Number(summary.totalReviews || 0)
  const googleList = googleReviews.data || []
  const googleRating = Number(profile.data?.googleRating || 0)
  const googleCount = Number(profile.data?.googleReviewCount || 0)

  return (
    <div className="booking-frame">
      <div className="booking-plate">
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
              <div className="text-center mb-6">
                <p className="review-plate-score">{average.toFixed(1)}</p>
                <p className="review-plate-stars" aria-label={`${average.toFixed(1)} out of 5`}>
                  {stars(average)}
                </p>
                <p className="review-plate-count">
                  {count} {count === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              {list.length ? (
                <div>
                  {list.map((review) => (
                    <article className="review-plate-item" key={review.id}>
                      <div className="review-plate-item-head">
                        <span className="review-plate-item-stars" aria-label={`${review.rating} out of 5`}>
                          {stars(review.rating)}
                        </span>
                        {reviewDate(review.createdAt) && (
                          <time className="review-plate-item-date" dateTime={review.createdAt}>
                            {reviewDate(review.createdAt)}
                          </time>
                        )}
                      </div>
                      {review.comment && (
                        <p className="review-plate-item-body">&ldquo;{review.comment}&rdquo;</p>
                      )}
                      <p className="review-plate-item-date">{reviewerName(review.reviewer)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="booking-note">No reviews yet. They appear after completed appointments.</p>
              )}
            </>
          )}

          {(googleRating > 0 || googleList.length > 0) && (
            <div className="mt-8">
              <div className="text-center mb-6">
                <p className="card-kicker">From Google</p>
                {googleRating > 0 && (
                  <>
                    <p className="review-plate-score">{googleRating.toFixed(1)}</p>
                    <p className="review-plate-stars" aria-label={`${googleRating.toFixed(1)} out of 5 on Google`}>
                      {stars(googleRating)}
                    </p>
                    <p className="review-plate-count">
                      {googleCount} Google {googleCount === 1 ? 'review' : 'reviews'}
                    </p>
                  </>
                )}
              </div>
              {googleList.map((review, index) => (
                <article className="review-plate-item" key={index}>
                  <div className="review-plate-item-head">
                    <span className="review-plate-item-stars" aria-label={`${review.rating} out of 5`}>
                      {stars(review.rating)}
                    </span>
                    {review.relativeTime && (
                      <span className="review-plate-item-date">{review.relativeTime}</span>
                    )}
                  </div>
                  {review.text && (
                    <p className="review-plate-item-body">&ldquo;{review.text}&rdquo;</p>
                  )}
                  <p className="review-plate-item-date">{review.authorName || 'Google user'}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <p className="price-mark mt-auto pt-6">&mdash; {salonName} &mdash;</p>
      </div>
    </div>
  )
}
