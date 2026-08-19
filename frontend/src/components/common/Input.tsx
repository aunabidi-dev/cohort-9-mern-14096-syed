import { forwardRef, type InputHTMLAttributes, type ReactElement } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', ...props }, ref): ReactElement => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`form-input ${error ? 'form-input-error' : ''} ${className}`}
          {...props}
        />
        {error ? (
          <span className="form-error-text" role="alert">
            {error}
          </span>
        ) : helperText ? (
          <span className="form-helper-text">{helperText}</span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
