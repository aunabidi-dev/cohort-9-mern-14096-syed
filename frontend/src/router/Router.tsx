import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import NotesPage from '../pages/NotesPage';

interface RouterContextValue {
  currentPath: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export function Link({ href, onClick, children, ...props }: LinkProps): ReactElement {
  const { navigate } = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>): void => {
    if (onClick) {
      onClick(e);
    }
    // Allow standard browser behavior for middle clicks or modifier keys (new tab)
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

export function Router(): ReactElement {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    return path || '/';
  });

  const navigate = useCallback((to: string): void => {
    if (window.location.pathname !== to) {
      window.history.pushState(null, '', to);
      setCurrentPath(to);
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    const handlePopState = (): void => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Handle redirects once auth state is loaded
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // If user is not authenticated and trying to access protected /notes or root
      if (currentPath === '/notes' || currentPath === '/') {
        navigate('/login');
      }
    } else {
      // If user is authenticated and on login, register, or root
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
        navigate('/notes');
      }
    }
  }, [isAuthenticated, isLoading, currentPath, navigate]);

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="loading-spinner" />
        <p>Loading application...</p>
      </div>
    );
  }

  // Render appropriate view based on route & auth
  const renderRoute = (): ReactElement => {
    if (!isAuthenticated) {
      if (currentPath === '/register') {
        return <RegisterPage />;
      }
      return <LoginPage />;
    }

    // Authenticated
    if (currentPath === '/notes' || currentPath === '/') {
      return <NotesPage />;
    }

    // Default authenticated view
    return <NotesPage />;
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {renderRoute()}
    </RouterContext.Provider>
  );
}
