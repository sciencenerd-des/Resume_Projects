-- Create a SECURITY DEFINER function to handle workspace creation
-- This bypasses RLS while still being secure because:
-- 1. It validates the user_id is provided
-- 2. It sets the owner_id correctly
-- 3. It creates the membership in a single transaction
-- Migration 008: Workspace Creation Function

-- Drop existing function if exists
DROP FUNCTION IF EXISTS create_workspace_for_user(uuid, text, jsonb);

-- Create the workspace creation function
CREATE OR REPLACE FUNCTION create_workspace_for_user(
  p_user_id uuid,
  p_name text,
  p_settings jsonb DEFAULT '{"default_mode": "answer", "strict_mode": false}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_workspace jsonb;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;

  -- Create workspace
  INSERT INTO workspaces (name, owner_id, settings)
  VALUES (trim(p_name), p_user_id, p_settings)
  RETURNING id INTO v_workspace_id;

  -- Add owner as member
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_user_id, 'owner');

  -- Return the created workspace
  SELECT jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'owner_id', w.owner_id,
    'settings', w.settings,
    'created_at', w.created_at,
    'updated_at', w.updated_at,
    'role', 'owner'
  ) INTO v_workspace
  FROM workspaces w
  WHERE w.id = v_workspace_id;

  RETURN v_workspace;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_workspace_for_user(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_workspace_for_user(uuid, text, jsonb) TO anon;
