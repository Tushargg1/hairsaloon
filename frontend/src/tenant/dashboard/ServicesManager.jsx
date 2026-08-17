import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createService,
  deactivateService,
  errorMessage,
  getDashboardServices,
  tenantKeys,
  updateService,
} from '../tenant-api.js'

const emptyService = { name: '', category: '', durationMinutes: '60', price: '', active: true }

function toForm(service = emptyService) {
  return {
    name: service.name || '',
    category: service.category || '',
    durationMinutes: String(service.durationMinutes ?? 60),
    price: String(service.price ?? ''),
    active: service.active !== false,
  }
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    category: form.category.trim(),
    durationMinutes: Number(form.durationMinutes),
    price: Number(form.price),
    active: form.active,
  }
}

function ServiceFields({ form, onChange }) {
  function update(event) {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    onChange((current) => ({ ...current, [event.target.name]: value }))
  }
  return (
    <div className="manager-form-grid">
      <label>Service name<input name="name" required value={form.name} onChange={update} /></label>
      <label>Category<input name="category" required value={form.category} onChange={update} /></label>
      <label>Duration (minutes)<input name="durationMinutes" type="number" min="15" max="180" step="15" required value={form.durationMinutes} onChange={update} /></label>
      <label>Price<input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={update} /></label>
      <label className="checkbox-field"><input name="active" type="checkbox" checked={form.active} onChange={update} /> Active</label>
    </div>
  )
}

function ServiceEditor({ service, pending, onSave, onDeactivate }) {
  const [form, setForm] = useState(() => toForm(service))
  const [editing, setEditing] = useState(false)

  async function submit(event) {
    event.preventDefault()
    try {
      await onSave({ id: service.id, payload: toPayload(form) })
      setEditing(false)
    } catch {
      // Mutation feedback is handled by the manager.
    }
  }

  if (!editing) {
    return (
      <article className={`manager-item ${service.active === false ? 'inactive' : ''}`}>
        <div><p className="card-kicker">{service.category || 'Uncategorized'}</p><h3>{service.name}</h3><p>{service.durationMinutes || '—'} minutes · {service.price ?? '—'}</p></div>
        <span className={`manager-status ${service.active === false ? 'inactive' : ''}`}>{service.active === false ? 'Inactive' : 'Active'}</span>
        <div className="button-row"><button className="button button-secondary button-small" onClick={() => setEditing(true)}>Edit</button>{service.active !== false && <button className="button button-ghost button-small" disabled={pending} onClick={() => onDeactivate(service.id)}>Deactivate</button>}</div>
      </article>
    )
  }

  return (
    <form className="manager-item manager-edit-form" onSubmit={submit}>
      <ServiceFields form={form} onChange={setForm} />
      <div className="button-row"><button className="button button-small" disabled={pending} type="submit">{pending ? 'Saving…' : 'Save service'}</button><button className="button button-ghost button-small" type="button" onClick={() => { setForm(toForm(service)); setEditing(false) }}>Cancel</button></div>
    </form>
  )
}

export default function ServicesManager() {
  const queryClient = useQueryClient()
  const [createForm, setCreateForm] = useState(emptyService)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const servicesQuery = useQuery({ queryKey: tenantKeys.dashboardServices, queryFn: getDashboardServices })
  const saveMutation = useMutation({
    mutationFn: (variables) => variables.id ? updateService(variables) : createService(variables.payload),
    onSuccess: (_, variables) => {
      setFeedback({ type: 'success', message: variables.id ? 'Service updated.' : 'Service created.' })
      queryClient.invalidateQueries({ queryKey: tenantKeys.dashboardServices })
      queryClient.invalidateQueries({ queryKey: tenantKeys.publicServices })
    },
    onError: (error) => setFeedback({ type: 'error', message: errorMessage(error, 'Unable to save the service.') }),
  })
  const deactivateMutation = useMutation({
    mutationFn: deactivateService,
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Service deactivated.' })
      queryClient.invalidateQueries({ queryKey: tenantKeys.dashboardServices })
      queryClient.invalidateQueries({ queryKey: tenantKeys.publicServices })
    },
    onError: (error) => setFeedback({ type: 'error', message: errorMessage(error, 'Unable to deactivate the service.') }),
  })

  async function create(event) {
    event.preventDefault()
    setFeedback({ type: '', message: '' })
    try {
      await saveMutation.mutateAsync({ payload: toPayload(createForm) })
      setCreateForm(emptyService)
    } catch {
      // Mutation feedback is handled by onError.
    }
  }

  return (
    <section className="manager-section" aria-labelledby="services-heading">
      <div className="manager-heading"><div><p className="eyebrow">Service menu</p><h2 id="services-heading">Services</h2><p>Create, update, and deactivate salon services.</p></div></div>
      {feedback.message && <p className={`form-status ${feedback.type}`} role="status">{feedback.message}</p>}
      <form className="manager-create-card" onSubmit={create}>
        <h3>Add a service</h3>
        <ServiceFields form={createForm} onChange={setCreateForm} />
        <button className="button" disabled={saveMutation.isPending} type="submit">{saveMutation.isPending && !saveMutation.variables?.id ? 'Creating…' : 'Create service'}</button>
      </form>

      {servicesQuery.isLoading ? <div className="manager-loading" aria-live="polite">Loading services…</div> : servicesQuery.isError ? (
        <div className="state-card dashboard-state" role="alert"><h2>Couldn’t load services</h2><p>{errorMessage(servicesQuery.error)}</p><button className="button button-secondary" onClick={() => servicesQuery.refetch()}>Try again</button></div>
      ) : servicesQuery.data.length === 0 ? (
        <div className="state-card dashboard-state"><h2>No services yet</h2><p>Add the first service using the form above.</p></div>
      ) : (
        <div className="manager-list">
          {servicesQuery.data.map((service) => <ServiceEditor key={service.id} service={service} pending={(saveMutation.isPending && saveMutation.variables?.id === service.id) || (deactivateMutation.isPending && deactivateMutation.variables === service.id)} onSave={saveMutation.mutateAsync} onDeactivate={(id) => { setFeedback({ type: '', message: '' }); deactivateMutation.mutate(id) }} />)}
        </div>
      )}
    </section>
  )
}