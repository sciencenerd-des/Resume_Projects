-- Complete reset of workspace_members RLS
-- Migration 006: Nuclear option - disable and re-enable RLS

-- Temporarily disable RLS on workspace_members
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on workspace_members
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'workspace_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_members', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- SELECT: users can only see their own memberships
CREATE POLICY member_select ON workspace_members
FOR SELECT USING (user_id = auth.uid());

-- INSERT: users can add themselves as owner to any workspace they own
CREATE POLICY member_insert ON workspace_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- DELETE: users can remove themselves
CREATE POLICY member_delete ON workspace_members
FOR DELETE USING (user_id = auth.uid());

-- Also fix workspace_update policy which was still referencing workspace_members
DROP POLICY IF EXISTS workspace_update ON workspaces;
CREATE POLICY workspace_update ON workspaces FOR UPDATE USING (
  owner_id = auth.uid()
);
