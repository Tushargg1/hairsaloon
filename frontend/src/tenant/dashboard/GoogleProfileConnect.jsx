import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { applyGoogleProfile, errorMessage, previewGoogleProfile, tenantKeys } from '../tenant-api.js'

function ChangeRow({ label, change }) {
  if (!change || (change.current == null && change.incoming == null)) return null
  const changed = String(change.current ?? '') !== String(change.incoming ?? '')
  return (
    <div className="google-change-row">
      <span className="google-change-label">{label}</span>
      <span className="google-change-old">{change.current || '—'}</span>
      <span className="google-change-arrow">→</span>
      <span className={`google-change-new ${changed ? 'is-changed' : ''}`}>{change.incoming || '—'}</span>
    </div>
  )
}

export default function GoogleProfileConnect() {
  const client = useQueryClient()
  const [url, setUrl] = useState('')
  const [overwriteContact, setOverwriteContact] = useState(true)
  const [preview, setPreview] = useState(null)
  const [done, setDone] = useState('')

  const previewMutation = useMutation({
    mutationFn: () => previewGoogleProfile(url.trim()),
    onSuccess: (data) => { setPreview(data); setDone('') },
  })

  const applyMutation = useMutation({
    mutationFn: () => applyGoogleProfile({ googleUrl: url.trim(), overwriteContact }),
    onSuccess: () => {
      setDone('Google profile imported. It is now shown on your public page.')
      setPreview(null)
      client.invalidateQueries({ queryKey: tenantKeys.dashboardProfile })
      client.invalidateQueries({ queryKey: tenantKeys.profile })
      client.invalidateQueries({ queryKey: tenantKeys.publicGoogleReviews })
    },
  })

  return (
    <section className="manager-create-card" aria-labelledby="google-heading">
      <h3 id="google-heading">Import from Google</h3>
      <p className="muted">
        Paste your Google Maps profile link. We show what will change before saving.
        Only 5-star reviews are imported, and photos/rating are refreshed on each import.
      </p>

      <div className="manager-form-grid">
        <label className="span-2" htmlFor="google-url">Google Maps link
          <input id="google-url" name="googleUrl" type="url" maxLength="2048"
            placeholder="https://maps.app.goo.gl/..." value={url}
            onChange={(e) => { setUrl(e.target.value); setPreview(null); setDone('') }} />
        </label>
      </div>

      <button className="button button-secondary" type="button"
        disabled={!url.trim() || previewMutation.isPending}
        onClick={() => previewMutation.mutate()}>
        {previewMutation.isPending ? 'Checking…' : 'Preview changes'}
      </button>

      {previewMutation.isError && (
        <p className="form-status error" role="alert">{errorMessage(previewMutation.error, 'Could not read that Google profile.')}</p>
      )}

      {preview && (
        <div className="google-preview">
          <p className="card-kicker">Found: {preview.googleName || 'Google profile'}</p>
          <div className="google-changes">
            <ChangeRow label="Rating" change={preview.changes?.rating} />
            <ChangeRow label="Review count" change={preview.changes?.reviewCount} />
            <ChangeRow label="Address" change={preview.changes?.address} />
            <ChangeRow label="Phone" change={preview.changes?.phone} />
          </div>
          <p className="muted">
            {preview.fiveStarReviewCount} five-star review(s) and {preview.photoCount} photo(s) will be imported.
          </p>
          <label className="google-contact-toggle">
            <input type="checkbox" checked={overwriteContact}
              onChange={(e) => setOverwriteContact(e.target.checked)} />
            Also update my address and phone from Google
          </label>
          <div className="google-preview-actions">
            <button className="button" type="button" disabled={applyMutation.isPending}
              onClick={() => applyMutation.mutate()}>
              {applyMutation.isPending ? 'Importing…' : 'Apply changes'}
            </button>
            <button className="button button-secondary" type="button"
              onClick={() => setPreview(null)}>Cancel</button>
          </div>
          {applyMutation.isError && (
            <p className="form-status error" role="alert">{errorMessage(applyMutation.error, 'Could not import.')}</p>
          )}
        </div>
      )}

      {done && <p className="form-status success" role="status">{done}</p>}
    </section>
  )
}
