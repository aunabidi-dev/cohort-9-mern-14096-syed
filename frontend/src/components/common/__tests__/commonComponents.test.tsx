import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { Input } from '../Input';
import { Modal } from '../Modal';
import { TagBadge } from '../TagBadge';
import { SearchBar } from '../../notes/SearchBar';
import { EmptyNotes } from '../../notes/EmptyNotes';

describe('Common UI Components', () => {
  describe('Button', () => {
    it('renders with variants, sizes, and handles click', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(
        <Button variant="danger" size="lg" onClick={handleClick}>
          Delete
        </Button>,
      );

      const btn = screen.getByRole('button', { name: 'Delete' });
      expect(btn).toHaveClass('btn-danger', 'btn-lg');

      await user.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button and shows spinner when isLoading is true', () => {
      render(<Button isLoading>Submit</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass('btn-loading');
    });
  });

  describe('Input', () => {
    it('renders label, input, and error message', () => {
      render(
        <Input
          label="Test Label"
          placeholder="Enter text"
          error="Field is required"
        />,
      );

      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Field is required');
      expect(screen.getByPlaceholderText('Enter text')).toHaveClass('form-input-error');
    });

    it('renders helper text when no error is present', () => {
      render(<Input label="Username" helperText="Choose a unique username" />);
      expect(screen.getByText('Choose a unique username')).toBeInTheDocument();
    });
  });

  describe('Alert', () => {
    it('renders alert message and calls onClose when dismiss button is clicked', async () => {
      const handleClose = jest.fn();
      const user = userEvent.setup();

      render(
        <Alert type="warning" message="Session expiring soon" onClose={handleClose} />,
      );

      expect(screen.getByRole('alert')).toHaveClass('alert-warning');
      expect(screen.getByText('Session expiring soon')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText('Dismiss alert');
      await user.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('returns null when no message or children are passed', () => {
      const { container } = render(<Alert />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Modal', () => {
    it('renders title and children when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
          <p>Modal content body</p>
        </Modal>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Test Modal' })).toBeInTheDocument();
      expect(screen.getByText('Modal content body')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={jest.fn()} title="Hidden Modal">
          <p>Hidden</p>
        </Modal>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when Escape key is pressed or close button clicked', () => {
      const handleClose = jest.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Body</p>
        </Modal>,
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      const closeBtn = screen.getByLabelText('Close dialog');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('TagBadge', () => {
    it('renders tag name with prefix and handles click and remove', async () => {
      const handleClick = jest.fn();
      const handleRemove = jest.fn();
      const user = userEvent.setup();

      render(
        <TagBadge
          name="react"
          isRemovable={true}
          onClick={handleClick}
          onRemove={handleRemove}
        />,
      );

      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('#')).toBeInTheDocument();

      await user.click(screen.getByText('react'));
      expect(handleClick).toHaveBeenCalledWith('react');

      const removeBtn = screen.getByLabelText('Remove tag react');
      await user.click(removeBtn);
      expect(handleRemove).toHaveBeenCalledWith('react');
    });

    it('handles keyboard enter and space for clickable tag', () => {
      const handleClick = jest.fn();

      render(<TagBadge name="typescript" onClick={handleClick} />);

      const tag = screen.getByText('typescript');
      fireEvent.keyDown(tag, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(tag, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('SearchBar', () => {
    it('renders input, handles typing, and clears search', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      const { rerender } = render(<SearchBar value="" onChange={handleChange} />);
      const searchInput = screen.getByLabelText('Search notes');

      await user.type(searchInput, 'hello');
      expect(handleChange).toHaveBeenCalled();

      rerender(<SearchBar value="hello" onChange={handleChange} />);
      const clearBtn = screen.getByLabelText('Clear search');
      await user.click(clearBtn);
      expect(handleChange).toHaveBeenCalledWith('');
    });
  });

  describe('EmptyNotes', () => {
    it('renders default empty state when not searching/filtering', () => {
      const handleCreate = jest.fn();
      render(<EmptyNotes onCreateNote={handleCreate} />);

      expect(screen.getByText('No notes yet')).toBeInTheDocument();
      const createBtn = screen.getByRole('button', { name: /create your first note/i });
      fireEvent.click(createBtn);
      expect(handleCreate).toHaveBeenCalled();
    });

    it('renders filtered empty state when searching/filtering with clear button', () => {
      const handleClear = jest.fn();
      render(<EmptyNotes isSearchOrFilter={true} onClearFilter={handleClear} />);

      expect(screen.getByText('No matching notes found')).toBeInTheDocument();
      const clearBtn = screen.getByRole('button', { name: /clear filters/i });
      fireEvent.click(clearBtn);
      expect(handleClear).toHaveBeenCalled();
    });
  });
});
