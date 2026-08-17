import useAuth from '../auth/useAuth.js'

export default function BackendStatusBanner() {
  const { backendStatus, retryBackend } = useAuth()
  if (backendStatus !== 'offline') return null

  return (
    <aside className="backend-status-banner" role="alert" aria-live="assertive">
      <span className="backend-status-dot" aria-hidden="true" />
      <div><strong>Backend unavailable</strong><span>Start the API on port 8080, then reconnect.</span></div>
      <button className="button button-light button-small" type="button" onClick={retryBackend}>Retry</button>
    </aside>
  )
}
