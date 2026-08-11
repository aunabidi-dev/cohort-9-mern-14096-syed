import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import type { AuthContextValue } from '../types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): ReactElement {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: null,
      isAuthenticated: false,
    }),
    [],
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
