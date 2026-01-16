import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('LoginForm', () => {
  const defaultProps = {
    onSubmit: async () => {},
  };

  describe('rendering', () => {
    test('renders email input', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    test('renders password input', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    test('renders submit button', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('renders forgot password link', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    test('renders sign up link', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      expect(screen.getByText(/sign up/i)).toBeInTheDocument();
    });

    test('renders remember me checkbox', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    test('calls onSubmit with email and password', async () => {
      let submittedEmail = '';
      let submittedPassword = '';

      const handleSubmit = async (email: string, password: string) => {
        submittedEmail = email;
        submittedPassword = password;
      };

      renderWithRouter(<LoginForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(submittedEmail).toBe('user@example.com');
        expect(submittedPassword).toBe('password123');
      });
    });

    test('shows error when fields are empty and submitted', async () => {
      const { container } = renderWithRouter(<LoginForm {...defaultProps} />);

      const form = container.querySelector('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
    });

    test('isLoading prop disables button and shows loading indicator', () => {
      const { container } = renderWithRouter(<LoginForm {...defaultProps} isLoading />);
      // Button exists but has loading dots instead of text
      const button = container.querySelector('button[type="submit"]');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
      // Loading dots are shown
      expect(container.querySelector('.animate-bounce')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('displays error from failed submission', async () => {
      const handleSubmit = async () => {
        throw new Error('Invalid credentials');
      };

      renderWithRouter(<LoginForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    test('displays generic error for non-Error throws', async () => {
      const handleSubmit = async () => {
        throw 'Something went wrong';
      };

      renderWithRouter(<LoginForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });
    });

    test('clears error on new submission', async () => {
      let callCount = 0;
      const handleSubmit = async () => {
        callCount++;
        if (callCount === 1) throw new Error('First attempt failed');
      };

      renderWithRouter(<LoginForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });

      // First submission - error
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('First attempt failed')).toBeInTheDocument();
      });

      // Second submission - error cleared then success
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.queryByText('First attempt failed')).not.toBeInTheDocument();
      });
    });
  });

  describe('input types', () => {
    test('email input has email type', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    });

    test('password input has password type', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    });
  });

  describe('accessibility', () => {
    test('inputs have labels', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    test('submit button is keyboard accessible', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      const button = screen.getByRole('button', { name: /sign in/i });
      button.focus();
      expect(button).toHaveFocus();
    });

    test('form has proper semantic structure', () => {
      const { container } = renderWithRouter(<LoginForm {...defaultProps} />);
      expect(container.querySelector('form')).toBeInTheDocument();
    });

    test('error message has icon', async () => {
      const handleSubmit = async () => {
        throw new Error('Test error');
      };

      const { container } = renderWithRouter(<LoginForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'user@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        const errorDiv = container.querySelector('.bg-red-50');
        expect(errorDiv).toBeInTheDocument();
        expect(errorDiv?.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('styling', () => {
    test('form has space-y-6 class', () => {
      const { container } = renderWithRouter(<LoginForm {...defaultProps} />);
      expect(container.querySelector('form.space-y-6')).toBeInTheDocument();
    });

    test('submit button has w-full class', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      const button = screen.getByRole('button', { name: /sign in/i });
      expect(button).toHaveClass('w-full');
    });

    test('links have blue styling', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      const signUpLink = screen.getByText(/sign up/i);
      expect(signUpLink).toHaveClass('text-blue-600');
    });
  });

  describe('links', () => {
    test('forgot password link points to forgot-password route', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      const link = screen.getByText(/forgot password/i);
      expect(link).toHaveAttribute('href', '/forgot-password');
    });

    test('sign up link points to signup route', () => {
      renderWithRouter(<LoginForm {...defaultProps} />);
      const link = screen.getByText(/sign up/i);
      expect(link).toHaveAttribute('href', '/signup');
    });
  });

  describe('icons', () => {
    test('inputs have icons', () => {
      const { container } = renderWithRouter(<LoginForm {...defaultProps} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
