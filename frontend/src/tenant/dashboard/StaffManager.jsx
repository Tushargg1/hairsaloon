import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  addTimeOff,
  createStaff,
  deactivateStaff,
  deleteTimeOff,
  errorMessage,
  getDashboardServices,
  getDashboardStaff,
  getStaffTimeOff,
  tenantKeys,
  unwrapCollection,
  updateStaff,
  updateStaffServices,
  updateWorkingHours,
} from '../tenant-api.js'

const days = [
  { value: 0, label: 'SUNDAY' },
  { value: 1, label: 'MONDAY' },
  { value: 2, label: 'TUESDAY' },
  { value: 3, label: 'WEDNESDAY' },
  { value: 4, label: 'THURSDAY' },
  { value: 5, label: 'FRIDAY' },
  { value: 6, label: 'SATURDAY' },
]
const dayLabel = (value) => days.find((day) => day.value === Number(value) || day.label === String(value).toUpperCase())?.label || value
const emptyStaff = { name: '', photoUrl: '', serviceIds: [] }
const emptyTimeOff = { startDateTime: '', endDateTime: '', reason: '' }

function relatedServices(staff) {
  const directIds = Array.isArray(staff.serviceIds) ? staff.serviceIds : []
  if (directIds.length) return directIds.map(String)
  return unwrapCollection(staff.services || staff.assignedServices, ['services'])
    .map((service) => service?.id)
    .filter((id) => id != null)
    .map(String)
}

function suppliedHours(staff) {
  return unwrapCollection(staff.workingHours || staff.hours || staff.schedule, ['workingHours', 'hours'])
}

function initialHours(staff) {
  const existing = suppliedHours(staff)
  return days.map((day) => {
    const match = existing.find((item) => {
      const suppliedDay = item.dayOfWeek ?? item.day
      return Number(suppliedDay) === day.value || String(suppliedDay).toUpperCase() === day.label
    })
    return { dayOfWeek: day.value, label: day.label, closed: !match || match.closed === true, startTime: match?.startTime || '09:00', endTime: match?.endTime || '17:00' }
  })
}

function displayDateTime(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function ServiceChoices({ services, selected, onChange }) {
  function toggle(id) {
    const value = String(id)
    onChange((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }
  if (!services.length) return <p className="muted">No active services are available for assignment.</p>
  return <div className="choice-grid">{services.map((service) => <label className="checkbox-field" key={service.id}><input type="checkbox" checked={selected.includes(String(service.id))} onChange={() => toggle(service.id)} /> {service.name}</label>)}</div>
}

function StaffProfileEditor({ staff, pending, onSave, onStatusChange }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: staff.name || '', photoUrl: staff.photoUrl || '' })

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    try {
      await onSave({ action: 'edit', id: staff.id, payload: { name: form.name.trim(), photoUrl: form.photoUrl.trim(), active: staff.active !== false } })
      setEditing(false)
    } catch {
      // Mutation feedback is handled by the manager.
    }
  }

  if (editing) {
    return (
      <form className="staff-subform" onSubmit={submit}>
        <h4>Edit staff member</h4>
        <div className="manager-form-grid"><label>Name<input name="name" required value={form.name} onChange={update} /></label><label>Photo URL <span className="optional">optional</span><input name="photoUrl" type="url" value={form.photoUrl} onChange={update} /></label></div>
        <div className="button-row"><button className="button button-small" disabled={pending} type="submit">{pending ? 'Saving…' : 'Save staff member'}</button><button className="button button-ghost button-small" disabled={pending} type="button" onClick={() => setEditing(false)}>Cancel</button></div>
      </form>
    )
  }

  return (
    <div className="button-row">
      <button className="button button-secondary button-small" disabled={pending} type="button" onClick={() => setEditing(true)}>Edit</button>
      {staff.active === false ? (
        <button className="button button-small" disabled={pending} type="button" onClick={() => onStatusChange({ action: 'reactivate', id: staff.id, payload: { name: staff.name, photoUrl: staff.photoUrl || '', active: true } })}>{pending ? 'Reactivating…' : 'Reactivate'}</button>
      ) : (
        <button className="button button-ghost button-small" disabled={pending} type="button" onClick={() => onStatusChange({ action: 'deactivate', id: staff.id })}>{pending ? 'Deactivating…' : 'Deactivate'}</button>
      )}
    </div>
  )
}

