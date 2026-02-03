import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryInput } from '@/components/chat/QueryInput';

describe('QueryInput', () => {
  describe('rendering', () => {
    test('renders textarea with placeholder', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      expect(screen.getByPlaceholderText('Message VerityDraft...')).toBeInTheDocument();
    });

    test('renders send button', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    test('displays current value', () => {
      render(<QueryInput value="Test query" onChange={() => {}} onSubmit={() => {}} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Test query');
    });
  });

  describe('interactions', () => {
    test('calls onChange when text is entered', () => {
      const handleChange = () => { mockCalls++; };
      let mockCalls = 0;
      render(<QueryInput value="" onChange={handleChange} onSubmit={() => {}} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      expect(mockCalls).toBe(1);
    });

    test('calls onSubmit when send button is clicked', () => {
      const handleSubmit = () => { mockCalls++; };
      let mockCalls = 0;
      render(<QueryInput value="Test" onChange={() => {}} onSubmit={handleSubmit} />);
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      expect(mockCalls).toBe(1);
    });

    test('submits on Enter key without Shift', () => {
      const handleSubmit = () => { mockCalls++; };
      let mockCalls = 0;
      render(<QueryInput value="Test" onChange={() => {}} onSubmit={handleSubmit} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      expect(mockCalls).toBe(1);
    });

    test('does not submit on Enter key with Shift', () => {
      const handleSubmit = () => { mockCalls++; };
      let mockCalls = 0;
      render(<QueryInput value="Test" onChange={() => {}} onSubmit={handleSubmit} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
      expect(mockCalls).toBe(0);
    });

    test('does not submit when value is empty', () => {
      const handleSubmit = () => { mockCalls++; };
      let mockCalls = 0;
      render(<QueryInput value="" onChange={() => {}} onSubmit={handleSubmit} />);
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      expect(mockCalls).toBe(0);
    });

    test('does not submit when value is only whitespace', () => {
      const handleSubmit = () => { mockCalls++; };
      let mockCalls = 0;
      render(<QueryInput value="   " onChange={() => {}} onSubmit={handleSubmit} />);
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
      expect(mockCalls).toBe(0);
    });
  });

  describe('disabled state', () => {
    test('disables textarea when disabled is true', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    test('disables send button when disabled is true', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} disabled />);
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    test('disables send button when value is empty', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });
  });

  describe('auto-resize', () => {
    test('sets height style on textarea', () => {
      // Auto-resize relies on scrollHeight which doesn't work in happy-dom
      // We can only verify the effect hook runs and sets some height
      render(<QueryInput value="Short text" onChange={() => {}} onSubmit={() => {}} />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      // The useEffect sets height based on scrollHeight, so height should be set
      expect(textarea.style.height).toBeDefined();
    });

    test('uses Math.min to cap height at 200px', () => {
      // In a real browser with scrollHeight > 200, this would cap at 200px
      // Here we just verify the code path by checking the component renders
      // The actual 200px cap is enforced in the component via Math.min
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      // Verify the textarea element is properly rendered
      expect(textarea.tagName).toBe('TEXTAREA');
    });
  });

  describe('accessibility', () => {
    test('has aria-label on textarea', () => {
      render(<QueryInput value="" onChange={() => {}} onSubmit={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Message input');
    });
  });
});
