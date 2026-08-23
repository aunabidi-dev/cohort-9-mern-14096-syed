import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '../../services/authService';

jest.mock('../../services/authService');

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  created_at: '2026-01-01T00:00:00Z',
};

describe('AuthContext and useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('throws an error if useAuth is used outside an AuthProvider', () => {
    // Silence console.error for expected React error boundary / hook error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
    spy.mockRestore();
  });

  it('initializes with unauthenticated state when localStorage is empty', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('initializes with authenticated user and token if present in localStorage', () => {
    localStorage.setItem('auth_token', 'stored-token-999');
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('stored-token-999');
  });

  it('clears corrupted localStorage items on mount and sets unauthenticated state', () => {
    localStorage.setItem('auth_token', 'stored-token-999');
    localStorage.setItem('auth_user', 'INVALID-JSON-STRING{{{');

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('login() calls authService.login, stores credentials in localStorage, and updates state', async () => {
    const mockAuthResponse = {
      token: 'jwt-new-login-token',
      user: mockUser,
    };
    (authService.login as jest.Mock).mockResolvedValueOnce(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('jwt-new-login-token');
    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem('auth_token')).toBe('jwt-new-login-token');
    expect(JSON.parse(localStorage.getItem('auth_user') || '{}')).toEqual(mockUser);
  });

  it('register() calls authService.register, stores credentials, and updates state', async () => {
    const registeredUser = { ...mockUser, name: 'Registered Name' };
    const mockAuthResponse = {
      token: 'jwt-register-token',
      user: registeredUser,
    };
    (authService.register as jest.Mock).mockResolvedValueOnce(mockAuthResponse);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.register({
        name: 'Registered Name',
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(authService.register).toHaveBeenCalledWith({
      name: 'Registered Name',
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('jwt-register-token');
    expect(result.current.user).toEqual(registeredUser);
    expect(localStorage.getItem('auth_token')).toBe('jwt-register-token');
  });

  it('logout() clears token, user from state and removes them from localStorage', async () => {
    localStorage.setItem('auth_token', 'active-token');
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('renders children correctly within provider', () => {
    function ChildComponent(): ReactElement {
      const { isAuthenticated } = useAuth();
      return <div>Status: {isAuthenticated ? 'Logged In' : 'Logged Out'}</div>;
    }

    render(
      <AuthProvider>
        <ChildComponent />
      </AuthProvider>,
    );

    expect(screen.getByText('Status: Logged Out')).toBeInTheDocument();
  });
});
