import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { createOwner, errorMessage } from './salon-api.js'
import GlassPanel from '../shared/components/GlassPanel.jsx'
import BrassButton from '../shared/components/BrassButton.jsx'
import InputField from '../shared/components/InputField.jsx'
import AdminNav from './AdminNav.jsx'

export default function AdminAddSalon() {
  const [ownerForm, setOwnerForm] = useState({ name: '', phone: '', email: '', temporaryPassword: '' })
  const [ownerFeedback, setOwnerFeedback] = useState({ type: '', message: '' })
  const provisioning = useMutation({
    mutationFn: createOwner,
    onSuccess: () => { setOwnerForm({ name: '', phone: '', email: '', temporaryPassword: '' }); setOwnerFeedback({ type: 'success', message: 'Owner account created.' }) },
    onError: (error) => {
      const fields = error?.response?.data?.fieldErrors
      if (fields && Object.keys(fields).length) setOwnerFeedback({ type: 'error', message: Object.entries(fields).map(([f, m]) => `${f}: ${m}`).join('. ') })
      else setOwnerFeedback({ type: 'error', message: errorMessage(error, 'Unable to create owner.') })
    },
  })

  function updateOwner(e) { setOwnerForm((c) => ({ ...c, [e.target.name]: e.target.value })) }
  function submitOwner(e) { e.preventDefault(); setOwnerFeedback({ type: '', message: '' }); provisioning.mutate({ name: ownerForm.name.trim(), phone: ownerForm.phone.trim(), email: ownerForm.email.trim(), temporaryPassword: ownerForm.temporaryPassword }) }

  return (
    <main className="max-w-[1280px] mx-auto px-4 py-12">
      <AdminNav />
      <div className="mb-8">
        <p className="font-body text-label-md text-secondary tracking-wider uppercase mb-1">Platform administration</p>
        <h1 className="font-display text-headline-md text-on-surface">Add a Salon</h1>
        <p className="font-body text-body-md text-on-surface-variant mt-1">Create the owner's account first; they'll register their salon after signing in.</p>
      </div>

      <GlassPanel className="max-w-xl">
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
    </main>
  )
}
