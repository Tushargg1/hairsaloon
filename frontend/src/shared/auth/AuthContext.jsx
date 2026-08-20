import { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient, { isConnectivityError } from '../api/client.js'
import AuthContext from './auth-context.js'

let initialUserRequest

function fetchInitialUser() {
  if (!initialUserRequest) {
    initialUserRequest = apiClient.get('/api/platform/auth/me').finally(() => {
      initialUserRequest = undefined
    })
  }
  return initialUserRequest
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [backendStatus, setBackendStatus] = useState('checking')

  const refreshSession = useCallback(async () => {
    setLoading(true)
    setBackendStatus('checking')
    try {
      const { data } = await fetchInitialUser()
      setUser(data)
      setBackendStatus('online')
      return data
    } catch (error) {
      setUser(null)
      setBackendStatus(isConnectivityError(error) ? 'offline' : 'online')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    if (active) refreshSession()
    return () => { active = false }
  }, [refreshSession])

  const signup = useCallback(async (credentials) => {
    try {
      const { data } = await apiClient.post('/api/platform/auth/signup', credentials)
      setUser(data)
      setBackendStatus('online')
      return data
    } catch (error) {
      if (isConnectivityError(error)) setBackendStatus('offline')
      throw error
    }
  }, [])

  const businessSignup = useCallback(async (credentials) => {
    try {
      const { data } = await apiClient.post('/api/platform/auth/business-signup', credentials)
      setUser(data)
      setBackendStatus('online')
      return data
    } catch (error) {
      if (isConnectivityError(error)) setBackendStatus('offline')
      throw error
    }
  }, [])

  const login = useCallback(async (credentials) => {
    try {
      const { data } = await apiClient.post('/api/platform/auth/login', credentials)
      setUser(data)
      setBackendStatus('online')
      return data
    } catch (error) {
      if (isConnectivityError(error)) setBackendStatus('offline')
      throw error
    }
  }, [])

  const privilegedLogin = useCallback(async (credentials) => {
    try {
      const { data } = await apiClient.post('/api/platform/privileged-auth/login', credentials)
      setUser(data)
      setBackendStatus('online')
      return data
    } catch (error) {
      if (isConnectivityError(error)) setBackendStatus('offline')
      throw error
    }
  }, [])

  const requestOtp = useCallback(async (payload) => {
    try {
      const { data } = await apiClient.post('/api/platform/auth/otp/request', payload)
      setBackendStatus('online')
      return data
    } catch (error) {
      if (isConnectivityError(error)) setBackendStatus('offline')
      throw error
    }
  }, [])

  const verifyOtp = useCallback(async (payload) => {
    try {
      const { data } = await apiClient.post('/api/platform/auth/otp/verify', payload)
      setBackendStatus('online')
      return data
    } catch (error) {
      if (isConnectivityError(error)) setBackendStatus('offline')
      throw error
    }
  }, [])

  const resetPassword = useCallback(async (payload) => {
    try {
      const { data } = await apiClient.post('/api/platform/auth/otp/reset-password', payload)
      setBackendStatus('online')
      return data
    } catch (error) {
      if (isConnectivityError(error)) setBackendStatus('offline')
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/platform/auth/logout')
      setBackendStatus('online')
    } catch (error) {
      if (isConnectivityError(error)) setBackendStatus('offline')
      throw error
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user, signup, businessSignup, login, privilegedLogin, requestOtp, verifyOtp,
      resetPassword, logout, loading, backendStatus, refreshSession,
      retryBackend: refreshSession,
    }),
    [
      user, signup, businessSignup, login, privilegedLogin, requestOtp, verifyOtp,
      resetPassword, logout, loading, backendStatus, refreshSession,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
