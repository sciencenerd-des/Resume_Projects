/**
 * useConvexChat Hook
 * Pure Convex implementation for chat functionality
 * Replaces WebSocket-based streaming with Convex real-time subscriptions
 */

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type QueryMode = "answer" | "draft";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isVerified?: boolean;
  isPartial?: boolean;
  sessionId?: Id<"sessions">;
}

interface LedgerEntry {
  claimText: string;
  claimType: string;
  importance: string;
  verdict: string;
  confidenceScore: number;
  evidenceSnippet?: string;
  notes?: string;
}

export function useConvexChat(workspaceId: Id<"workspaces"> | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Convex mutation to start a query
  const startQueryMutation = useMutation(api.pipeline.orchestrator.startQuery);

  // Real-time progress subscription (only when there's an active session)
  const progress = useQuery(
    api.sessions.getProgress,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  );

  // Real-time session data subscription
  const sessionData = useQuery(
    api.sessions.getWithLedger,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  );

  // Computed states
  const isProcessing = activeSessionId !== null && (
    progress?.status === "in_progress" ||
    progress?.status === "pending" ||
    sessionData?.status === "processing" ||
    sessionData?.status === "pending"
  );
  const currentPhase = progress?.phase ?? "idle";

  // Handle session completion - add response to messages
  useEffect(() => {
    if (sessionData?.status === "completed" && sessionData.response && activeSessionId) {
      // Check if we already have this message
      const hasMessage = messages.some(m => m.sessionId === activeSessionId && m.role === "assistant");

      if (!hasMessage) {
        setMessages(prev => [
          ...prev,
          {
            id: activeSessionId,
            role: "assistant",
            content: sessionData.response!,
            timestamp: new Date(sessionData.completedAt ?? Date.now()),
            isVerified: true,
            sessionId: activeSessionId,
          }
        ]);
        setActiveSessionId(null);
      }
    }

    // Handle errors
    if (sessionData?.status === "error" && activeSessionId) {
      setError(sessionData.errorMessage ?? "An error occurred");
      setActiveSessionId(null);
    }
  }, [sessionData, activeSessionId, messages]);

  // Submit a new query
  const submitQuery = useCallback(async (query: string, mode: QueryMode) => {
    if (!workspaceId || !query.trim()) return;

    setError(null);

    // Build conversation history from existing messages (before adding current one)
    const conversationHistory = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Start the query via Convex mutation with conversation history
      const sessionId = await startQueryMutation({
        workspaceId,
        query: query.trim(),
        mode,
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      });

      // Set active session to trigger real-time subscriptions
      setActiveSessionId(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start query");
    }
  }, [workspaceId, startQueryMutation, messages]);

  // Get ledger for the active session
  const ledger = sessionData?.ledger ?? null;

  // Get streamed content from progress (if pipeline supports it)
  const streamingContent = progress?.streamedContent ?? "";

  // Chunks retrieved from progress details
  const chunksRetrieved = progress?.details?.match(/(\d+) chunks/)?.[1] ?? "0";

  return {
    // State
    messages,
    isProcessing,
    currentPhase,
    ledger: ledger as LedgerEntry[] | null,
    error,
    activeSessionId,
    streamingContent,

    // Progress details
    progress,
    chunksRetrieved: parseInt(chunksRetrieved, 10),

    // Actions
    submitQuery,
    clearError: () => setError(null),
    clearMessages: () => setMessages([]),
  };
}
