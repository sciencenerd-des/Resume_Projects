import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  describe('rendering', () => {
    test('renders with default props', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    test('renders with label', () => {
      render(<Input label="Email" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    test('renders with error state', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    test('renders with helper text', () => {
      render(<Input helperText="Use a strong password" />);
      expect(screen.getByText('Use a strong password')).toBeInTheDocument();
    });

    test('renders with type', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });
  });

  describe('interactions', () => {
    test('calls onChange when value changes', () => {
      const handleChange = () => { mockCalls++; };
      let mockCalls = 0;
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      expect(mockCalls).toBe(1);
    });

    test('calls onFocus when focused', () => {
      const handleFocus = () => { mockCalls++; };
      let mockCalls = 0;
      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');
      input.focus();
      expect(mockCalls).toBe(1);
    });

    test('calls onBlur when blurred', () => {
      const handleBlur = () => { mockCalls++; };
      let mockCalls = 0;
      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      input.focus();
      input.blur();
      expect(mockCalls).toBe(1);
    });
  });

  describe('validation', () => {
    test('shows error when value is empty and required', () => {
      render(<Input required error="Required" value="" />);
      expect(screen.getByText('Required')).toBeInTheDocument();
    });

    test('applies error styles', () => {
      render(<Input error="Invalid" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });
  });

  describe('disabled state', () => {
    test('is disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    test('has aria-label when provided', () => {
      render(<Input aria-label="Search input" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Search input');
    });

    test('renders label element when label prop provided', () => {
      render(<Input label="Email" />);
      const label = screen.getByText('Email');
      expect(label.tagName).toBe('LABEL');
    });
  });
});
