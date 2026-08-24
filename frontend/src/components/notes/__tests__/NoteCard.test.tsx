import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NoteCard, NOTE_THEMES } from '../NoteCard';
import type { Note } from '../../../types/notes';

const mockNote: Note = {
  id: 1,
  user_id: 10,
  title: 'Project Roadmap',
  content: '<p>Complete Phase 6 testing suite and verify.</p>',
  tags: ['work', 'shine'],
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T12:00:00Z',
};

describe('NoteCard Component', () => {
  const mockOnExpand = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnAutoDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Collapsed State', () => {
    it('renders note title, tags, and formatted preview', () => {
      render(
        <NoteCard
          note={mockNote}
          index={0}
          isExpanded={false}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );

      expect(screen.getByText('Project Roadmap')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.getByText('shine')).toBeInTheDocument();
      expect(screen.getByText(/Complete Phase 6 testing suite/)).toBeInTheDocument();
    });

    it('renders Untitled Note when title is empty', () => {
      render(
        <NoteCard
          note={{ ...mockNote, title: '' }}
          index={0}
          isExpanded={false}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );

      expect(screen.getByText('Untitled Note')).toBeInTheDocument();
    });

    it('applies cyclic theme classes based on index', () => {
      const { container: container0 } = render(
        <NoteCard
          note={mockNote}
          index={0}
          isExpanded={false}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );
      expect(container0.firstChild).toHaveClass(NOTE_THEMES[0]);

      const { container: container3 } = render(
        <NoteCard
          note={mockNote}
          index={3}
          isExpanded={false}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );
      expect(container3.firstChild).toHaveClass(NOTE_THEMES[3]);
      expect(container3.firstChild).toHaveClass('note-card-dark');
    });

    it('clicking on collapsed card triggers onExpand', () => {
      render(
        <NoteCard
          note={mockNote}
          index={0}
          isExpanded={false}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );

      const titleButton = screen.getByRole('button', { name: /open note: project roadmap/i });
      fireEvent.click(titleButton);

      expect(mockOnExpand).toHaveBeenCalledWith(mockNote);
    });

    it('clicking delete button triggers onDelete', () => {
      render(
        <NoteCard
          note={mockNote}
          index={0}
          isExpanded={false}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /delete project roadmap/i });
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockNote);
    });
  });

  describe('Expanded State & Editing', () => {
    it('renders expanded editor controls, title input, and tags', () => {
      render(
        <NoteCard
          note={mockNote}
          index={0}
          isExpanded={true}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );

      expect(screen.getByText('Editing')).toBeInTheDocument();
      expect(screen.getByLabelText('Note title')).toHaveValue('Project Roadmap');
      expect(screen.getByLabelText('Close note')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add tag')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
    });

    it('allows adding tags via enter key and plus button, and removing tags', () => {
      render(
        <NoteCard
          note={mockNote}
          index={0}
          isExpanded={true}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );

      const tagInput = screen.getByPlaceholderText('Add tag');
      fireEvent.change(tagInput, { target: { value: 'frontend' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });

      expect(screen.getByText('frontend')).toBeInTheDocument();

      // Add another tag via plus button
      fireEvent.change(tagInput, { target: { value: 'testing' } });
      const addBtn = screen.getByRole('button', { name: '+' });
      fireEvent.click(addBtn);

      expect(screen.getByText('testing')).toBeInTheDocument();

      // Remove a tag
      const removeBtn = screen.getByLabelText('Remove tag work');
      fireEvent.click(removeBtn);

      expect(screen.queryByText('work')).not.toBeInTheDocument();
    });

    it('saves note changes when user clicks close/collapse button', async () => {
      mockOnSave.mockResolvedValueOnce({ ...mockNote, title: 'Updated Roadmap' });

      render(
        <NoteCard
          note={mockNote}
          index={0}
          isExpanded={true}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );

      const titleInput = screen.getByLabelText('Note title');
      fireEvent.change(titleInput, { target: { value: 'Updated Roadmap' } });

      const closeBtn = screen.getByLabelText('Close note');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(1, expect.objectContaining({
          title: 'Updated Roadmap',
        }));
      });

      expect(mockOnClose).toHaveBeenCalledWith(1);
    });

    it('auto-deletes empty note when closed', async () => {
      const emptyNote: Note = {
        id: -123,
        user_id: 10,
        title: '',
        content: '',
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      render(
        <NoteCard
          note={emptyNote}
          index={0}
          isExpanded={true}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );

      const closeBtn = screen.getByLabelText('Close note');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(mockOnAutoDelete).toHaveBeenCalledWith(-123);
      });
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('keeps card expanded and preserves edits if save fails', async () => {
      mockOnSave.mockRejectedValueOnce(new Error('Network error on save'));

      render(
        <NoteCard
          note={mockNote}
          index={0}
          isExpanded={true}
          onExpand={mockOnExpand}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onAutoDelete={mockOnAutoDelete}
        />,
      );

      const titleInput = screen.getByLabelText('Note title');
      fireEvent.change(titleInput, { target: { value: 'Failed Save Title' } });

      const closeBtn = screen.getByLabelText('Close note');
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Note title')).toHaveValue('Failed Save Title');
    });

    it('triggers save on click outside the note card', async () => {
      mockOnSave.mockResolvedValueOnce({ ...mockNote, title: 'Click Outside Title' });

      render(
        <div>
          <div data-testid="outside-area">Outside</div>
          <NoteCard
            note={mockNote}
            index={0}
            isExpanded={true}
            onExpand={mockOnExpand}
            onClose={mockOnClose}
            onSave={mockOnSave}
            onDelete={mockOnDelete}
            onAutoDelete={mockOnAutoDelete}
          />
        </div>,
      );

      const titleInput = screen.getByLabelText('Note title');
      fireEvent.change(titleInput, { target: { value: 'Click Outside Title' } });

      // NoteCard attaches pointerdown listener after 80ms
      await waitFor(
        () => {
          const outsideArea = screen.getByTestId('outside-area');
          fireEvent.pointerDown(outsideArea);
          expect(mockOnSave).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
              title: 'Click Outside Title',
            }),
          );
        },
        { timeout: 1000 },
      );
    });
  });
});
