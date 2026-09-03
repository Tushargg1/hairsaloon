import apiClient, { apiErrorMessage } from '../shared/api/client.js'

export const errorMessage = apiErrorMessage

export const referralKeys = {
  me: ['referrals', 'me'],
  admin: ['referrals', 'admin'],
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

// Admin
export async function getAdminReferrals() {
  const { data } = await apiClient.get('/api/platform/admin/referrals')
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
