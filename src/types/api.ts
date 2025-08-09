export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface Organisation {
  id: string
  name: string
  industry?: string
  subscription_plan: 'basic' | 'professional' | 'enterprise'
  is_active: boolean
}

export interface Tool {
  id: string
  name: string
  description?: string
  version: string
  is_active: boolean
  has_access: boolean
  subscription_tier?: string
  features_enabled: string[]
}

export interface ToolAccess {
  tool: Tool
  subscription_tier: string
  features_enabled: string[]
  usage_limits: Record<string, any>
}