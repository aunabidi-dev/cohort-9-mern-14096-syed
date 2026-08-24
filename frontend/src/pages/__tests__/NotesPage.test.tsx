import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotesPage } from '../NotesPage';
import { notesService } from '../../services/notesService';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../services/notesService');
jest.mock('../../context/AuthContext');

const mockNotesList = [
  {
    id: 1,
    user_id: 1,
    title: 'Work Sprint Tasks',
    content: '<p>Complete phase 6 testing tasks</p>',
    tags: ['work', 'important'],
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
  },
  {
    id: 2,
    user_id: 1,
    title: 'Grocery List',
    content: '<p>Apples, Bananas, Milk</p>',
    tags: ['personal'],
    created_at: '2026-08-21T10:00:00Z',
    updated_at: '2026-08-21T10:00:00Z',
  },
];

describe('NotesPage Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
      logout: jest.fn(),
      isAuthenticated: true,
    });
  });

  it('renders loading state initially and then displays notes list', async () => {
    (notesService.getNotes as jest.Mock).mockResolvedValue(mockNotesList);

    render(<NotesPage />);

    expect(screen.getByText('Loading your notes...')).toBeInTheDocument();

    expect(await screen.findByText('Work Sprint Tasks')).toBeInTheDocument();
    expect(screen.getByText('Grocery List')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('renders empty notes state when no notes exist', async () => {
    (notesService.getNotes as jest.Mock).mockResolvedValue([]);

    render(<NotesPage />);

    expect(await screen.findByText('No notes yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create your first note/i })).toBeInTheDocument();
  });

  it('displays error alert if fetching notes fails', async () => {
    (notesService.getNotes as jest.Mock).mockRejectedValue(new Error('Failed to load notes from server'));

    render(<NotesPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load notes from server');
  });

  it('handles search input and fetches filtered notes after debounce', async () => {
    (notesService.getNotes as jest.Mock).mockResolvedValue(mockNotesList);

    render(<NotesPage />);
    await screen.findByText('Work Sprint Tasks');

    const searchInput = screen.getByLabelText('Search notes');
    fireEvent.change(searchInput, { target: { value: 'Sprint' } });

    await waitFor(
      () => {
        expect(notesService.getNotes).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Sprint',
          }),
        );
      },
      { timeout: 1000 },
    );
  });

  it('filters notes by tag when a tag is clicked in the sidebar', async () => {
    (notesService.getNotes as jest.Mock).mockResolvedValue(mockNotesList);

    render(<NotesPage />);
    await screen.findByText('Work Sprint Tasks');

    // Sidebar should have tags computed from notes: #work, #important, #personal
    const workTagButton = screen.getByRole('button', { name: /# work/i });
    fireEvent.click(workTagButton);

    await waitFor(
      () => {
        expect(notesService.getNotes).toHaveBeenCalledWith(
          expect.objectContaining({
            tag: 'work',
          }),
        );
      },
      { timeout: 1000 },
    );

    expect(await screen.findByText(/filtering by/i)).toBeInTheDocument();

    // Clear filter
    const clearBtn = screen.getByRole('button', { name: /clear filter/i });
    fireEvent.click(clearBtn);

    await waitFor(
      () => {
        expect(notesService.getNotes).toHaveBeenCalledWith(
          expect.objectContaining({
            tag: undefined,
          }),
        );
      },
      { timeout: 1000 },
    );
  });

  it('creates a new note when clicking New Note button', async () => {
    const user = userEvent.setup();
    (notesService.getNotes as jest.Mock).mockResolvedValue(mockNotesList);
    const createdNote = {
      id: 101,
      user_id: 1,
      title: 'Newly Created Note',
      content: '<p>Fresh ideas</p>',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    (notesService.createNote as jest.Mock).mockResolvedValueOnce(createdNote);

    render(<NotesPage />);
    await screen.findByText('Work Sprint Tasks');

    // Click "New Note" in workspace header
    const newNoteBtn = screen.getAllByRole('button', { name: /new note/i })[0];
    await user.click(newNoteBtn);

    // An expanded title input should appear
    const titleInput = screen.getByLabelText('Note title');
    expect(titleInput).toBeInTheDocument();

    await user.type(titleInput, 'Newly Created Note');

    // Close to save
    const closeBtn = screen.getByLabelText('Close note');
    await user.click(closeBtn);

    await waitFor(() => {
      expect(notesService.createNote).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Newly Created Note',
      }));
    });
  });

  it('deletes a note via confirmation modal', async () => {
    const user = userEvent.setup();
    (notesService.getNotes as jest.Mock).mockResolvedValue([...mockNotesList]);
    (notesService.deleteNote as jest.Mock).mockResolvedValueOnce(undefined);

    render(<NotesPage />);
    await screen.findByText('Work Sprint Tasks');

    // Click delete on the first note
    const deleteBtn = screen.getByRole('button', { name: /delete work sprint tasks/i });
    await user.click(deleteBtn);

    // Confirmation modal should be visible
    expect(screen.getByRole('heading', { name: /delete note/i })).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

    // Confirm deletion
    const confirmDeleteBtn = screen.getByRole('button', { name: /^delete note$/i });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(notesService.deleteNote).toHaveBeenCalledWith(1);
    });

    // Note should be removed from view
    await waitFor(() => {
      expect(screen.queryByText('Work Sprint Tasks')).not.toBeInTheDocument();
    });
  });

  it('cancelling deletion modal leaves the note in the list', async () => {
    const user = userEvent.setup();
    (notesService.getNotes as jest.Mock).mockResolvedValue([...mockNotesList]);

    render(<NotesPage />);
    await screen.findByText('Work Sprint Tasks');

    const deleteBtn = screen.getByRole('button', { name: /delete work sprint tasks/i });
    await user.click(deleteBtn);

    // Cancel deletion
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    expect(screen.queryByRole('heading', { name: /delete note/i })).not.toBeInTheDocument();
    expect(screen.getByText('Work Sprint Tasks')).toBeInTheDocument();
    expect(notesService.deleteNote).not.toHaveBeenCalled();
  });
});
