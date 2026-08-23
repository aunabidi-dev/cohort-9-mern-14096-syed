import { fireEvent, render, screen } from '@testing-library/react';
import { RichTextEditor } from '../RichTextEditor';

describe('RichTextEditor Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders toolbar buttons and content container', () => {
    render(
      <RichTextEditor
        content="<p>Sample rich text</p>"
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByRole('toolbar', { name: /text formatting/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /heading 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /heading 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /heading 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bullet list/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /numbered list/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quote/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /code block/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /redo/i })).toBeInTheDocument();
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('clicks toolbar formatting buttons without errors', () => {
    render(
      <RichTextEditor
        content="<p>Test formatting</p>"
        onChange={mockOnChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /bold/i }));
    fireEvent.click(screen.getByRole('button', { name: /italic/i }));
    fireEvent.click(screen.getByRole('button', { name: /heading 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /heading 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /heading 3/i }));
    fireEvent.click(screen.getByRole('button', { name: /bullet list/i }));
    fireEvent.click(screen.getByRole('button', { name: /numbered list/i }));
    fireEvent.click(screen.getByRole('button', { name: /quote/i }));
    fireEvent.click(screen.getByRole('button', { name: /code block/i }));
    fireEvent.click(screen.getByRole('button', { name: /undo/i }));
    fireEvent.click(screen.getByRole('button', { name: /redo/i }));
  });

  it('disables toolbar buttons when disabled prop is true', () => {
    render(
      <RichTextEditor
        content="<p>Disabled state</p>"
        onChange={mockOnChange}
        disabled={true}
      />,
    );

    expect(screen.getByRole('button', { name: /bold/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /italic/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /heading 1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled();
  });
});
