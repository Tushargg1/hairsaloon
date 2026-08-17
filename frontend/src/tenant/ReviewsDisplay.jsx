const number = (value) => new Intl.NumberFormat().format(Number(value || 0))
const reviewDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}
const reviewerName = (reviewer) => typeof reviewer === 'string' ? reviewer : reviewer?.name || 'Salon customer'

function Stars({ rating }) {
  const score = Math.max(0, Math.min(5, Number(rating) || 0))
  return <span className="review-stars" aria-label={`${score} out of 5 stars`}><span aria-hidden="true">{'★'.repeat(Math.round(score))}{'☆'.repeat(5 - Math.round(score))}</span></span>
}

export default function ReviewsDisplay({ data, onPage }) {
  const reviews = data?.content || []
  const summary = data?.summary || {}
  const page = data?.page || {}
  const average = Number(summary.averageRating || 0)
  const count = Number(summary.totalReviews || 0)
  const distribution = summary.ratingDistribution || {}
  return <div className="reviews-content">
    <section className="review-summary" aria-label="Review summary">
      <div className="review-average"><strong>{average.toFixed(1)}</strong><Stars rating={average} /><span>{number(count)} {count === 1 ? 'review' : 'reviews'}</span></div>
      <div className="rating-distribution" aria-label="Rating distribution">{[5, 4, 3, 2, 1].map((rating) => { const value = Number(distribution[rating] || 0); return <div key={rating}><span>{rating} star</span><progress value={value} max={Math.max(count, 1)} aria-label={`${rating} stars: ${value} reviews`} /><strong>{number(value)}</strong></div> })}</div>
    </section>
    {reviews.length ? <div className="review-grid">{reviews.map((review) => <article className="review-card" key={review.id}><Stars rating={review.rating} />{review.comment && <p>“{review.comment}”</p>}<footer><strong>{reviewerName(review.reviewer)}</strong>{reviewDate(review.createdAt) && <time dateTime={review.createdAt}>{reviewDate(review.createdAt)}</time>}</footer></article>)}</div> : <div className="public-state review-empty"><h3>No reviews yet</h3><p>Customer reviews will appear here after completed appointments.</p></div>}
    {Number(page.totalPages || 0) > 1 && <nav className="review-pagination" aria-label="Review pages"><button className="button button-secondary button-small" disabled={page.first} onClick={() => onPage(page.number - 1)}>Previous</button><span aria-live="polite">Page {page.number + 1} of {page.totalPages}</span><button className="button button-secondary button-small" disabled={page.last} onClick={() => onPage(page.number + 1)}>Next</button></nav>}
  </div>
}
