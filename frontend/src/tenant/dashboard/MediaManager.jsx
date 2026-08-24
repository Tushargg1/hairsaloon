import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  errorMessage,
  getDashboardMedia,
  tenantKeys,
  uploadSalonImage,
} from '../tenant-api.js'

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxSizeBytes = { GALLERY: 10 * 1024 * 1024, LOGO: 5 * 1024 * 1024, STAFF: 5 * 1024 * 1024 }

function unavailable(error) {
  return [404, 405, 501].includes(error?.response?.status)
}

function mediaUrl(item) {
  const value = typeof item === 'string' ? item : item?.url || item?.mediaUrl || item?.imageUrl || item?.publicUrl
  if (!value) return ''
  try {
    const url = new URL(value, window.location.origin)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function validateFile(file, type) {
  if (!file) return 'Choose an image to upload.'
  if (!acceptedTypes.includes(file.type)) return 'Use a JPEG, PNG, or WebP image.'
  const limit = maxSizeBytes[type] || maxSizeBytes.GALLERY
  if (file.size > limit) return `This image must be ${limit / 1_048_576} MB or smaller.`
  if (file.size === 0) return 'The selected image is empty.'
  return ''
}

export default function MediaManager() {
  const queryClient = useQueryClient()
  const fileInput = useRef(null)
  // This section is the salon gallery only; the logo is uploaded from the
  // salon details form above.
  const type = 'GALLERY'
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState({ value: 0, label: '' })
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const media = useQuery({ queryKey: tenantKeys.dashboardMedia, queryFn: getDashboardMedia, retry: false })
  const upload = useMutation({
    mutationFn: ({ uploadType, image }) => uploadSalonImage({
      type: uploadType,
      file: image,
      onStep: (value, label) => setProgress({ value, label }),
    }),
    onSuccess: () => {
      setProgress({ value: 3, label: 'Upload complete.' })
      setFeedback({ type: 'success', message: 'Image uploaded and confirmed.' })
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      queryClient.invalidateQueries({ queryKey: tenantKeys.dashboardMedia })
      queryClient.invalidateQueries({ queryKey: tenantKeys.profile })
    },
    onError: (error) => {
      setProgress({ value: 0, label: 'Upload failed.' })
      setFeedback({
      type: 'error',
      message: unavailable(error)
        ? 'Media uploads are not enabled by the backend for this salon.'
        : error?.message?.startsWith('Media uploads') || error?.message?.startsWith('Direct media upload')
          ? error.message
          : errorMessage(error, 'Unable to upload this image.'),
      })
    },
  })

  function submit(event) {
    event.preventDefault()
    const validationMessage = validateFile(file, type)
    if (validationMessage) {
      setProgress({ value: 0, label: '' })
      setFeedback({ type: 'error', message: validationMessage })
      return
    }
    setFeedback({ type: '', message: '' })
    upload.mutate({ uploadType: type, image: file })
  }

  const listUnavailable = media.isError && unavailable(media.error)

  return (
    <section className="manager-section" aria-labelledby="media-heading">
      <header className="manager-heading">
        <p className="eyebrow">Salon imagery</p>
        <h2 id="media-heading">Salon photos</h2>
        <p>Photos of the salon, shown in the gallery on your public page.</p>
      </header>
      {feedback.message && <p className={`form-status ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
      <form className="manager-create-card" onSubmit={submit}>
        <h3>Add a salon photo</h3>
        <div className="manager-form-grid">
          <label className="span-2">Image file
            <input ref={fileInput} type="file" accept={acceptedTypes.join(',')} onChange={(event) => { setFile(event.target.files?.[0] || null); setProgress({ value: 0, label: '' }); setFeedback({ type: '', message: '' }) }} />
          </label>
        </div>
        <p className="muted">JPEG, PNG, or WebP. Maximum size 10 MB.</p>
        {(upload.isPending || progress.label) && <div className="upload-progress" role="status" aria-live="polite"><progress max="3" value={progress.value} aria-label="Media upload progress" /><span>{progress.label}</span></div>}
        <button className="button" type="submit" disabled={upload.isPending}>{upload.isPending ? 'Uploading…' : 'Upload photo'}</button>
      </form>

      {media.isLoading ? <div className="manager-loading" aria-live="polite">Loading media…</div> : listUnavailable ? (
        <div className="state-card dashboard-state" role="status">
          <h3>Media management is not available</h3>
          <p>This backend does not currently support salon media uploads. Existing salon pages remain available.</p>
        </div>
      ) : media.isError ? (
        <div className="state-card dashboard-state" role="alert">
          <h3>Couldn’t load media</h3>
          <p>{errorMessage(media.error)}</p>
          <button className="button button-secondary button-small" type="button" onClick={() => media.refetch()}>Try again</button>
        </div>
      ) : media.data.length === 0 ? (
        <div className="state-card dashboard-state"><h3>No photos yet</h3><p>Upload the first salon photo using the form above.</p></div>
      ) : (
        <ul className="media-gallery" aria-label="Uploaded salon media">
          {media.data.map((item, index) => {
            const url = mediaUrl(item)
            const label = item.altText || `${item.type || 'Salon'} image`
            return <li key={item.id || item.uploadId || url || index}>
              <figure>
                {url ? <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${label} at full size`}><img src={url} alt={label} /></a> : <div className="media-placeholder" role="status">Processing image</div>}
                <figcaption><strong>{item.type || item.mediaType || 'Salon image'}</strong><span>{item.fileName || item.contentType || 'Uploaded media'}{item.sizeBytes ? ` · ${(item.sizeBytes / 1_048_576).toFixed(1)} MB` : ''}</span></figcaption>
              </figure>
            </li>
          })}
        </ul>
      )}
    </section>
  )
}