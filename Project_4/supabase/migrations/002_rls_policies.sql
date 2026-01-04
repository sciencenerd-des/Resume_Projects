-- VerityDraft Row-Level Security Policies
-- Migration 002: RLS Policies

-- =====================
-- Enable RLS on all tables
-- =====================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;

-- =====================
-- Workspace Policies
-- =====================

-- Users can see workspaces they are members of
DROP POLICY IF EXISTS workspace_select ON workspaces;
CREATE POLICY workspace_select ON workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Users can create workspaces (they become owner)
DROP POLICY IF EXISTS workspace_insert ON workspaces;
CREATE POLICY workspace_insert ON workspaces FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);

-- Only owners and admins can update workspaces
DROP POLICY IF EXISTS workspace_update ON workspaces;
CREATE POLICY workspace_update ON workspaces FOR UPDATE USING (
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Only owners can delete workspaces
DROP POLICY IF EXISTS workspace_delete ON workspaces;
CREATE POLICY workspace_delete ON workspaces FOR DELETE USING (
  owner_id = auth.uid()
);

-- =====================
-- Workspace Member Policies
-- =====================

-- Users can see members of workspaces they belong to
DROP POLICY IF EXISTS member_select ON workspace_members;
CREATE POLICY member_select ON workspace_members FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Owners and admins can add members
DROP POLICY IF EXISTS member_insert ON workspace_members;
CREATE POLICY member_insert ON workspace_members FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Owners can remove members (or self-removal)
DROP POLICY IF EXISTS member_delete ON workspace_members;
CREATE POLICY member_delete ON workspace_members FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'owner')
  OR user_id = auth.uid()
);

-- =====================
-- Document Policies
-- =====================

-- Users can access documents in workspaces they belong to
DROP POLICY IF EXISTS document_select ON documents;
CREATE POLICY document_select ON documents FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS document_insert ON documents;
CREATE POLICY document_insert ON documents FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS document_update ON documents;
CREATE POLICY document_update ON documents FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS document_delete ON documents;
CREATE POLICY document_delete ON documents FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- =====================
-- Document Chunk Policies
-- =====================

-- Users can access chunks of documents in their workspaces
DROP POLICY IF EXISTS chunk_select ON document_chunks;
CREATE POLICY chunk_select ON document_chunks FOR SELECT USING (
  document_id IN (
    SELECT d.id FROM documents d
    JOIN workspace_members wm ON d.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS chunk_insert ON document_chunks;
CREATE POLICY chunk_insert ON document_chunks FOR INSERT WITH CHECK (
  document_id IN (
    SELECT d.id FROM documents d
    JOIN workspace_members wm ON d.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS chunk_delete ON document_chunks;
CREATE POLICY chunk_delete ON document_chunks FOR DELETE USING (
  document_id IN (
    SELECT d.id FROM documents d
    JOIN workspace_members wm ON d.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- =====================
-- Session Policies
-- =====================

-- Users can access sessions in workspaces they belong to
DROP POLICY IF EXISTS session_select ON sessions;
CREATE POLICY session_select ON sessions FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS session_insert ON sessions;
CREATE POLICY session_insert ON sessions FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS session_update ON sessions;
CREATE POLICY session_update ON sessions FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS session_delete ON sessions;
CREATE POLICY session_delete ON sessions FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- =====================
-- Claims Policies
-- =====================

DROP POLICY IF EXISTS claims_select ON claims;
CREATE POLICY claims_select ON claims FOR SELECT USING (
  session_id IN (
    SELECT s.id FROM sessions s
    JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS claims_insert ON claims;
CREATE POLICY claims_insert ON claims FOR INSERT WITH CHECK (
  session_id IN (
    SELECT s.id FROM sessions s
    JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- =====================
-- Evidence Ledger Policies
-- =====================

DROP POLICY IF EXISTS ledger_select ON evidence_ledger;
CREATE POLICY ledger_select ON evidence_ledger FOR SELECT USING (
  session_id IN (
    SELECT s.id FROM sessions s
    JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS ledger_insert ON evidence_ledger;
CREATE POLICY ledger_insert ON evidence_ledger FOR INSERT WITH CHECK (
  session_id IN (
    SELECT s.id FROM sessions s
    JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- =====================
-- Session Feedback Policies
-- =====================

DROP POLICY IF EXISTS feedback_select ON session_feedback;
CREATE POLICY feedback_select ON session_feedback FOR SELECT USING (
  session_id IN (
    SELECT s.id FROM sessions s
    JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS feedback_insert ON session_feedback;
CREATE POLICY feedback_insert ON session_feedback FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND session_id IN (
    SELECT s.id FROM sessions s
    JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);
