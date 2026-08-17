import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import ReviewsDisplay from './ReviewsDisplay.jsx'
import { errorMessage, getPublicReviews, tenantKeys } from './tenant-api.js'

const pageSize = 20

export default function PublicReviews() {
  const [page, setPage] = useState(0)
  const reviews = useQuery({
    queryKey: tenantKeys.publicReviews(page, pageSize),
    queryFn: () => getPublicReviews({ page, size: pageSize }),
  })
  return <section className="public-section reviews-neutral" id="reviews">
    <div className="page-width">
      <header className="public-section-heading"><p className="eyebrow">Customer stories</p><h2>Salon reviews</h2></header>
      {reviews.isLoading ? <div className="public-loading" aria-live="polite">Loading salon reviews…</div> : reviews.isError ? <div className="public-state" role="alert"><h3>Reviews are unavailable</h3><p>{errorMessage(reviews.error)}</p><button className="button button-secondary button-small" onClick={() => reviews.refetch()}>Try again</button></div> : <ReviewsDisplay data={reviews.data} onPage={setPage} />}
    </div>
  </section>
}
