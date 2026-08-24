import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterPage } from '../RegisterPage';
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

describe('RegisterPage', () => {
  const mockRegister = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      isAuthenticated: false,
    });
    (useRouter as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      currentPath: '/register',
    });
  });

  it('renders registration form fields and buttons', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('validates empty inputs on submit', async () => {
    render(<RegisterPage />);

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates password length and password matching', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), '12345');
    await user.type(screen.getByLabelText(/confirm password/i), '123456');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('successfully registers and navigates to /notes on valid submit', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce(undefined);

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email address/i), 'Jane.Doe@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        password: 'Password123',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/notes');
  });

  it('displays error alert on server registration failure', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(new Error('Email already registered'));

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
