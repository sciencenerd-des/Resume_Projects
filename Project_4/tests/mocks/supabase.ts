// Mock Supabase client for tests
import { mock } from 'bun:test';

export const mockSession = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  user: {
    id: 'user-1',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
  },
};

export const supabase = {
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
    signOut: mock(async () => ({ error: null })),
    onAuthStateChange: mock((callback: (event: string, session: any) => void) => {
      setTimeout(() => callback('INITIAL_SESSION', { session: mockSession }), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }),
  },
};
