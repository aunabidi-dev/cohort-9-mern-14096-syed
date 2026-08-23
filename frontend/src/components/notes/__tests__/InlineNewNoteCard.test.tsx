import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InlineNewNoteCard } from '../InlineNewNoteCard';

describe('InlineNewNoteCard Component', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders new note card with inputs and cancel button', () => {
    render(<InlineNewNoteCard onSave={mockOnSave} onCancel={mockOnCancel} />);

    expect(screen.getByText('New Note')).toBeInTheDocument();
    expect(screen.getByLabelText('New note title')).toBeInTheDocument();
    expect(screen.getByLabelText('New note content')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add tag')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Discard new note')).toBeInTheDocument();
  });

  it('validates empty title and content', async () => {
    render(<InlineNewNoteCard onSave={mockOnSave} onCancel={mockOnCancel} />);

    const createBtn = screen.getByRole('button', { name: /create note/i });
    fireEvent.click(createBtn);

    expect(await screen.findByText('Please enter a note title.')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();

    // Enter title, leave content empty
    const titleInput = screen.getByLabelText('New note title');
    fireEvent.change(titleInput, { target: { value: 'New Quick Note' } });
    fireEvent.click(createBtn);

    expect(await screen.findByText('Please enter some note content.')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('allows adding and removing tags', () => {
    render(<InlineNewNoteCard onSave={mockOnSave} onCancel={mockOnCancel} />);

    const tagInput = screen.getByPlaceholderText('Add tag');
    fireEvent.change(tagInput, { target: { value: 'ideas' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    expect(screen.getByText('ideas')).toBeInTheDocument();

    // Add another tag via plus button
    fireEvent.change(tagInput, { target: { value: 'urgent' } });
    const addBtn = screen.getByRole('button', { name: '+' });
    fireEvent.click(addBtn);

    expect(screen.getByText('urgent')).toBeInTheDocument();

    // Remove tag
    const removeBtn = screen.getByLabelText('Remove tag ideas');
    fireEvent.click(removeBtn);

    expect(screen.queryByText('ideas')).not.toBeInTheDocument();
  });

  it('submits valid new note and handles save failure gracefully', async () => {
    mockOnSave.mockRejectedValueOnce(new Error('Network error creating note'));

    render(<InlineNewNoteCard onSave={mockOnSave} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText('New note title');
    const contentInput = screen.getByLabelText('New note content');
    const createBtn = screen.getByRole('button', { name: /create note/i });

    fireEvent.change(titleInput, { target: { value: 'Valid Title' } });
    fireEvent.change(contentInput, { target: { value: 'Valid note content body' } });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        title: 'Valid Title',
        content: 'Valid note content body',
        tags: [],
      });
    });

    expect(await screen.findByText('Network error creating note')).toBeInTheDocument();
  });

  it('calls onCancel when cancel or discard button is clicked', () => {
    render(<InlineNewNoteCard onSave={mockOnSave} onCancel={mockOnCancel} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);

    const discardBtn = screen.getByLabelText('Discard new note');
    fireEvent.click(discardBtn);
    expect(mockOnCancel).toHaveBeenCalledTimes(2);
  });
});
