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

// Create the mock supabase client
const mockSupabaseClient = {
  auth: {
    getSession: mock(async () => ({
      data: { session: mockSession },
      error: null,
    })),
    getUser: mock(async () => ({
      data: { user: mockSession.user },
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
};

// Create the mock module exports
const createMockSupabase = () => ({
  supabase: mockSupabaseClient,
  getSupabase: () => mockSupabaseClient,
  initSupabase: async () => mockSupabaseClient,
});

// Mock using multiple path patterns to ensure coverage
// Absolute path
mock.module('/Users/biswajitmondal/Developer/project_profile/Project_4/src/services/supabase', createMockSupabase);
// Relative paths from tests
mock.module('../src/services/supabase', createMockSupabase);
mock.module('../../src/services/supabase', createMockSupabase);
mock.module('../../../src/services/supabase', createMockSupabase);
// Path alias
mock.module('@/services/supabase', createMockSupabase);

// Create a complete mock API object with ALL methods
// This ensures consistent mocking across all test files
const createMockApi = () => ({
  api: {
    // Workspaces
    getWorkspaces: mock(async () => []),
    createWorkspace: mock(async () => ({ id: 'ws-1', name: 'Test Workspace' })),

    // Documents
    getDocuments: mock(async () => []),
    uploadDocument: mock(async () => ({ id: 'doc-1', status: 'processing' })),
    deleteDocument: mock(async () => {}),

    // Sessions
    getSessions: mock(async () => []),
    getWorkspaceSessions: mock(async () => []),
    getSession: mock(async () => ({ id: 'session-1', title: 'Test Session' })),
    getSessionMessages: mock(async () => []),
    getSessionLedger: mock(async () => []),
    deleteSession: mock(async () => {}),
    exportSession: mock(async () => ({ url: 'export.pdf' })),

    // Chat
    createQuery: mock(async () => ({ session_id: 'session-1' })),
  },
});

// Mock @/services/api globally with complete API object
mock.module('@/services/api', createMockApi);
mock.module('../src/services/api', createMockApi);
mock.module('../../src/services/api', createMockApi);
mock.module('../../../src/services/api', createMockApi);
mock.module('../../../../src/services/api', createMockApi);

// Create a complete mock for useAuth hook
// This ensures all test files get a consistent, complete mock
const createMockUseAuth = () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
    isLoading: false,
    signIn: {
      mutate: mock(() => {}),
      mutateAsync: mock(async () => ({ user: { id: 'user-1' } })),
      isPending: false,
      isError: false,
      error: null,
    },
    signUp: {
      mutate: mock(() => {}),
      mutateAsync: mock(async () => ({ user: { id: 'user-1' } })),
      isPending: false,
      isError: false,
      error: null,
    },
    signOut: {
      mutate: mock(() => {}),
      mutateAsync: mock(async () => {}),
      isPending: false,
      isError: false,
      error: null,
    },
  }),
});

// Mock @/hooks/useAuth globally with complete hook
mock.module('@/hooks/useAuth', createMockUseAuth);
mock.module('../hooks/useAuth', createMockUseAuth);
mock.module('../../hooks/useAuth', createMockUseAuth);
mock.module('../../../hooks/useAuth', createMockUseAuth);
mock.module('../../src/hooks/useAuth', createMockUseAuth);
mock.module('../../../src/hooks/useAuth', createMockUseAuth);
