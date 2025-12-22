/**
 * Authentication Hook
 *
 * Provides authentication state and methods for the SafeCon application.
 */

import { useState, useEffect, useCallback } from "react";
import { authApi, User, getAccessToken, clearTokens, ApiError } from "../services/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        // Token might be expired, try refresh
        try {
          await authApi.refreshToken();
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        } catch {
          clearTokens();
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.login(email, password);
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.register(email, password, name);
      // Auto-login after registration
      await login(email, password);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Registration failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
      }
    }
  }, [logout]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    setError(null);

    try {
      const updatedUser = await authApi.updateProfile(data);
      setUser(updatedUser);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Update failed";
      setError(message);
      throw err;
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
  };
}

export default useAuth;
