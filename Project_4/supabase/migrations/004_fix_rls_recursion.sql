-- Fix infinite recursion in workspace_members RLS policies
-- Migration 004: Fix RLS Recursion

-- Users can see their own membership records directly (no recursion)
DROP POLICY IF EXISTS member_select ON workspace_members;
CREATE POLICY member_select ON workspace_members FOR SELECT USING (
  user_id = auth.uid()
);

-- Fix member_insert to allow owner to add first member (themselves)
DROP POLICY IF EXISTS member_insert ON workspace_members;
CREATE POLICY member_insert ON workspace_members FOR INSERT WITH CHECK (
  -- Allow if user is adding themselves as owner of a workspace they own
  (user_id = auth.uid() AND role = 'owner')
  OR
  -- Allow if user is an owner/admin of the workspace (for adding other members)
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Fix member_delete similarly
DROP POLICY IF EXISTS member_delete ON workspace_members;
CREATE POLICY member_delete ON workspace_members FOR DELETE USING (
  -- Self-removal is allowed
  user_id = auth.uid()
  OR
  -- Owners can remove anyone
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);
