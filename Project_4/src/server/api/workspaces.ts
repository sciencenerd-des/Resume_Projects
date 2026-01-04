/**
 * Workspace API Handlers
 * CRUD operations for workspaces
 */
import { type AuthUser } from "../middleware/auth";
import { createAuthenticatedClient } from "../db";

interface RouteParams {
  id?: string;
}

/**
 * List all workspaces for the authenticated user
 */
export async function list(
  _request: Request,
  user: AuthUser,
  _params: RouteParams
): Promise<Response> {
  const supabase = createAuthenticatedClient(user.accessToken);

  // Get workspaces where user is a member
  const { data: memberships, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id);

  if (memberError) {
    console.log("[Workspaces] Query error:", memberError.message);
    return Response.json(
      {
        success: false,
        error: { code: "DATABASE_ERROR", message: memberError.message },
      },
      { status: 500 }
    );
  }

  if (!memberships || memberships.length === 0) {
    return Response.json([]);
  }

  const workspaceIds = memberships.map((m) => m.workspace_id);
  const roleMap = new Map(memberships.map((m) => [m.workspace_id, m.role]));

  // Get workspace details
  const { data: workspaces, error: wsError } = await supabase
    .from("workspaces")
    .select("*")
    .in("id", workspaceIds)
    .order("created_at", { ascending: false });

  if (wsError) {
    return Response.json(
      {
        success: false,
        error: { code: "DATABASE_ERROR", message: wsError.message },
      },
      { status: 500 }
    );
  }

  // Get document and session counts
  const workspacesWithCounts = await Promise.all(
    (workspaces || []).map(async (ws) => {
      const [docCount, sessionCount] = await Promise.all([
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws.id),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", ws.id),
      ]);

      return {
        ...ws,
        role: roleMap.get(ws.id),
        document_count: docCount.count || 0,
        session_count: sessionCount.count || 0,
      };
    })
  );

  // Return bare array (matches frontend expectation and API docs)
  return Response.json(workspacesWithCounts);
}

/**
 * Get a single workspace by ID
 */
export async function get(
  _request: Request,
  user: AuthUser,
  params: RouteParams
): Promise<Response> {
  const supabase = createAuthenticatedClient(user.accessToken);
  const { id } = params;

  if (!id) {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Workspace ID is required" },
      },
      { status: 400 }
    );
  }

  // Check user has access
  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Workspace not found" },
      },
      { status: 404 }
    );
  }

  // Get workspace
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();

  if (wsError || !workspace) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Workspace not found" },
      },
      { status: 404 }
    );
  }

  // Return bare object
  return Response.json({ ...workspace, role: membership.role });
}

/**
 * Create a new workspace
 */
export async function create(
  request: Request,
  user: AuthUser,
  _params: RouteParams
): Promise<Response> {
  const supabase = createAuthenticatedClient(user.accessToken);
  let body: { name?: string; settings?: Record<string, unknown> };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      },
      { status: 400 }
    );
  }

  const { name, settings } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Name is required" },
      },
      { status: 400 }
    );
  }

  // Create workspace using SECURITY DEFINER function to bypass RLS
  console.log("[Workspaces] Creating workspace:", name, "for user:", user.id);
  const { data: workspace, error: wsError } = await supabase.rpc(
    "create_workspace_for_user",
    {
      p_user_id: user.id,
      p_name: name.trim(),
      p_settings: settings || { default_mode: "answer", strict_mode: false },
    }
  );

  if (wsError || !workspace) {
    console.log("[Workspaces] Workspace creation error:", wsError?.message);
    return Response.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: wsError?.message || "Failed to create workspace",
        },
      },
      { status: 500 }
    );
  }

  console.log("[Workspaces] Workspace created:", workspace.id);

  // Return the workspace (function already returns with role: 'owner')
  return Response.json(workspace, { status: 201 });
}

/**
 * Update a workspace
 */
export async function update(
  request: Request,
  user: AuthUser,
  params: RouteParams
): Promise<Response> {
  const supabase = createAuthenticatedClient(user.accessToken);
  const { id } = params;

  if (!id) {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Workspace ID is required" },
      },
      { status: 400 }
    );
  }

  // Check user has admin/owner access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return Response.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      },
      { status: 403 }
    );
  }

  let body: { name?: string; settings?: Record<string, unknown> };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name.trim();
  if (body.settings) updates.settings = body.settings;

  if (Object.keys(updates).length === 0) {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "No fields to update" },
      },
      { status: 400 }
    );
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !workspace) {
    return Response.json(
      {
        success: false,
        error: { code: "DATABASE_ERROR", message: error?.message || "Update failed" },
      },
      { status: 500 }
    );
  }

  // Return bare object
  return Response.json(workspace);
}

/**
 * Delete a workspace
 */
export async function remove(
  _request: Request,
  user: AuthUser,
  params: RouteParams
): Promise<Response> {
  const supabase = createAuthenticatedClient(user.accessToken);
  const { id } = params;

  if (!id) {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Workspace ID is required" },
      },
      { status: 400 }
    );
  }

  // Check user is owner
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!workspace) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Workspace not found" },
      },
      { status: 404 }
    );
  }

  if (workspace.owner_id !== user.id) {
    return Response.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Only owner can delete workspace" },
      },
      { status: 403 }
    );
  }

  // Delete workspace (cascades to members, documents, sessions, etc.)
  const { error } = await supabase.from("workspaces").delete().eq("id", id);

  if (error) {
    return Response.json(
      {
        success: false,
        error: { code: "DATABASE_ERROR", message: error.message },
      },
      { status: 500 }
    );
  }

  return Response.json({ deleted: true });
}
