import React from 'react';
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useSession, useSessionMessages, useSessionLedger } from '@/hooks/useSessions';

// Create mock functions - we'll assign them to the api object before each test
const mockGetSession = mock(() =>
  Promise.resolve({ data: { id: 'session1', title: 'Test Session' } })
);
const mockGetSessionMessages = mock(() =>
  Promise.resolve({ data: [] })
);
const mockGetSessionLedger = mock(() =>
  Promise.resolve({ data: [] })
);

// Mock api methods directly on the imported object (doesn't pollute other tests)
beforeEach(() => {
  (api as any).getSession = mockGetSession;
  (api as any).getSessionMessages = mockGetSessionMessages;
  (api as any).getSessionLedger = mockGetSessionLedger;
});

// Integration test component
function SessionChatIntegration({ sessionId }: { sessionId: string }) {
  const sessionQuery = useSession(sessionId);
  const messagesQuery = useSessionMessages(sessionId);
  const ledgerQuery = useSessionLedger(sessionId);

  if (sessionQuery.isLoading || messagesQuery.isLoading || ledgerQuery.isLoading) {
    return <div data-testid="loading">loading</div>;
  }

  const session = sessionQuery.data;
  const messages = messagesQuery.data || [];
  const ledger = ledgerQuery.data || [];

  return (
    <div>
      <div data-testid="session-title">{session?.title || 'Untitled'}</div>
      <div data-testid="messages-count">{messages.length}</div>
      <div data-testid="ledger-count">{ledger.length}</div>

      <div data-testid="message-list">
        {messages.map((msg: any, i: number) => (
          <div key={i} data-testid={`message-${i}`}>
            <span data-testid={`message-${i}-role`}>{msg.role}</span>
            <span data-testid={`message-${i}-content`}>{msg.content}</span>
          </div>
        ))}
      </div>

      <div data-testid="ledger-list">
        {ledger.map((entry: any, i: number) => (
          <div key={i} data-testid={`ledger-${i}`}>
            <span data-testid={`ledger-${i}-claim`}>{entry.claim}</span>
            <span data-testid={`ledger-${i}-verdict`}>{entry.verdict}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

describe('Session Chat Integration', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetSession.mockClear();
    mockGetSessionMessages.mockClear();
    mockGetSessionLedger.mockClear();
  });

  describe('session loading', () => {
    test('shows loading state initially', () => {
      mockGetSession.mockImplementation(() => new Promise(() => {}));
      mockGetSessionMessages.mockImplementation(() => new Promise(() => {}));
      mockGetSessionLedger.mockImplementation(() => new Promise(() => {}));

      render(<SessionChatIntegration sessionId="session1" />, { wrapper });

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    test('displays session data after loading', async () => {
      mockGetSession.mockResolvedValue({ data: { id: 'session1', title: 'Test Session' } });
      mockGetSessionMessages.mockResolvedValue({ data: [] });
      mockGetSessionLedger.mockResolvedValue({ data: [] });

      render(<SessionChatIntegration sessionId="session1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('session-title')).toHaveTextContent('Test Session');
      });
    });
  });

  describe('messages display', () => {
    test('displays messages in order', async () => {
      mockGetSession.mockResolvedValue({ data: { id: 'session1', title: 'Test' } });
      mockGetSessionMessages.mockResolvedValue({
        data: [
          { role: 'user', content: 'What is AI?' },
          { role: 'assistant', content: 'AI is...' },
        ],
      });
      mockGetSessionLedger.mockResolvedValue({ data: [] });

      render(<SessionChatIntegration sessionId="session1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('messages-count')).toHaveTextContent('2');
        expect(screen.getByTestId('message-0-role')).toHaveTextContent('user');
        expect(screen.getByTestId('message-0-content')).toHaveTextContent('What is AI?');
        expect(screen.getByTestId('message-1-role')).toHaveTextContent('assistant');
      });
    });

    test('shows empty message list', async () => {
      mockGetSession.mockResolvedValue({ data: { id: 'session1', title: 'Test' } });
      mockGetSessionMessages.mockResolvedValue({ data: [] });
      mockGetSessionLedger.mockResolvedValue({ data: [] });

      render(<SessionChatIntegration sessionId="session1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('messages-count')).toHaveTextContent('0');
      });
    });
  });

  describe('evidence ledger display', () => {
    test('displays ledger entries', async () => {
      mockGetSession.mockResolvedValue({ data: { id: 'session1', title: 'Test' } });
      mockGetSessionMessages.mockResolvedValue({ data: [] });
      mockGetSessionLedger.mockResolvedValue({
        data: [
          { claim: 'AI can learn', verdict: 'supported' },
          { claim: 'AI is conscious', verdict: 'contradicted' },
        ],
      });

      render(<SessionChatIntegration sessionId="session1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('ledger-count')).toHaveTextContent('2');
        expect(screen.getByTestId('ledger-0-claim')).toHaveTextContent('AI can learn');
        expect(screen.getByTestId('ledger-0-verdict')).toHaveTextContent('supported');
        expect(screen.getByTestId('ledger-1-verdict')).toHaveTextContent('contradicted');
      });
    });

    test('shows empty ledger', async () => {
      mockGetSession.mockResolvedValue({ data: { id: 'session1', title: 'Test' } });
      mockGetSessionMessages.mockResolvedValue({ data: [] });
      mockGetSessionLedger.mockResolvedValue({ data: [] });

      render(<SessionChatIntegration sessionId="session1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('ledger-count')).toHaveTextContent('0');
      });
    });
  });

  describe('combined data', () => {
    test('displays session, messages, and ledger together', async () => {
      mockGetSession.mockResolvedValue({
        data: { id: 'session1', title: 'Complete Session' },
      });
      mockGetSessionMessages.mockResolvedValue({
        data: [
          { role: 'user', content: 'Question 1' },
          { role: 'assistant', content: 'Answer 1' },
        ],
      });
      mockGetSessionLedger.mockResolvedValue({
        data: [
          { claim: 'Claim 1', verdict: 'supported' },
          { claim: 'Claim 2', verdict: 'weak' },
          { claim: 'Claim 3', verdict: 'not_found' },
        ],
      });

      render(<SessionChatIntegration sessionId="session1" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('session-title')).toHaveTextContent('Complete Session');
        expect(screen.getByTestId('messages-count')).toHaveTextContent('2');
        expect(screen.getByTestId('ledger-count')).toHaveTextContent('3');
      });
    });
  });

  describe('error handling', () => {
    test('handles API errors gracefully', async () => {
      mockGetSession.mockRejectedValue(new Error('Session not found'));
      mockGetSessionMessages.mockResolvedValue({ data: [] });
      mockGetSessionLedger.mockResolvedValue({ data: [] });

      render(<SessionChatIntegration sessionId="invalid" />, { wrapper });

      // Should eventually stop loading even with error
      await waitFor(
        () => {
          expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });
});
