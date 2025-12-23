/**
 * Authentication Context
 *
 * Provides authentication state management for the SafeCon application.
 * Handles login, logout, registration, and token refresh.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  authApi,
  User,
  AuthTokens,
  ApiError,
  getAccessToken,
  setTokens,
  clearTokens,
} from "../services/api";

// Auth state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Context type with actions
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Storage key for caching user data
const USER_CACHE_KEY = "safecon_user_cache";

// Cache user data for faster initial load
function cacheUser(user: User | null): void {
  if (user) {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_CACHE_KEY);
  }
}

function getCachedUser(): User | null {
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>(() => {
    // Initialize with cached user if token exists
    const token = getAccessToken();
    const cachedUser = getCachedUser();

    if (token && cachedUser) {
      return {
        user: cachedUser,
        isAuthenticated: true,
        isLoading: true, // Still loading to verify token
        error: null,
      };
    }

    return initialState;
  });

  // Set error helper
  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Login and get tokens
      await authApi.login(email, password);

      // Fetch user data
      const user = await authApi.getCurrentUser();

      // Update state and cache
      cacheUser(user);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Login failed. Please try again.";

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  // Register function
  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Register user
        await authApi.register(email, password, name);

        // Auto-login after registration
        await login(email, password);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Registration failed. Please try again.";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw err;
      }
    },
    [login]
  );

  // Logout function
  const logout = useCallback(() => {
    authApi.logout();
    cacheUser(null);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  // Update profile function
  const updateProfile = useCallback(async (data: Partial<User>) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const updatedUser = await authApi.updateProfile(data);
      cacheUser(updatedUser);
      setState((prev) => ({
        ...prev,
        user: updatedUser,
        isLoading: false,
      }));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to update profile.";

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const user = await authApi.getCurrentUser();
      cacheUser(user);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      // Token might be expired, try refresh
      if (err instanceof ApiError && err.status === 401) {
        try {
          await authApi.refreshToken();
          const user = await authApi.getCurrentUser();
          cacheUser(user);
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch {
          // Refresh failed, logout
          logout();
        }
      } else {
        logout();
      }
    }
  }, [logout]);

  // Check auth on mount - only run once
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (!getAccessToken()) {
        if (isMounted) {
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
        return;
      }

      try {
        const user = await authApi.getCurrentUser();
        if (isMounted) {
          cacheUser(user);
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          try {
            await authApi.refreshToken();
            const user = await authApi.getCurrentUser();
            if (isMounted) {
              cacheUser(user);
              setState({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            }
          } catch {
            if (isMounted) {
              clearTokens();
              cacheUser(null);
              setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              });
            }
          }
        } else if (isMounted) {
          clearTokens();
          cacheUser(null);
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Memoize context value
  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      login,
      register,
      logout,
      updateProfile,
      refreshUser,
      clearError,
    }),
    [state, login, register, logout, updateProfile, refreshUser, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// HOC for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Parent should handle redirect
    }

    return <Component {...props} />;
  };
}

export default AuthContext;
