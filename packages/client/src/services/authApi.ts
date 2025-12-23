/**
 * Authentication API Client
 */

import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  MeResponse
} from '@survival-game/shared';

const API_BASE = '/api/auth';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get stored token from localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Store token in localStorage
 */
export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

/**
 * Remove token from localStorage
 */
export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

/**
 * Make authenticated request with timeout
 */
async function authenticatedFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    console.log('[AuthAPI] Sending request to:', url);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('[AuthAPI] Response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`
      };
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[AuthAPI] Request timeout');
        return {
          success: false,
          error: '请求超时，请检查服务器是否正在运行'
        };
      }
      console.error('[AuthAPI] Request failed:', error.message);
      return {
        success: false,
        error: `网络错误: ${error.message}`
      };
    }

    console.error('[AuthAPI] Unknown error:', error);
    return {
      success: false,
      error: '未知错误'
    };
  }
}

/**
 * Register new user
 */
export async function register(
  username: string,
  password: string
): Promise<ApiResponse<RegisterResponse>> {
  const body: RegisterRequest = { username, password };

  const response = await authenticatedFetch<RegisterResponse>(
    `${API_BASE}/register`,
    {
      method: 'POST',
      body: JSON.stringify(body)
    }
  );

  // Store token if successful
  if (response.success && response.data?.token) {
    setToken(response.data.token);
  }

  return response;
}

/**
 * Login user
 */
export async function login(
  username: string,
  password: string
): Promise<ApiResponse<LoginResponse>> {
  const body: LoginRequest = { username, password };

  const response = await authenticatedFetch<LoginResponse>(
    `${API_BASE}/login`,
    {
      method: 'POST',
      body: JSON.stringify(body)
    }
  );

  // Store token if successful
  if (response.success && response.data?.token) {
    setToken(response.data.token);
  }

  return response;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    await authenticatedFetch(`${API_BASE}/logout`, {
      method: 'POST'
    });
  } finally {
    clearToken();
  }
}

/**
 * Get current user
 */
export async function me(): Promise<ApiResponse<MeResponse>> {
  return await authenticatedFetch<MeResponse>(`${API_BASE}/me`, {
    method: 'GET'
  });
}
