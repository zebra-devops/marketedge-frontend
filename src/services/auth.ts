import { apiService } from './api'
import { LoginRequest, TokenResponse, User } from '@/types/auth'
import Cookies from 'js-cookie'

interface EnhancedTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
  tenant: {
    id: string
    name: string
    industry: string
    subscription_plan: string
  }
  permissions: string[]
}

interface EnhancedUserResponse {
  user: User & {
    created_at?: string
    updated_at?: string
  }
  tenant: {
    id: string
    name: string
    industry: string
    subscription_plan: string
  }
  permissions: string[]
  session: {
    authenticated: boolean
    tenant_isolated: boolean
  }
}

interface LogoutRequest {
  refresh_token?: string
  all_devices?: boolean
}

export class AuthService {
  private refreshTokenPromise: Promise<EnhancedTokenResponse> | null = null
  private readonly tokenRefreshThreshold = 5 * 60 * 1000 // 5 minutes in milliseconds

  async login(loginData: LoginRequest & { state?: string }): Promise<EnhancedTokenResponse> {
    const response = await apiService.post<EnhancedTokenResponse>('/auth/login', loginData)
    
    // Store token metadata
    this.setTokens(response)
    this.setUserData(response.user, response.tenant, response.permissions)
    
    return response
  }

  async refreshToken(): Promise<EnhancedTokenResponse> {
    // Prevent multiple concurrent refresh requests
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise
    }

    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    this.refreshTokenPromise = apiService.post<EnhancedTokenResponse>('/auth/refresh', {
      refresh_token: refreshToken
    })

