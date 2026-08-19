import {
  useEffect,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import type { CreateNoteInput, Note, UpdateNoteInput } from '../../types/notes';
import { Alert } from '../common/Alert';
import { Button } from '../common/Button';
import { TagBadge } from '../common/TagBadge';

interface NoteEditorProps {
  note: Note | null;
  isCreating: boolean;
  onSave: (data: CreateNoteInput | UpdateNoteInput) => Promise<void>;
  onDelete?: (note: Note) => void;
  onCancel?: () => void;
  onCloseMobile?: () => void;
}

export function NoteEditor({
  note,
  isCreating,
  onSave,
  onDelete,
  onCancel,
  onCloseMobile,
}: NoteEditorProps): ReactElement {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with selected note or reset for new note
  useEffect(() => {
    if (isCreating || !note) {
      setTitle('');
      setContent('');
      setTags([]);
      setTagInput('');
      setError(null);
    } else {
      setTitle(note.title || '');
      setContent(note.content || '');
      setTags(note.tags || []);
      setTagInput('');
      setError(null);
    }
  }, [note, isCreating]);

  const handleAddTag = (): void => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (!trimmed) return;

    if (tags.includes(trimmed)) {
      setTagInput('');
      return;
    }

    if (tags.length >= 50) {
      setError('Maximum 50 tags allowed per note');
      return;
    }

    setTags((prev) => [...prev, trimmed]);
    setTagInput('');
    setError(null);
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string): void => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (): Promise<void> => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError('Please provide a title for your note.');
      return;
    }

    if (!trimmedContent) {
      setError('Please provide some content for your note.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        title: trimmedTitle,
        content: trimmedContent,
        tags,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save note. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <section className="note-editor-container" aria-label="Note Editor">
      <div className="editor-top-bar">
        <div className="editor-top-left">
          {onCloseMobile && (
            <button
              type="button"
              className="editor-back-btn"
              onClick={onCloseMobile}
              aria-label="Back to notes list"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back</span>
            </button>
          )}
          <span className="editor-mode-badge">
            {isCreating ? 'Creating New Note' : 'Editing Note'}
          </span>
        </div>

        <div className="editor-top-actions">
          {!isCreating && note && onDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(note)}
              title="Delete this note"
              leftIcon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              }
            >
              Delete
            </Button>
          )}

          {isCreating && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            isLoading={isSaving}
            onClick={handleSubmit}
            leftIcon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          >
            {isCreating ? 'Create Note' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="editor-alert-wrapper">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      <div className="editor-form">
        <input
          type="text"
          className="editor-title-input"
          placeholder="Note title..."
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          maxLength={255}
          aria-label="Note title"
        />

        <div className="editor-tags-section">
          <div className="editor-tags-list">
            {tags.map((tag) => (
              <TagBadge
                key={tag}
                name={tag}
                isRemovable
                onRemove={handleRemoveTag}
              />
            ))}
          </div>

          <div className="editor-tag-input-wrapper">
            <span className="tag-input-prefix">#</span>
            <input
              type="text"
              className="editor-tag-input"
              placeholder="Add tag (press Enter)"
              value={tagInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              maxLength={100}
              aria-label="Add tag"
            />
            {tagInput.trim() && (
              <button
                type="button"
                className="editor-add-tag-btn"
                onClick={handleAddTag}
              >
                Add
              </button>
            )}
          </div>
        </div>

        <textarea
          className="editor-content-textarea"
          placeholder="Write your note ideas, tasks, recipes, or thoughts here..."
          value={content}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          aria-label="Note content"
        />

        <div className="editor-footer-stats">
          <div className="editor-stats-left">
            <span>{wordCount} words</span>
            <span className="stats-divider">&bull;</span>
            <span>{charCount} characters</span>
          </div>

          {!isCreating && note && (
            <div className="editor-stats-right">
              <span>Updated {formatDate(note.updated_at || note.created_at)}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
