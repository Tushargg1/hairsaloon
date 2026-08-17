import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, details) {
    console.error('HairSaloon UI crashed', error, details)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="fatal-error-page" role="alert">
        <div className="fatal-error-card">
          <span className="brand-mark" aria-hidden="true">H</span>
          <p className="eyebrow">Unexpected application error</p>
          <h1>Something went wrong.</h1>
          <p>Your information is safe. Reload the page to restore the application.</p>
          <button className="button" type="button" onClick={() => window.location.reload()}>Reload HairSaloon</button>
        </div>
      </main>
    )
  }
}
