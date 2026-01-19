import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ThemeProvider } from '../../src/contexts/ThemeContext';

// Create test query client
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Custom render with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    queryClient?: QueryClient;
    route?: string;
    renderOptions?: Omit<RenderOptions, 'wrapper'>;
  }
) {
  const {
    queryClient = createTestQueryClient(),
    route = '/',
    renderOptions = {},
  } = options ?? {};

  window.history.pushState({}, 'Test page', route);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Wait for async operations
export async function waitForLoadingToFinish() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

// Mock user data
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2026-01-01T00:00:00Z',
};

// Mock auth token
export const mockAuthToken = 'mock-jwt-token';

// Mock workspace data
export const mockWorkspace = {
  id: 'workspace-1',
  name: 'Test Workspace',
  owner_id: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Mock document data
export const mockDocument = {
  id: 'doc-1',
  workspace_id: 'workspace-1',
  filename: 'test.pdf',
  file_type: 'pdf' as const,
  status: 'ready' as const,
  chunk_count: 10,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Mock message data
export const mockMessage = {
  id: 'msg-1',
  role: 'assistant' as const,
  content: 'Test response',
  timestamp: new Date(),
};

// Mock ledger entry
export const mockLedgerEntry = {
  id: 'claim-1',
  claim_text: 'Test claim',
  claim_type: 'fact' as const,
  importance: 'critical' as const,
  verdict: 'supported' as const,
  confidence: 0.95,
  evidence_snippet: 'Test evidence',
  chunk_ids: ['chunk-1'],
};
