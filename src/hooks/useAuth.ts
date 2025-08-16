'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { User } from '@/types/auth'
import { authService } from '@/services/auth'
import { safeClearInterval, ensureTimerFunctions } from '@/utils/timer-utils'

interface EnhancedUser extends User {
  created_at?: string
  updated_at?: string
}

interface TenantInfo {
  id: string
  name: string
  industry: string
  subscription_plan: string
}

interface AuthState {
  user: EnhancedUser | null
  tenant: TenantInfo | null
  permissions: string[]
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
}

interface AuthContextType extends AuthState {
  login: (loginData: { code: string; redirect_uri: string; state?: string }) => Promise<any>
  logout: (allDevices?: boolean) => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasRole: (role: string) => boolean
  checkSession: () => Promise<any>
  extendSession: () => Promise<any>
  getTenantContext: () => TenantInfo | null
  validateTenantAccess: (requiredTenant: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

export const useAuth = (): AuthContextType => {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
    isInitialized: false
  })

  useEffect(() => {
    initializeAuth()
  }, [])

  // Initialize timer-based features only on client-side after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Ensure timer functions are available before initialization
      ensureTimerFunctions()
      
      // Initialize auto-refresh and activity tracking
      authService.initializeAutoRefresh()
      authService.initializeActivityTracking()

      // Cleanup function to clear intervals when component unmounts
      return () => {
        const refreshInterval = (window as any).__authRefreshInterval
        const timeoutInterval = (window as any).__sessionTimeoutInterval
        
        if (refreshInterval) {
          safeClearInterval(refreshInterval)
          delete (window as any).__authRefreshInterval
        }
        
        if (timeoutInterval) {
          safeClearInterval(timeoutInterval)
          delete (window as any).__sessionTimeoutInterval
        }
      }
    }
  }, [state.isAuthenticated]) // Re-initialize when auth state changes

  const initializeAuth = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))

      // Check if user has valid authentication
      if (authService.isAuthenticated()) {
        try {
          // Get current user data from backend
          const userResponse = await authService.getCurrentUser()
          const permissions = authService.getUserPermissions ? authService.getUserPermissions() : []
          
          setState({
            user: userResponse.user || userResponse,
            tenant: userResponse.tenant || null,
            permissions,
            isLoading: false,
            isAuthenticated: true,
            isInitialized: true
          })
        } catch (error) {
          console.error('Failed to get current user:', error)
          // Clear invalid tokens
          await authService.logout()
          setState({
            user: null,
            tenant: null,
            permissions: [],
            isLoading: false,
            isAuthenticated: false,
            isInitialized: true
          })
        }
      } else {
        setState({
          user: null,
          tenant: null,
          permissions: [],
          isLoading: false,
          isAuthenticated: false,
          isInitialized: true
        })
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      setState({
        user: null,
        tenant: null,
        permissions: [],
        isLoading: false,
        isAuthenticated: false,
        isInitialized: true
      })
    }
  }

  const login = async (loginData: { code: string; redirect_uri: string; state?: string }) => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const response = await authService.login(loginData)
      
      setState({
        user: response.user || response,
        tenant: response.tenant || null,
        permissions: response.permissions || [],
        isLoading: false,
        isAuthenticated: true,
        isInitialized: true
      })

      return response
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        user: null,
        tenant: null,
        permissions: [],
        isAuthenticated: false
      }))
      throw error
    }
  }

  const logout = async (allDevices: boolean = false) => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      await authService.logout(allDevices)
    } catch (error) {
      console.warn('Logout error:', error)
    } finally {
      setState({
        user: null,
        tenant: null,
        permissions: [],
        isLoading: false,
        isAuthenticated: false,
        isInitialized: true
      })
    }
  }

  const refreshUser = async () => {
    try {
      const userResponse = await authService.getCurrentUser()
      const permissions = authService.getUserPermissions ? authService.getUserPermissions() : []
      
      setState(prev => ({
        ...prev,
        user: userResponse.user || userResponse,
        tenant: userResponse.tenant || null,
        permissions
      }))
    } catch (error) {
      console.error('Failed to refresh user data:', error)
      // Clear auth state on refresh failure
      setState(prev => ({
        ...prev,
        user: null,
        tenant: null,
        permissions: [],
        isAuthenticated: false
      }))
      await authService.logout()
      throw error
    }
  }

  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission ? authService.hasPermission(permission) : false
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    return authService.hasAnyPermission ? authService.hasAnyPermission(permissions) : false
  }

  const hasRole = (role: string): boolean => {
    return authService.getUserRole ? authService.getUserRole() === role : false
  }

  const checkSession = async () => {
    try {
      return authService.checkSession ? await authService.checkSession() : { valid: true }
    } catch (error) {
      console.error('Session check failed:', error)
      throw error
    }
  }

  const extendSession = async () => {
    try {
      return authService.extendSession ? await authService.extendSession() : { extended: true }
    } catch (error) {
      console.error('Session extension failed:', error)
      throw error
    }
  }

  const getTenantContext = (): TenantInfo | null => {
    return state.tenant
  }

  const validateTenantAccess = (requiredTenant: string): boolean => {
    if (!state.tenant || !state.isAuthenticated) {
      return false
    }
    return state.tenant.id === requiredTenant
  }

  return {
    ...state,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasAnyPermission,
    hasRole,
    checkSession,
    extendSession,
    getTenantContext,
    validateTenantAccess
  }
}

export { AuthContext }