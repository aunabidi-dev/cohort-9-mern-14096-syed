import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import type { CreateNoteInput } from '../../types/notes';
import { TagBadge } from '../common/TagBadge';
import { Button } from '../common/Button';

interface InlineNewNoteCardProps {
  onSave: (data: CreateNoteInput) => Promise<void>;
  onCancel: () => void;
}

export function InlineNewNoteCard({
  onSave,
  onCancel,
}: InlineNewNoteCardProps): ReactElement {
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus title input on mount
    titleInputRef.current?.focus();
  }, []);

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
      setError('Please enter a note title.');
      return;
    }

    if (!trimmedContent) {
      setError('Please enter some note content.');
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
        setError('Failed to create note.');
      }
      setIsSaving(false);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="note-card note-card-expanded theme-dae5ec note-card-light note-card-new">
      <div className="note-card-expanded-header">
        <div className="note-card-status-wrapper">
          <span className="note-card-badge-new">New Note</span>
        </div>

        <div className="note-card-actions">
          <button
            type="button"
            className="note-card-icon-btn note-card-collapse-btn"
            onClick={onCancel}
            title="Discard and close"
            aria-label="Discard new note"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {error && <div className="note-card-error-msg">{error}</div>}

      <div className="note-card-body">
        <input
          ref={titleInputRef}
          type="text"
          className="note-card-title-input"
          placeholder="Title..."
          value={title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          maxLength={255}
          aria-label="New note title"
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

        <textarea
          className="note-card-content-textarea"
          placeholder="Write your note ideas, tasks, or thoughts here..."
          value={content}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
            setContent(e.target.value);
            if (error) setError(null);
          }}
          aria-label="New note content"
        />
      </div>

      <div className="note-card-expanded-footer">
        <div className="note-card-stats">
          <span>{wordCount} words</span>
          <span className="stats-dot">&bull;</span>
          <span>{charCount} chars</span>
        </div>

        <div className="note-card-create-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isSaving}
            onClick={handleSubmit}
          >
            Create Note
          </Button>
        </div>
      </div>
    </div>
  );
}
