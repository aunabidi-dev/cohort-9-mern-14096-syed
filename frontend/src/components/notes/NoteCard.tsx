import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from 'react';
import type { Note, UpdateNoteInput } from '../../types/notes';
import { TagBadge } from '../common/TagBadge';
import { RichTextEditor } from './RichTextEditor';

interface NoteCardProps {
  note: Note;
  index: number;
  isExpanded: boolean;
  onExpand: (note: Note) => void;
  onClose: (noteId: number) => void;
  onSave: (noteId: number, data: UpdateNoteInput) => Promise<Note | void>;
  onDelete: (note: Note) => void;
  onAutoDelete: (noteId: number) => Promise<void>;
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

// Safe DOM-based HTML sanitizer without extra npm dependencies
function sanitizeHtml(html: string): string {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove dangerous tags
    const dangerousTags = doc.querySelectorAll(
      'script, iframe, object, embed, style, link, meta, base',
    );
    dangerousTags.forEach((el) => el.remove());

    // Strip inline event attributes and javascript: URIs
    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();
        const attrVal = attr.value.trim().toLowerCase();
        if (attrName.startsWith('on') || attrVal.startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return doc.body.innerHTML;
  } catch {
    return '';
  }
}

// Convert existing raw content (plain text or HTML) into valid TipTap HTML
function formatInitialHtml(rawContent?: string): string {
  if (!rawContent) return '<p></p>';
  const trimmed = rawContent.trim();
  if (trimmed === '—' || trimmed === '.' || trimmed === 'Untitled') return '<p></p>';

  const sanitized = sanitizeHtml(trimmed);

  // If already formatted HTML
  if (/<[a-z][\s\S]*>/i.test(sanitized)) {
    return sanitized;
  }

  // Convert plain text with newlines to HTML paragraphs
  return sanitized
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
}

// Extract clean human-readable plain text for preview and word counts
function extractPlainText(rawContent?: string): string {
  if (!rawContent) return '';
  const trimmed = rawContent.trim();
  if (trimmed === '—' || trimmed === '.' || trimmed === 'Untitled') return '';

  return trimmed
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(rawTitle?: string): string {
  if (!rawTitle) return '';
  if (rawTitle === 'Untitled Note') return '';
  return rawTitle;
}

export function NoteCard({
  note,
  index,
  isExpanded,
  onExpand,
  onClose,
  onSave,
  onDelete,
  onAutoDelete,
}: NoteCardProps): ReactElement {
  const themeClass = NOTE_THEMES[Math.abs(index) % NOTE_THEMES.length];
  const isDark = themeClass === 'theme-344945';

  const cardRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Local editing state
  const [title, setTitle] = useState<string>(normalizeTitle(note.title));
  const [htmlContent, setHtmlContent] = useState<string>(() => formatInitialHtml(note.content));
  const [textContent, setTextContent] = useState<string>(() => extractPlainText(note.content));
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [tagInput, setTagInput] = useState<string>('');

  const currentNoteIdRef = useRef<number>(note.id);
  currentNoteIdRef.current = note.id;

  const latestDataRef = useRef({ title, htmlContent, textContent, tags });
  latestDataRef.current = { title, htmlContent, textContent, tags };

  // Sync state when note prop updates (only when collapsed, preserving in-progress typing while expanded)
  useEffect(() => {
    if (!isExpanded) {
      setTitle(normalizeTitle(note.title));
      const initialHtml = formatInitialHtml(note.content);
      setHtmlContent(initialHtml);
      setTextContent(extractPlainText(note.content));
      setTags(note.tags || []);
    }
  }, [isExpanded, note.id, note.title, note.content, note.tags]);

  const sessionIdRef = useRef<number>(0);
  const hasClosedViaUserActionRef = useRef<boolean>(false);
  const isClosingRef = useRef<boolean>(false);

  // Focus title input when expanded and bump session token
  useEffect(() => {
    if (isExpanded) {
      sessionIdRef.current += 1;
      hasClosedViaUserActionRef.current = false;
      const timer = setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Collapse / Close Handler: Save or Auto-delete ONLY when closing
  const handleCollapse = useCallback(async (): Promise<void> => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    hasClosedViaUserActionRef.current = true;
    const currentSession = sessionIdRef.current;

    try {
      const currentTitle = latestDataRef.current.title.trim();
      const currentText = latestDataRef.current.textContent.trim();
      const currentHtml = latestDataRef.current.htmlContent;
      const currentTags = latestDataRef.current.tags;
      const noteIdToClose = currentNoteIdRef.current;

      // Check if the note is completely empty
      const isEmpty = !currentTitle && !currentText;

      if (isEmpty) {
        // Empty note -> auto-delete from DB/state on close
        await onAutoDelete(noteIdToClose);
        return;
      }

      // Save note to backend on close
      const saved = await onSave(noteIdToClose, {
        title: currentTitle || 'Untitled Note',
        content: currentText ? currentHtml : '—',
        tags: currentTags,
      });

      // Skip onClose if a newer editing session has begun (reopened while saving)
      if (currentSession !== sessionIdRef.current) {
        return;
      }

      const savedId = saved ? saved.id : noteIdToClose;
      onClose(savedId);
    } catch {
      hasClosedViaUserActionRef.current = false;
      // Keep card expanded on failure so user's edits are preserved for retry
    } finally {
      isClosingRef.current = false;
    }
  }, [onAutoDelete, onClose, onSave]);

  // Click outside to close and save
  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent | Event): void => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Don't close if clicking inside this note card
      if (cardRef.current && cardRef.current.contains(target)) {
        return;
      }

      // Don't close if clicking inside a modal
      if (target.closest('.modal-overlay') || target.closest('.modal-container')) {
        return;
      }

      // Close and save
      void handleCollapse();
    };

    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 80);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isExpanded, handleCollapse]);

  // Ensure note is saved if unexpanded programmatically (e.g. keyboard navigation or New Note)
  const wasExpandedRef = useRef<boolean>(isExpanded);
  useEffect(() => {
    if (wasExpandedRef.current && !isExpanded) {
      if (!hasClosedViaUserActionRef.current) {
        void handleCollapse();
      }
    }
    wasExpandedRef.current = isExpanded;
  }, [isExpanded, handleCollapse]);

  // Local input handlers — zero background network requests while typing
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setTitle(e.target.value);
  };

  const handleEditorChange = (newHtml: string, newText: string): void => {
    setHtmlContent(newHtml);
    setTextContent(newText);
    latestDataRef.current.htmlContent = newHtml;
    latestDataRef.current.textContent = newText;
  };

  const handleAddTag = (): void => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (!trimmed) return;

    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }

    const updatedTags = [...tags, trimmed];
    setTags(updatedTags);
    latestDataRef.current.tags = updatedTags;
    setTagInput('');
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string): void => {
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    setTags(updatedTags);
    latestDataRef.current.tags = updatedTags;
  };

  const handleDeleteClick = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    onDelete(note);
  };

  const handleCollapseClick = async (e: MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.stopPropagation();
    try {
      await handleCollapse();
    } catch {
      // Rejection boundary for click event
    }
  };

  const handleCardClick = (): void => {
    if (!isExpanded) {
      onExpand(note);
    }
  };

  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;

  if (isExpanded) {
    return (
      <div
        ref={cardRef}
        className={`note-card note-card-expanded ${themeClass} ${isDark ? 'note-card-dark' : 'note-card-light'}`}
        data-expanded="true"
      >
        <div className="note-card-expanded-header">
          <div className="note-card-status-wrapper">
            <span className="note-card-editing-badge">Editing</span>
          </div>

          <div className="note-card-actions">
            {/* Delete Icon Button */}
            <button
              type="button"
              className="note-card-icon-btn note-card-delete-btn"
              onClick={handleDeleteClick}
              title="Delete note"
              aria-label={`Delete ${note.title}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>

            {/* Collapse / Close Icon Button */}
            <button
              type="button"
              className="note-card-icon-btn note-card-collapse-btn"
              onClick={handleCollapseClick}
              title="Close note"
              aria-label="Close note"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="note-card-body">
          <input
            ref={titleInputRef}
            type="text"
            className="note-card-title-input"
            placeholder="Title..."
            value={title}
            onChange={handleTitleChange}
            maxLength={255}
            aria-label="Note title"
          />

          <div className="note-card-tags-section">
            {tags.length > 0 && (
              <div className="note-card-tags-list">
                {tags.map((tag) => (
                  <TagBadge
                    key={tag}
                    name={tag}
                    isRemovable
                    onRemove={handleRemoveTag}
                  />
                ))}
              </div>
            )}

            <div className="note-card-tag-input-pill">
              <span className="tag-input-prefix">#</span>
              <input
                type="text"
                className="note-card-tag-input"
                placeholder="Add tag"
                value={tagInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                maxLength={50}
                aria-label="Add tag"
              />
              {tagInput.trim() && (
                <button
                  type="button"
                  className="note-card-add-tag-btn"
                  onClick={handleAddTag}
                >
                  +
                </button>
              )}
            </div>
          </div>

          {/* TipTap Rich Text Editor */}
          <RichTextEditor
            content={htmlContent}
            onChange={handleEditorChange}
          />
        </div>

        <div className="note-card-expanded-footer">
          <div className="note-card-stats">
            <span>{wordCount} words</span>
            <span className="stats-dot">&bull;</span>
            <span>{charCount} chars</span>
          </div>
          <span className="note-card-date">
            Updated {formatRelativeTime(note.updated_at || note.created_at)}
          </span>
        </div>
      </div>
    );
  }

  // Collapsed State
  return (
    <div
      className={`note-card ${themeClass} ${isDark ? 'note-card-dark' : 'note-card-light'}`}
      onClick={handleCardClick}
    >
      <div className="note-card-header">
        <button
          type="button"
          className="note-card-title-btn"
          onClick={handleCardClick}
          aria-label={`Open note: ${note.title || 'Untitled Note'}`}
        >
          <h4 className="note-card-title">{note.title || 'Untitled Note'}</h4>
        </button>
        <button
          type="button"
          className="note-card-icon-btn note-card-delete-btn"
          onClick={handleDeleteClick}
          title="Delete note"
          aria-label={`Delete ${note.title || 'Untitled Note'}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>

      {/* Preserved Rich-Text Preview */}
      {extractPlainText(note.content) && (
        <div
          className="note-card-preview-rich"
          dangerouslySetInnerHTML={{ __html: formatInitialHtml(note.content) }}
        />
      )}

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
