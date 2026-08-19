import type { ReactElement } from 'react';
import { Button } from '../common/Button';

interface EmptyNotesProps {
  isSearchOrFilter?: boolean;
  onClearFilter?: () => void;
  onCreateNote?: () => void;
}

export function EmptyNotes({
  isSearchOrFilter = false,
  onClearFilter,
  onCreateNote,
}: EmptyNotesProps): ReactElement {
  return (
    <div className="empty-notes-container">
      <div className="empty-notes-icon-wrapper">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cfb59e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>

      <h3 className="empty-notes-title">
        {isSearchOrFilter ? 'No matching notes found' : 'No notes yet'}
      </h3>

      <p className="empty-notes-subtitle">
        {isSearchOrFilter
          ? 'Try adjusting your search terms or filter tags to find what you need.'
          : 'Capture your thoughts, to-dos, inspirations, and ideas all in one place.'}
      </p>

      <div className="empty-notes-actions">
        {isSearchOrFilter && onClearFilter && (
          <Button variant="secondary" size="md" onClick={onClearFilter}>
            Clear Filters
          </Button>
        )}
        {!isSearchOrFilter && onCreateNote && (
          <Button variant="primary" size="md" onClick={onCreateNote}>
            Create Your First Note
          </Button>
        )}
      </div>
    </div>
  );
}