function WorkingHoursForm({ staff, pending, onSave }) {
  const [hours, setHours] = useState(() => initialHours(staff))
  const [validation, setValidation] = useState('')

  function update(index, field, value) {
    setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))
  }

  function submit(event) {
    event.preventDefault()
    const workingHours = hours.filter((item) => !item.closed).map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))
    if (workingHours.some((item) => item.startTime >= item.endTime)) {
      setValidation('Each start time must be before its end time.')
      return
    }
    setValidation('')
    onSave({ action: 'hours', id: staff.id, workingHours })
  }

  return (
    <form className="staff-subform" onSubmit={submit}>
      <h4>Weekly working hours</h4>
      {validation && <p className="form-status error" role="alert">{validation}</p>}
      <div className="hours-grid">{hours.map((item, index) => <div className="hours-row" key={item.dayOfWeek}><strong>{item.label.slice(0, 3)}</strong><label className="checkbox-field"><input type="checkbox" checked={item.closed} onChange={(event) => update(index, 'closed', event.target.checked)} /> Closed</label><label><span className="sr-only">{item.label} start time</span><input type="time" disabled={item.closed} required={!item.closed} value={item.startTime} onChange={(event) => update(index, 'startTime', event.target.value)} /></label><label><span className="sr-only">{item.label} end time</span><input type="time" disabled={item.closed} required={!item.closed} value={item.endTime} onChange={(event) => update(index, 'endTime', event.target.value)} /></label></div>)}</div>
      <button className="button button-small" disabled={pending} type="submit">{pending ? 'Saving…' : 'Save hours'}</button>
    </form>
  )
}

function TimeOffForm({ staff, pending, onSave }) {
  const [form, setForm] = useState(emptyTimeOff)
  const [validation, setValidation] = useState('')

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (form.startDateTime >= form.endDateTime) {
      setValidation('The start date and time must be before the end date and time.')
      return
    }
    setValidation('')
    try {
      await onSave({ action: 'addTimeOff', id: staff.id, timeOff: { ...form, reason: form.reason.trim() || null } })
      setForm(emptyTimeOff)
    } catch {
      // Mutation feedback is handled by the manager.
    }
  }

  return (
    <form className="staff-subform" onSubmit={submit}>
      <h4>Add time off</h4>
      {validation && <p className="form-status error" role="alert">{validation}</p>}
      <div className="manager-form-grid"><label>Starts<input name="startDateTime" type="datetime-local" required value={form.startDateTime} onChange={update} /></label><label>Ends<input name="endDateTime" type="datetime-local" required value={form.endDateTime} onChange={update} /></label><label className="span-2">Reason <span className="optional">optional</span><input name="reason" maxLength="255" value={form.reason} onChange={update} /></label></div>
      <button className="button button-small" disabled={pending} type="submit">{pending ? 'Adding…' : 'Add time off'}</button>
    </form>
  )
}

function TimeOffList({ staff, mutation, activeAction }) {
  const timeOffQuery = useQuery({ queryKey: tenantKeys.staffTimeOff(staff.id), queryFn: () => getStaffTimeOff(staff.id) })

  return (
    <section className="staff-subform" aria-labelledby={`time-off-${staff.id}`}>
      <h4 id={`time-off-${staff.id}`}>Scheduled time off</h4>
      {timeOffQuery.isLoading ? <p className="muted" aria-live="polite">Loading time off…</p> : timeOffQuery.isError ? (
        <div className="form-status error" role="alert"><p>{errorMessage(timeOffQuery.error, 'Unable to load time off.')}</p><button className="button button-secondary button-small" type="button" onClick={() => timeOffQuery.refetch()}>Try again</button></div>
      ) : timeOffQuery.data.length === 0 ? <p className="muted">No time off scheduled.</p> : (
        <ul>{timeOffQuery.data.map((item) => <li key={item.id}>{displayDateTime(item.startDateTime)} to {displayDateTime(item.endDateTime)}{item.reason ? ` — ${item.reason}` : ''} <button className="button button-ghost button-small" disabled={Boolean(activeAction)} type="button" onClick={() => mutation.mutate({ action: 'deleteTimeOff', id: staff.id, timeOffId: item.id })}>{activeAction === 'deleteTimeOff' && mutation.variables?.timeOffId === item.id ? 'Deleting…' : 'Delete'}</button></li>)}</ul>
      )}
    </section>
  )
}

