import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../src/contexts/ThemeContext';

// Custom render with providers for Convex-based app
// Note: For full Convex testing, use ConvexProvider with a test client
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    route?: string;
    renderOptions?: Omit<RenderOptions, 'wrapper'>;
  }
) {
  const {
    route = '/',
    renderOptions = {},
  } = options ?? {};

  window.history.pushState({}, 'Test page', route);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Wait for async operations
export async function waitForLoadingToFinish() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

// Mock user data (Clerk format)
export const mockUser = {
  id: 'user_test123',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  firstName: 'Test',
  lastName: 'User',
};

// Mock workspace data (Convex format)
export const mockWorkspace = {
  _id: 'workspace_test123' as any,
  name: 'Test Workspace',
  ownerId: 'user_test123',
  _creationTime: Date.now(),
};

// Mock document data (Convex format)
export const mockDocument = {
  _id: 'doc_test123' as any,
  workspaceId: 'workspace_test123',
  filename: 'test.pdf',
  fileType: 'pdf' as const,
  status: 'ready' as const,
  chunkCount: 10,
  _creationTime: Date.now(),
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
