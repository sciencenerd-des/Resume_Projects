/**
 * Query API Handler
 * Submit queries for verification pipeline (HTTP fallback for non-WebSocket)
 */
import { type AuthUser } from "../middleware/auth";
import { supabaseAdmin } from "../db";
import { executePipeline, type PipelineEvent } from "../pipeline/orchestrator";

interface RouteParams {
  workspaceId?: string;
}

/**
 * Submit a new query
 * Returns SSE stream of pipeline events
 */
export async function submit(
  request: Request,
  user: AuthUser,
  params: RouteParams
): Promise<Response> {
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
  const { data: membership } = await supabaseAdmin
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

  // Parse request body
  let body: { query?: string; mode?: "answer" | "draft" };
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

  const { query, mode = "answer" } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return Response.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Query is required" },
      },
      { status: 400 }
    );
  }

  if (!["answer", "draft"].includes(mode)) {
    return Response.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Mode must be 'answer' or 'draft'",
        },
      },
      { status: 400 }
    );
  }

  // Create session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      query: query.trim(),
      mode,
      status: "processing",
    })
    .select()
    .single();

  if (sessionError || !session) {
    return Response.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: sessionError?.message || "Failed to create session",
        },
      },
      { status: 500 }
    );
  }

  // Check if client accepts SSE
  const acceptHeader = request.headers.get("Accept") || "";
  const wantsStream = acceptHeader.includes("text/event-stream");

  if (wantsStream) {
    // Return SSE stream
    return createSSEStream(session.id, query.trim(), workspaceId, mode);
  }

  // Non-streaming response - execute pipeline and return final result
  try {
    let finalEvent: PipelineEvent | null = null;

    for await (const event of executePipeline(
      session.id,
      query.trim(),
      workspaceId,
      mode
    )) {
      if (event.type === "generation_complete") {
        finalEvent = event;
      }
    }

    if (!finalEvent) {
      throw new Error("Pipeline did not complete");
    }

    return Response.json({
      success: true,
      data: {
        session_id: session.id,
        response: (finalEvent as { response?: string }).response,
        ledger: (finalEvent as { ledger?: unknown }).ledger,
        metrics: (finalEvent as { metrics?: unknown }).metrics,
      },
    });
  } catch (error) {
    // Update session status to error
    await supabaseAdmin
      .from("sessions")
      .update({
        status: "error",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", session.id);

    return Response.json(
      {
        success: false,
        error: {
          code: "PIPELINE_ERROR",
          message: error instanceof Error ? error.message : "Pipeline failed",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Create SSE stream for pipeline events
 */
function createSSEStream(
  sessionId: string,
  query: string,
  workspaceId: string,
  mode: "answer" | "draft"
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send session created event
      controller.enqueue(
        encoder.encode(
          `event: session_created\ndata: ${JSON.stringify({ session_id: sessionId })}\n\n`
        )
      );

      try {
        for await (const event of executePipeline(
          sessionId,
          query,
          workspaceId,
          mode
        )) {
          const eventType = event.type;
          const data = JSON.stringify(event);
          controller.enqueue(
            encoder.encode(`event: ${eventType}\ndata: ${data}\n\n`)
          );

          if (eventType === "generation_complete" || eventType === "error") {
            break;
          }
        }

        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      } catch (error) {
        const errorData = JSON.stringify({
          type: "error",
          payload: {
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
        controller.enqueue(encoder.encode(`event: error\ndata: ${errorData}\n\n`));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
