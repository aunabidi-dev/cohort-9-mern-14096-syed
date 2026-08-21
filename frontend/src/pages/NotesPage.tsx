import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from 'react';
import { Alert } from '../components/common/Alert';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { EmptyNotes } from '../components/notes/EmptyNotes';
import { NoteCard } from '../components/notes/NoteCard';
import { NoteSidebar } from '../components/notes/NoteSidebar';
import { SearchBar } from '../components/notes/SearchBar';
import { notesService } from '../services/notesService';
import type {
  Note,
  NoteFilter,
  UpdateNoteInput,
} from '../types/notes';

export function NotesPage(): ReactElement {
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Responsive column count for dynamic masonry packing
  const [numColumns, setNumColumns] = useState<number>(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth <= 720) return 1;
    if (window.innerWidth <= 1100) return 2;
    return 3;
  });

  useEffect(() => {
    const handleResize = (): void => {
      if (window.innerWidth <= 720) {
        setNumColumns(1);
      } else if (window.innerWidth <= 1100) {
        setNumColumns(2);
      } else {
        setNumColumns(3);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Fetch notes from backend
  const fetchNotes = useCallback(async (filter?: NoteFilter): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await notesService.getNotes(filter);
      setNotes(data);
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

  // Debounced search / tag filter
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

  // Distribute notes horizontally into columns so shorter cards allow cards below to fill space
  const columns = useMemo(() => {
    const cols: Note[][] = Array.from({ length: numColumns }, () => []);
    notes.forEach((note, index) => {
      cols[index % numColumns].push(note);
    });
    return cols;
  }, [notes, numColumns]);

  // Instant New Note: Opens a clean note card at top of grid for user entry
  const handleStartCreate = (): void => {
    // If a draft is already open, maintain focus on it
    if (expandedNoteId && expandedNoteId < 0) {
      return;
    }

    const draftId = -Date.now();
    const draftNote: Note = {
      id: draftId,
      user_id: 0,
      title: '',
      content: '',
      tags: selectedTag ? [selectedTag] : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setNotes((prev) => [draftNote, ...prev]);
    setExpandedNoteId(draftId);
  };

  // In-place auto save / update note on close
  const handleSaveNote = async (
    noteId: number,
    data: UpdateNoteInput,
  ): Promise<Note | void> => {
    try {
      if (noteId < 0) {
        // Create draft in backend once user enters content or title
        const created = await notesService.createNote({
          title: data.title?.trim() || 'Untitled Note',
          content: data.content?.trim() || '—',
          tags: data.tags || [],
        });

        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? created : n)),
        );
        setExpandedNoteId((curr) => (curr === noteId ? created.id : curr));
        return created;
      } else {
        // Update existing note in backend
        const updated = await notesService.updateNote(noteId, {
          title: data.title?.trim() || 'Untitled Note',
          content: data.content?.trim() || '—',
          tags: data.tags || [],
        });

        setNotes((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n)),
        );
        return updated;
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save note changes.');
      }
      throw err;
    }
  };

  // Auto-delete empty notes only when user closes / unexpands them
  const handleAutoDeleteNote = async (noteId: number): Promise<void> => {
    try {
      if (noteId > 0) {
        await notesService.deleteNote(noteId);
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setExpandedNoteId((curr) => (curr === noteId ? null : curr));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete empty note.');
      }
    }
  };

  // Confirm manual deletion via modal
  const handleConfirmDelete = async (): Promise<void> => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      if (noteToDelete.id > 0) {
        await notesService.deleteNote(noteToDelete.id);
      }
      const deletedId = noteToDelete.id;
      setNoteToDelete(null);

      // Remove from list
      setNotes((prev) => prev.filter((n) => n.id !== deletedId));
      if (expandedNoteId === deletedId) {
        setExpandedNoteId(null);
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
      {/* Panel 1: Existing Left Sidebar */}
      <NoteSidebar
        totalNotes={notes.filter((n) => n.id > 0).length}
        tags={tagCounts}
        selectedTag={selectedTag}
        onSelectTag={(tag) => setSelectedTag(tag)}
        onNewNote={handleStartCreate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Panel 2: Full-Width Primary Notes Workspace */}
      <main className="notes-main-workspace" aria-label="Notes Workspace">
        {/* Workspace Top Header */}
        <header className="notes-workspace-header">
          <div className="notes-workspace-header-row">
            <div className="notes-workspace-left">
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open workspace menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <div className="notes-heading-group">
                <h1 className="notes-pane-title">
                  {selectedTag ? `#${selectedTag}` : 'Notes'}
                </h1>
                <span className="notes-count-badge">
                  {notes.filter((n) => n.id > 0).length}
                </span>
              </div>
            </div>

            <div className="notes-workspace-actions">
              <div className="notes-search-container">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search in title, content..."
                />
              </div>

              <Button
                variant="primary"
                size="md"
                className="workspace-create-note-btn"
                onClick={handleStartCreate}
                leftIcon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                }
              >
                New Note
              </Button>
            </div>
          </div>

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
        </header>

        {error && (
          <div className="notes-alert-container">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Scrollable Masonry Area */}
        <div className="notes-workspace-scrollable">
          {isLoading ? (
            <div className="notes-loading-state">
              <div className="loading-spinner" />
              <p>Loading your notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <EmptyNotes
              isSearchOrFilter={Boolean(searchQuery || selectedTag)}
              onClearFilter={handleClearFilters}
              onCreateNote={handleStartCreate}
            />
          ) : (
            <div className="notes-bento-grid">
              {columns.map((columnNotes, colIndex) => (
                <div key={colIndex} className="notes-bento-column">
                  {columnNotes.map((note) => {
                    const trueIndex = notes.findIndex((n) => n.id === note.id);
                    return (
                      <NoteCard
                        key={note.id}
                        note={note}
                        index={trueIndex >= 0 ? trueIndex : 0}
                        isExpanded={expandedNoteId === note.id}
                        onExpand={(n) => setExpandedNoteId(n.id)}
                        onClose={(noteId) =>
                          setExpandedNoteId((current) =>
                            current === noteId ? null : current,
                          )
                        }
                        onSave={handleSaveNote}
                        onDelete={(n) => setNoteToDelete(n)}
                        onAutoDelete={handleAutoDeleteNote}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(noteToDelete)}
        onClose={() => !isDeleting && setNoteToDelete(null)}
        title="Delete Note"
      >
        <p className="delete-modal-text">
          Are you sure you want to delete <strong>"{noteToDelete?.title || 'Untitled Note'}"</strong>?
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
