import axios, { AxiosInstance, AxiosResponse } from 'axios'
import Cookies from 'js-cookie'
import { TokenResponse, RefreshTokenRequest } from '@/types/auth'
import { Organisation, OrganisationCreate, IndustryOption } from '@/types/api'

class ApiService {
  private client: AxiosInstance
  private currentOrganizationId: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL + '/api/v1',
      timeout: 60000, // 60 second timeout to handle Render cold starts
      withCredentials: true, // Include cookies for cross-origin requests
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  setOrganizationContext(organizationId: string) {
    this.currentOrganizationId = organizationId
  }

  clearOrganizationContext() {
    this.currentOrganizationId = null
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        // Add organization context header if set
        if (this.currentOrganizationId) {
          config.headers['X-Organization-ID'] = this.currentOrganizationId
        }
        
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        // Handle specific error cases that should not trigger retries
        if (error?.message?.includes('ERR_INSUFFICIENT_RESOURCES') || 
            error?.code === 'ERR_INSUFFICIENT_RESOURCES') {
          console.error('Network resource exhaustion detected:', error)
          return Promise.reject(new Error('Server overloaded. Please wait and try again.'))
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          console.error('Rate limit exceeded:', error)
          return Promise.reject(new Error('Too many requests. Please wait and try again.'))
        }

        // Handle 401 with token refresh (but prevent infinite loops)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = Cookies.get('refresh_token')
            if (refreshToken) {
              const response = await this.refreshToken({ refresh_token: refreshToken })
              Cookies.set('access_token', response.access_token)
              originalRequest.headers.Authorization = `Bearer ${response.access_token}`
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            console.error('Token refresh failed during 401 handling:', refreshError)
            this.clearTokens()
            // Prevent multiple redirects by checking current location
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login'
            }
          }
        }

        // Handle network errors with better messaging
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.error('Request timeout:', error)
          return Promise.reject(new Error('Request timeout: Backend may be starting up (cold start). Please wait a moment and try again.'))
        }

        if (error.code === 'ERR_NETWORK') {
          console.error('Network error:', error)
          return Promise.reject(new Error('Network error. Please check your connection.'))
        }

        return Promise.reject(error)
      }
    )
  }

  private clearTokens() {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
  }

  async get<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url)
    return response.data
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data)
    return response.data
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data)
    return response.data
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url)
    return response.data
  }

  async refreshToken(data: RefreshTokenRequest): Promise<{ access_token: string; token_type: string }> {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/refresh`,
      data,
      {
        withCredentials: true // Include cookies for refresh token request
      }
    )
    return response.data
  }

  // Organisation Management Methods
  async createOrganisation(data: OrganisationCreate): Promise<Organisation> {
    return this.post<Organisation>('/organisations', data)
  }

  async getAllOrganisations(): Promise<Organisation[]> {
    return this.get<Organisation[]>('/organisations')
  }

  async getCurrentOrganisation(): Promise<Organisation> {
    return this.get<Organisation>('/organisations/current')
  }

  async updateCurrentOrganisation(data: Partial<OrganisationCreate>): Promise<Organisation> {
    return this.put<Organisation>('/organisations/current', data)
  }

  async getAvailableIndustries(): Promise<IndustryOption[]> {
    return this.get<IndustryOption[]>('/organisations/industries')
  }

  async getOrganisationStats(): Promise<Record<string, any>> {
    return this.get<Record<string, any>>('/organisations/stats')
  }

  // Organization Switching Methods
  async getUserAccessibleOrganisations(): Promise<Organisation[]> {
    return this.get<Organisation[]>('/organisations/accessible')
  }

  async logOrganizationSwitch(organizationId: string): Promise<void> {
    return this.post<void>('/audit/organization-switch', { 
      organization_id: organizationId,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent
    })
  }
}

export const apiService = new ApiService()