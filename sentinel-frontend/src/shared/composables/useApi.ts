import axios, { type AxiosInstance } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function createInstance(): AxiosInstance {
  const instance = axios.create({ baseURL: BASE_URL })

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('sentinel_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem('sentinel_token')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
  )

  return instance
}

export const api = createInstance()

// Separate instance for auth routes (no redirect loop)
export const authApi = axios.create({ baseURL: BASE_URL })

export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.response?.data?.error || err.message
  }
  return 'An unexpected error occurred'
}
