import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth.js'
import { apiErrorMessage } from '../api/client.js'

/**
 * Danger-zone control to permanently delete (anonymize) the caller's own account.
 * Requires typing DELETE to confirm, then ends the session and redirects home.
 */
export default function DeleteAccount({ note }) {
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await deleteAccount()
      navigate('/', { replace: true })
    } catch (e) {
      setBusy(false)
      setError(apiErrorMessage(e, 'Could not delete the account.'))
    }
  }

  return (
    <div className="rounded-xl border border-error/40 bg-error-container/10 p-6">
      <h2 className="font-display text-headline-sm text-error mb-1">Delete account</h2>
      <p className="font-body text-body-md text-on-surface-variant mb-4">
        {note || 'This permanently closes your account and removes your personal data. This cannot be undone.'}
      </p>

      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)}
          className="font-body font-semibold px-5 py-2 rounded border border-error text-error hover:bg-error hover:text-on-error transition-colors">
          Delete my account
        </button>
      ) : (
        <div className="flex flex-col gap-3 max-w-sm">
          <label className="font-body text-label-md text-on-surface-variant">
            Type <span className="font-semibold text-error">DELETE</span> to confirm
            <input value={text} onChange={(e) => setText(e.target.value)}
              className="mt-1 w-full rounded border border-outline-variant/40 bg-transparent px-3 py-2" />
          </label>
          {error && <p className="font-body text-label-sm text-error" role="alert">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={remove} disabled={busy || text !== 'DELETE'}
              className="font-body font-semibold px-5 py-2 rounded bg-error text-on-error disabled:opacity-40">
              {busy ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button type="button" onClick={() => { setConfirming(false); setText(''); setError('') }}
              className="font-body px-5 py-2 rounded border border-outline-variant/40 text-on-surface-variant">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
