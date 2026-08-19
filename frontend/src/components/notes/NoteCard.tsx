import type { MouseEvent, ReactElement } from 'react';
import type { Note } from '../../types/notes';
import { TagBadge } from '../common/TagBadge';

interface NoteCardProps {
  note: Note;
  index: number;
  isSelected: boolean;
  onSelect: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export const NOTE_THEMES = [
  'theme-dae5ec', // #dae5ec
  'theme-eae3d9', // #eae3d9
  'theme-cfb59e', // #cfb59e
  'theme-344945', // #344945 (dark bg with white text)
  'theme-e0dcd1', // #e0dcd1
] as const;

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function NoteCard({
  note,
  index,
  isSelected,
  onSelect,
  onDelete,
}: NoteCardProps): ReactElement {
  const themeClass = NOTE_THEMES[index % NOTE_THEMES.length];
  const isDark = themeClass === 'theme-344945';

  const handleDeleteClick = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    onDelete(note);
  };

  return (
    <div
      className={`note-card ${themeClass} ${isSelected ? 'note-card-selected' : ''} ${isDark ? 'note-card-dark' : 'note-card-light'}`}
      onClick={() => onSelect(note)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(note);
        }
      }}
    >
      <div className="note-card-header">
        <h4 className="note-card-title">{note.title}</h4>
        <button
          type="button"
          className="note-card-delete-btn"
          onClick={handleDeleteClick}
          title="Delete note"
          aria-label={`Delete ${note.title}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>

      <p className="note-card-preview">{note.content}</p>

      {note.tags && note.tags.length > 0 && (
        <div className="note-card-tags">
          {note.tags.map((tag) => (
            <TagBadge key={tag} name={tag} />
          ))}
        </div>
      )}

      <div className="note-card-footer">
        <span className="note-card-date">
          {formatRelativeTime(note.updated_at || note.created_at)}
        </span>
      </div>
    </div>
  );
}
