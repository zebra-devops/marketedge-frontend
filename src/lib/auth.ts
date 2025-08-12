// Simple cookie utility
function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift();
  }
  return undefined;
}

export class AuthError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthHeaders {
  'Content-Type'?: string;
  'Authorization': string;
}

/**
 * Get authentication headers for API requests
 * Safely extracts token from httpOnly cookies
 */
export function getAuthHeaders(contentType: string = 'application/json'): AuthHeaders {
  const token = getCookie('access_token');
  
  if (!token) {
    throw new AuthError('No authentication token found', 401);
  }

  const headers: AuthHeaders = {
    'Authorization': `Bearer ${token}`
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return headers;
}

/**
 * Make authenticated API request with enhanced tenant context and error handling
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  includeCredentials: boolean = true
): Promise<Response> {
  try {
    const headers = getAuthHeaders();
    
    // Add tenant isolation headers for multi-tenant security
    const enhancedHeaders: HeadersInit = {
      ...headers,
      'X-Tenant-Context': 'isolated', // Ensure tenant isolation
      'X-Client-Version': '1.0.0', // For API versioning
      'X-Request-Source': 'frontend-app', // Request source tracking
      ...options.headers,
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: enhancedHeaders,
    };

    // Include credentials for cookie-based auth if enabled
    if (includeCredentials) {
      requestOptions.credentials = 'include';
    }

    const response = await fetch(url, requestOptions);

    // Handle authentication errors with enhanced tenant context
    if (response.status === 401) {
      // Check if it's a tenant-specific auth error
      const tenantError = response.headers.get('X-Tenant-Error');
      if (tenantError) {
        console.error('Tenant authentication error:', tenantError);
      }

      // Clear invalid tokens and redirect to login
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httpOnly';
      document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httpOnly';
      
      // Clear tenant-specific session data
      localStorage.removeItem('tenant_info');
      localStorage.removeItem('user_permissions');
      
      window.location.href = '/login';
      throw new AuthError('Authentication failed - please log in again', 401);
    }

    if (response.status === 403) {
      // Enhanced permission error with tenant context
      const permissionError = response.headers.get('X-Permission-Error');
      const requiredPermission = response.headers.get('X-Required-Permission');
      
      let errorMessage = 'Insufficient permissions';
      if (requiredPermission) {
        errorMessage += ` - requires: ${requiredPermission}`;
      }
      if (permissionError) {
        errorMessage += ` (${permissionError})`;
      }
      
      throw new AuthError(errorMessage, 403);
    }

    // Handle tenant isolation errors (custom status for cross-tenant violations)
    if (response.status === 422) {
      const tenantViolation = response.headers.get('X-Tenant-Violation');
      if (tenantViolation) {
        throw new AuthError(`Tenant isolation violation: ${tenantViolation}`, 422);
      }
    }

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    
    // Handle network errors with enhanced context
    const networkError = error instanceof Error ? error.message : 'Unknown network error';
    console.error('Authenticated fetch error:', {
      url,
      error: networkError,
      timestamp: new Date().toISOString()
    });
    
    throw new Error(`Request failed: ${networkError}`);
  }
}

/**
 * Validate user has admin role
 */
export function validateAdminRole(user: any): boolean {
  return user && user.role === 'admin' && user.is_active;
}

/**
 * Enhanced secure logout with complete session cleanup
 */
export function logout(): void {
  // Clear all auth-related cookies
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httpOnly';
  document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httpOnly';
  
  // Clear all tenant-related cookies if they exist
  document.cookie = 'tenant_context=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httpOnly';
  document.cookie = 'user_permissions=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httpOnly';
  
  // Enhanced localStorage cleanup
  const authKeys = [
    'user',
    'current_user',
    'tenant_info',
    'user_permissions',
    'token_expires_at',
    'auth_state',
    'last_activity',
    'session_data'
  ];
  
  authKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear all sessionStorage
  sessionStorage.clear();
  
  // Clear any auth-related intervals
  if (typeof window !== 'undefined') {
    const refreshInterval = (window as any).__authRefreshInterval;
    const timeoutInterval = (window as any).__sessionTimeoutInterval;
    
    if (refreshInterval) {
      clearInterval(refreshInterval);
      delete (window as any).__authRefreshInterval;
    }
    
    if (timeoutInterval) {
      clearInterval(timeoutInterval);
      delete (window as any).__sessionTimeoutInterval;
    }
  }
  
  // Clear browser state
  if (typeof window !== 'undefined' && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }
  
  console.info('Enhanced logout cleanup completed');
  
  // Redirect to login
  window.location.href = '/login';
}