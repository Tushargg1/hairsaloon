import apiClient, { apiErrorMessage } from '../shared/api/client.js'

export const errorMessage = apiErrorMessage

export const referralKeys = {
  me: ['referrals', 'me'],
  admin: ['referrals', 'admin'],
  adminReferrers: ['referrals', 'admin', 'referrers'],
}

// Referrer-facing
export async function getReferralOverview() {
  const { data } = await apiClient.get('/api/platform/referrals/me')
  return data
}

export async function submitReferral(payload) {
  const { data } = await apiClient.post('/api/platform/referrals', payload)
  return data
}

export async function getReferralLeads() {
  const { data } = await apiClient.post('/api/platform/referrals/leads')
  return data
}

export async function getLeadAccess() {
  const { data } = await apiClient.get('/api/platform/referrals/lead-access')
  return data
}

export async function requestLeadAccess() {
  const { data } = await apiClient.post('/api/platform/referrals/lead-access/request')
  return data
}

// Admin
export async function getAdminReferrals() {
  const { data } = await apiClient.get('/api/platform/admin/referrals')
  return data
}

export async function getAdminReferrers() {
  const { data } = await apiClient.get('/api/platform/admin/referrals/referrers')
  return data
}

export async function verifyReferral(id, amount) {
  const { data } = await apiClient.post(`/api/platform/admin/referrals/${id}/verify`, { amount })
  return data
}

export async function rejectReferral(id, reason) {
  const { data } = await apiClient.post(`/api/platform/admin/referrals/${id}/reject`, { reason })
  return data
}

export async function markReferralPaid(id) {
  const { data } = await apiClient.post(`/api/platform/admin/referrals/${id}/paid`)
  return data
}

export async function setReferrerApproval(userId, approved, amount) {
  const { data } = await apiClient.post(
    `/api/platform/admin/referrals/referrers/${userId}/approval`, { approved, amount })
  return data
}

export async function setReferrerHold(userId, onHold, reason) {
  const { data } = await apiClient.post(
    `/api/platform/admin/referrals/referrers/${userId}/hold`, { onHold, reason })
  return data
}
