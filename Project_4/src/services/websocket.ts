/**
 * WebSocket Service
 * @version 1.0.0
 * Handles real-time communication for streaming responses
 */

import type {
  WSMessage,
  ContentChunkMessage,
  ClaimVerifiedMessage,
  LedgerUpdatedMessage,
  GenerationCompleteMessage,
  SessionCreatedMessage,
  ErrorMessage,
} from '@/types';

type MessageHandler = (message: WSMessage) => void;

const WS_URL = import.meta.env?.PUBLIC_WS_URL || 'ws://localhost:8000/ws';

class WebSocketService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string): void {
    this.token = token;
    this.createConnection();
  }

  private createConnection(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${WS_URL}?token=${this.token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        this.dispatch(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.createConnection();
    }, delay);
  }

  private dispatch(message: WSMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(message));
    }
  }

  on<T extends WSMessage['type']>(
    eventType: T,
    handler: (message: Extract<WSMessage, { type: T }>) => void
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler as MessageHandler);

    return () => {
      this.handlers.get(eventType)?.delete(handler as MessageHandler);
    };
  }

  onContentChunk(handler: (message: ContentChunkMessage) => void): () => void {
    return this.on('content_chunk', handler);
  }

  onClaimVerified(handler: (message: ClaimVerifiedMessage) => void): () => void {
    return this.on('claim_verified', handler);
  }

  onLedgerUpdated(handler: (message: LedgerUpdatedMessage) => void): () => void {
    return this.on('ledger_updated', handler);
  }

  onGenerationComplete(handler: (message: GenerationCompleteMessage) => void): () => void {
    return this.on('generation_complete', handler);
  }

  onSessionCreated(handler: (message: SessionCreatedMessage) => void): () => void {
    return this.on('session_created', handler);
  }

  onError(handler: (message: ErrorMessage) => void): () => void {
    return this.on('error', handler);
  }

  onAny(handler: MessageHandler): () => void {
    if (!this.handlers.has('*')) {
      this.handlers.set('*', new Set());
    }

    this.handlers.get('*')!.add(handler);

    return () => {
      this.handlers.get('*')?.delete(handler);
    };
  }

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }

  sendQuery(workspaceId: string, query: string, mode: 'answer' | 'draft'): void {
    this.send('query', { workspace_id: workspaceId, query, mode });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.token = null;
    this.handlers.clear();
  }

  get readyState(): number | null {
    return this.ws?.readyState ?? null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const ws = new WebSocketService();
export default ws;