    try {
      const response = await this.refreshTokenPromise
      this.setTokens(response)
      this.setUserData(response.user, response.tenant, response.permissions)
      return response
    } catch (error) {
      // If refresh fails, clear tokens and redirect to login
      this.clearTokens()
      throw error
    } finally {
      this.refreshTokenPromise = null
    }
  }

  async getCurrentUser(): Promise<EnhancedUserResponse> {
    try {
      return await apiService.get<EnhancedUserResponse>('/auth/me')
    } catch (error: any) {
      if (error?.response?.status === 401) {
        // Try to refresh token and retry
        try {
          await this.refreshToken()
          return await apiService.get<EnhancedUserResponse>('/auth/me')
        } catch (refreshError) {
          this.clearTokens()
          throw refreshError
        }
      }
      throw error
    }
  }

  async getAuth0Url(redirectUri: string, additionalScopes?: string[], organizationHint?: string): Promise<{
    auth_url: string
    redirect_uri: string
    scopes: string[]
    organization_hint?: string
  }> {
    const params = new URLSearchParams({
      redirect_uri: redirectUri
    })
    
    if (additionalScopes?.length) {
      params.append('additional_scopes', additionalScopes.join(','))
    }

    if (organizationHint) {
      params.append('organization_hint', organizationHint)
    }

    return apiService.get<{
      auth_url: string
      redirect_uri: string
      scopes: string[]
      organization_hint?: string
    }>(`/auth/auth0-url?${params}`)
  }

  async logout(allDevices: boolean = false): Promise<void> {
    const refreshToken = this.getRefreshToken()
    
    try {
      await apiService.post('/auth/logout', {
        refresh_token: refreshToken,
        all_devices: allDevices
      } as LogoutRequest)
    } catch (error) {
      console.warn('Logout API call failed:', error)
      // Continue with local cleanup even if server logout fails
    }

    // Enhanced session cleanup
    this.performCompleteSessionCleanup()
    
    // Redirect to login page
    window.location.href = '/login'
  }

  private performCompleteSessionCleanup(): void {
    // Clear tokens and user data
    this.clearTokens()
    this.clearUserData()

    // Clear all localStorage with auth-related data
    const keysToRemove = [
      'current_user',
      'tenant_info', 
      'user_permissions',
      'token_expires_at',
      'auth_state',
      'last_activity'
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })

    // Clear all sessionStorage
    sessionStorage.clear()

    // Clear intervals
    if (typeof window !== 'undefined') {
      const refreshInterval = (window as any).__authRefreshInterval
      const timeoutInterval = (window as any).__sessionTimeoutInterval
      
      if (refreshInterval) {
        clearInterval(refreshInterval)
        delete (window as any).__authRefreshInterval
      }
      
      if (timeoutInterval) {
        clearInterval(timeoutInterval)
        delete (window as any).__sessionTimeoutInterval
      }
    }

    // Clear any cached data from API service
    if ((apiService as any).clearCache) {
      (apiService as any).clearCache()
    }

    // Clear browser history state related to auth
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const currentUrl = window.location.pathname
      window.history.replaceState(null, '', currentUrl)
    }

    console.info('Complete session cleanup performed')
  }

  async checkSession(): Promise<{
    authenticated: boolean
    user_id: string
    tenant_id: string
    role: string
    active: boolean
  }> {
    return apiService.get('/auth/session/check')
  }

  async extendSession(): Promise<{
    extend_recommended: boolean
    message: string
    expires_soon: boolean
  }> {
    return apiService.post('/auth/session/extend')
  }

  getToken(): string | undefined {
    return Cookies.get('access_token')
  }

  getRefreshToken(): string | undefined {
    return Cookies.get('refresh_token')
  }

  isAuthenticated(): boolean {
    const token = this.getToken()
    const user = this.getStoredUser()
    return !!(token && user)
  }

  getUserPermissions(): string[] {
    try {
      const permissions = localStorage.getItem('user_permissions')
      return permissions ? JSON.parse(permissions) : []
    } catch {
      return []
    }
  }

  hasPermission(permission: string): boolean {
    const permissions = this.getUserPermissions()
    return permissions.includes(permission)
  }

  hasAnyPermission(requiredPermissions: string[]): boolean {
    const userPermissions = this.getUserPermissions()
    return requiredPermissions.some(perm => userPermissions.includes(perm))
  }

  getUserRole(): string | null {
    const user = this.getStoredUser()
    return user?.role || null
  }

  getTenantInfo(): { id: string; name: string; industry: string; subscription_plan: string } | null {
    try {
      const tenantData = localStorage.getItem('tenant_info')
      return tenantData ? JSON.parse(tenantData) : null
    } catch {
      return null
    }
  }

  shouldRefreshToken(): boolean {
    // Check if we should proactively refresh the token
    const tokenExpiry = localStorage.getItem('token_expires_at')
    if (!tokenExpiry) return false

    const expiryTime = new Date(tokenExpiry).getTime()
    const currentTime = Date.now()
    
    return (expiryTime - currentTime) <= this.tokenRefreshThreshold
  }

  // Auto-refresh token if needed
  async ensureValidToken(): Promise<string | null> {
    const token = this.getToken()
    if (!token) return null

    if (this.shouldRefreshToken()) {
      try {
        await this.refreshToken()
        return this.getToken()
      } catch (error) {
        console.error('Token refresh failed:', error)
        return null
      }
    }

    return token
  }

  private setTokens(tokenResponse: EnhancedTokenResponse): void {
    // Set HTTP-only cookies are handled by the server
    // Store token expiry for refresh logic
    const expiryTime = new Date(Date.now() + (tokenResponse.expires_in * 1000))
    localStorage.setItem('token_expires_at', expiryTime.toISOString())
  }

  private setUserData(user: User, tenant: any, permissions: string[]): void {
    localStorage.setItem('current_user', JSON.stringify(user))
    localStorage.setItem('tenant_info', JSON.stringify(tenant))
    localStorage.setItem('user_permissions', JSON.stringify(permissions))
  }

  private getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem('current_user')
      return userData ? JSON.parse(userData) : null
    } catch {
      return null
    }
  }

  private clearTokens(): void {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    localStorage.removeItem('token_expires_at')
  }

  private clearUserData(): void {
    localStorage.removeItem('current_user')
    localStorage.removeItem('tenant_info')
    localStorage.removeItem('user_permissions')
  }

  // Enhanced auto-refresh with tenant validation and better error handling
  initializeAutoRefresh(): void {
    if (!this.isAuthenticated() || process.env.NODE_ENV === 'test' || typeof window === 'undefined') {
      return
    }

    // Clear existing interval if it exists
    const existingInterval = (window as any).__authRefreshInterval
    if (existingInterval) {
      clearInterval(existingInterval)
      delete (window as any).__authRefreshInterval
    }

    // Check token status every minute
    const refreshInterval = setInterval(() => {
      if (!this.isAuthenticated()) {
        clearInterval(refreshInterval)
        if (typeof window !== 'undefined') {
          delete (window as any).__authRefreshInterval
        }
        return
      }

      if (this.shouldRefreshToken()) {
        this.refreshToken().catch(error => {
          console.error('Background token refresh failed:', error)
          
          // If refresh fails due to invalid token, clear session and redirect
          if (error?.response?.status === 401) {
            console.warn('Session expired, redirecting to login')
            this.clearTokens()
            this.clearUserData()
            window.location.href = '/login'
          }
        })
      }
    }, 60000) // Check every minute

    // Store interval ID for cleanup
    (window as any).__authRefreshInterval = refreshInterval
  }

  // Enhanced session timeout detection
  private sessionTimeoutThreshold = 30 * 60 * 1000 // 30 minutes
  private lastActivityTime = Date.now()

  trackUserActivity(): void {
    this.lastActivityTime = Date.now()
  }

  checkSessionTimeout(): boolean {
    const now = Date.now()
    const timeSinceLastActivity = now - this.lastActivityTime
    return timeSinceLastActivity > this.sessionTimeoutThreshold
  }

  initializeActivityTracking(): void {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') return

    // Clear existing interval if it exists
    const existingInterval = (window as any).__sessionTimeoutInterval
    if (existingInterval) {
      clearInterval(existingInterval)
      delete (window as any).__sessionTimeoutInterval
    }

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      this.trackUserActivity()
    }

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Check for session timeout every 5 minutes
    const timeoutCheckInterval = setInterval(() => {
      if (!this.isAuthenticated()) {
        clearInterval(timeoutCheckInterval)
        if (typeof window !== 'undefined') {
          delete (window as any).__sessionTimeoutInterval
        }
        return
      }

      if (this.checkSessionTimeout()) {
        console.warn('Session timeout due to inactivity')
        this.logout()
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    // Store interval ID for cleanup
    (window as any).__sessionTimeoutInterval = timeoutCheckInterval
  }
}

export const authService = new AuthService()

// Note: Timer initialization moved to client-side components to prevent SSR issues