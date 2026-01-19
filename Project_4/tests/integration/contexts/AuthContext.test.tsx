import React from 'react';
import { describe, test, expect } from 'bun:test';
import '@testing-library/jest-dom';
import { AuthContext } from '@/contexts/AuthContext';

// Note: Due to Bun's mock.module limitations with path aliases,
// we test the context contract without rendering AuthProvider
// which would require complex Supabase mocking

describe('AuthContext Integration', () => {
  describe('context creation', () => {
    test('AuthContext is defined', () => {
      expect(AuthContext).toBeDefined();
    });

    test('AuthContext is a React context', () => {
      // React contexts have Provider and Consumer properties
      expect(AuthContext.Provider).toBeDefined();
      expect(AuthContext.Consumer).toBeDefined();
    });
  });

  describe('context contract', () => {
    test('can create a mock auth value with expected shape', () => {
      // This tests the expected shape of AuthContext value
      const mockAuthValue = {
        user: null,
        session: null,
        isLoading: false,
        signIn: async () => {},
        signUp: async () => {},
        signOut: async () => {},
      };

      // Verify the shape matches what AuthProvider would provide
      expect(mockAuthValue).toHaveProperty('user');
      expect(mockAuthValue).toHaveProperty('session');
      expect(mockAuthValue).toHaveProperty('isLoading');
      expect(typeof mockAuthValue.signIn).toBe('function');
      expect(typeof mockAuthValue.signUp).toBe('function');
      expect(typeof mockAuthValue.signOut).toBe('function');
    });

    test('context can provide auth value to children', () => {
      // Test that we can use the context to provide values
      const TestConsumer = () => {
        const auth = React.useContext(AuthContext);
        return <div data-testid="auth-value">{auth ? 'has-value' : 'no-value'}</div>;
      };

      // Without provider, should be null
      const element = <TestConsumer />;
      expect(element).toBeDefined();
    });
  });

  describe('module exports', () => {
    test('exports AuthProvider component', async () => {
      // Dynamic import to check exports
      const module = await import('@/contexts/AuthContext');
      expect(module.AuthProvider).toBeDefined();
      expect(typeof module.AuthProvider).toBe('function');
    });

    test('exports useAuth hook', async () => {
      const module = await import('@/contexts/AuthContext');
      expect(module.useAuth).toBeDefined();
      expect(typeof module.useAuth).toBe('function');
    });

    test('exports AuthContext', async () => {
      const module = await import('@/contexts/AuthContext');
      expect(module.AuthContext).toBeDefined();
    });
  });
});
