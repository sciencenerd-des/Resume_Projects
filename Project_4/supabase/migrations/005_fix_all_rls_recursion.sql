-- Fix all RLS recursion issues
-- Migration 005: Complete RLS Fix with Security Definer Function

-- Create a security definer function to check workspace membership
-- This bypasses RLS when checking membership, preventing recursion
CREATE OR REPLACE FUNCTION public.user_workspace_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = uid;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_workspace_ids(uuid) TO authenticated;

-- =====================
-- Fix Workspace Policies
-- =====================
DROP POLICY IF EXISTS workspace_select ON workspaces;
CREATE POLICY workspace_select ON workspaces FOR SELECT USING (
  id IN (SELECT public.user_workspace_ids(auth.uid()))
);

DROP POLICY IF EXISTS workspace_update ON workspaces;
CREATE POLICY workspace_update ON workspaces FOR UPDATE USING (
  owner_id = auth.uid()
  OR id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- =====================
-- Fix Workspace Member Policies (no recursion)
-- =====================
DROP POLICY IF EXISTS member_select ON workspace_members;
CREATE POLICY member_select ON workspace_members FOR SELECT USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS member_insert ON workspace_members;
CREATE POLICY member_insert ON workspace_members FOR INSERT WITH CHECK (
  user_id = auth.uid() AND role = 'owner'
);

DROP POLICY IF EXISTS member_delete ON workspace_members;
CREATE POLICY member_delete ON workspace_members FOR DELETE USING (
  user_id = auth.uid()
);

-- =====================
-- Fix Document Policies
-- =====================
DROP POLICY IF EXISTS document_select ON documents;
CREATE POLICY document_select ON documents FOR SELECT USING (
  workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
);

DROP POLICY IF EXISTS document_insert ON documents;
CREATE POLICY document_insert ON documents FOR INSERT WITH CHECK (
  workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
);

DROP POLICY IF EXISTS document_update ON documents;
CREATE POLICY document_update ON documents FOR UPDATE USING (
  workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
);

DROP POLICY IF EXISTS document_delete ON documents;
CREATE POLICY document_delete ON documents FOR DELETE USING (
  workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
);

-- =====================
-- Fix Document Chunk Policies
-- =====================
DROP POLICY IF EXISTS chunk_select ON document_chunks;
CREATE POLICY chunk_select ON document_chunks FOR SELECT USING (
  document_id IN (
    SELECT id FROM documents WHERE workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS chunk_insert ON document_chunks;
CREATE POLICY chunk_insert ON document_chunks FOR INSERT WITH CHECK (
  document_id IN (
    SELECT id FROM documents WHERE workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS chunk_delete ON document_chunks;
CREATE POLICY chunk_delete ON document_chunks FOR DELETE USING (
  document_id IN (
    SELECT id FROM documents WHERE workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  )
);

-- =====================
-- Fix Session Policies
-- =====================
DROP POLICY IF EXISTS session_select ON sessions;
CREATE POLICY session_select ON sessions FOR SELECT USING (
  workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
);

DROP POLICY IF EXISTS session_insert ON sessions;
CREATE POLICY session_insert ON sessions FOR INSERT WITH CHECK (
  workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS session_update ON sessions;
CREATE POLICY session_update ON sessions FOR UPDATE USING (
  workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
);

DROP POLICY IF EXISTS session_delete ON sessions;
CREATE POLICY session_delete ON sessions FOR DELETE USING (
  workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
);

-- =====================
-- Fix Claims Policies
-- =====================
DROP POLICY IF EXISTS claims_select ON claims;
CREATE POLICY claims_select ON claims FOR SELECT USING (
  session_id IN (
    SELECT id FROM sessions WHERE workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS claims_insert ON claims;
CREATE POLICY claims_insert ON claims FOR INSERT WITH CHECK (
  session_id IN (
    SELECT id FROM sessions WHERE workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  )
);

-- =====================
-- Fix Evidence Ledger Policies
-- =====================
DROP POLICY IF EXISTS ledger_select ON evidence_ledger;
CREATE POLICY ledger_select ON evidence_ledger FOR SELECT USING (
  session_id IN (
    SELECT id FROM sessions WHERE workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS ledger_insert ON evidence_ledger;
CREATE POLICY ledger_insert ON evidence_ledger FOR INSERT WITH CHECK (
  session_id IN (
    SELECT id FROM sessions WHERE workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  )
);

-- =====================
-- Fix Session Feedback Policies
-- =====================
DROP POLICY IF EXISTS feedback_select ON session_feedback;
CREATE POLICY feedback_select ON session_feedback FOR SELECT USING (
  session_id IN (
    SELECT id FROM sessions WHERE workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS feedback_insert ON session_feedback;
CREATE POLICY feedback_insert ON session_feedback FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND session_id IN (
    SELECT id FROM sessions WHERE workspace_id IN (SELECT public.user_workspace_ids(auth.uid()))
  )
);
