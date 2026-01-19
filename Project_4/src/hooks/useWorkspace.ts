import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useWorkspace() {
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: api.getWorkspaces,
  });

  const { data: currentWorkspace = null, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['currentWorkspace'],
    queryFn: async () => {
      const id = localStorage.getItem('verity_current_workspace');
      if (!id) {
        // Fall back to first workspace if none selected
        const all = await api.getWorkspaces();
        if (all.length > 0) {
          localStorage.setItem('verity_current_workspace', all[0].id);
          return all[0];
        }
        return null;
      }
      const all = await api.getWorkspaces();
      return all.find((w: { id: string }) => w.id === id) || all[0] || null;
    },
  });

  const createWorkspace = useMutation({
    mutationFn: async (name: string) => {
      return api.createWorkspace(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });

  const switchWorkspace = useCallback((id: string) => {
    localStorage.setItem('verity_current_workspace', id);
    queryClient.invalidateQueries({ queryKey: ['currentWorkspace'] });
    queryClient.invalidateQueries({ queryKey: ['documents', id] });
    queryClient.invalidateQueries({ queryKey: ['sessions', id] });
  }, [queryClient]);

  return {
    workspaces,
    currentWorkspace,
    isLoading: isLoadingWorkspaces || isLoadingCurrent,
    createWorkspace,
    switchWorkspace,
  };
}
