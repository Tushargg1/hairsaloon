import apiClient, { apiErrorMessage } from '../shared/api/client.js'

export const tenantKeys = {
  profile: ['tenant', 'profile'],
  publicServices: ['tenant', 'public-services'],
  publicStaff: ['tenant', 'public-staff'],
  publicPromotions: ['tenant', 'public-promotions'],
  publicGoogleReviews: ['tenant', 'public-google-reviews'],
  publicReviews: (page = 0, size = 20) => ['tenant', 'public-reviews', page, size],
  dashboardProfile: ['tenant', 'dashboard-profile'],
  dashboardServices: ['tenant', 'dashboard-services'],
  dashboardStaff: ['tenant', 'dashboard-staff'],
  dashboardReviews: (page = 0, size = 20) => ['tenant', 'dashboard-reviews', page, size],
  availability: (serviceId, date, staffId) => ['tenant', 'availability', serviceId, date, staffId ?? 'any'],
  myBookings: ['tenant', 'my-bookings'],
  dashboardBookings: (filters) => ['tenant', 'dashboard-bookings', filters],
  dashboardAnalytics: ['tenant', 'dashboard-analytics'],
  dashboardMedia: ['tenant', 'dashboard-media'],
  dashboardPromotions: ['tenant', 'dashboard-promotions'],
  staffTimeOff: (staffId) => ['tenant', 'dashboard-staff', staffId, 'time-off'],
}

export const errorMessage = apiErrorMessage

// Opens the device's map app. The salon's own Google link wins; otherwise fall
// back to coordinates, then to a text search on the address.
export function mapsUrl(profile = {}) {
  if (profile.mapsUrl) return profile.mapsUrl
  const query = profile.latitude != null && profile.longitude != null
    ? `${profile.latitude},${profile.longitude}`
    : [profile.address, profile.city].filter(Boolean).join(', ')
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : ''
}

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

function isDashboardRole(roleOrDashboard) {
  if (typeof roleOrDashboard === 'boolean') return roleOrDashboard
  if (typeof roleOrDashboard === 'string') return roleOrDashboard === 'SALON_OWNER'
  return Boolean(roleOrDashboard?.dashboard || roleOrDashboard?.role === 'SALON_OWNER')
}

function pushSubscriptionsUrl(roleOrDashboard) {
  return isDashboardRole(roleOrDashboard)
    ? '/api/salon/dashboard/push-subscriptions'
    : '/api/salon/push-subscriptions'
}

export const getSalonProfile = () => getObject('/api/salon/profile', ['profile', 'salon'])
export const getPublicServices = () => getCollection('/api/salon/services', ['services'])
export const getPublicStaff = () => getCollection('/api/salon/staff', ['staff', 'employees'])
export const getPublicPromotions = () => getCollection('/api/salon/promotions', ['promotions'])
export const getPublicReviews = (pagination) => getReviews('/api/salon/reviews', pagination)
export const getDashboardProfile = () => getObject('/api/salon/dashboard/profile', ['profile', 'salon'])
export const getDashboardServices = () => getCollection('/api/salon/dashboard/services', ['services'])
export const getDashboardStaff = () => getCollection('/api/salon/dashboard/staff', ['staff', 'employees'])
export const getDashboardReviews = (pagination) => getReviews('/api/salon/dashboard/reviews', pagination)
export const getDashboardMedia = () => getCollection('/api/salon/dashboard/media', ['media', 'uploads', 'assets'])
export const getDashboardPromotions = () => getCollection('/api/salon/dashboard/promotions', ['promotions'])

export async function createReview(payload) {
  const { data } = await apiClient.post('/api/salon/reviews', payload)
  return data
}

export async function updateDashboardProfile(payload) {
  const { data } = await apiClient.put('/api/salon/dashboard/profile', payload)
  return data
}

export async function previewGoogleProfile(googleUrl) {
  const { data } = await apiClient.post('/api/salon/dashboard/google/preview', { googleUrl })
  return data
}

export async function applyGoogleProfile({ googleUrl, overwriteContact }) {
  const { data } = await apiClient.post('/api/salon/dashboard/google/apply', {
    googleUrl, overwriteContact,
  })
  return data
}

export const getPublicGoogleReviews = () => getCollection('/api/salon/google-reviews', ['reviews'])

