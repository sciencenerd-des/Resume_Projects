/**
 * WorkspaceContext
 * @version 2.0.0
 * Manages workspace state with Convex real-time subscriptions
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useConvexAuthState } from '../hooks/useConvexAuth';
import type { Workspace } from '../types';

// Internal Convex workspace type
interface ConvexWorkspace {
  _id: Id<"workspaces">;
  name: string;
  ownerId: string;
  _creationTime: number;
}

// Normalize Convex workspace to include both formats for compatibility
function normalizeWorkspace(w: ConvexWorkspace): Workspace {
  return {
    _id: w._id,
    id: w._id, // Alias for legacy code
    name: w.name,
    ownerId: w.ownerId,
    owner_id: w.ownerId, // Alias for legacy code
    _creationTime: w._creationTime,
    created_at: new Date(w._creationTime).toISOString(),
    updated_at: new Date(w._creationTime).toISOString(),
  };
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<string>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const CURRENT_WORKSPACE_KEY = 'verity_current_workspace';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuthState();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem(CURRENT_WORKSPACE_KEY);
  });
  const [error, setError] = useState<string | null>(null);

  // Real-time workspace list from Convex
  const rawWorkspaces = useQuery(
    api.workspaces.list,
    isAuthenticated ? {} : "skip"
  );

  // Current workspace details (guarded by auth state)
  const rawCurrentWorkspace = useQuery(
    api.workspaces.get,
    isAuthenticated && currentWorkspaceId ? { workspaceId: currentWorkspaceId as Id<"workspaces"> } : "skip"
  );

  // Create workspace mutation
  const createWorkspaceMutation = useMutation(api.workspaces.create);

  // Normalize workspaces for compatibility with legacy code
  const workspaces = useMemo(() => {
    if (!rawWorkspaces) return [];
    // Filter out any null values and normalize
    return rawWorkspaces
      .filter((w): w is NonNullable<typeof w> => w !== null)
      .map((w) => normalizeWorkspace(w as ConvexWorkspace));
  }, [rawWorkspaces]);

  const currentWorkspace = useMemo(() => {
    if (!rawCurrentWorkspace) return null;
    return normalizeWorkspace(rawCurrentWorkspace as ConvexWorkspace);
  }, [rawCurrentWorkspace]);

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (rawWorkspaces && rawWorkspaces.length > 0 && !currentWorkspaceId) {
      const firstWorkspace = rawWorkspaces.find((w) => w !== null);
      if (firstWorkspace) {
        setCurrentWorkspaceId(firstWorkspace._id);
        localStorage.setItem(CURRENT_WORKSPACE_KEY, firstWorkspace._id);
      }
    }
  }, [rawWorkspaces, currentWorkspaceId]);

  // Clear workspace when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentWorkspaceId(null);
    }
  }, [isAuthenticated]);

  // Listen for storage events (workspace switch from other tabs)
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem(CURRENT_WORKSPACE_KEY);
      if (saved !== currentWorkspaceId) {
        setCurrentWorkspaceId(saved);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentWorkspaceId]);

  const switchWorkspace = useCallback((workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId);
    window.dispatchEvent(new Event('storage'));
  }, []);

  const createWorkspace = useCallback(async (name: string): Promise<string> => {
    try {
      setError(null);
      const workspaceId = await createWorkspaceMutation({ name });
      setCurrentWorkspaceId(workspaceId);
      localStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId);
      return workspaceId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(message);
      throw err;
    }
  }, [createWorkspaceMutation]);

  const isLoading = rawWorkspaces === undefined || (currentWorkspaceId && rawCurrentWorkspace === undefined);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentWorkspaceId,
        isLoading: !!isLoading,
        error,
        switchWorkspace,
        createWorkspace,
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
