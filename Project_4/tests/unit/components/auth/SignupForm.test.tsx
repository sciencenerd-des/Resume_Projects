import React from 'react';
import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('SignupForm', () => {
  const defaultProps = {
    onSubmit: async () => {},
  };

  describe('rendering', () => {
    test('renders name input', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    test('renders email input', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    test('renders password input', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    test('renders confirm password input', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    test('renders submit button', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    test('renders sign in link', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    test('renders terms and conditions checkbox', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    test('calls onSubmit with email, password, name', async () => {
      let submittedEmail = '';
      let submittedPassword = '';
      let submittedName = '';

      const handleSubmit = async (email: string, password: string, name: string) => {
        submittedEmail = email;
        submittedPassword = password;
        submittedName = name;
      };

      renderWithRouter(<SignupForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'John Doe' },
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'john@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'Password1A' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'Password1A' },
      });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(submittedEmail).toBe('john@example.com');
        expect(submittedPassword).toBe('Password1A');
        expect(submittedName).toBe('John Doe');
      });
    });

    test('shows error when password valid but other fields empty', async () => {
      const { container } = renderWithRouter(<SignupForm {...defaultProps} />);

      // Enter valid password to enable button
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'Password1A' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'Password1A' },
      });

      // Now button should be enabled, submit the form
      const form = container.querySelector('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
    });

    test('button is disabled when password is invalid', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      // Button is disabled by default because password requirements not met
      const button = screen.getByRole('button', { name: /create account/i });
      expect(button).toBeDisabled();
    });
  });

  describe('password requirements', () => {
    test('shows all password requirements', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one number/i)).toBeInTheDocument();
    });

    test('requirements turn green when met', async () => {
      const { container } = renderWithRouter(<SignupForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'Password1A' },
      });

      await waitFor(() => {
        // Uses semantic verdict-supported color for met requirements
        const greenItems = container.querySelectorAll('.text-verdict-supported');
        expect(greenItems.length).toBe(4); // All 4 requirements met
      });
    });

    test('unmet requirements stay gray', async () => {
      const { container } = renderWithRouter(<SignupForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'short' },
      });

      await waitFor(() => {
        // Uses semantic muted-foreground color for unmet requirements
        const grayItems = container.querySelectorAll('.text-muted-foreground');
        expect(grayItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('password matching', () => {
    test('shows error when passwords do not match', async () => {
      renderWithRouter(<SignupForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'Password1A' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'DifferentPassword1A' },
      });

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    test('clears error when passwords match', async () => {
      renderWithRouter(<SignupForm {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'Password1A' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'DifferentPassword1A' },
      });

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'Password1A' },
      });

      await waitFor(() => {
        expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('terms and conditions', () => {
    test('blocks submission without terms acceptance', async () => {
      let submitted = false;
      renderWithRouter(
        <SignupForm onSubmit={async () => { submitted = true; }} />
      );

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password1A' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1A' } });
      // Don't click the checkbox

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/please agree to the terms/i)).toBeInTheDocument();
        expect(submitted).toBe(false);
      });
    });

    test('allows submission with terms accepted', async () => {
      let submitted = false;
      renderWithRouter(
        <SignupForm onSubmit={async () => { submitted = true; }} />
      );

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password1A' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1A' } });
      fireEvent.click(screen.getByRole('checkbox'));

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(submitted).toBe(true);
      });
    });

    test('renders terms of service and privacy policy links', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('displays error from failed submission', async () => {
      const handleSubmit = async () => {
        throw new Error('Email already registered');
      };

      renderWithRouter(<SignupForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password1A' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1A' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
    });

    test('displays generic error for non-Error throws', async () => {
      const handleSubmit = async () => {
        throw 'Something went wrong';
      };

      renderWithRouter(<SignupForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password1A' } });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1A' } });
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Signup failed')).toBeInTheDocument();
      });
    });

    test('error message has icon', async () => {
      const { container } = renderWithRouter(<SignupForm {...defaultProps} />);

      // Enter valid password to enable button
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'Password1A' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'Password1A' },
      });

      // Submit form to trigger error (fields empty)
      const form = container.querySelector('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      // Error div uses semantic destructive background
      const errorDiv = container.querySelector('[class*="bg-destructive"]');
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('all inputs have labels', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    test('form has proper semantic structure', () => {
      const { container } = renderWithRouter(<SignupForm {...defaultProps} />);
      expect(container.querySelector('form')).toBeInTheDocument();
    });

    test('submit button is keyboard accessible', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      const button = screen.getByRole('button', { name: /create account/i });
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('styling', () => {
    test('form has space-y-6 class', () => {
      const { container } = renderWithRouter(<SignupForm {...defaultProps} />);
      expect(container.querySelector('form.space-y-6')).toBeInTheDocument();
    });

    test('submit button has w-full class', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      const button = screen.getByRole('button', { name: /create account/i });
      expect(button).toHaveClass('w-full');
    });

    test('links have primary styling', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      const signInLink = screen.getByText(/sign in/i);
      expect(signInLink).toHaveClass('text-primary');
    });
  });

  describe('links', () => {
    test('sign in link points to login route', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      const link = screen.getByText(/sign in/i);
      expect(link).toHaveAttribute('href', '/login');
    });

    test('terms link points to terms route', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      const link = screen.getByText(/terms of service/i);
      expect(link).toHaveAttribute('href', '/terms');
    });

    test('privacy link points to privacy route', () => {
      renderWithRouter(<SignupForm {...defaultProps} />);
      const link = screen.getByText(/privacy policy/i);
      expect(link).toHaveAttribute('href', '/privacy');
    });
  });

  describe('icons', () => {
    test('inputs have icons', () => {
      const { container } = renderWithRouter(<SignupForm {...defaultProps} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(4); // At least one for each input
    });
  });

  describe('loading state', () => {
    test('isLoading prop disables button and shows loading indicator', () => {
      const { container } = renderWithRouter(<SignupForm {...defaultProps} isLoading />);
      // Button exists but has loading dots instead of text
      const button = container.querySelector('button[type="submit"]');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
      // Loading dots are shown
      expect(container.querySelector('.animate-bounce')).toBeInTheDocument();
    });
  });
});
