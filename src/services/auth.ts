import { apiService } from './api'
import { LoginRequest, TokenResponse, User } from '@/types/auth'
import Cookies from 'js-cookie'

export class AuthService {
  async login(loginData: LoginRequest): Promise<TokenResponse> {
    const response = await apiService.post<TokenResponse>('/auth/login', loginData)
    
    Cookies.set('access_token', response.access_token, { expires: 1 })
    Cookies.set('refresh_token', response.refresh_token, { expires: 7 })
    
    return response
  }

  async getCurrentUser(): Promise<User> {
    return apiService.get<User>('/auth/me')
  }

  async getAuth0Url(redirectUri: string): Promise<{ auth_url: string }> {
    return apiService.get<{ auth_url: string }>(`/auth/auth0-url?redirect_uri=${encodeURIComponent(redirectUri)}`)
  }

  logout() {
    Cookies.remove('access_token')
    Cookies.remove('refresh_token')
    window.location.href = '/login'
  }

  getToken(): string | undefined {
    return Cookies.get('access_token')
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

export const authService = new AuthService()