function ExistingDetails({ staff, services }) {
  const assignments = relatedServices(staff).map((id) => services.find((service) => String(service.id) === id)?.name || id)
  const hours = suppliedHours(staff)
  return (
    <div className="staff-existing">
      <div><strong>Status</strong><p>{staff.active === false ? 'Inactive' : 'Active'}</p></div>
      <div><strong>Assigned services</strong><p>{assignments.length ? assignments.join(', ') : 'None assigned'}</p></div>
      <div><strong>Current hours</strong>{hours.length ? <ul>{hours.map((item, index) => <li key={`${item.dayOfWeek ?? item.day}-${index}`}>{dayLabel(item.dayOfWeek ?? item.day)}: {item.startTime}–{item.endTime}</li>)}</ul> : <p>No working hours set.</p>}</div>
    </div>
  )
}

function StaffCard({ staff, services, mutation }) {
  const [serviceIds, setServiceIds] = useState(() => relatedServices(staff))
  const activeAction = mutation.isPending && mutation.variables?.id === staff.id ? mutation.variables.action : ''

  function saveAssignments(event) {
    event.preventDefault()
    mutation.mutate({ action: 'services', id: staff.id, serviceIds: serviceIds.map(Number) })
  }

  return (
    <article className={`staff-manager-card ${staff.active === false ? 'inactive' : ''}`}>
      <header className="staff-card-header">
        <div className="staff-avatar">{staff.photoUrl ? <img src={staff.photoUrl} alt={`${staff.name} portrait`} /> : <span>{staff.name?.charAt(0) || 'S'}</span>}</div>
        <div><p className="card-kicker">Staff member</p><h3>{staff.name || 'Unnamed staff member'}</h3></div>
        <span className={`manager-status ${staff.active === false ? 'inactive' : ''}`}>{staff.active === false ? 'Inactive' : 'Active'}</span>
      </header>
      <StaffProfileEditor staff={staff} pending={activeAction === 'edit' || activeAction === 'deactivate' || activeAction === 'reactivate'} onSave={mutation.mutateAsync} onStatusChange={mutation.mutate} />
      <ExistingDetails staff={staff} services={services} />
      <form className="staff-subform" onSubmit={saveAssignments}>
        <h4>Service assignments</h4>
        <ServiceChoices services={services} selected={serviceIds} onChange={setServiceIds} />
        <button className="button button-small" disabled={Boolean(activeAction)} type="submit">{activeAction === 'services' ? 'Saving…' : 'Save assignments'}</button>
      </form>
      <WorkingHoursForm staff={staff} pending={activeAction === 'hours'} onSave={mutation.mutate} />
      <TimeOffList staff={staff} mutation={mutation} activeAction={activeAction} />
      <TimeOffForm staff={staff} pending={activeAction === 'addTimeOff'} onSave={mutation.mutateAsync} />
    </article>
  )
}

