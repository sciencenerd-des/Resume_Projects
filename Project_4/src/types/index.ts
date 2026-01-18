// User & Auth
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

// Workspace - Compatible with both Convex (_id, ownerId) and legacy (id, owner_id)
export interface Workspace {
  // Convex format
  _id?: string;
  ownerId?: string;
  _creationTime?: number;
  // Legacy format (for backward compatibility)
  id: string;
  name: string;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper to convert Convex workspace to legacy format
export function normalizeWorkspace(w: {
  _id: string;
  name: string;
  ownerId: string;
  _creationTime: number;
}): Workspace {
  return {
    _id: w._id,
    id: w._id,
    name: w.name,
    ownerId: w.ownerId,
    owner_id: w.ownerId,
    _creationTime: w._creationTime,
    created_at: new Date(w._creationTime).toISOString(),
    updated_at: new Date(w._creationTime).toISOString(),
  };
}

// Document
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'error';
export type FileType = 'pdf' | 'docx';

export interface Document {
  id: string;
  workspace_id: string;
  filename: string;
  file_type: FileType;
  status: DocumentStatus;
  chunk_count: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  content: string;
  page_number?: number;
  heading_path: string[];
  start_offset: number;
  end_offset: number;
}

// Session
export type SessionStatus = 'in_progress' | 'completed' | 'error';

export interface ChatSession {
  id: string;
  workspace_id: string;
  query: string;
  mode: 'answer' | 'draft';
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

// Chat
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  isPartial?: boolean; // True if response was interrupted (e.g., by error)
  isVerified?: boolean; // True if response was verified by Judge
}

export interface Citation {
  index: number;
  chunk_id: string;
  document_id: string;
  verdict?: Verdict;
}

export type Verdict = 'supported' | 'weak' | 'contradicted' | 'not_found' | 'expert_verified' | 'conflict_flagged';
export type ClaimType = 'fact' | 'policy' | 'numeric' | 'definition' | 'scientific' | 'historical' | 'legal';
export type ClaimImportance = 'critical' | 'material' | 'minor';

// Evidence Ledger
export interface LedgerEntry {
  id: string;
  claim_text: string;
  claim_type: ClaimType;
  source_tag?: string; // cite:N, llm:writer, llm:skeptic, llm:judge
  importance: ClaimImportance;
  verdict: Verdict;
  confidence: number;
  evidence_snippet?: string;
  expert_assessment?: string;
  chunk_ids: string[];
}

export interface RiskFlag {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface EvidenceLedger {
  session_id: string;
  summary: {
    total_claims: number;
    supported: number;
    weak: number;
    contradicted: number;
    not_found: number;
    expert_verified: number;
    conflict_flagged: number;
  };
  entries: LedgerEntry[];
  risk_flags: RiskFlag[];
}

// API Response Types
export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

// Query Params
export interface QueryParams {
  query: string;
  mode: 'answer' | 'draft';
}

// WebSocket Message Types
export interface WSMessage {
  type: string;
  payload: unknown;
}

export interface ContentChunkMessage {
  type: 'content_chunk';
  payload: {
    session_id: string;
    delta: string;
    citations?: Citation[];
  };
}

export interface ClaimVerifiedMessage {
  type: 'claim_verified';
  payload: {
    claim: LedgerEntry;
  };
}

export interface LedgerUpdatedMessage {
  type: 'ledger_updated';
  payload: EvidenceLedger;
}

export interface GenerationCompleteMessage {
  type: 'generation_complete';
  payload: {
    session_id: string;
  };
}

export interface SessionCreatedMessage {
  type: 'session_created';
  payload: {
    session_id: string;
  };
}

export interface ErrorMessage {
  type: 'error';
  payload: {
    message: string;
  };
}

export type WSEvents =
  | ContentChunkMessage
  | ClaimVerifiedMessage
  | LedgerUpdatedMessage
  | GenerationCompleteMessage
  | SessionCreatedMessage
  | ErrorMessage;
