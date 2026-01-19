/**
 * WorkspaceContext
 * @version 1.0.0
 * Manages workspace state and multi-tenancy
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Workspace } from '../types';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const CURRENT_WORKSPACE_KEY = 'verity_current_workspace';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getWorkspaces();
      setWorkspaces(data);

      // Restore last selected workspace or select first one
      const savedWorkspaceId = localStorage.getItem(CURRENT_WORKSPACE_KEY);
      const savedWorkspace = data.find((w: Workspace) => w.id === savedWorkspaceId);

      if (savedWorkspace) {
        setCurrentWorkspace(savedWorkspace);
      } else if (data.length > 0) {
        setCurrentWorkspace(data[0]);
        localStorage.setItem(CURRENT_WORKSPACE_KEY, data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch workspaces when user changes
  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const switchWorkspace = useCallback((workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId);
    }
  }, [workspaces]);

  const createWorkspace = useCallback(async (name: string): Promise<Workspace> => {
    const newWorkspace = await api.createWorkspace(name);
    setWorkspaces((prev) => [...prev, newWorkspace]);
    setCurrentWorkspace(newWorkspace);
    localStorage.setItem(CURRENT_WORKSPACE_KEY, newWorkspace.id);
    return newWorkspace;
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        isLoading,
        error,
        switchWorkspace,
        createWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export { WorkspaceContext };
