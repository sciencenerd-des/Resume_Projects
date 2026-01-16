import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export async function getUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<string> {
  const identity = await requireAuth(ctx);
  return identity.tokenIdentifier;
}

export async function requireWorkspaceMember(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">
): Promise<{ userId: string; role: "owner" | "admin" | "member" }> {
  const userId = await getUserId(ctx);

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Not a workspace member");
  }

  return { userId, role: membership.role };
}

export async function requireWorkspaceAdmin(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">
) {
  const { userId, role } = await requireWorkspaceMember(ctx, workspaceId);

  if (role !== "owner" && role !== "admin") {
    throw new Error("Admin access required");
  }

  return { userId, role };
}
