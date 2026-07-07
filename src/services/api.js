import axios from 'axios'

// Use environment variable for production, fallback to '/api' for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for login endpoint - let the login form handle it
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    
    if (error.response?.status === 401 && !isLoginRequest) {
      // Only redirect to login for other API calls (session expired)
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

