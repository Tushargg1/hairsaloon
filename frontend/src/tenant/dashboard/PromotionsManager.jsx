import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import MultiSelect from '../../shared/components/MultiSelect.jsx'
import {
  createPromotion,
  deletePromotion,
  errorMessage,
  getDashboardPromotions,
  getDashboardServices,
  tenantKeys,
  updatePromotion,
} from '../tenant-api.js'

const emptyPromotion = {
  code: '', discountType: 'PERCENT', discountValue: '', startsAt: '', endsAt: '',
  totalLimit: '', perCustomerLimit: '', minimumSpend: '', active: true, serviceIds: [],
}

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function promotionForm(promotion = emptyPromotion) {
  return {
    code: promotion.code || '',
    discountType: promotion.discountType || 'PERCENT',
    discountValue: promotion.discountValue ?? '',
    startsAt: toLocalInput(promotion.startsAt),
    endsAt: toLocalInput(promotion.endsAt),
    totalLimit: promotion.totalLimit ?? '',
    perCustomerLimit: promotion.perCustomerLimit ?? '',
    minimumSpend: promotion.minimumSpend ?? '',
    active: promotion.active !== false,
    serviceIds: (promotion.serviceIds || []).map(String),
  }
}

const optionalNumber = (value) => value === '' ? null : Number(value)

