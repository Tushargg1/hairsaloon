import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { approveSalon, errorMessage, getPendingSalons, salonKeys } from './salon-api.js'
import { salonUrl } from './platform-config.js'

export default function AdminApprovals() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState('')
  const pendingQuery = useQuery({ queryKey: salonKeys.pending, queryFn: getPendingSalons })
  const approval = useMutation({
    mutationFn: approveSalon,
    onSuccess: (salon) => {
      setFeedback(`${salon?.name || 'Salon'} approved successfully.`)
      queryClient.invalidateQueries({ queryKey: salonKeys.pending })
      queryClient.invalidateQueries({ queryKey: salonKeys.all })
    },
    onError: (error) => setFeedback(errorMessage(error, 'Approval failed. Please try again.')),
  })

  return (
    <main className="admin-page page-width">
      <header className="admin-heading">
        <div><p className="eyebrow">Platform administration</p><h1>Salon approvals</h1><p>Review new businesses before they become visible on HairSaloon.</p></div>
        <div className="count-card"><strong>{pendingQuery.data?.length ?? '—'}</strong><span>Awaiting review</span></div>
      </header>

      {feedback && <p className={`form-status ${approval.isError ? 'error' : 'success'}`} role="status">{feedback}</p>}

      {pendingQuery.isLoading ? (
        <section className="approval-list" aria-label="Loading pending salons">
          {[1, 2, 3].map((item) => <div className="approval-card skeleton" key={item} />)}
        </section>
      ) : pendingQuery.isError ? (
        <section className="state-card" role="alert"><h2>Couldn’t load applications</h2><p>{errorMessage(pendingQuery.error)}</p><button className="button button-secondary" onClick={() => pendingQuery.refetch()}>Try again</button></section>
      ) : pendingQuery.data.length === 0 ? (
        <section className="state-card success-empty"><span aria-hidden="true">✓</span><h2>You’re all caught up</h2><p>There are no salons waiting for approval.</p></section>
      ) : (
        <section className="approval-list" aria-label="Pending salon applications">
          {pendingQuery.data.map((salon) => (
            <article className="approval-card" key={salon.id}>
              <div className="approval-logo">
                {salon.logoUrl ? <img src={salon.logoUrl} alt={`${salon.name} logo`} /> : <span>{salon.name?.slice(0, 1) || 'S'}</span>}
              </div>
              <div className="approval-main">
                <div className="approval-title"><div><span className="status-pill pending">{salon.status || 'PENDING'}</span><h2>{salon.name}</h2><a href={salonUrl(salon.subdomain)}>{salon.subdomain}</a></div></div>
                <p>{salon.description || 'No description supplied.'}</p>
                <dl className="approval-details">
                  <div><dt>Location</dt><dd>{salon.address || '—'}{salon.city ? `, ${salon.city}` : ''}</dd></div>
                  <div><dt>Salon contact</dt><dd>{salon.email || '—'}<br />{salon.phone || '—'}</dd></div>
                  <div><dt>Owner / timezone</dt><dd>{salon.ownerEmail || '—'}<br />{salon.timezone || '—'}</dd></div>
                </dl>
              </div>
              <div className="approval-actions">
                <button className="button" disabled={approval.isPending} onClick={() => { setFeedback(''); approval.mutate(salon.id) }}>
                  {approval.isPending && approval.variables === salon.id ? 'Approving…' : 'Approve salon'}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
