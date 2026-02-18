import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, api } from '../composables/useApi'

export interface User {
  _id: string
  email: string
  name: string
  timezone: string
  windsorApiKey?: boolean
  slackWorkspaceId?: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('sentinel_token'))
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  function setToken(t: string) {
    token.value = t
    localStorage.setItem('sentinel_token', t)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem('sentinel_token')
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await api.get('/auth/me')
      user.value = res.data
    } catch {
      clearAuth()
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const res = await authApi.post('/auth/login', { email, password })
      setToken(res.data.token)
      user.value = res.data.user
    } finally {
      loading.value = false
    }
  }

  async function register(name: string, email: string, password: string) {
    loading.value = true
    try {
      const res = await authApi.post('/auth/register', { name, email, password })
      setToken(res.data.token)
      user.value = res.data.user
    } finally {
      loading.value = false
    }
  }

  function logout() {
    clearAuth()
  }

  return { token, user, loading, isAuthenticated, login, register, logout, fetchMe }
})
