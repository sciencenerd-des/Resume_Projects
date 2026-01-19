/**
 * Database Client
 * Uses Supabase PostgreSQL for server-side operations
 * Uses service key to bypass RLS for server operations
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[DB] Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set. Using mock mode."
  );
}

// Create admin client - use service key if available to bypass RLS
// Service key should be set for server-side operations that need to bypass RLS
const adminKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === "your-service-key") {
  console.warn(
    "[DB] Warning: SUPABASE_SERVICE_KEY not set. Using anon key - RLS policies will be enforced."
  );
}

const adminClient = createClient(
  SUPABASE_URL || "http://localhost:54321",
  adminKey || "placeholder-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Export the admin client - bypasses RLS when service key is used
export const supabaseAdmin = adminClient;

/**
 * Create a Supabase client authenticated with a user's JWT token
 * This allows RLS policies to work correctly with the anon key
 */
export function createAuthenticatedClient(accessToken: string) {
  const client = createClient(
    SUPABASE_URL || "http://localhost:54321",
    SUPABASE_ANON_KEY || "placeholder-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );

  // Also set the session to ensure auth.uid() works in RLS policies
  // This is needed because just setting the header might not be enough
  client.auth.setSession({
    access_token: accessToken,
    refresh_token: '', // Not needed for server-side
  });

  return client;
}

// Type-safe database query helper
export interface QueryResult<T = unknown> {
  data: T | null;
  error: Error | null;
}

interface DbHelper {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  from<T extends keyof Tables>(table: T): ReturnType<typeof supabaseAdmin.from>;
  transaction<T>(fn: (tx: DbHelper) => Promise<T>): Promise<T>;
  rpc<T = unknown>(fnName: string, params?: Record<string, unknown>): Promise<T>;
}

export const db: DbHelper = {
  /**
   * Execute a raw SQL query
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const { data, error } = await supabaseAdmin.rpc("exec_sql", {
      query: sql,
      params,
    });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return (data as T[]) || [];
  },

  /**
   * Execute a query using Supabase query builder (preferred)
   */
  from<T extends keyof Tables>(table: T) {
    return supabaseAdmin.from(table);
  },

  /**
   * Run a transaction (simulated - Supabase doesn't support true transactions via REST)
   */
  async transaction<T>(
    fn: (tx: DbHelper) => Promise<T>
  ): Promise<T> {
    // Note: This is a simplified transaction wrapper
    // For true ACID transactions, use Supabase Edge Functions with pg
    return fn(db);
  },

  /**
   * Call a database function
   */
  async rpc<T = unknown>(
    fnName: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    const { data, error } = await supabaseAdmin.rpc(fnName, params);

    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    return data as T;
  },
};

// Table types for type safety
export interface Tables {
  workspaces: {
    id: string;
    name: string;
    owner_id: string;
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  };
  workspace_members: {
    workspace_id: string;
    user_id: string;
    role: "owner" | "admin" | "member";
    created_at: string;
  };
  documents: {
    id: string;
    workspace_id: string;
    filename: string;
    file_type: "pdf" | "docx";
    file_size: number;
    storage_path: string;
    tags: string[];
    metadata: Record<string, unknown>;
    status: "uploading" | "processing" | "ready" | "error";
    error_message: string | null;
    chunk_count: number;
    created_at: string;
    updated_at: string;
  };
  document_chunks: {
    id: string;
    document_id: string;
    chunk_hash: string;
    content: string;
    chunk_index: number;
    page_number: number | null;
    heading_path: string[];
    start_offset: number;
    end_offset: number;
    embedding: number[];
    metadata: Record<string, unknown>;
    created_at: string;
  };
  sessions: {
    id: string;
    workspace_id: string;
    user_id: string;
    query: string;
    mode: "answer" | "draft";
    settings: Record<string, unknown>;
    response: string | null;
    status: "pending" | "processing" | "completed" | "error";
    error_message: string | null;
    processing_time_ms: number | null;
    token_count: Record<string, number> | null;
    evidence_coverage: number | null;
    unsupported_claim_count: number;
    revision_cycles: number;
    created_at: string;
    completed_at: string | null;
  };
  claims: {
    id: string;
    session_id: string;
    claim_text: string;
    claim_type: "fact" | "policy" | "numeric" | "definition";
    importance: "critical" | "material" | "minor";
    requires_citation: boolean;
    start_offset: number | null;
    end_offset: number | null;
    created_at: string;
  };
  evidence_ledger: {
    id: string;
    session_id: string;
    claim_id: string;
    verdict: "supported" | "weak" | "contradicted" | "not_found";
    confidence_score: number;
    chunk_ids: string[];
    evidence_snippet: string | null;
    notes: string | null;
    created_at: string;
  };
  session_feedback: {
    id: string;
    session_id: string;
    user_id: string;
    feedback_type: "helpful" | "incorrect" | "missing_citation";
    comment: string | null;
    corrections: Record<string, unknown> | null;
    created_at: string;
  };
}

export default db;
