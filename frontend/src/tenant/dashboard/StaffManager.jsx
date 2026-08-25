import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import MultiSelect from '../../shared/components/MultiSelect.jsx'
import { CHARACTERS, characterVideo } from '../../shared/characters.js'
import {
  addTimeOff,
  createStaff,
  deactivateStaff,
  deleteTimeOff,
  errorMessage,
  getDashboardMedia,
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
const AUTOSAVE_DELAY = 3000
const emptyStaff = { name: '', photoUrl: '', characterKey: '', serviceIds: [] }
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

// A daily break is stored as two working-hour ranges for the same day, which
// availability already treats as a gap. Two ranges are folded back into
// open/close plus break times here.
function initialHours(staff) {
  const existing = suppliedHours(staff)
  return days.map((day) => {
    const ranges = existing.filter((item) => {
      const suppliedDay = item.dayOfWeek ?? item.day
      return Number(suppliedDay) === day.value || String(suppliedDay).toUpperCase() === day.label
    }).sort((left, right) => String(left.startTime).localeCompare(String(right.startTime)))
    const first = ranges[0]
    const last = ranges[ranges.length - 1]
    return {
      dayOfWeek: day.value,
      label: day.label,
      closed: ranges.length === 0,
      startTime: shortTime(first?.startTime) || '10:00',
      endTime: shortTime(last?.endTime) || '20:00',
      breakStart: ranges.length > 1 ? shortTime(first.endTime) : '',
      breakEnd: ranges.length > 1 ? shortTime(last.startTime) : '',
    }
  })
}

function displayDateTime(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const shortTime = (value) => String(value || '').slice(0, 5)

// Collapses the seven-line schedule into runs of consecutive days that share
// the same times, e.g. "Sun-Fri 10:00-20:00 · Sat 11:00-18:00".
function hoursSummary(hours) {
  const byDay = days.map((day) => {
    const match = hours.find((item) => {
      const supplied = item.dayOfWeek ?? item.day
      return Number(supplied) === day.value || String(supplied).toUpperCase() === day.label
    })
    return match ? `${shortTime(match.startTime)}-${shortTime(match.endTime)}` : null
  })

  const runs = []
  byDay.forEach((slot, index) => {
    const previous = runs[runs.length - 1]
    if (previous && previous.slot === slot) previous.end = index
    else runs.push({ slot, start: index, end: index })
  })

  return runs.filter((run) => run.slot).map((run) => {
    const label = run.start === run.end
      ? days[run.start].label.slice(0, 3)
      : `${days[run.start].label.slice(0, 3)}-${days[run.end].label.slice(0, 3)}`
    return `${label} ${run.slot}`
  })
}

function ServiceChoices({ services, selected, onChange }) {
  function toggle(value) {
    onChange((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }
  if (!services.length) return <p className="muted">No active services are available for assignment.</p>
  return <MultiSelect label="Services" options={services} selected={selected}
    onToggle={toggle} emptyLabel="No services selected" />
}

function StaffProfileEditor({ staff, gallery, pending, onSave, onStatusChange }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: staff.name || '', photoUrl: staff.photoUrl || '', characterKey: staff.characterKey || '',
  })

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    try {
      await onSave({ action: 'edit', id: staff.id, payload: { name: form.name.trim(), photoUrl: form.photoUrl.trim(), characterKey: form.characterKey || null, active: staff.active !== false } })
      setEditing(false)
    } catch {
      // Mutation feedback is handled by the manager.
    }
  }

  if (editing) {
    return (
      <form className="staff-subform" onSubmit={submit}>
        <h4>Edit staff member</h4>
        <div className="staff-edit-row">
          <label>Name<input name="name" required value={form.name} onChange={update} /></label>
          <label>Photo
            <select name="photoUrl" value={form.photoUrl} onChange={update}>
              <option value="">No photo</option>
              {gallery.map((photo) => (
                <option value={photo.url} key={photo.url}>{photo.label}</option>
              ))}
              {form.photoUrl && !gallery.some((photo) => photo.url === form.photoUrl) && (
                <option value={form.photoUrl}>Current photo</option>
              )}
            </select>
          </label>
          <label>Character
            <select name="characterKey" value={form.characterKey} onChange={update}>
              <option value="">None</option>
              {CHARACTERS.map((character) => (
                <option value={character.key} key={character.key}>{character.label}</option>
              ))}
            </select>
          </label>
          <button className="button button-small" disabled={pending} type="submit">{pending ? 'Saving…' : 'Save'}</button>
          <button className="button button-secondary button-small" disabled={pending} type="button" onClick={() => setEditing(false)}>Cancel</button>
        </div>
        {characterVideo(form.characterKey) && (
          <video className="character-preview" key={form.characterKey}
            src={characterVideo(form.characterKey)} autoPlay loop muted playsInline
            aria-label="Selected character preview" />
        )}
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

  // Copies the first open day's break to every other open day, for the common
  // case of one shared lunch time.
  function applyBreakToAll() {
    const source = hours.find((item) => !item.closed && item.breakStart && item.breakEnd)
    if (!source) {
      setValidation('Set a break on one day first, then apply it to the rest.')
      return
    }
    setValidation('')
    setHours((current) => current.map((item) => item.closed
      ? item
      : { ...item, breakStart: source.breakStart, breakEnd: source.breakEnd }))
  }

  function submit(event) {
    event.preventDefault()
    const open = hours.filter((item) => !item.closed)
    if (open.some((item) => item.startTime >= item.endTime)) {
      setValidation('Each opening time must be before its closing time.')
      return
    }
    const broken = open.filter((item) => item.breakStart || item.breakEnd)
    if (broken.some((item) => !item.breakStart || !item.breakEnd
        || item.breakStart <= item.startTime || item.breakEnd >= item.endTime
        || item.breakStart >= item.breakEnd)) {
      setValidation('A break needs both times and must sit inside the working hours.')
      return
    }
    const workingHours = open.flatMap((item) => (item.breakStart && item.breakEnd
      ? [
        { dayOfWeek: item.dayOfWeek, startTime: item.startTime, endTime: item.breakStart },
        { dayOfWeek: item.dayOfWeek, startTime: item.breakEnd, endTime: item.endTime },
      ]
      : [{ dayOfWeek: item.dayOfWeek, startTime: item.startTime, endTime: item.endTime }]))
    setValidation('')
    onSave({ action: 'hours', id: staff.id, workingHours })
  }

  return (
    <form className="staff-subform" onSubmit={submit}>
      <h4>Weekly working hours</h4>
      {validation && <p className="form-status error" role="alert">{validation}</p>}
      <div className="hours-head" aria-hidden="true">
        <span /><span /><span>Open</span><span>Close</span><span>Break from</span><span>Break to</span>
      </div>
      <div className="hours-grid">
        {hours.map((item, index) => (
          <div className="hours-row" key={item.dayOfWeek}>
            <strong>{item.label.slice(0, 3)}</strong>
            <label className="checkbox-field">
              <input type="checkbox" checked={item.closed}
                onChange={(event) => update(index, 'closed', event.target.checked)} /> Closed
            </label>
            <input type="time" aria-label={`${item.label} opening time`} disabled={item.closed}
              required={!item.closed} value={item.startTime}
              onChange={(event) => update(index, 'startTime', event.target.value)} />
            <input type="time" aria-label={`${item.label} closing time`} disabled={item.closed}
              required={!item.closed} value={item.endTime}
              onChange={(event) => update(index, 'endTime', event.target.value)} />
            <input type="time" aria-label={`${item.label} break start`} disabled={item.closed}
              value={item.breakStart}
              onChange={(event) => update(index, 'breakStart', event.target.value)} />
            <input type="time" aria-label={`${item.label} break end`} disabled={item.closed}
              value={item.breakEnd}
              onChange={(event) => update(index, 'breakEnd', event.target.value)} />
          </div>
        ))}
      </div>
      <div className="button-row">
        <button className="button button-small" disabled={pending} type="submit">{pending ? 'Saving…' : 'Save hours'}</button>
        <button className="button button-secondary button-small" type="button" onClick={applyBreakToAll}>Break on every day</button>
      </div>
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
      <div className="timeoff-row">
        <label>Starts<input name="startDateTime" type="datetime-local" required value={form.startDateTime} onChange={update} /></label>
        <label>Ends<input name="endDateTime" type="datetime-local" required value={form.endDateTime} onChange={update} /></label>
        <label>Reason<input name="reason" maxLength="255" placeholder="Optional" value={form.reason} onChange={update} /></label>
        <button className="button button-small" disabled={pending} type="submit">{pending ? 'Adding…' : 'Add'}</button>
      </div>
      <p className="muted">For a break that repeats every day, use the break columns in the weekly hours instead.</p>
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
  const assignments = relatedServices(staff)
    .map((id) => services.find((service) => String(service.id) === id)?.name)
    .filter(Boolean)
  const summary = hoursSummary(suppliedHours(staff))
  return (
    <dl className="staff-existing">
      <div>
        <dt>Services</dt>
        <dd>{assignments.length ? assignments.join(', ') : 'None assigned'}</dd>
      </div>
      <div>
        <dt>Hours</dt>
        <dd>{summary.length ? summary.join(' · ') : 'Not set'}</dd>
      </div>
    </dl>
  )
}

function StaffCard({ staff, services, allServices, gallery, mutation }) {
  const [serviceIds, setServiceIds] = useState(() => relatedServices(staff))
  const touched = useRef(false)
  const activeAction = mutation.isPending && mutation.variables?.id === staff.id ? mutation.variables.action : ''

  // Held in a ref so the debounce below depends only on the selection; the
  // mutation object is a new identity every render and would reset the timer.
  const save = useRef(null)
  save.current = () => mutation.mutate({
    action: 'services', id: staff.id, serviceIds: serviceIds.map(Number),
  })

  // Assignments save themselves: one request 3s after the last checkbox click,
  // so a burst of changes costs a single call.
  useEffect(() => {
    if (!touched.current) return undefined
    const timer = setTimeout(() => save.current(), AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [serviceIds])

  function changeServices(next) {
    touched.current = true
    setServiceIds(next)
  }

  return (
    <article className={`staff-manager-card ${staff.active === false ? 'inactive' : ''}`}>
      <header className="staff-card-header">
        <div className="staff-avatar">{staff.photoUrl ? <img src={staff.photoUrl} alt={`${staff.name} portrait`} /> : <span>{staff.name?.charAt(0) || 'S'}</span>}</div>
        <div className="min-w-0 flex-grow"><h3>{staff.name || 'Unnamed staff member'}</h3></div>
        <span className={`manager-status ${staff.active === false ? 'inactive' : ''}`}>{staff.active === false ? 'Inactive' : 'Active'}</span>
      </header>
      <StaffProfileEditor staff={staff} gallery={gallery} pending={activeAction === 'edit' || activeAction === 'deactivate' || activeAction === 'reactivate'} onSave={mutation.mutateAsync} onStatusChange={mutation.mutate} />

      <ExistingDetails staff={staff} services={allServices} />

      <TimeOffList staff={staff} mutation={mutation} activeAction={activeAction} />

      <div className="staff-subform staff-assign-row">
        <h4>Service assignments</h4>
        <ServiceChoices services={services} selected={serviceIds} onChange={changeServices} />
        <p className="muted" aria-live="polite">{activeAction === 'services' ? 'Saving…' : 'Saves automatically.'}</p>
      </div>

      <div className="staff-panels">
        <TimeOffForm staff={staff} pending={activeAction === 'addTimeOff'} onSave={mutation.mutateAsync} />
        <WorkingHoursForm staff={staff} pending={activeAction === 'hours'} onSave={mutation.mutate} />
      </div>
    </article>
  )
}

export default function StaffManager() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyStaff)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const staffQuery = useQuery({ queryKey: tenantKeys.dashboardStaff, queryFn: getDashboardStaff })
  const servicesQuery = useQuery({ queryKey: tenantKeys.dashboardServices, queryFn: getDashboardServices })
  const mediaQuery = useQuery({ queryKey: tenantKeys.dashboardMedia, queryFn: getDashboardMedia, retry: false })
  const services = (servicesQuery.data || []).filter((service) => service.active !== false)
  // Staff photos are picked from uploaded media rather than pasted as a URL.
  const gallery = (mediaQuery.data || []).map((item, index) => ({
    url: item.url || item.mediaUrl || item.imageUrl || item.publicUrl || item.photoUrl,
    label: item.altText || item.fileName || `${item.type || 'Photo'} ${index + 1}`,
  })).filter((photo) => photo.url)

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
      await mutation.mutateAsync({ action: 'create', payload: { name: form.name.trim(), photoUrl: form.photoUrl.trim(), characterKey: form.characterKey || null }, serviceIds: form.serviceIds.map(Number) })
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
        <div className="manager-form-grid"><label>Name<input name="name" required value={form.name} onChange={update} /></label><label>Photo<select name="photoUrl" value={form.photoUrl} onChange={update}><option value="">No photo</option>{gallery.map((photo) => <option value={photo.url} key={photo.url}>{photo.label}</option>)}</select></label><label>Character<select name="characterKey" value={form.characterKey} onChange={update}><option value="">None</option>{CHARACTERS.map((character) => <option value={character.key} key={character.key}>{character.label}</option>)}</select></label><label>Initial service assignments{servicesQuery.isLoading ? <p className="muted">Loading services…</p> : servicesQuery.isError ? <div className="form-status error" role="alert"><p>Services could not be loaded.</p><button className="button button-secondary button-small" type="button" onClick={() => servicesQuery.refetch()}>Try again</button></div> : <ServiceChoices services={services} selected={form.serviceIds} onChange={(updateIds) => setForm((current) => ({ ...current, serviceIds: updateIds(current.serviceIds) }))} />}</label></div>
        <button className="button" disabled={creating} type="submit">{creating ? 'Adding…' : 'Add staff member'}</button>
      </form>

      {staffQuery.isLoading ? <div className="manager-loading" aria-live="polite">Loading staff…</div> : staffQuery.isError ? (
        <div className="state-card dashboard-state" role="alert"><h2>Couldn’t load staff</h2><p>{errorMessage(staffQuery.error)}</p><button className="button button-secondary" onClick={() => staffQuery.refetch()}>Try again</button></div>
      ) : staffQuery.data.length === 0 ? (
        <div className="state-card dashboard-state"><h2>No staff yet</h2><p>Add the first team member using the form above.</p></div>
      ) : (
        <div className="staff-manager-list">{staffQuery.data.map((staff) => <StaffCard key={`${staff.id}-${staff.name}-${staff.photoUrl}-${staff.active}-${JSON.stringify(staff.serviceIds)}-${JSON.stringify(staff.workingHours)}`} staff={staff} services={services} allServices={servicesQuery.data || []} gallery={gallery} mutation={mutation} />)}</div>
      )}
    </section>
  )
}