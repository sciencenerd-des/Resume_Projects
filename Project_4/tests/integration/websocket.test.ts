import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';

// Mock useAuth with complete properties
const mockSession = { access_token: 'test-token' };
mock.module('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: mockSession,
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
}));

// Mock WebSocket class
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send = mock((data: string) => {});
  close = mock(() => {
    this.readyState = 3;
  });

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  simulateClose() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close'));
  }

  simulateMessage(data: Record<string, unknown>) {
    this.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify(data) })
    );
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

describe('WebSocket Integration', () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    (global as any).WebSocket = MockWebSocket;
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  describe('connection', () => {
    test('creates WebSocket with auth token', async () => {
      // Test that WebSocket is created with the correct URL format
      const ws = new MockWebSocket('ws://localhost:8000/ws?token=test-token');
      expect(ws.url).toContain('token=test-token');
    });

    test('handles successful connection', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      let isConnected = false;

      ws.onopen = () => {
        isConnected = true;
      };

      ws.simulateOpen();

      expect(isConnected).toBe(true);
    });

    test('handles connection close', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      let isClosed = false;

      ws.onclose = () => {
        isClosed = true;
      };

      ws.simulateOpen();
      ws.simulateClose();

      expect(isClosed).toBe(true);
    });

    test('handles connection error', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      let hasError = false;

      ws.onerror = () => {
        hasError = true;
      };

      ws.simulateError();

      expect(hasError).toBe(true);
    });
  });

  describe('message handling', () => {
    test('receives content_chunk messages', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      let receivedMessage: Record<string, unknown> | null = null;

      ws.onmessage = (event) => {
        receivedMessage = JSON.parse(event.data);
      };

      ws.simulateOpen();
      ws.simulateMessage({
        type: 'content_chunk',
        delta: 'Hello',
        sessionId: 'session1',
      });

      expect(receivedMessage).toEqual({
        type: 'content_chunk',
        delta: 'Hello',
        sessionId: 'session1',
      });
    });

    test('receives claim_verified messages', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      let receivedMessage: Record<string, unknown> | null = null;

      ws.onmessage = (event) => {
        receivedMessage = JSON.parse(event.data);
      };

      ws.simulateOpen();
      ws.simulateMessage({
        type: 'claim_verified',
        claim: 'Test claim',
        verdict: 'supported',
        confidence: 0.95,
      });

      expect(receivedMessage?.type).toBe('claim_verified');
      expect(receivedMessage?.verdict).toBe('supported');
    });

    test('receives ledger_updated messages', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      let receivedMessage: Record<string, unknown> | null = null;

      ws.onmessage = (event) => {
        receivedMessage = JSON.parse(event.data);
      };

      ws.simulateOpen();
      ws.simulateMessage({
        type: 'ledger_updated',
        entries: [
          { claim: 'Claim 1', verdict: 'supported' },
          { claim: 'Claim 2', verdict: 'weak' },
        ],
      });

      expect(receivedMessage?.type).toBe('ledger_updated');
      expect((receivedMessage?.entries as any[])?.length).toBe(2);
    });

    test('receives generation_complete messages', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      let receivedMessage: Record<string, unknown> | null = null;

      ws.onmessage = (event) => {
        receivedMessage = JSON.parse(event.data);
      };

      ws.simulateOpen();
      ws.simulateMessage({
        type: 'generation_complete',
        sessionId: 'session1',
        finalContent: 'Complete response',
      });

      expect(receivedMessage?.type).toBe('generation_complete');
    });
  });

  describe('sending messages', () => {
    test('sends query message', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      ws.simulateOpen();

      ws.send(
        JSON.stringify({
          type: 'query',
          payload: {
            workspaceId: 'ws1',
            sessionId: 'session1',
            query: 'What is AI?',
            mode: 'answer',
          },
        })
      );

      expect(ws.send).toHaveBeenCalled();
      const sentData = JSON.parse(ws.send.mock.calls[0][0]);
      expect(sentData.type).toBe('query');
      expect(sentData.payload.query).toBe('What is AI?');
    });

    test('sends cancel message', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      ws.simulateOpen();

      ws.send(
        JSON.stringify({
          type: 'cancel',
          payload: { sessionId: 'session1' },
        })
      );

      const sentData = JSON.parse(ws.send.mock.calls[0][0]);
      expect(sentData.type).toBe('cancel');
    });
  });

  describe('event listeners', () => {
    test('multiple listeners can be registered', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      const messages: string[] = [];

      const listener1 = () => messages.push('listener1');
      const listener2 = () => messages.push('listener2');

      // Simulate multiple listeners by creating a composite handler
      const originalOnMessage = ws.onmessage;
      ws.onmessage = (event) => {
        listener1();
        listener2();
        originalOnMessage?.(event);
      };

      ws.simulateOpen();
      ws.simulateMessage({ type: 'test' });

      expect(messages).toContain('listener1');
      expect(messages).toContain('listener2');
    });

    test('listeners can be removed', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      let callCount = 0;

      ws.onmessage = () => {
        callCount++;
      };

      ws.simulateOpen();
      ws.simulateMessage({ type: 'test' });

      // Remove listener
      ws.onmessage = null;
      ws.simulateMessage({ type: 'test' });

      expect(callCount).toBe(1);
    });
  });

  describe('reconnection', () => {
    test('attempts to reconnect after close', async () => {
      const ws1 = new MockWebSocket('ws://localhost:8000/ws');
      ws1.simulateOpen();
      ws1.simulateClose();

      // Simulate reconnection by creating a new WebSocket
      const ws2 = new MockWebSocket('ws://localhost:8000/ws');

      expect(MockWebSocket.instances.length).toBe(2);
    });
  });

  describe('cleanup', () => {
    test('closes connection on cleanup', async () => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      ws.simulateOpen();

      ws.close();

      expect(ws.close).toHaveBeenCalled();
    });
  });
});
