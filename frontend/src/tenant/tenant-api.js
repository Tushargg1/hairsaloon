import apiClient, { apiErrorMessage } from '../shared/api/client.js'

export const tenantKeys = {
  profile: ['tenant', 'profile'],
  publicServices: ['tenant', 'public-services'],
  publicStaff: ['tenant', 'public-staff'],
  publicReviewsRoot: ['tenant', 'public-reviews'],
  publicReviews: (page = 0, size = 20) => ['tenant', 'public-reviews', page, size],
  dashboardServices: ['tenant', 'dashboard-services'],
  dashboardStaff: ['tenant', 'dashboard-staff'],
  dashboardReviewsRoot: ['tenant', 'dashboard-reviews'],
  dashboardReviews: (page = 0, size = 20) => ['tenant', 'dashboard-reviews', page, size],
  availability: (serviceId, date, staffId) => ['tenant', 'availability', serviceId, date, staffId ?? 'any'],
  myBookings: ['tenant', 'my-bookings'],
  dashboardBookings: (filters) => ['tenant', 'dashboard-bookings', filters],
  dashboardAnalytics: ['tenant', 'dashboard-analytics'],
  staffTimeOff: (staffId) => ['tenant', 'dashboard-staff', staffId, 'time-off'],
}

export const errorMessage = apiErrorMessage

export function unwrapObject(value, keys = []) {
  let current = value
  for (let depth = 0; depth < 5 && current && typeof current === 'object' && !Array.isArray(current); depth += 1) {
    const key = keys.find((candidate) => current[candidate] && typeof current[candidate] === 'object')
    if (key) current = current[key]
    else if (current.data && typeof current.data === 'object') current = current.data
    else break
  }
  return current && typeof current === 'object' && !Array.isArray(current) ? current : {}
}

export function unwrapCollection(value, keys = []) {
  let current = value
  for (let depth = 0; depth < 6; depth += 1) {
    if (Array.isArray(current)) return current
    if (!current || typeof current !== 'object') return []
    const key = [...keys, 'content', 'items', 'results', 'data'].find((candidate) => Array.isArray(current[candidate]) || (current[candidate] && typeof current[candidate] === 'object'))
    if (!key) return []
    current = current[key]
  }
  return Array.isArray(current) ? current : []
}

async function getObject(url, keys) {
  const { data } = await apiClient.get(url)
  return unwrapObject(data, keys)
}

async function getCollection(url, keys) {
  const { data } = await apiClient.get(url)
  return unwrapCollection(data, keys)
}

async function getReviews(url, { page = 0, size = 20 } = {}) {
  const { data } = await apiClient.get(url, { params: { page, size } })
  return data
}

export const getSalonProfile = () => getObject('/api/salon/profile', ['profile', 'salon'])
export const getPublicServices = () => getCollection('/api/salon/services', ['services'])
export const getPublicStaff = () => getCollection('/api/salon/staff', ['staff', 'employees'])
export const getPublicReviews = (pagination) => getReviews('/api/salon/reviews', pagination)
export const getDashboardServices = () => getCollection('/api/salon/dashboard/services', ['services'])
export const getDashboardStaff = () => getCollection('/api/salon/dashboard/staff', ['staff', 'employees'])
export const getDashboardReviews = (pagination) => getReviews('/api/salon/dashboard/reviews', pagination)

export async function createReview(payload) {
  const { data } = await apiClient.post('/api/salon/reviews', payload)
  return data
}

export async function createService(payload) {
  const { name, category, durationMinutes, price } = payload
  const { data } = await apiClient.post('/api/salon/dashboard/services', {
    name, category, durationMinutes, price,
  })
  return data
}

export async function updateService({ id, payload }) {
  const { data } = await apiClient.put(`/api/salon/dashboard/services/${id}`, payload)
  return data
}

export async function deactivateService(id) {
  const { data } = await apiClient.delete(`/api/salon/dashboard/services/${id}`)
  return data
}

export async function createStaff(payload) {
  const { data } = await apiClient.post('/api/salon/dashboard/staff', payload)
  return data
}

export async function updateStaff({ id, payload }) {
  const { data } = await apiClient.put(`/api/salon/dashboard/staff/${id}`, payload)
  return data
}

export async function deactivateStaff(id) {
  await apiClient.delete(`/api/salon/dashboard/staff/${id}`)
}

export async function updateStaffServices({ id, serviceIds }) {
  const { data } = await apiClient.put(`/api/salon/dashboard/staff/${id}/services`, { serviceIds })
  return data
}

export async function updateWorkingHours({ id, workingHours }) {
  const { data } = await apiClient.put(`/api/salon/dashboard/staff/${id}/working-hours`, { workingHours })
  return data
}

export const getStaffTimeOff = (id) => getCollection(`/api/salon/dashboard/staff/${id}/time-off`, ['timeOff', 'timeOffPeriods'])

export async function addTimeOff({ id, timeOff }) {
  const { data } = await apiClient.post(`/api/salon/dashboard/staff/${id}/time-off`, timeOff)
  return data
}

export async function deleteTimeOff({ id, timeOffId }) {
  await apiClient.delete(`/api/salon/dashboard/staff/${id}/time-off/${timeOffId}`)
}

export async function getAvailability({ serviceId, date, staffId }) {
  const params = { serviceId, date }
  if (staffId) params.staffId = staffId
  return getCollection(`/api/salon/availability?${new URLSearchParams(params)}`, ['slots'])
}

export async function createBooking({ payload, idempotencyKey }) {
  const { data } = await apiClient.post('/api/salon/bookings', payload, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  })
  return data
}

export const getMyBookings = () => getCollection('/api/salon/bookings/me', ['bookings'])

export async function cancelMyBooking(id) {
  const { data } = await apiClient.patch(`/api/salon/bookings/${id}/cancel`)
  return data
}

export async function rescheduleMyBooking({ id, startDatetime }) {
  const { data } = await apiClient.patch(`/api/salon/bookings/${id}/reschedule`, { startDatetime })
  return data
}

export async function getDashboardAnalytics() {
  const { data } = await apiClient.get('/api/salon/dashboard/analytics')
  return data
}

export async function getDashboardBookings(filters) {
  const params = new URLSearchParams()
  if (filters.date) params.set('date', filters.date)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.staffId) params.set('staffId', filters.staffId)
  return getCollection(`/api/salon/dashboard/bookings?${params}`, ['bookings'])
}

export async function cancelDashboardBooking(id) {
  const { data } = await apiClient.patch(`/api/salon/dashboard/bookings/${id}/cancel`)
  return data
}

export async function transitionDashboardBooking({ id, status }) {
  const { data } = await apiClient.patch(`/api/salon/dashboard/bookings/${id}/status`, { status })
  return data
}