export default function StaffManager() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyStaff)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const staffQuery = useQuery({ queryKey: tenantKeys.dashboardStaff, queryFn: getDashboardStaff })
  const servicesQuery = useQuery({ queryKey: tenantKeys.dashboardServices, queryFn: getDashboardServices })
  const services = (servicesQuery.data || []).filter((service) => service.active !== false)

  const mutation = useMutation({
    mutationFn: async (variables) => {
      if (variables.action === 'create') {
        const created = await createStaff(variables.payload)
        if (variables.serviceIds.length) await updateStaffServices({ id: created.id, serviceIds: variables.serviceIds })
        return created
      }
      if (variables.action === 'edit' || variables.action === 'reactivate') return updateStaff(variables)
      if (variables.action === 'deactivate') return deactivateStaff(variables.id)
      if (variables.action === 'services') return updateStaffServices(variables)
      if (variables.action === 'hours') return updateWorkingHours(variables)
      if (variables.action === 'deleteTimeOff') return deleteTimeOff(variables)
      return addTimeOff(variables)
    },
    onSuccess: (_, variables) => {
      const messages = { create: 'Staff member added.', edit: 'Staff member updated.', reactivate: 'Staff member reactivated.', deactivate: 'Staff member deactivated.', services: 'Service assignments updated.', hours: 'Working hours updated.', addTimeOff: 'Time off added.', deleteTimeOff: 'Time off deleted.' }
      setFeedback({ type: 'success', message: messages[variables.action] })
      queryClient.invalidateQueries({ queryKey: tenantKeys.dashboardStaff })
      queryClient.invalidateQueries({ queryKey: tenantKeys.publicStaff })
      if (variables.id && (variables.action === 'addTimeOff' || variables.action === 'deleteTimeOff')) queryClient.invalidateQueries({ queryKey: tenantKeys.staffTimeOff(variables.id) })
    },
    onError: (error) => setFeedback({ type: 'error', message: errorMessage(error, 'Unable to update staff details.') }),
  })

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submitStaff(event) {
    event.preventDefault()
    setFeedback({ type: '', message: '' })
    try {
      await mutation.mutateAsync({ action: 'create', payload: { name: form.name.trim(), photoUrl: form.photoUrl.trim() }, serviceIds: form.serviceIds.map(Number) })
      setForm(emptyStaff)
    } catch {
      // Mutation feedback is handled by onError.
    }
  }

  const creating = mutation.isPending && mutation.variables?.action === 'create'

  return (
    <section className="manager-section" aria-labelledby="staff-heading">
      <div className="manager-heading"><div><p className="eyebrow">Team management</p><h2 id="staff-heading">Staff</h2><p>Add team members and maintain their services, hours, and time off.</p></div></div>
      {feedback.message && <p className={`form-status ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
      <form className="manager-create-card" onSubmit={submitStaff}>
        <h3>Add a staff member</h3>
        <div className="manager-form-grid"><label>Name<input name="name" required value={form.name} onChange={update} /></label><label>Photo URL <span className="optional">optional</span><input name="photoUrl" type="url" value={form.photoUrl} onChange={update} /></label></div>
        <fieldset><legend>Initial service assignments</legend>{servicesQuery.isLoading ? <p className="muted">Loading services…</p> : servicesQuery.isError ? <div className="form-status error" role="alert"><p>Services could not be loaded.</p><button className="button button-secondary button-small" type="button" onClick={() => servicesQuery.refetch()}>Try again</button></div> : <ServiceChoices services={services} selected={form.serviceIds} onChange={(updateIds) => setForm((current) => ({ ...current, serviceIds: updateIds(current.serviceIds) }))} />}</fieldset>
        <button className="button" disabled={creating} type="submit">{creating ? 'Adding…' : 'Add staff member'}</button>
      </form>

      {staffQuery.isLoading ? <div className="manager-loading" aria-live="polite">Loading staff…</div> : staffQuery.isError ? (
        <div className="state-card dashboard-state" role="alert"><h2>Couldn’t load staff</h2><p>{errorMessage(staffQuery.error)}</p><button className="button button-secondary" onClick={() => staffQuery.refetch()}>Try again</button></div>
      ) : staffQuery.data.length === 0 ? (
        <div className="state-card dashboard-state"><h2>No staff yet</h2><p>Add the first team member using the form above.</p></div>
      ) : (
        <div className="staff-manager-list">{staffQuery.data.map((staff) => <StaffCard key={`${staff.id}-${staff.name}-${staff.photoUrl}-${staff.active}-${JSON.stringify(staff.serviceIds)}-${JSON.stringify(staff.workingHours)}`} staff={staff} services={services} mutation={mutation} />)}</div>
      )}
    </section>
  )
}