/**
 * WebSocket Handler
 * Handles real-time communication for streaming responses
 */
import type { ServerWebSocket } from "bun";
import { createClient } from "@supabase/supabase-js";
import { extractUserIdFromToken } from "../middleware/auth";
import { executePipeline, type PipelineEvent } from "../pipeline/orchestrator";
import { supabaseAdmin } from "../db";

// Create Supabase client for WebSocket auth validation
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const supabaseAuth = createClient(
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_ANON_KEY || "placeholder-key"
);

export interface WSData {
  token: string;
  userId?: string;
  workspaceId?: string;
}

interface QueryPayload {
  workspace_id: string;
  query: string;
  mode: "answer" | "draft";
  request_id?: string;
}

// Track active connections
const connections = new Map<string, ServerWebSocket<WSData>>();
const activePipelines = new Map<string, AbortController>();

/**
 * Validate WebSocket token and return user ID
 * Uses JWT parsing first, then Supabase validation
 */
async function validateWebSocketToken(token: string): Promise<string | null> {
  // First try to extract from JWT format (fastest)
  const jwtUserId = extractUserIdFromToken(token);
  if (jwtUserId) {
    return jwtUserId;
  }

  // Fallback to Supabase validation
  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (!error && user) {
      return user.id;
    }
  } catch {
    // Supabase validation failed
  }

  return null;
}

export const handleWebSocket = {
  async open(ws: ServerWebSocket<WSData>) {
    const token = ws.data.token;

    // Validate token and get user
    const userId = await validateWebSocketToken(token);
    if (!userId) {
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: "Invalid authentication token" },
        })
      );
      ws.close();
      return;
    }

    ws.data.userId = userId;
    connections.set(userId, ws);

    console.log(`[WS] Connection opened for user ${userId}`);

    ws.send(
      JSON.stringify({
        type: "connected",
        payload: { timestamp: Date.now() },
      })
    );
  },

  async message(ws: ServerWebSocket<WSData>, message: string | Buffer) {
    const userId = ws.data.userId;
    if (!userId) {
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: "Not authenticated" },
        })
      );
      return;
    }

    try {
      const msg = JSON.parse(message.toString());

      switch (msg.type) {
        case "query":
          await handleQuery(ws, msg.payload as QueryPayload);
          break;

        case "ping":
          ws.send(
            JSON.stringify({
              type: "pong",
              payload: { timestamp: Date.now() },
            })
          );
          break;

        case "cancel":
          handleCancel(ws, msg.payload?.session_id);
          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              payload: { message: `Unknown message type: ${msg.type}` },
            })
          );
      }
    } catch (error) {
      console.error("[WS] Error processing message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          payload: {
            message: error instanceof Error ? error.message : "Unknown error",
          },
        })
      );
    }
  },

  close(ws: ServerWebSocket<WSData>) {
    const userId = ws.data.userId;
    if (userId) {
      connections.delete(userId);
      console.log(`[WS] Connection closed for user ${userId}`);
    }
  },
};

async function handleQuery(
  ws: ServerWebSocket<WSData>,
  payload: QueryPayload
) {
  const { workspace_id, query, mode, request_id } = payload;
  const userId = ws.data.userId!;

  try {
    // Create session record using admin client (service key bypasses RLS)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .insert({
        workspace_id,
        user_id: userId,
        query,
        mode,
        status: "processing",
      })
      .select()
      .single();

    if (sessionError || !session) {
      throw new Error(sessionError?.message || "Failed to create session");
    }

    const sessionId = session.id;

    // Notify client of session creation
    ws.send(
      JSON.stringify({
        type: "session_created",
        payload: { session_id: sessionId, request_id },
      })
    );

    // Create abort controller for cancellation
    const abortController = new AbortController();
    activePipelines.set(sessionId, abortController);

    // Execute pipeline with streaming
    console.log(`[WS] Starting pipeline for session ${sessionId}`);
    try {
      for await (const event of executePipeline(
        sessionId,
        query,
        workspace_id,
        mode
      )) {
        if (abortController.signal.aborted) {
          ws.send(
            JSON.stringify({
              type: "cancelled",
              payload: { session_id: sessionId },
            })
          );
          break;
        }

        // Send event to client
        console.log(`[WS] Sending event: ${event.type}`);
        ws.send(JSON.stringify(event));
      }
      console.log(`[WS] Pipeline completed for session ${sessionId}`);
    } catch (pipelineError) {
      console.error(`[WS] Pipeline error:`, pipelineError);
      throw pipelineError;
    } finally {
      activePipelines.delete(sessionId);
    }
  } catch (error) {
    console.error("[WS] Query error:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        payload: {
          message: error instanceof Error ? error.message : "Query failed",
        },
      })
    );
  }
}

function handleCancel(ws: ServerWebSocket<WSData>, sessionId?: string) {
  if (!sessionId) {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { message: "Session ID required for cancellation" },
      })
    );
    return;
  }

  const controller = activePipelines.get(sessionId);
  if (controller) {
    controller.abort();
    ws.send(
      JSON.stringify({
        type: "cancelling",
        payload: { session_id: sessionId },
      })
    );
  } else {
    ws.send(
      JSON.stringify({
        type: "error",
        payload: { message: "No active pipeline found for session" },
      })
    );
  }
}

/**
 * Send a message to a specific user
 */
export function sendToUser(userId: string, event: PipelineEvent) {
  const ws = connections.get(userId);
  if (ws) {
    ws.send(JSON.stringify(event));
  }
}

export default handleWebSocket;
