/**
 * Authentication Context
 * Manages user authentication state
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User } from '@survival-game/shared';
import * as authApi from '../services/authApi';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if user is authenticated on mount
   */
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = authApi.getToken();

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      console.log('[Auth] Found stored token, verifying...');
      setTokenState(storedToken);

      try {
        const response = await authApi.me();

        if (response.success && response.data) {
          setUser(response.data.user);
          console.log('[Auth] User authenticated:', response.data.user.username);
        } else {
          // Invalid token, clear it
          console.warn('[Auth] Invalid token, clearing...');
          authApi.clearToken();
          setTokenState(null);
        }
      } catch (err) {
        console.error('[Auth] Failed to check authentication:', err);
        authApi.clearToken();
        setTokenState(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(username, password);

      if (response.success && response.data) {
        setUser(response.data.user);
        setTokenState(response.data.token);
        console.log('[Auth] Login successful:', response.data.user.username);
        console.log('[Auth] Token set:', !!response.data.token);
        return true;
      } else {
        setError(response.error || 'Login failed');
        return false;
      }
    } catch (err) {
      console.error('[Auth] Login error:', err);
      setError('Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register user
   */
  const register = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.register(username, password);

      if (response.success && response.data) {
        setUser(response.data.user);
        setTokenState(response.data.token);
        console.log('[Auth] Registration successful:', response.data.user.username);
        console.log('[Auth] Token set:', !!response.data.token);
        return true;
      } else {
        setError(response.error || 'Registration failed');
        return false;
      }
    } catch (err) {
      console.error('[Auth] Registration error:', err);
      setError('Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      await authApi.logout();

      // Disconnect WebSocket on logout
      const { disconnectWebSocket } = await import('../services/websocket-client');
      disconnectWebSocket();
      console.log('[Auth] WebSocket disconnected on logout');
    } finally {
      setUser(null);
      setTokenState(null);
      console.log('[Auth] Logout successful, token cleared');
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