function toPayload(form) {
  return {
    code: form.code.trim().toUpperCase(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    totalLimit: optionalNumber(form.totalLimit),
    perCustomerLimit: optionalNumber(form.perCustomerLimit),
    minimumSpend: optionalNumber(form.minimumSpend),
    active: form.active,
    serviceIds: form.serviceIds.map(Number),
  }
}

function PromotionFields({ form, onChange, prefix, services }) {
  function update(event) {
    const { name, type, checked, value } = event.target
    onChange((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }
  function toggleServiceId(id) {
    onChange((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(id)
        ? current.serviceIds.filter((value) => value !== id)
        : [...current.serviceIds, id],
    }))
  }

  const combo = form.discountType === 'COMBO'
  return <div className="manager-form-grid promotion-form-grid">
    <label htmlFor={`${prefix}-code`}>Promotion code<input id={`${prefix}-code`} name="code" required maxLength="40" autoComplete="off" value={form.code} onChange={update} /></label>
    <label htmlFor={`${prefix}-discount-type`}>Discount type<select id={`${prefix}-discount-type`} name="discountType" value={form.discountType} onChange={update}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option><option value="COMBO">Combo</option></select></label>
    <label htmlFor={`${prefix}-discount-value`}>{combo ? 'Combo price' : 'Discount value'}<input id={`${prefix}-discount-value`} name="discountValue" type="number" min="0.01" max={form.discountType === 'PERCENT' ? '100' : undefined} step="0.01" required value={form.discountValue} onChange={update} /></label>
    <label htmlFor={`${prefix}-minimum-spend`}>Minimum spend<input id={`${prefix}-minimum-spend`} name="minimumSpend" type="number" min="0" step="0.01" placeholder="Optional" value={form.minimumSpend} onChange={update} /></label>
    <label htmlFor={`${prefix}-starts-at`}>Starts at<input id={`${prefix}-starts-at`} name="startsAt" type="datetime-local" required value={form.startsAt} onChange={update} /></label>
    <label htmlFor={`${prefix}-ends-at`}>Ends at<input id={`${prefix}-ends-at`} name="endsAt" type="datetime-local" min={form.startsAt} required value={form.endsAt} onChange={update} /></label>
    <label htmlFor={`${prefix}-total-limit`}>Total redemption limit<input id={`${prefix}-total-limit`} name="totalLimit" type="number" min="1" step="1" placeholder="Optional" value={form.totalLimit} onChange={update} /></label>
    <label htmlFor={`${prefix}-customer-limit`}>Per-customer limit<input id={`${prefix}-customer-limit`} name="perCustomerLimit" type="number" min="1" step="1" placeholder="Optional" value={form.perCustomerLimit} onChange={update} /></label>
    <label>{combo ? 'Combo services' : 'Eligible services'}<MultiSelect label={combo ? 'Combo services' : 'Eligible services'} options={services} selected={form.serviceIds} onToggle={toggleServiceId} emptyLabel={combo ? 'Pick at least two' : 'All services'} /></label>
    <label className="checkbox-field span-2" htmlFor={`${prefix}-active`}><input id={`${prefix}-active`} name="active" type="checkbox" checked={form.active} onChange={update} /> Active and available to customers</label>
  </div>
}

function displayDate(value) {
  if (!value) return 'no end date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function discountSummary(promotion) {
  const value = promotion.discountValue ?? '—'
  if (promotion.discountType === 'PERCENT') return `${value}% off`
  if (promotion.discountType === 'COMBO') return `Combo ${value}`
  return `${value} off`
}

function PromotionEditor({ promotion, mutation, onDelete, services }) {
  const id = promotion.id ?? promotion.promotionId
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => promotionForm(promotion))
  const pending = mutation.isPending && mutation.variables?.id === id
  const eligibleServices = services.filter((service) => (promotion.serviceIds || []).map(String).includes(String(service.id)))

  async function save(event) {
    event.preventDefault()
    try {
      await mutation.mutateAsync({ action: 'update', id, payload: toPayload(form) })
      setEditing(false)
    } catch {
      // Mutation feedback is handled by the parent.
    }
  }

  if (editing) return <form className="manager-item manager-edit-form" onSubmit={save}>
    <h3>Edit {promotion.code}</h3>
    <PromotionFields form={form} onChange={setForm} prefix={`promotion-${id}`} services={services} />
    <div className="button-row"><button className="button button-small" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</button><button className="button button-ghost button-small" type="button" onClick={() => { setForm(promotionForm(promotion)); setEditing(false) }}>Cancel</button></div>
  </form>

  return <article className={`manager-item service-row ${promotion.active === false ? 'inactive' : ''}`}>
    <div className="min-w-0">
      <h3>{promotion.code}</h3>
      <p>{discountSummary(promotion)} · {eligibleServices.length
        ? eligibleServices.map((service) => service.name).join(', ')
        : 'All services'}</p>
      <p className="card-kicker">Until {displayDate(promotion.endsAt)}{promotion.minimumSpend
        ? ` · min spend ${promotion.minimumSpend}` : ''}</p>
    </div>
    <span className={`manager-status ${promotion.active === false ? 'inactive' : ''}`}>{promotion.active === false ? 'Inactive' : 'Active'}</span>
    <div className="service-actions">
      <button className="button button-secondary button-small" type="button" onClick={() => { setForm(promotionForm(promotion)); setEditing(true) }}>Edit</button>
      <button className="button button-secondary button-small" type="button" disabled={pending} onClick={() => onDelete(id)}>{pending && mutation.variables?.action === 'delete' ? 'Deleting…' : 'Delete'}</button>
    </div>
  </article>
}

export default function PromotionsManager() {
  const queryClient = useQueryClient()
  const [createForm, setCreateForm] = useState(() => promotionForm())
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const promotions = useQuery({ queryKey: tenantKeys.dashboardPromotions, queryFn: getDashboardPromotions })
  const services = useQuery({ queryKey: tenantKeys.dashboardServices, queryFn: getDashboardServices })
  const mutation = useMutation({
    mutationFn: ({ action, id, payload }) => {
      if (action === 'create') return createPromotion(payload)
      if (action === 'update') return updatePromotion({ id, payload })
      return deletePromotion(id)
    },
    onSuccess: (_, variables) => {
      const messages = { create: 'Promotion created.', update: 'Promotion updated.', delete: 'Promotion deleted.' }
      setFeedback({ type: 'success', message: messages[variables.action] })
      queryClient.invalidateQueries({ queryKey: tenantKeys.dashboardPromotions })
    },
    onError: (error, variables) => {
      const actions = { create: 'create', update: 'update', delete: 'delete' }
      setFeedback({ type: 'error', message: errorMessage(error, `Unable to ${actions[variables.action]} the promotion.`) })
    },
  })

  async function create(event) {
    event.preventDefault()
    setFeedback({ type: '', message: '' })
    try {
      await mutation.mutateAsync({ action: 'create', payload: toPayload(createForm) })
      setCreateForm(promotionForm())
    } catch {
      // Mutation feedback is handled by onError.
    }
  }

  function remove(id) {
    if (!globalThis.confirm('Delete this promotion? Customers will no longer be able to use it.')) return
    setFeedback({ type: '', message: '' })
    mutation.mutate({ action: 'delete', id })
  }

  const serviceList = services.data || []

  return <section className="manager-section" aria-labelledby="promotions-heading">
    <header className="manager-heading">
      <p className="eyebrow">Customer offers</p>
      <h2 id="promotions-heading">Promotions</h2>
      <p>Create service-specific or salon-wide discount codes with redemption controls.</p>
    </header>
    {feedback.message && <p className={`form-status ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
    <form className="manager-create-card" onSubmit={create}>
      <h3>Create a promotion</h3>
      <PromotionFields form={createForm} onChange={setCreateForm} prefix="new-promotion" services={serviceList} />
      {services.isError && <p className="form-status error" role="alert">Services could not be loaded. You can still create a promotion that applies to all services.</p>}
      <button className="button" type="submit" disabled={mutation.isPending}>{mutation.isPending && mutation.variables?.action === 'create' ? 'Creating…' : 'Create promotion'}</button>
    </form>

    {promotions.isLoading ? <div className="manager-loading" aria-live="polite">Loading promotions…</div> : promotions.isError ? (
      <div className="state-card dashboard-state" role="alert"><h3>Couldn’t load promotions</h3><p>{errorMessage(promotions.error)}</p><button className="button button-secondary button-small" type="button" onClick={() => promotions.refetch()}>Try again</button></div>
    ) : promotions.data.length === 0 ? (
      <div className="state-card dashboard-state"><h3>No promotions yet</h3><p>Create the first customer offer using the form above.</p></div>
    ) : (
      <div className="manager-list">
        {promotions.data.map((promotion) => <PromotionEditor key={promotion.id ?? promotion.promotionId ?? promotion.code} promotion={promotion} mutation={mutation} onDelete={remove} services={serviceList} />)}
      </div>
    )}
  </section>
}
