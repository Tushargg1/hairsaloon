import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import ReviewsDisplay from '../ReviewsDisplay.jsx'
import { errorMessage, getDashboardReviews, tenantKeys } from '../tenant-api.js'

const pageSize = 20

export default function ReviewsManager() {
  const [page, setPage] = useState(0)
  const reviews = useQuery({
    queryKey: tenantKeys.dashboardReviews(page, pageSize),
    queryFn: () => getDashboardReviews({ page, size: pageSize }),
  })
  return <section className="manager-section reviews-manager">
    <header className="manager-heading"><p className="eyebrow">Customer feedback</p><h2>Reviews</h2><p>Read ratings and comments submitted after completed appointments.</p></header>
    {reviews.isLoading ? <div className="manager-loading" aria-live="polite">Loading customer reviews…</div> : reviews.isError ? <div className="public-state" role="alert"><h3>Reviews unavailable</h3><p>{errorMessage(reviews.error)}</p><button className="button button-small" onClick={() => reviews.refetch()}>Try again</button></div> : <ReviewsDisplay data={reviews.data} onPage={setPage} />}
  </section>
}
