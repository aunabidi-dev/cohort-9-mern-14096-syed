import type { ReactElement, ReactNode } from 'react';

export type AlertType = 'error' | 'success' | 'info' | 'warning';

interface AlertProps {
  type?: AlertType;
  message?: string;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  type = 'error',
  message,
  children,
  onClose,
  className = '',
}: AlertProps): ReactElement | null {
  if (!message && !children) return null;

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      <div className="alert-content">
        {message && <span className="alert-message">{message}</span>}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          className="alert-close-btn"
          onClick={onClose}
          aria-label="Dismiss alert"
        >
          &times;
        </button>
      )}
    </div>
  );
}
