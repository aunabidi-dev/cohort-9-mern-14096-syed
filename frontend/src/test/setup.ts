import '@testing-library/jest-dom';
import React from 'react';
import { cleanup } from '@testing-library/react';

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill DOM Range methods for rich text editor support in jsdom
if (typeof window !== 'undefined') {
  Range.prototype.getBoundingClientRect = () => ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => '',
  });

  Range.prototype.getClientRects = () => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: jest.fn(),
  });
}

// Lightweight TipTap / ProseMirror mock to prevent heavy jsdom DOM mutation observers
// and provide fast, deterministic, <1s test execution across all suites
jest.mock('@tiptap/react', () => ({
  useEditor: ({ content, onUpdate }: { content?: string; onUpdate?: ({ editor }: { editor: { getHTML: () => string; getText: () => string } }) => void } = {}) => {
    let currentContent = content || '<p></p>';
    return {
      getHTML: () => currentContent,
      getText: () => currentContent.replace(/<[^>]+>/g, ' ').trim(),
      chain: () => ({
        focus: () => ({
          toggleBold: () => ({ run: jest.fn() }),
          toggleItalic: () => ({ run: jest.fn() }),
          toggleHeading: () => ({ run: jest.fn() }),
          toggleBulletList: () => ({ run: jest.fn() }),
          toggleOrderedList: () => ({ run: jest.fn() }),
          toggleBlockquote: () => ({ run: jest.fn() }),
          toggleCodeBlock: () => ({ run: jest.fn() }),
          undo: () => ({ run: jest.fn() }),
          redo: () => ({ run: jest.fn() }),
        }),
      }),
      isActive: () => false,
      can: () => ({ undo: () => true, redo: () => true }),
      setEditable: jest.fn(),
      commands: {
        setContent: (newContent: string) => {
          currentContent = newContent;
          if (onUpdate) {
            onUpdate({
              editor: {
                getHTML: () => currentContent,
                getText: () => currentContent.replace(/<[^>]+>/g, ' ').trim(),
              },
            });
          }
        },
      },
      isFocused: false,
    };
  },
  EditorContent: ({ editor }: { editor?: { getHTML: () => string } }) =>
    React.createElement(
      'div',
      { 'data-testid': 'editor-content', className: 'tiptap-editor-content' },
      editor?.getHTML ? editor.getHTML() : '',
    ),
}));

// Reset mocks and storage before each test
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// Clean up mounted components and clear pending timers after each test to prevent worker leaks
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});
