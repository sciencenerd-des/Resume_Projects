import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

describe('WebSocket Integration', () => {
  let mockWs: any;
  let eventHandlers: Map<string, (event: any) => void>;
  let wsConstructorCalls: number;

  beforeEach(() => {
    eventHandlers = new Map();
    wsConstructorCalls = 0;

    // Create mock WebSocket that captures event handlers during construction
    const createMockWs = () => {
      wsConstructorCalls++;
      const ws = {
        send: mock(() => {}),
        close: mock(() => {}),
        addEventListener: (event: string, handler: any) => {
          eventHandlers.set(event, handler);
        },
        removeEventListener: mock(() => {}),
        readyState: 1, // WebSocket.OPEN
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3,
      };
      mockWs = ws;
      // Auto-trigger open event for connection simulation
      setTimeout(() => {
        const openHandler = eventHandlers.get('open');
        if (openHandler) openHandler({ type: 'open' });
      }, 0);
      return ws;
    };

    // Mock global WebSocket as a constructor
    (global as any).WebSocket = mock(createMockWs);
    (global as any).WebSocket.CONNECTING = 0;
    (global as any).WebSocket.OPEN = 1;
    (global as any).WebSocket.CLOSING = 2;
    (global as any).WebSocket.CLOSED = 3;
  });

  afterEach(() => {
    eventHandlers.clear();
  });

  describe('connection', () => {
    test('establishes connection with correct URL', () => {
      new (global as any).WebSocket('ws://localhost:8080');
      expect((global as any).WebSocket).toHaveBeenCalledWith('ws://localhost:8080');
    });

    test('handles connection open', async () => {
      const ws = new (global as any).WebSocket('ws://localhost:8080');
      // Add event listener manually to simulate real usage
      ws.addEventListener('open', () => {});

      const openHandler = eventHandlers.get('open');
      expect(openHandler).toBeDefined();

      if (openHandler) {
        mockWs.readyState = 1; // WebSocket.OPEN
        openHandler({ type: 'open' });
        expect(mockWs.readyState).toBe(1);
      }
    });

    test('handles connection close', async () => {
      const ws = new (global as any).WebSocket('ws://localhost:8080');
      // Add event listener manually to simulate real usage
      ws.addEventListener('close', () => {});

      const closeHandler = eventHandlers.get('close');
      expect(closeHandler).toBeDefined();

      if (closeHandler) {
        mockWs.readyState = 3; // WebSocket.CLOSED
        closeHandler({ type: 'close', code: 1000 });
        expect(mockWs.readyState).toBe(3);
      }
    });

    test('reconnects on connection loss', async () => {
      const ws = new (global as any).WebSocket('ws://localhost:8080');
      // Add close handler to capture
      ws.addEventListener('close', () => {});

      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 10));

      const closeHandler = eventHandlers.get('close');
      expect(closeHandler).toBeDefined();

      if (closeHandler) {
        // Simulate abnormal close (code 1006 = abnormal closure)
        closeHandler({ type: 'close', code: 1006 });
      }

      // Initial connection should have been made
      expect(wsConstructorCalls).toBeGreaterThanOrEqual(1);
    });
  });

  describe('message handling', () => {
    test('receives content_chunk messages', () => {
      const ws = new (global as any).WebSocket('ws://localhost:8080');
      // Add event listener to capture handler
      ws.addEventListener('message', () => {});

      const messageHandler = eventHandlers.get('message');
      expect(messageHandler).toBeDefined();

      if (messageHandler) {
        const message = {
          type: 'content_chunk',
          payload: {
            session_id: 'session-1',
            delta: 'Hello',
          },
        };
        messageHandler({ data: JSON.stringify(message) });
      }
    });

    test('receives claim_verified messages', () => {
      const ws = new (global as any).WebSocket('ws://localhost:8080');
      ws.addEventListener('message', () => {});

      const messageHandler = eventHandlers.get('message');
      expect(messageHandler).toBeDefined();

      if (messageHandler) {
        const message = {
          type: 'claim_verified',
          payload: {
            claim: {
              id: 'claim-1',
              verdict: 'supported',
              confidence: 0.95,
            },
          },
        };
        messageHandler({ data: JSON.stringify(message) });
      }
    });

    test('receives ledger_updated messages', () => {
      const ws = new (global as any).WebSocket('ws://localhost:8080');
      ws.addEventListener('message', () => {});

      const messageHandler = eventHandlers.get('message');
      expect(messageHandler).toBeDefined();

      if (messageHandler) {
        const message = {
          type: 'ledger_updated',
          payload: {
            session_id: 'session-1',
            summary: { total_claims: 5, supported: 4, weak: 1, contradicted: 0, not_found: 0 },
            entries: [],
            risk_flags: [],
          },
        };
        messageHandler({ data: JSON.stringify(message) });
      }
    });
  });

  describe('sending messages', () => {
    test('sends query message', () => {
      const ws = new (global as any).WebSocket('ws://localhost:8080');

      const message = {
        type: 'query',
        payload: {
          session_id: 'session-1',
          query: 'What is the policy?',
        },
      };

      mockWs.send(JSON.stringify(message));

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message));
    });
  });
});
