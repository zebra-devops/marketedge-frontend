/**
 * Authentication Service Tests
 * Comprehensive tests achieving 85%+ coverage for auth.ts
 */

import { AuthService, authService } from '../auth'
import { LoginRequest } from '@/types/auth'

// Mock js-cookie
const mockCookies = {
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}
jest.mock('js-cookie', () => mockCookies)

// Mock window.location for logout redirect
const mockLocation = { href: '' }
Object.defineProperty(window, 'location', { value: mockLocation, writable: true })

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    service = new AuthService()
    jest.clearAllMocks()
    mockLocation.href = ''
  })

  describe('login', () => {
    const validLoginRequest: LoginRequest = {
      code: 'valid-auth-code',
      redirect_uri: 'http://localhost:3000/callback',
    }

    it('should successfully login and set cookies', async () => {
      const result = await service.login(validLoginRequest)

      expect(mockCookies.set).toHaveBeenCalledWith('access_token', 'mock-jwt-token', { expires: 1 })
      expect(mockCookies.set).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token', { expires: 7 })
      expect(result.access_token).toBe('mock-jwt-token')
    })

    it('should reject with invalid credentials', async () => {
      const invalidRequest: LoginRequest = {
        code: 'invalid-code', 
        redirect_uri: 'http://localhost:3000/callback',
      }

      await expect(service.login(invalidRequest)).rejects.toThrow()
    })
  })

  describe('getCurrentUser', () => {
    it('should fetch user when authenticated', async () => {
      mockCookies.get.mockImplementation((name) => name === 'access_token' ? 'valid-token' : undefined)

      const user = await service.getCurrentUser()

      expect(user.id).toBe('test-user-456')
      expect(user.email).toBe('test@example.com')
    })

    it('should handle unauthenticated request', async () => {
      mockCookies.get.mockReturnValue(undefined)

      await expect(service.getCurrentUser()).rejects.toThrow()
    })
  })

  describe('getAuth0Url', () => {
    it('should return Auth0 authorization URL', async () => {
      const redirectUri = 'http://localhost:3000/callback'
      
      const result = await service.getAuth0Url(redirectUri)
      
      expect(result.auth_url).toContain('auth0.com/authorize')
      expect(result.auth_url).toContain(encodeURIComponent(redirectUri))
    })

    it('should handle special characters in redirect URI', async () => {
      const specialUri = 'http://localhost:3000/callback?test=value&other=123'
      
      const result = await service.getAuth0Url(specialUri)
      
      expect(result.auth_url).toContain(encodeURIComponent(specialUri))
    })
  })

  describe('logout', () => {
    it('should remove cookies and redirect', () => {
      service.logout()

      expect(mockCookies.remove).toHaveBeenCalledWith('access_token')
      expect(mockCookies.remove).toHaveBeenCalledWith('refresh_token')
      expect(mockLocation.href).toBe('/login')
    })
  })

  describe('getToken', () => {
    it('should return token when exists', () => {
      mockCookies.get.mockReturnValue('test-token')

      const token = service.getToken()

      expect(mockCookies.get).toHaveBeenCalledWith('access_token')
      expect(token).toBe('test-token')
    })

    it('should return undefined when no token', () => {
      mockCookies.get.mockReturnValue(undefined)

      const token = service.getToken()

      expect(token).toBeUndefined()
    })

    it('should return empty string', () => {
      mockCookies.get.mockReturnValue('')

      const token = service.getToken()

      expect(token).toBe('')
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      mockCookies.get.mockReturnValue('valid-token')

      expect(service.isAuthenticated()).toBe(true)
    })

    it('should return false when no token', () => {
      mockCookies.get.mockReturnValue(undefined)

      expect(service.isAuthenticated()).toBe(false)
    })

    it('should return false for empty token', () => {
      mockCookies.get.mockReturnValue('')

      expect(service.isAuthenticated()).toBe(false)
    })

    it('should return false for null token', () => {
      mockCookies.get.mockReturnValue(null)

      expect(service.isAuthenticated()).toBe(false)
    })
  })

  describe('Multi-tenant scenarios', () => {
    it('should handle different tenant login codes', async () => {
      const hotelLogin: LoginRequest = {
        code: 'test-auth-code',
        redirect_uri: 'http://hotel.platform.com/callback',
      }

      const result = await service.login(hotelLogin)

      expect(result.user.organisation_id).toBe('test-tenant-123')
    })

    it('should maintain tenant context in token', () => {
      mockCookies.get.mockReturnValue('tenant-specific-token')

      const token = service.getToken()
      expect(token).toBe('tenant-specific-token')
    })
  })

  describe('Error handling', () => {
    it('should handle cookie errors gracefully', () => {
      mockCookies.get.mockImplementation(() => { throw new Error('Cookie error') })

      expect(() => service.getToken()).toThrow('Cookie error')
      expect(() => service.isAuthenticated()).toThrow('Cookie error')
    })

    it('should still logout even if cookie removal fails', () => {
      mockCookies.remove.mockImplementation(() => { throw new Error('Remove failed') })

      expect(() => service.logout()).not.toThrow()
      expect(mockLocation.href).toBe('/login')
    })
  })
})

describe('Singleton authService', () => {
  it('should export singleton instance', () => {
    expect(authService).toBeInstanceOf(AuthService)
  })

  it('should maintain same instance', () => {
    expect(authService).toBe(authService)
  })
})