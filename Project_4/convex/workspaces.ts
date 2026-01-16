import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  getUserId,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
} from "./lib/auth";

export const list = query({
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    // Get all workspaces where user is a member
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const workspace = await ctx.db.get(m.workspaceId);
        return workspace ? { ...workspace, role: m.role } : null;
      })
    );

    return workspaces.filter(Boolean);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    settings: v.optional(
      v.object({
        defaultMode: v.union(v.literal("answer"), v.literal("draft")),
        strictMode: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    // Create workspace
    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      ownerId: userId,
      settings: args.settings ?? { defaultMode: "answer", strictMode: false },
    });

    // Add owner as member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "owner",
    });

    return workspaceId;
  },
});

export const get = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db.get(args.workspaceId);
  },
});

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    settings: v.optional(
      v.object({
        defaultMode: v.union(v.literal("answer"), v.literal("draft")),
        strictMode: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAdmin(ctx, args.workspaceId);

    const updates: Record<string, unknown> = {};
    if (args.name) updates.name = args.name;
    if (args.settings) updates.settings = args.settings;

    await ctx.db.patch(args.workspaceId, updates);
  },
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const { role } = await requireWorkspaceMember(ctx, args.workspaceId);

    if (role !== "owner") {
      throw new Error("Only owner can delete workspace");
    }

    // Delete all related data (cascade)
    // Documents, chunks, sessions, claims, ledger entries
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const doc of documents) {
      const chunks = await ctx.db
        .query("documentChunks")
        .withIndex("by_document", (q) => q.eq("documentId", doc._id))
        .collect();

      for (const chunk of chunks) {
        await ctx.db.delete(chunk._id);
      }

      if (doc.storageId) {
        await ctx.storage.delete(doc.storageId);
      }

      await ctx.db.delete(doc._id);
    }

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const session of sessions) {
      // Delete claims and ledger entries
      const claims = await ctx.db
        .query("claims")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const claim of claims) {
        const ledgerEntries = await ctx.db
          .query("evidenceLedger")
          .withIndex("by_claim", (q) => q.eq("claimId", claim._id))
          .collect();

        for (const entry of ledgerEntries) {
          await ctx.db.delete(entry._id);
        }

        await ctx.db.delete(claim._id);
      }

      // Delete pipeline progress
      const progress = await ctx.db
        .query("pipelineProgress")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const p of progress) {
        await ctx.db.delete(p._id);
      }

      // Delete session feedback
      const feedback = await ctx.db
        .query("sessionFeedback")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      for (const f of feedback) {
        await ctx.db.delete(f._id);
      }

      await ctx.db.delete(session._id);
    }

    // Delete members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete workspace
    await ctx.db.delete(args.workspaceId);
  },
});

// Add member to workspace
export const addMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAdmin(ctx, args.workspaceId);

    // Check if already a member
    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      throw new Error("User is already a member");
    }

    return await ctx.db.insert("workspaceMembers", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      role: args.role,
    });
  },
});

// Remove member from workspace
export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: currentUserId, role: currentRole } =
      await requireWorkspaceMember(ctx, args.workspaceId);

    // Can't remove yourself if you're the owner
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      throw new Error("User is not a member");
    }

    if (membership.role === "owner") {
      throw new Error("Cannot remove workspace owner");
    }

    // Only admins/owners can remove other members
    if (currentUserId !== args.userId && currentRole === "member") {
      throw new Error("Only admins can remove other members");
    }

    await ctx.db.delete(membership._id);
  },
});

// Get workspace members
export const getMembers = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);

    return await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

// Update member role
export const updateMemberRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAdmin(ctx, args.workspaceId);

    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      throw new Error("User is not a member");
    }

    if (membership.role === "owner") {
      throw new Error("Cannot change owner role");
    }

    await ctx.db.patch(membership._id, { role: args.role });
  },
});
