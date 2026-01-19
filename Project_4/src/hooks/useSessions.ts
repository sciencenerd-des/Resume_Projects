/**
 * useSessions Hook
 * @version 1.0.0
 * Manages chat session data fetching and operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { ChatSession } from '@/types';

export function useSessions(workspaceId: string) {
  return useQuery({
    queryKey: ['sessions', workspaceId],
    queryFn: async () => {
      const response = await api.getWorkspaceSessions(workspaceId);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!workspaceId,
  });
}

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await api.getSession(sessionId);
      return response.data;
    },
    enabled: !!sessionId,
  });
}

export function useSessionMessages(sessionId: string) {
  return useQuery({
    queryKey: ['session-messages', sessionId],
    queryFn: async () => {
      const response = await api.getSessionMessages(sessionId);
      return response.data;
    },
    enabled: !!sessionId,
  });
}

export function useSessionLedger(sessionId: string) {
  return useQuery({
    queryKey: ['session-ledger', sessionId],
    queryFn: async () => {
      const response = await api.getSessionLedger(sessionId);
      // Return empty array if no data to prevent React Query undefined error
      return response.data ?? [];
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExportSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      format,
    }: { sessionId: string; format: 'pdf' | 'markdown' | 'json' }) => {
      return api.exportSession(sessionId, format);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId] });
    },
  });
}
