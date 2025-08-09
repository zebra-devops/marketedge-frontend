export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'analyst' | 'viewer'
  organisation_id: string
  is_active: boolean
}

export interface LoginRequest {
  code: string
  redirect_uri: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}