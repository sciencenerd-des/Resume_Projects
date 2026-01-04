// Setup mocks before any test imports
// This file should be preloaded before tests run
import { mock } from 'bun:test';

// Mock session data
const mockSession = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  user: {
    id: 'user-1',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
  },
};

// Create the mock supabase object
const createMockSupabase = () => ({
  supabase: {
    auth: {
      getSession: mock(async () => ({
        data: { session: mockSession },
        error: null,
      })),
      signInWithPassword: mock(async (credentials: { email: string; password: string }) => {
        if (credentials.email === 'invalid@example.com') {
          return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
        }
        return { data: { user: mockSession.user, session: mockSession }, error: null };
      }),
      signUp: mock(async () => ({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      })),
      signOut: mock(async () => ({ error: null })),
      onAuthStateChange: mock((_callback: (event: string, session: unknown) => void) => {
        // Don't call callback in preload to avoid side effects
        return { data: { subscription: { unsubscribe: () => {} } } };
      }),
    },
    from: mock(() => ({
      select: mock(() => Promise.resolve({ data: [], error: null })),
      insert: mock(() => Promise.resolve({ data: null, error: null })),
      update: mock(() => Promise.resolve({ data: null, error: null })),
      delete: mock(() => Promise.resolve({ data: null, error: null })),
    })),
    storage: {
      from: mock(() => ({
        upload: mock(() => Promise.resolve({ data: null, error: null })),
        getPublicUrl: mock(() => ({ data: { publicUrl: 'http://example.com/file' } })),
      })),
    },
  },
});

// Mock using multiple path patterns to ensure coverage
// Absolute path
mock.module('/Users/biswajitmondal/Developer/project_profile/Project_4/src/services/supabase', createMockSupabase);
// Relative paths from tests
mock.module('../src/services/supabase', createMockSupabase);
mock.module('../../src/services/supabase', createMockSupabase);
mock.module('../../../src/services/supabase', createMockSupabase);
