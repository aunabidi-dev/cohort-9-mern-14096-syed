import type { MouseEvent, ReactElement } from 'react';

interface TagBadgeProps {
  name: string;
  isActive?: boolean;
  isRemovable?: boolean;
  onClick?: (name: string) => void;
  onRemove?: (name: string) => void;
  className?: string;
}

export function TagBadge({
  name,
  isActive = false,
  isRemovable = false,
  onClick,
  onRemove,
  className = '',
}: TagBadgeProps): ReactElement {
  const handleClick = (e: MouseEvent<HTMLSpanElement>): void => {
    if (onClick) {
      e.stopPropagation();
      onClick(name);
    }
  };

  const handleRemove = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(name);
    }
  };

  return (
    <span
      className={`tag-badge ${isActive ? 'tag-badge-active' : ''} ${onClick ? 'tag-badge-clickable' : ''} ${className}`}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(name);
        }
      }}
    >
      <span className="tag-prefix">#</span>
      <span className="tag-name">{name}</span>
      {isRemovable && (
        <button
          type="button"
          className="tag-remove-btn"
          onClick={handleRemove}
          aria-label={`Remove tag ${name}`}
        >
          &times;
        </button>
      )}
    </span>
  );
}
