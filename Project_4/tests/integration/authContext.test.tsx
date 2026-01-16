import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Supabase
const mockSignIn = mock(() => Promise.resolve({ error: null }));
const mockSignUp = mock(() => Promise.resolve({ error: null }));
const mockSignOut = mock(() => Promise.resolve({ error: null }));
const mockGetSession = mock(() =>
  Promise.resolve({ data: { session: null } })
);
const mockOnAuthStateChange = mock(() => ({
  data: { subscription: { unsubscribe: () => {} } },
}));

mock.module('../../src/services/supabase', () => ({
  getSupabase: () => ({
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

import { AuthProvider, useAuth, AuthContext } from '../../src/contexts/AuthContext';

// Test component that uses auth context
function AuthTestComponent() {
  const { user, session, isLoading, signIn, signUp, signOut } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="user">{user?.email || 'no-user'}</div>
      <div data-testid="session">{session ? 'has-session' : 'no-session'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signUp('new@example.com', 'password')}>Sign Up</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthContext Integration', () => {
  beforeEach(() => {
    mockSignIn.mockClear();
    mockSignUp.mockClear();
    mockSignOut.mockClear();
    mockGetSession.mockClear();
    mockOnAuthStateChange.mockClear();
  });

  describe('AuthProvider', () => {
    test('provides auth context to children', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });
    });

    test('loads initial session on mount', async () => {
      const mockSession = {
        access_token: 'token',
        user: { id: 'user1', email: 'test@example.com', created_at: '2024-01-01' },
      };
      mockGetSession.mockResolvedValueOnce({ data: { session: mockSession } });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('session')).toHaveTextContent('has-session');
      });
    });

    test('shows loading state initially', async () => {
      mockGetSession.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 100))
      );

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });
  });

  describe('signIn', () => {
    test('calls supabase signInWithPassword', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      fireEvent.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password',
        });
      });
    });

    test('throws error on sign in failure', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignIn.mockResolvedValueOnce({ error: { message: 'Invalid credentials' } });

      const ErrorComponent = () => {
        const { signIn } = useAuth();
        const [error, setError] = React.useState<string | null>(null);

        const handleSignIn = async () => {
          try {
            await signIn('test@example.com', 'wrong');
          } catch (e: any) {
            setError(e.message);
          }
        };

        return (
          <>
            <button onClick={handleSignIn}>Sign In</button>
            {error && <div data-testid="error">{error}</div>}
          </>
        );
      };

      render(
        <AuthProvider>
          <ErrorComponent />
        </AuthProvider>
      );

      await waitFor(() => screen.getByText('Sign In'));

      fireEvent.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      });
    });
  });

  describe('signUp', () => {
    test('calls supabase signUp', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      fireEvent.click(screen.getByText('Sign Up'));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'password',
        });
      });
    });

    test('throws error on sign up failure', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValueOnce({ error: { message: 'Email already registered' } });

      const ErrorComponent = () => {
        const { signUp } = useAuth();
        const [error, setError] = React.useState<string | null>(null);

        const handleSignUp = async () => {
          try {
            await signUp('existing@example.com', 'password');
          } catch (e: any) {
            setError(e.message);
          }
        };

        return (
          <>
            <button onClick={handleSignUp}>Sign Up</button>
            {error && <div data-testid="error">{error}</div>}
          </>
        );
      };

      render(
        <AuthProvider>
          <ErrorComponent />
        </AuthProvider>
      );

      await waitFor(() => screen.getByText('Sign Up'));

      fireEvent.click(screen.getByText('Sign Up'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email already registered');
      });
    });
  });

  describe('signOut', () => {
    test('calls supabase signOut', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      fireEvent.click(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });
  });

  describe('useAuth hook', () => {
    test('throws error when used outside provider', () => {
      const consoleError = console.error;
      console.error = () => {};

      expect(() => {
        render(<AuthTestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = consoleError;
    });
  });

  describe('auth state changes', () => {
    test('subscribes to auth state changes on mount', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled();
      });
    });

    test('unsubscribes on unmount', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const unsubscribe = mock(() => {});
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe } },
      });

      const { unmount } = render(
        <AuthProvider>
          <AuthTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
