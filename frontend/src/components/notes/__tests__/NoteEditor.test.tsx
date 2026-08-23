import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NoteEditor } from '../NoteEditor';
import type { Note } from '../../../types/notes';

const mockNote: Note = {
  id: 42,
  user_id: 1,
  title: 'Architecture Review',
  content: 'Review the backend and frontend boundaries.',
  tags: ['arch', 'review'],
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-21T15:30:00Z',
};

describe('NoteEditor Component', () => {
  const mockOnSave = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnCloseMobile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in creating mode when isCreating is true', () => {
    render(
      <NoteEditor
        note={null}
        isCreating={true}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Creating New Note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('renders in editing mode with existing note data', () => {
    render(
      <NoteEditor
        note={mockNote}
        isCreating={false}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onCloseMobile={mockOnCloseMobile}
      />,
    );

    expect(screen.getByText('Editing Note')).toBeInTheDocument();
    expect(screen.getByLabelText('Note title')).toHaveValue('Architecture Review');
    expect(screen.getByLabelText('Note content')).toHaveValue(
      'Review the backend and frontend boundaries.',
    );
    expect(screen.getByText('arch')).toBeInTheDocument();
    expect(screen.getByText('review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to notes list/i })).toBeInTheDocument();
  });

  it('validates empty title and content on save', async () => {
    render(
      <NoteEditor
        note={null}
        isCreating={true}
        onSave={mockOnSave}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /create note/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Please provide a title for your note.')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();

    // Enter title, leave content empty
    const titleInput = screen.getByLabelText('Note title');
    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Please provide some content for your note.')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('allows adding and removing tags', () => {
    render(
      <NoteEditor
        note={mockNote}
        isCreating={false}
        onSave={mockOnSave}
      />,
    );

    const tagInput = screen.getByPlaceholderText('Add tag (press Enter)');
    fireEvent.change(tagInput, { target: { value: 'testing' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    expect(screen.getByText('testing')).toBeInTheDocument();

    // Add via button
    fireEvent.change(tagInput, { target: { value: 'qa' } });
    const addBtn = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addBtn);

    expect(screen.getByText('qa')).toBeInTheDocument();

    // Remove tag
    const removeBtn = screen.getByLabelText('Remove tag arch');
    fireEvent.click(removeBtn);

    expect(screen.queryByText('arch')).not.toBeInTheDocument();
  });

  it('successfully submits valid note edits', async () => {
    mockOnSave.mockResolvedValueOnce(undefined);

    render(
      <NoteEditor
        note={mockNote}
        isCreating={false}
        onSave={mockOnSave}
      />,
    );

    const titleInput = screen.getByLabelText('Note title');
    fireEvent.change(titleInput, { target: { value: 'Updated Architecture' } });

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        title: 'Updated Architecture',
        content: 'Review the backend and frontend boundaries.',
        tags: ['arch', 'review'],
      });
    });
  });

  it('handles save error and displays error alert', async () => {
    mockOnSave.mockRejectedValueOnce(new Error('Server error updating note'));

    render(
      <NoteEditor
        note={mockNote}
        isCreating={false}
        onSave={mockOnSave}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Server error updating note');
  });

  it('calls onDelete, onCancel, and onCloseMobile handlers when clicked', () => {
    render(
      <NoteEditor
        note={mockNote}
        isCreating={false}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onCloseMobile={mockOnCloseMobile}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);
    expect(mockOnDelete).toHaveBeenCalledWith(mockNote);

    const backBtn = screen.getByRole('button', { name: /back to notes list/i });
    fireEvent.click(backBtn);
    expect(mockOnCloseMobile).toHaveBeenCalledTimes(1);
  });
});
