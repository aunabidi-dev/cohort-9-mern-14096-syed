import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../router/Router';

jest.mock('../../context/AuthContext');
jest.mock('../../router/Router', () => {
  const actual = jest.requireActual('../../router/Router');
  return {
    ...actual,
    useRouter: jest.fn(),
    Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
      <a href={href} className={className}>
        {children}
      </a>
    ),
  };
});

describe('LoginPage', () => {
  const mockLogin = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
    });
    (useRouter as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      currentPath: '/login',
    });
  });

  it('renders login form elements correctly', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/register');
  });

  it('displays validation errors when submitting an empty form', async () => {
    render(<LoginPage />);

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('displays validation error for invalid email format', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'secret123');
    await user.click(submitBtn);

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('clears field validation error when user types into the field', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Email is required')).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'user@example.com');

    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });

  it('submits valid credentials, calls login(), and navigates to /notes', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'Jane.Doe@Example.com');
    await user.type(passwordInput, 'ValidPassword123');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'jane.doe@example.com',
        password: 'ValidPassword123',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/notes');
  });

  it('displays server error alert when login fails', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Invalid email or password'));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(mockNavigate).not.toHaveBeenCalled();

    // Dismiss the error alert
    const dismissBtn = screen.getByLabelText('Dismiss alert');
    await user.click(dismissBtn);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