export async function updateServiceCategories(categories) {
  const { data } = await apiClient.put('/api/salon/dashboard/service-categories', { categories })
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

export async function getAvailability({ serviceId, serviceIds, date, staffId, includeUnavailable }) {
  const params = new URLSearchParams()
  const chain = serviceIds?.length ? serviceIds : [serviceId]
  chain.filter(Boolean).forEach((id) => params.append('serviceId', id))
  params.set('date', date)
  if (staffId) params.set('staffId', staffId)
  if (includeUnavailable) params.set('includeUnavailable', 'true')
  return getCollection(`/api/salon/availability?${params}`, ['slots'])
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

export async function getDashboardAnalytics({ startDate, endDate } = {}) {
  const params = {}
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate
  const { data } = await apiClient.get('/api/salon/dashboard/analytics', { params })
  return data
}

export async function getDashboardBookings(filters = {}) {
  const params = new URLSearchParams()
  if (filters.date) params.set('date', filters.date)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.staffId) params.set('staffId', filters.staffId)
  return getCollection(`/api/salon/dashboard/bookings?${params}`, ['bookings'])
}

export async function createWalkInBooking(payload) {
  const { data } = await apiClient.post('/api/salon/dashboard/bookings/walk-ins', payload)
  return data
}

export async function cancelDashboardBooking(id) {
  const { data } = await apiClient.patch(`/api/salon/dashboard/bookings/${id}/cancel`)
  return data
}

export async function transitionDashboardBooking({ id, status }) {
  const { data } = await apiClient.patch(`/api/salon/dashboard/bookings/${id}/status`, { status })
  return data
}

export async function createMediaUpload({ type, contentType, sizeBytes }) {
  const { data } = await apiClient.post('/api/salon/dashboard/media/uploads', {
    type, contentType, sizeBytes,
  })
  return unwrapObject(data, ['upload'])
}

export async function uploadMediaFile({ uploadUrl, requiredHeaders = {}, file }) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: requiredHeaders,
    body: file,
    credentials: 'omit',
  })
  if (!response.ok) throw new Error(`Direct media upload failed with status ${response.status}.`)
}

// The full direct-to-storage upload: ticket, PUT, confirm. `onStep` reports
// progress so callers can show it without repeating the sequence.
export async function uploadSalonImage({ type, file, onStep = () => {} }) {
  onStep(1, 'Requesting a secure upload…')
  const ticket = await createMediaUpload({ type, contentType: file.type, sizeBytes: file.size })
  if (!ticket.uploadUrl || !ticket.uploadId) {
    throw new Error('Media uploads are not configured for this salon.')
  }
  onStep(2, 'Uploading image directly to storage…')
  await uploadMediaFile({
    uploadUrl: ticket.uploadUrl,
    requiredHeaders: ticket.requiredHeaders || {},
    file,
  })
  onStep(3, 'Confirming the uploaded image…')
  return confirmMediaUpload({ type, uploadId: ticket.uploadId })
}

export async function confirmMediaUpload({ type, uploadId }) {
  const { data } = await apiClient.post(`/api/salon/dashboard/media/uploads/${encodeURIComponent(type)}/${encodeURIComponent(uploadId)}/confirm`)
  return data
}

export async function subscribePushSubscription(payload, roleOrDashboard) {
  const { role, dashboard, endpoint, keys } = payload
  const target = roleOrDashboard ?? dashboard ?? role
  const { data } = await apiClient.post(pushSubscriptionsUrl(target), { endpoint, keys })
  return data
}

export async function unsubscribePushSubscription(payload, roleOrDashboard) {
  const { role, dashboard, endpoint } = payload
  const target = roleOrDashboard ?? dashboard ?? role
  const { data } = await apiClient.delete(pushSubscriptionsUrl(target), { data: { endpoint } })
  return data
}

export async function createPromotion(payload) {
  const { data } = await apiClient.post('/api/salon/dashboard/promotions', payload)
  return data
}

export async function updatePromotion({ id, payload }) {
  const { data } = await apiClient.put(`/api/salon/dashboard/promotions/${encodeURIComponent(id)}`, payload)
  return data
}

export async function deletePromotion(id) {
  const { data } = await apiClient.delete(`/api/salon/dashboard/promotions/${encodeURIComponent(id)}`)
  return data
}

export async function validatePromotion({ promoCode, serviceId }) {
  const { data } = await apiClient.post('/api/salon/promotions/validate', { promoCode, serviceId })
  return data
}

export const createWalkIn = createWalkInBooking
