import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { approveSalon, createOwner, errorMessage, getPendingSalons, salonKeys } from './salon-api.js'
import { salonUrl } from './platform-config.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import InputField from '../shared/components/InputField.jsx'
import Icon from '../shared/components/Icon.jsx'
import AdminNav from './AdminNav.jsx'

export default function AdminApprovals() {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState('')
  const [ownerForm, setOwnerForm] = useState({ name: '', phone: '', email: '', temporaryPassword: '' })
  const [ownerFeedback, setOwnerFeedback] = useState({ type: '', message: '' })
  const pendingQuery = useQuery({ queryKey: salonKeys.pending, queryFn: getPendingSalons })
  const provisioning = useMutation({
    mutationFn: createOwner,
    onSuccess: () => { setOwnerForm({ name: '', phone: '', email: '', temporaryPassword: '' }); setOwnerFeedback({ type: 'success', message: 'Owner account created.' }) },
    onError: (error) => {
      const fields = error?.response?.data?.fieldErrors
      if (fields && Object.keys(fields).length) setOwnerFeedback({ type: 'error', message: Object.entries(fields).map(([f, m]) => `${f}: ${m}`).join('. ') })
      else setOwnerFeedback({ type: 'error', message: errorMessage(error, 'Unable to create owner.') })
    },
  })
  const approval = useMutation({
    mutationFn: approveSalon,
    onSuccess: (salon) => { setFeedback(`${salon?.name || 'Salon'} approved!`); queryClient.invalidateQueries({ queryKey: salonKeys.pending }); queryClient.invalidateQueries({ queryKey: salonKeys.all }) },
    onError: (error) => setFeedback(errorMessage(error, 'Approval failed.')),
  })

  function updateOwner(e) { setOwnerForm((c) => ({ ...c, [e.target.name]: e.target.value })) }
  function submitOwner(e) { e.preventDefault(); setOwnerFeedback({ type: '', message: '' }); provisioning.mutate({ name: ownerForm.name.trim(), phone: ownerForm.phone.trim(), email: ownerForm.email.trim(), temporaryPassword: ownerForm.temporaryPassword }) }

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <AdminNav />
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Platform administration</p>
          <h1 className="font-display text-headline-md text-on-surface">Salon Approvals</h1>
          <p className="font-body text-body-md text-on-surface-variant mt-1">Review new businesses before they go live on Groomit.</p>
        </div>
        <div className="glass-panel rounded-lg px-6 py-4 text-center amber-glow">
          <strong className="font-display text-headline-md text-secondary-fixed block">{pendingQuery.data?.length ?? '—'}</strong>
          <span className="font-body text-label-sm text-on-surface-variant">Awaiting review</span>
        </div>
      </div>

      {/* Owner Provisioning */}
      <GlassPanel className="mb-8 max-w-xl">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Account provisioning</p>
        <h2 className="font-display text-headline-sm text-on-surface mb-2">Create Salon Owner</h2>
        <p className="font-body text-body-md text-on-surface-variant mb-6">Create the owner's account first; they'll register their salon after signing in.</p>
        <form onSubmit={submitOwner} className="flex flex-col gap-4">
          <InputField label="Owner name" icon="person" name="name" value={ownerForm.name} onChange={updateOwner} required maxLength={160} />
          <InputField label="Phone" icon="phone_iphone" type="tel" name="phone" value={ownerForm.phone} onChange={updateOwner} required minLength={10} maxLength={15} inputMode="tel" />
          <InputField label="Email" icon="mail" type="email" name="email" value={ownerForm.email} onChange={updateOwner} required maxLength={320} />
          <InputField label="Temporary password" icon="lock" type="password" name="temporaryPassword" value={ownerForm.temporaryPassword} onChange={updateOwner} required minLength={12} maxLength={72} />
          {ownerFeedback.message && <p className={`font-body text-body-md rounded px-3 py-2 ${ownerFeedback.type === 'error' ? 'text-error bg-error-container/20' : 'text-[#A89048] bg-[rgba(168,144,72,0.1)]'}`}>{ownerFeedback.message}</p>}
          <BrassButton type="submit" disabled={provisioning.isPending} className="w-full">{provisioning.isPending ? 'Creating...' : 'Create Salon Owner'}</BrassButton>
        </form>
      </GlassPanel>

      {feedback && <p className={`font-body text-body-md rounded px-3 py-2 mb-6 ${approval.isError ? 'text-error bg-error-container/20' : 'text-[#A89048] bg-[rgba(168,144,72,0.1)]'}`}>{feedback}</p>}

      {/* Pending Salons */}
      {pendingQuery.isLoading ? (
        <div className="flex flex-col gap-4">{[1, 2, 3].map((i) => <div key={i} className="glass-surface metallic-border rounded-lg h-32 animate-pulse" />)}</div>
      ) : pendingQuery.isError ? (
        <GlassPanel className="text-center"><p className="text-error mb-4">{errorMessage(pendingQuery.error)}</p><BrassButton onClick={() => pendingQuery.refetch()} variant="outline">Try again</BrassButton></GlassPanel>
      ) : !pendingQuery.data?.length ? (
        <GlassPanel className="text-center">
          <Icon name="check_circle" filled className="text-[#A89048] text-4xl mb-4" />
          <h2 className="font-display text-headline-sm text-on-surface mb-2">All caught up</h2>
          <p className="font-body text-body-md text-on-surface-variant">No salons waiting for approval.</p>
        </GlassPanel>
      ) : (
        <div className="flex flex-col gap-4">
          {pendingQuery.data.map((salon) => (
            <div key={salon.id} className="glass-surface metallic-border rounded-lg p-6 flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50 flex-shrink-0">
                {salon.logoUrl ? <img src={salon.logoUrl} alt="" className="w-full h-full object-cover rounded-full" /> : <span className="font-display text-secondary text-xl">{salon.name?.[0] || 'S'}</span>}
              </div>
              {/* Details */}
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[rgba(168,144,72,0.15)] text-[#A89048] px-2 py-0.5 rounded-full font-body text-label-sm">{salon.status || 'PENDING'}</span>
                  <h2 className="font-display text-title-lg text-on-surface">{salon.name}</h2>
                </div>
                <a href={salonUrl(salon.subdomain)} className="font-body text-label-sm text-secondary hover:underline">{salon.subdomain}.groomit.in</a>
                <p className="font-body text-body-md text-on-surface-variant mt-2">{salon.description || 'No description.'}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 font-body text-label-sm text-on-surface-variant">
                  <span><strong className="text-on-surface">Location:</strong> {salon.address || '—'}{salon.city ? `, ${salon.city}` : ''}</span>
                  <span><strong className="text-on-surface">Contact:</strong> {salon.email || '—'}</span>
                  <span><strong className="text-on-surface">Owner:</strong> {salon.ownerEmail || '—'}</span>
                </div>
              </div>
              {/* Action */}
              <div className="flex items-center flex-shrink-0">
                <BrassButton onClick={() => { setFeedback(''); approval.mutate(salon.id) }} disabled={approval.isPending}>
                  {approval.isPending && approval.variables === salon.id ? 'Approving...' : 'Approve'}
                </BrassButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
