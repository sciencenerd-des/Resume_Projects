-- VerityDraft Database Functions
-- Migration 003: Helper Functions

-- =====================
-- Vector Search Function
-- =====================

-- Match chunks by vector similarity
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  workspace_id_param UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  chunk_hash TEXT,
  content TEXT,
  heading_path TEXT[],
  page_number INT,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    dc.chunk_hash,
    dc.content,
    dc.heading_path,
    dc.page_number,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.workspace_id = workspace_id_param
    AND d.status = 'ready'
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- =====================
-- Search chunks by text (fallback without embeddings)
-- =====================

CREATE OR REPLACE FUNCTION search_chunks_text(
  search_query TEXT,
  workspace_id_param UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  chunk_hash TEXT,
  content TEXT,
  heading_path TEXT[],
  page_number INT,
  rank FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    dc.chunk_hash,
    dc.content,
    dc.heading_path,
    dc.page_number,
    ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', search_query)) as rank
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.workspace_id = workspace_id_param
    AND d.status = 'ready'
    AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

-- =====================
-- Get workspace statistics
-- =====================

CREATE OR REPLACE FUNCTION get_workspace_stats(workspace_id_param UUID)
RETURNS TABLE (
  document_count BIGINT,
  chunk_count BIGINT,
  session_count BIGINT,
  total_queries BIGINT,
  avg_evidence_coverage FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    (SELECT COUNT(*) FROM documents WHERE workspace_id = workspace_id_param AND status = 'ready'),
    (SELECT COUNT(*) FROM document_chunks dc
     JOIN documents d ON dc.document_id = d.id
     WHERE d.workspace_id = workspace_id_param),
    (SELECT COUNT(*) FROM sessions WHERE workspace_id = workspace_id_param),
    (SELECT COUNT(*) FROM sessions WHERE workspace_id = workspace_id_param AND status = 'completed'),
    (SELECT AVG(evidence_coverage) FROM sessions
     WHERE workspace_id = workspace_id_param AND status = 'completed');
$$;

-- =====================
-- Get chunk context (previous and next chunks)
-- =====================

CREATE OR REPLACE FUNCTION get_chunk_context(
  chunk_id_param UUID,
  context_size INT DEFAULT 1
)
RETURNS TABLE (
  chunk_id UUID,
  chunk_hash TEXT,
  content TEXT,
  chunk_index INT,
  is_target BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH target AS (
    SELECT document_id, chunk_index
    FROM document_chunks
    WHERE id = chunk_id_param
  )
  SELECT
    dc.id as chunk_id,
    dc.chunk_hash,
    dc.content,
    dc.chunk_index,
    (dc.id = chunk_id_param) as is_target
  FROM document_chunks dc
  CROSS JOIN target t
  WHERE dc.document_id = t.document_id
    AND dc.chunk_index BETWEEN (t.chunk_index - context_size) AND (t.chunk_index + context_size)
  ORDER BY dc.chunk_index;
$$;

-- =====================
-- Delete old sessions (cleanup function)
-- =====================

CREATE OR REPLACE FUNCTION cleanup_old_sessions(days_old INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM sessions
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL
    AND status IN ('completed', 'error');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =====================
-- Calculate evidence coverage for a session
-- =====================

CREATE OR REPLACE FUNCTION calculate_evidence_coverage(session_id_param UUID)
RETURNS FLOAT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 0.0
      ELSE COUNT(*) FILTER (WHERE el.verdict IN ('supported', 'weak'))::FLOAT / COUNT(*)::FLOAT
    END
  FROM claims c
  LEFT JOIN evidence_ledger el ON c.id = el.claim_id
  WHERE c.session_id = session_id_param
    AND c.importance IN ('critical', 'material');
$$;
