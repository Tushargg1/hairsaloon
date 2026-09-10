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

export async function getMyLeads() {
  const { data } = await apiClient.get('/api/platform/referrals/leads/mine')
  return data
}

export async function setLeadStatus(leadId, status) {
  await apiClient.post(`/api/platform/referrals/leads/${leadId}/status`, { status })
}

export async function recordScriptSent(leadId, label, kind) {
  await apiClient.post(`/api/platform/referrals/leads/${leadId}/followup`, { label, kind })
}

export async function createLeadSite(leadId) {
  const { data } = await apiClient.post(`/api/platform/referrals/leads/${leadId}/site`)
  return data
}

export async function deleteLeadSite(leadId) {
  await apiClient.delete(`/api/platform/referrals/leads/${leadId}/site`)
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

export async function getAdminLeads() {
  const { data } = await apiClient.get('/api/platform/admin/referrals/leads')
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

export async function setReferrerSiteLimit(userId, limit) {
  const { data } = await apiClient.post(
    `/api/platform/admin/referrals/referrers/${userId}/site-limit`, { limit })
  return data
}
