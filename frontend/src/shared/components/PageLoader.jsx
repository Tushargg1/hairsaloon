// Full-screen loading splash shown while a page's session or primary data loads.
// Reuses the razor-spinner styles from index.css (.site-loader / .loader).
export default function PageLoader({ light = false }) {
  return (
    <div className={`site-loader ${light ? 'theme-light' : ''}`} aria-live="polite">
      <div className="loader" />
      <p className="site-loader-text">Loading<span className="site-loader-dots" /></p>
    </div>
  )
}
