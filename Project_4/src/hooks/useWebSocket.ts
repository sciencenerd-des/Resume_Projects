import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';

interface WebSocketMessage {
  type: string;
  payload: Record<string, unknown>;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (message: WebSocketMessage) => void;
  on: (event: string, callback: (data: unknown) => void) => void;
  off: (event: string, callback: (data: unknown) => void) => void;
  disconnect: () => void;
}

const WS_URL = import.meta.env?.VITE_WS_URL || 'ws://localhost:8000/ws';

export function useWebSocket(): UseWebSocketReturn {
  const { session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!session?.access_token) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${session.access_token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const listeners = listenersRef.current.get(message.type);
        // Pass the entire message (including type) or the payload if it exists
        // Server sends events like { type, delta, ... } not { type, payload: { ... } }
        const eventData = message.payload ?? message;
        listeners?.forEach((callback) => callback(eventData));
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [session?.access_token]);

  useEffect(() => {
    connect();
    return () => {
      reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((message: WebSocketMessage) => {
    wsRef.current?.send(JSON.stringify(message));
  }, []);

  const on = useCallback((event: string, callback: (data: unknown) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)?.add(callback);
  }, []);

  const off = useCallback((event: string, callback: (data: unknown) => void) => {
    listenersRef.current.get(event)?.delete(callback);
  }, []);

  const disconnect = useCallback(() => {
    reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  return { isConnected, send, on, off, disconnect };
}
