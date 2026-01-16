import { describe, test, expect, beforeEach } from 'bun:test';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../../src/hooks/useAuth';

// The supabase mock is set up in the preload file
// Just test the hook behavior with the mocked supabase

describe('useAuth', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    queryClient?.clear();
  });

  describe('hook structure', () => {
    test('returns expected properties', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      // Check that the hook returns the expected shape
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('signIn');
      expect(result.current).toHaveProperty('signUp');
      expect(result.current).toHaveProperty('signOut');
    });

    test('signIn is a mutation object', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.signIn).toHaveProperty('mutate');
      expect(result.current.signIn).toHaveProperty('mutateAsync');
      expect(result.current.signIn).toHaveProperty('isPending');
    });

    test('signUp is a mutation object', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.signUp).toHaveProperty('mutate');
      expect(result.current.signUp).toHaveProperty('mutateAsync');
    });

    test('signOut is a mutation object', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(result.current.signOut).toHaveProperty('mutate');
      expect(result.current.signOut).toHaveProperty('mutateAsync');
    });
  });

  describe('loading state', () => {
    test('isLoading is a boolean', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      expect(typeof result.current.isLoading).toBe('boolean');
    });
  });
});
