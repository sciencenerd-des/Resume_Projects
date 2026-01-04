/**
 * Session API Handlers
 * List, view, and export query sessions
 */
import { type AuthUser } from "../middleware/auth";
import { createAuthenticatedClient } from "../db";

interface RouteParams {
  id?: string;
  workspaceId?: string;
}

/**
 * List all sessions in a workspace
 */
export async function list(
  request: Request,
  user: AuthUser,
  params: RouteParams
): Promise<Response> {
  const supabase = createAuthenticatedClient(user.accessToken);
  const { workspaceId } = params;

  if (!workspaceId) {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Workspace ID is required" },
      },
      { status: 400 }
    );
  }

  // Verify user has access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return Response.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Access denied" },
      },
      { status: 403 }
    );
  }

  // Parse pagination
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Get sessions
  const { data: sessions, error, count } = await supabase
    .from("sessions")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json(
      {
        success: false,
        error: { code: "DATABASE_ERROR", message: error.message },
      },
      { status: 500 }
    );
  }

  // Return bare array (or with pagination info for lists)
  return Response.json(sessions || []);
}

/**
 * Get a single session by ID
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
        error: { code: "VALIDATION_ERROR", message: "Session ID is required" },
      },
      { status: 400 }
    );
  }

  // Get session
  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !session) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Session not found" },
      },
      { status: 404 }
    );
  }

  // Verify user has access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", session.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return Response.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Access denied" },
      },
      { status: 403 }
    );
  }

  // Return bare object
  return Response.json(session);
}

/**
 * Get messages for a session
 * Reconstructs chat format from session data
 */
export async function getMessages(
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
        error: { code: "VALIDATION_ERROR", message: "Session ID is required" },
      },
      { status: 400 }
    );
  }

  // Get session
  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !session) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Session not found" },
      },
      { status: 404 }
    );
  }

  // Verify access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", session.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return Response.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Access denied" },
      },
      { status: 403 }
    );
  }

  // Construct messages array
  const messages = [
    {
      id: `${id}-user`,
      role: "user" as const,
      content: session.query,
      timestamp: session.created_at,
    },
  ];

  if (session.response) {
    // Get citations from evidence ledger
    const { data: ledgerEntries } = await supabase
      .from("evidence_ledger")
      .select("chunk_ids, verdict")
      .eq("session_id", id);

    const citations =
      ledgerEntries?.flatMap((entry, index) =>
        (entry.chunk_ids || []).map((chunkId: string) => ({
          index: index + 1,
          chunk_id: chunkId,
          document_id: "", // Would need to join to get this
          verdict: entry.verdict,
        }))
      ) || [];

    messages.push({
      id: `${id}-assistant`,
      role: "assistant",
      content: session.response,
      timestamp: session.completed_at || session.created_at,
      citations,
    } as unknown as (typeof messages)[0]);
  }

  // Return bare array
  return Response.json(messages);
}

/**
 * Get evidence ledger for a session
 */
