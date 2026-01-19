/**
 * Document API Handlers
 * Upload, list, and manage documents
 */
import { type AuthUser } from "../middleware/auth";
import { createAuthenticatedClient } from "../db";
import { processDocument } from "../processing/document-processor";

interface RouteParams {
  id?: string;
  workspaceId?: string;
}

/**
 * List all documents in a workspace
 */
export async function list(
  _request: Request,
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

  // Verify user has access to workspace
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

  // Get documents
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      {
        success: false,
        error: { code: "DATABASE_ERROR", message: error.message },
      },
      { status: 500 }
    );
  }

  // Return bare array
  return Response.json(documents || []);
}

/**
 * Get a single document by ID
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
        error: { code: "VALIDATION_ERROR", message: "Document ID is required" },
      },
      { status: 400 }
    );
  }

  // Get document
  const { data: document, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !document) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Document not found" },
      },
      { status: 404 }
    );
  }

  // Verify user has access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", document.workspace_id)
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
  return Response.json(document);
}

/**
 * Upload a new document
 */
export async function upload(
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

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid form data" },
      },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "File is required" },
      },
      { status: 400 }
    );
  }

  // Validate file type
  const filename = file.name.toLowerCase();
  const fileType = filename.endsWith(".pdf")
    ? "pdf"
    : filename.endsWith(".docx")
      ? "docx"
      : null;

  if (!fileType) {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Only PDF and DOCX files are supported",
        },
      },
      { status: 400 }
    );
  }

  // Validate file size (max 50MB)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "File size exceeds 50MB limit",
        },
      },
      { status: 400 }
    );
  }

  // Create document record using SECURITY DEFINER function
  console.log("[Documents] Uploading document:", file.name, "to workspace:", workspaceId);
  const { data: document, error: insertError } = await supabase.rpc(
    "upload_document_for_user",
    {
      p_user_id: user.id,
      p_workspace_id: workspaceId,
      p_filename: file.name,
      p_file_type: fileType,
      p_file_size: file.size,
    }
  );

  if (insertError || !document) {
    console.log("[Documents] Upload error:", insertError?.message);
    return Response.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: insertError?.message || "Failed to create document",
        },
      },
      { status: 500 }
    );
  }

  console.log("[Documents] Document created:", document.id);

  // Process document asynchronously
  processDocument(document.id, file).catch((err) => {
    console.error(`[Document] Processing failed for ${document.id}:`, err);
  });

  // Return bare object
  return Response.json(document, { status: 201 });
}

/**
 * Get chunks for a document
 */
export async function getChunks(
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
        error: { code: "VALIDATION_ERROR", message: "Document ID is required" },
      },
      { status: 400 }
    );
  }

  // Get document to check access
  const { data: document } = await supabase
    .from("documents")
    .select("workspace_id")
    .eq("id", id)
    .single();

  if (!document) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Document not found" },
      },
      { status: 404 }
    );
  }

  // Verify user has access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", document.workspace_id)
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

  // Parse pagination params
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Get chunks
  const { data: chunks, error, count } = await supabase
    .from("document_chunks")
    .select("id, chunk_hash, content, chunk_index, page_number, heading_path", {
      count: "exact",
    })
    .eq("document_id", id)
    .order("chunk_index", { ascending: true })
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

  // Return bare object with pagination
  return Response.json({
    chunks: chunks || [],
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * Delete a document
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
        error: { code: "VALIDATION_ERROR", message: "Document ID is required" },
      },
      { status: 400 }
    );
  }

  // Get document to check access
  const { data: document } = await supabase
    .from("documents")
    .select("workspace_id")
    .eq("id", id)
    .single();

  if (!document) {
    return Response.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Document not found" },
      },
      { status: 404 }
    );
  }

  // Verify user has access
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", document.workspace_id)
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

  // Delete document (cascades to chunks)
  const { error } = await supabase.from("documents").delete().eq("id", id);

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
