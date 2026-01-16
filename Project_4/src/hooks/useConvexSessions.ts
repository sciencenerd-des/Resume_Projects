/**
 * useConvexSessions Hook
 * Manages chat sessions with Convex real-time subscriptions
 * Replaces WebSocket-based streaming with Convex table-based progress tracking
 */

import { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useConvexSessions(workspaceId: Id<"workspaces"> | undefined) {
  // Real-time session list
  const sessions = useQuery(
    api.sessions.list,
    workspaceId ? { workspaceId } : "skip"
  );

  return {
    sessions: sessions ?? [],
    isLoading: sessions === undefined,
  };
}

export function useConvexSession(sessionId: Id<"sessions"> | undefined) {
  // Real-time session data with ledger
  const sessionWithLedger = useQuery(
    api.sessions.getWithLedger,
    sessionId ? { sessionId } : "skip"
  );

  // Real-time progress (updates during pipeline execution)
  const progress = useQuery(
    api.sessions.getProgress,
    sessionId ? { sessionId } : "skip"
  );

  // Cancel mutation
  const cancelMutation = useMutation(api.sessions.cancel);
  const removeMutation = useMutation(api.sessions.remove);

  const cancel = useCallback(async () => {
    if (!sessionId) return;
    await cancelMutation({ sessionId });
  }, [sessionId, cancelMutation]);

  const remove = useCallback(async () => {
    if (!sessionId) return;
    await removeMutation({ sessionId });
  }, [sessionId, removeMutation]);

  return {
    // Session data
    session: sessionWithLedger ?? null,
    progress: progress ?? null,

    // Computed
    isProcessing:
      sessionWithLedger?.status === "processing" ||
      sessionWithLedger?.status === "pending",
    isComplete: sessionWithLedger?.status === "completed",
    isError: sessionWithLedger?.status === "error",

    // Loading state
    isLoading: sessionWithLedger === undefined,

    // Actions
    cancel,
    remove,
  };
}

export function useConvexLedger(sessionId: Id<"sessions"> | undefined) {
  // Real-time ledger data
  const ledger = useQuery(
    api.sessions.getLedger,
    sessionId ? { sessionId } : "skip"
  );

  return {
    ledger: ledger ?? null,
    summary: ledger?.summary ?? null,
    entries: ledger?.entries ?? [],
    isLoading: ledger === undefined,
  };
}

export function useStartQuery(workspaceId: Id<"workspaces"> | undefined) {
  const startQueryMutation = useMutation(api.pipeline.orchestrator.startQuery);

  const startQuery = useCallback(
    async (query: string, mode: "answer" | "draft") => {
      if (!workspaceId) throw new Error("No workspace selected");

      const sessionId = await startQueryMutation({
        workspaceId,
        query,
        mode,
      });

      return sessionId;
    },
    [workspaceId, startQueryMutation]
  );

  return { startQuery };
}

export function useSubmitFeedback() {
  const submitFeedbackMutation = useMutation(api.sessions.submitFeedback);

  return useCallback(
    async (
      sessionId: Id<"sessions">,
      feedbackType: "helpful" | "incorrect" | "missing_citation",
      comment?: string,
      corrections?: unknown
    ) => {
      await submitFeedbackMutation({
        sessionId,
        feedbackType,
        comment,
        corrections,
      });
    },
    [submitFeedbackMutation]
  );
}