export async function getLedger(
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
        error: { code: "VALIDATION_ERROR", message: "Session ID is required" },
      },
      { status: 400 }
    );
  }

  // Get session to verify access
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("workspace_id, evidence_coverage, unsupported_claim_count")
    .eq("id", id)
    .single();

  if (sessionError || !session) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Session not found" },
      },
      { status: 404 }
    );
  }

  // Verify access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", session.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return Response.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Access denied" },
      },
      { status: 403 }
    );
  }

  // Get claims with their ledger entries
  const { data: claims, error: claimsError } = await supabase
    .from("claims")
    .select(
      `
      id,
      claim_text,
      claim_type,
      importance,
      evidence_ledger (
        verdict,
        confidence_score,
        chunk_ids,
        evidence_snippet
      )
    `
    )
    .eq("session_id", id);

  if (claimsError) {
    return Response.json(
      {
        success: false,
        error: { code: "DATABASE_ERROR", message: claimsError.message },
      },
      { status: 500 }
    );
  }

  // Transform to ledger entry format
  const entries =
    claims?.map((claim) => {
      const ledger = claim.evidence_ledger?.[0];
      return {
        id: claim.id,
        claim_text: claim.claim_text,
        claim_type: claim.claim_type,
        importance: claim.importance,
        verdict: ledger?.verdict || "not_found",
        confidence: ledger?.confidence_score || 0,
        evidence_snippet: ledger?.evidence_snippet,
        chunk_ids: ledger?.chunk_ids || [],
      };
    }) || [];

  // Calculate summary
  const summary = {
    total_claims: entries.length,
    supported: entries.filter((e) => e.verdict === "supported").length,
    weak: entries.filter((e) => e.verdict === "weak").length,
    contradicted: entries.filter((e) => e.verdict === "contradicted").length,
    not_found: entries.filter((e) => e.verdict === "not_found").length,
  };

  // Return bare ledger object
  return Response.json({
    session_id: id,
    summary,
    entries,
    risk_flags: [], // TODO: Implement risk flag detection
  });
}

/**
 * Export session in various formats
 */
export async function exportSession(
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
        error: { code: "VALIDATION_ERROR", message: "Session ID is required" },
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";

  if (!["json", "markdown"].includes(format)) {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Format must be 'json' or 'markdown'",
        },
      },
      { status: 400 }
    );
  }

  // Get session
  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !session) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Session not found" },
      },
      { status: 404 }
    );
  }

  // Verify access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", session.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return Response.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Access denied" },
      },
      { status: 403 }
    );
  }

  // Get ledger
  const { data: claims } = await supabase
    .from("claims")
    .select(
      `
      claim_text,
      claim_type,
      importance,
      evidence_ledger (
        verdict,
        confidence_score,
        evidence_snippet
      )
    `
    )
    .eq("session_id", id);

  if (format === "markdown") {
    const markdown = generateMarkdown(session, claims || []);
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="session-${id}.md"`,
      },
    });
  }

  // JSON format - return bare object
  return Response.json({
    session,
    claims: claims || [],
  });
}

/**
 * Delete a session
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
        error: { code: "VALIDATION_ERROR", message: "Session ID is required" },
      },
      { status: 400 }
    );
  }

  // Get session to verify access
  const { data: session } = await supabase
    .from("sessions")
    .select("workspace_id")
    .eq("id", id)
    .single();

  if (!session) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Session not found" },
      },
      { status: 404 }
    );
  }

  // Verify access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", session.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return Response.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "Access denied" },
      },
      { status: 403 }
    );
  }

  // Delete session (cascades to claims, ledger)
  const { error } = await supabase.from("sessions").delete().eq("id", id);

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

/**
 * Generate markdown export
 */
function generateMarkdown(
  session: Record<string, unknown>,
  claims: Array<Record<string, unknown>>
): string {
  const lines: string[] = [
    `# VerityDraft Session Export`,
    ``,
    `**Date:** ${new Date(session.created_at as string).toLocaleString()}`,
    `**Mode:** ${session.mode}`,
    `**Status:** ${session.status}`,
    ``,
    `## Query`,
    ``,
    session.query as string,
    ``,
    `## Response`,
    ``,
    (session.response as string) || "_No response generated_",
    ``,
    `## Evidence Ledger`,
    ``,
  ];

  if (claims.length === 0) {
    lines.push("_No claims verified_");
  } else {
    lines.push("| Claim | Type | Verdict | Confidence |");
    lines.push("|-------|------|---------|------------|");

    for (const claim of claims) {
      const ledger = (claim.evidence_ledger as Array<Record<string, unknown>>)?.[0];
      const verdict = (ledger?.verdict as string) || "not_found";
      const confidence = (ledger?.confidence_score as number) || 0;

      lines.push(
        `| ${claim.claim_text} | ${claim.claim_type} | ${verdict} | ${(confidence * 100).toFixed(0)}% |`
      );
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("_Generated by VerityDraft_");

  return lines.join("\n");
}
