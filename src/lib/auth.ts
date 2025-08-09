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
 * Make authenticated API request
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const headers = getAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // Handle authentication errors
    if (response.status === 401) {
      // Clear invalid token and redirect to login
      document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httpOnly';
      window.location.href = '/login';
      throw new AuthError('Authentication failed', 401);
    }

    if (response.status === 403) {
      throw new AuthError('Insufficient permissions', 403);
    }

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    
    // Handle network errors
    throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate user has admin role
 */
export function validateAdminRole(user: any): boolean {
  return user && user.role === 'admin' && user.is_active;
}

/**
 * Logout user securely
 */
export function logout(): void {
  // Clear all auth-related cookies
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httpOnly';
  document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; httpOnly';
  
  // Clear any localStorage/sessionStorage
  localStorage.removeItem('user');
  sessionStorage.clear();
  
  // Redirect to login
  window.location.href = '/login';
}