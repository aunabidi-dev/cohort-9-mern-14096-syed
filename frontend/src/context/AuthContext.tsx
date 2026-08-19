import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import {
  getStoredToken,
  removeStoredToken,
  setStoredToken,
} from '../services/api';
import { authService } from '../services/authService';
import type {
  AuthContextValue,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../types/auth';

const USER_STORAGE_KEY = 'auth_user';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from localStorage on load
  useEffect(() => {
    try {
      const storedToken = getStoredToken();
      const storedUserJson = localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUserJson) {
        const parsedUser = JSON.parse(storedUserJson) as User;
        setToken(storedToken);
        setUser(parsedUser);
      }
    } catch {
      // Storage parsing failed or invalid data, clear corrupted items
      removeStoredToken();
      localStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const data = await authService.login(credentials);
    setStoredToken(data.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials): Promise<void> => {
    const data = await authService.register(credentials);
    setStoredToken(data.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback((): void => {
    removeStoredToken();
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
