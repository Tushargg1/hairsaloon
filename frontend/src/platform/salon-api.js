import apiClient, { apiErrorMessage } from '../shared/api/client.js'

export const salonKeys = {
  all: ['platform-salons'],
  list: (filters) => ['platform-salons', filters],
  pending: ['platform-salons', 'pending'],
  availability: (name) => ['platform-salons', 'availability', name],
}

export const errorMessage = apiErrorMessage

export async function getSalons(filters) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null),
  )
  const { data } = await apiClient.get('/api/platform/salons', { params })
  return data
}

export async function checkSubdomain(name) {
  const { data } = await apiClient.get('/api/platform/salons/check-subdomain', {
    params: { name },
  })
  return data
}

export async function createSalon(payload) {
  const { data } = await apiClient.post('/api/platform/salons', payload)
  return data
}

export async function getPendingSalons() {
  const { data } = await apiClient.get('/api/platform/admin/salons/pending')
  return Array.isArray(data) ? data : data?.content || []
}

export async function approveSalon(id) {
  const { data } = await apiClient.post(`/api/platform/admin/salons/${id}/approve`)
  return data
}

export async function createOwner(payload) {
  const { data } = await apiClient.post('/api/platform/admin/owners', payload)
  return data
}


export async function getAllSalons() {
  const { data } = await apiClient.get('/api/platform/admin/salons')
  return data
}

export async function getAllCustomers() {
  const { data } = await apiClient.get('/api/platform/admin/customers')
  return data
}

export async function getCustomerDetail(id) {
  const { data } = await apiClient.get(`/api/platform/admin/customers/${id}`)
  return data
}
