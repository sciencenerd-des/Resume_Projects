/**
 * useConvexWorkspace Hook
 * Manages workspace data with Convex real-time subscriptions
 */

import { useCallback } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useConvexWorkspace() {
  const { isAuthenticated } = useConvexAuth();

  // Real-time workspace list - skip when not authenticated
  const workspaces = useQuery(
    api.workspaces.list,
    isAuthenticated ? undefined : "skip"
  ) ?? [];

  // Get current workspace from localStorage
  const currentWorkspaceId = localStorage.getItem(
    "verity_current_workspace"
  ) as Id<"workspaces"> | null;

  // Current workspace details - skip when not authenticated
  const currentWorkspace = useQuery(
    api.workspaces.get,
    isAuthenticated && currentWorkspaceId ? { workspaceId: currentWorkspaceId } : "skip"
  );

  // Mutations
  const createWorkspaceMutation = useMutation(api.workspaces.create);
  const updateWorkspaceMutation = useMutation(api.workspaces.update);
  const deleteWorkspaceMutation = useMutation(api.workspaces.remove);

  const createWorkspace = useCallback(
    async (name: string) => {
      const workspaceId = await createWorkspaceMutation({ name });
      localStorage.setItem("verity_current_workspace", workspaceId);
      return workspaceId;
    },
    [createWorkspaceMutation]
  );

  const switchWorkspace = useCallback((id: Id<"workspaces">) => {
    localStorage.setItem("verity_current_workspace", id);
    // Force re-render by triggering a state change
    window.dispatchEvent(new Event("storage"));
  }, []);

  const updateWorkspace = useCallback(
    async (workspaceId: Id<"workspaces">, name: string) => {
      await updateWorkspaceMutation({ workspaceId, name });
    },
    [updateWorkspaceMutation]
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: Id<"workspaces">) => {
      await deleteWorkspaceMutation({ workspaceId });
      // Clear current workspace if it was deleted
      if (currentWorkspaceId === workspaceId) {
        localStorage.removeItem("verity_current_workspace");
      }
    },
    [deleteWorkspaceMutation, currentWorkspaceId]
  );

  return {
    // Data (real-time updated)
    workspaces,
    currentWorkspace: currentWorkspace ?? null,
    currentWorkspaceId,

    // Loading states (Convex queries return undefined while loading)
    isLoading: workspaces === undefined || currentWorkspace === undefined,

    // Mutations
    createWorkspace,
    switchWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}

export function useWorkspaceMembers(workspaceId: Id<"workspaces"> | undefined) {
  const { isAuthenticated } = useConvexAuth();

  const members = useQuery(
    api.workspaces.getMembers,
    isAuthenticated && workspaceId ? { workspaceId } : "skip"
  );

  const addMemberMutation = useMutation(api.workspaces.addMember);
  const removeMemberMutation = useMutation(api.workspaces.removeMember);
  const updateRoleMutation = useMutation(api.workspaces.updateMemberRole);

  return {
    members: members ?? [],
    isLoading: members === undefined,

    addMember: useCallback(
      async (userId: string, role: "admin" | "member") => {
        if (!workspaceId) throw new Error("No workspace selected");
        await addMemberMutation({ workspaceId, userId, role });
      },
      [addMemberMutation, workspaceId]
    ),

    removeMember: useCallback(
      async (userId: string) => {
        if (!workspaceId) throw new Error("No workspace selected");
        await removeMemberMutation({ workspaceId, userId });
      },
      [removeMemberMutation, workspaceId]
    ),

    updateRole: useCallback(
      async (userId: string, role: "admin" | "member") => {
        if (!workspaceId) throw new Error("No workspace selected");
        await updateRoleMutation({ workspaceId, userId, role });
      },
      [updateRoleMutation, workspaceId]
    ),
  };
}
