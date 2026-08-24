import { act, fireEvent, render, screen } from '@testing-library/react';
import { Router, Link, useRouter } from '../Router';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../context/AuthContext');
jest.mock('../../pages/LoginPage', () => () => {
  return (
    <div data-testid="login-page">
      <span>LoginPage Mock</span>
      <Link href="/register" data-testid="to-register-link">
        Register
      </Link>
    </div>
  );
});
jest.mock('../../pages/RegisterPage', () => () => <div data-testid="register-page">RegisterPage Mock</div>);
jest.mock('../../pages/NotesPage', () => () => <div data-testid="notes-page">NotesPage Mock</div>);

describe('Router and Link Component', () => {
  beforeEach(() => {
    window.history.pushState(null, '', '/');
    jest.clearAllMocks();
  });

  it('renders loading screen while auth state is resolving', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    });

    render(<Router />);
    expect(screen.getByText('Loading application...')).toBeInTheDocument();
  });

  it('redirects unauthenticated user accessing /notes or / to /login and renders LoginPage', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });

    window.history.pushState(null, '', '/notes');
    render(<Router />);

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('renders RegisterPage for unauthenticated user on /register', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });

    window.history.pushState(null, '', '/register');
    render(<Router />);

    expect(screen.getByTestId('register-page')).toBeInTheDocument();
  });

  it('redirects authenticated user accessing /login or / to /notes and renders NotesPage', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });

    window.history.pushState(null, '', '/login');
    render(<Router />);

    expect(screen.getByTestId('notes-page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/notes');
  });

  it('renders NotesPage for authenticated user on /notes', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });

    window.history.pushState(null, '', '/notes');
    render(<Router />);

    expect(screen.getByTestId('notes-page')).toBeInTheDocument();
  });

  it('handles popstate browser navigation events', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });

    window.history.pushState(null, '', '/register');
    render(<Router />);

    expect(screen.getByTestId('register-page')).toBeInTheDocument();

    act(() => {
      window.history.pushState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('Link component navigates to target path on click', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });

    window.history.pushState(null, '', '/login');
    render(<Router />);

    const link = screen.getByTestId('to-register-link');
    fireEvent.click(link);

    expect(screen.getByTestId('register-page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/register');
  });

  it('useRouter throws error when called outside RouterProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function InvalidComponent() {
      useRouter();
      return null;
    }
    expect(() => render(<InvalidComponent />)).toThrow('useRouter must be used within a RouterProvider');
    spy.mockRestore();
  });
});
