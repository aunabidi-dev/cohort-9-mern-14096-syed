import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { Alert } from '../components/common/Alert';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyNotes } from '../components/notes/EmptyNotes';
import { NoteCard } from '../components/notes/NoteCard';
import { NoteEditor } from '../components/notes/NoteEditor';
import { NoteSidebar } from '../components/notes/NoteSidebar';
import { SearchBar } from '../components/notes/SearchBar';
import { notesService } from '../services/notesService';
import type {
  CreateNoteInput,
  Note,
  NoteFilter,
  UpdateNoteInput,
} from '../types/notes';

export function NotesPage(): ReactElement {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const isCreatingRef = useRef<boolean>(isCreating);
  isCreatingRef.current = isCreating;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Mobile responsive views
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState<boolean>(false);

  // Fetch notes from the backend
  const fetchNotes = useCallback(async (filter?: NoteFilter): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await notesService.getNotes(filter);
      setNotes(data);

      setSelectedNoteId((currentId) => {
        // If currently selected note is no longer in the fetched notes list, reselect
        if (currentId !== null && !data.some((n) => n.id === currentId)) {
          return data.length > 0 ? data[0].id : null;
        }
        if (currentId === null && data.length > 0 && !isCreatingRef.current) {
          // Select first note by default on desktop if not creating
          return data[0].id;
        }
        return currentId;
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch notes. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load notes on mount and debounce / trigger when search or tag filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes({
        search: searchQuery.trim() || undefined,
        tag: selectedTag || undefined,
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag, fetchNotes]);

  // Compute available tags with note counts
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notes) {
      if (note.tags && Array.isArray(note.tags)) {
        for (const tag of note.tags) {
          map.set(tag, (map.get(tag) || 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [notes]);

  const activeNote = useMemo<Note | null>(() => {
    if (isCreating || selectedNoteId === null) return null;
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId, isCreating]);

  // Handler to start creating a new note
  const handleStartCreate = (): void => {
    setIsCreating(true);
    setSelectedNoteId(null);
    setIsMobileEditorOpen(true);
  };

  // Handler to select an existing note
  const handleSelectNote = (note: Note): void => {
    setIsCreating(false);
    setSelectedNoteId(note.id);
    setIsMobileEditorOpen(true);
  };

  // Handler to save (create or update) a note
  const handleSaveNote = async (data: CreateNoteInput | UpdateNoteInput): Promise<void> => {
    if (isCreating) {
      const newNote = await notesService.createNote(data as CreateNoteInput);
      setIsCreating(false);
      await fetchNotes({
        search: searchQuery.trim() || undefined,
        tag: selectedTag || undefined,
      });
      setSelectedNoteId(newNote.id);
    } else if (selectedNoteId !== null) {
      const updatedNote = await notesService.updateNote(selectedNoteId, data as UpdateNoteInput);
      setNotes((prev) =>
        prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)),
      );
    }
  };

  // Handler to confirm delete
  const handleConfirmDelete = async (): Promise<void> => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      await notesService.deleteNote(noteToDelete.id);
      const deletedId = noteToDelete.id;
      setNoteToDelete(null);

      // Refresh list
      const remainingNotes = notes.filter((n) => n.id !== deletedId);
      setNotes(remainingNotes);

      if (selectedNoteId === deletedId) {
        if (remainingNotes.length > 0) {
          setSelectedNoteId(remainingNotes[0].id);
        } else {
          setSelectedNoteId(null);
          setIsCreating(false);
          setIsMobileEditorOpen(false);
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete note.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearFilters = (): void => {
    setSearchQuery('');
    setSelectedTag(null);
  };

  return (
    <div className="notes-app-layout">
      {/* Left Sidebar */}
      <NoteSidebar
        totalNotes={notes.length}
        tags={tagCounts}
        selectedTag={selectedTag}
        onSelectTag={(tag) => setSelectedTag(tag)}
        onNewNote={handleStartCreate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area: Notes List + Editor */}
      <div className="notes-main-workspace">
        {/* Notes List Column */}
        <section
          className={`notes-list-pane ${isMobileEditorOpen ? 'hide-on-mobile' : ''}`}
          aria-label="Notes List"
        >
          <div className="notes-list-header">
            <div className="notes-list-header-top">
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open workspace menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <div className="notes-heading-group">
                <h2 className="notes-pane-title">
                  {selectedTag ? `#${selectedTag}` : 'Notes'}
                </h2>
                <span className="notes-count-badge">{notes.length}</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="mobile-create-note-btn"
                onClick={handleStartCreate}
                leftIcon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                }
              >
                New
              </Button>
            </div>

            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search in title, content..."
            />

            {selectedTag && (
              <div className="active-filter-banner">
                <span>
                  Filtering by <strong>#{selectedTag}</strong>
                </span>
                <button
                  type="button"
                  className="filter-clear-link"
                  onClick={() => setSelectedTag(null)}
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="notes-alert-container">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          <div className="notes-cards-scrollable">
            {isLoading ? (
              <div className="notes-loading-state">
                <div className="loading-spinner" />
                <p>Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <EmptyNotes
                isSearchOrFilter={Boolean(searchQuery || selectedTag)}
                onClearFilter={handleClearFilters}
                onCreateNote={handleStartCreate}
              />
            ) : (
              <div className="notes-grid">
                {notes.map((note, index) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    index={index}
                    isSelected={!isCreating && selectedNoteId === note.id}
                    onSelect={handleSelectNote}
                    onDelete={(n) => setNoteToDelete(n)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Editor / Detail Pane */}
        <section
          className={`notes-editor-pane ${!isMobileEditorOpen ? 'hide-on-mobile' : ''}`}
          aria-label="Note Content and Editor"
        >
          {isCreating || activeNote ? (
            <NoteEditor
              note={activeNote}
              isCreating={isCreating}
              onSave={handleSaveNote}
              onDelete={(n) => setNoteToDelete(n)}
              onCancel={() => {
                setIsCreating(false);
                if (notes.length > 0) {
                  setSelectedNoteId(notes[0].id);
                }
                setIsMobileEditorOpen(false);
              }}
              onCloseMobile={() => setIsMobileEditorOpen(false)}
            />
          ) : (
            <div className="editor-placeholder">
              <div className="editor-placeholder-graphic">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cfb59e" strokeWidth="1.2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3>Select a note to view</h3>
              <p>Choose a note from the left list or create a new one to begin editing.</p>
              <Button
                variant="primary"
                size="md"
                onClick={handleStartCreate}
                leftIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                }
              >
                Create New Note
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(noteToDelete)}
        onClose={() => !isDeleting && setNoteToDelete(null)}
        title="Delete Note"
      >
        <p className="delete-modal-text">
          Are you sure you want to delete <strong>"{noteToDelete?.title}"</strong>?
          This action cannot be undone.
        </p>
        <div className="delete-modal-actions">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setNoteToDelete(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            isLoading={isDeleting}
            onClick={handleConfirmDelete}
          >
            Delete Note
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default NotesPage;
