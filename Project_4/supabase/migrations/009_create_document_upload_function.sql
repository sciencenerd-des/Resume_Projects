-- Create a SECURITY DEFINER function to handle document uploads
-- This bypasses RLS while maintaining security by validating workspace membership
-- Migration 009: Document Upload Function

-- Drop existing function if exists
DROP FUNCTION IF EXISTS upload_document_for_user(uuid, uuid, text, text, integer);

-- Create the document upload function
CREATE OR REPLACE FUNCTION upload_document_for_user(
  p_user_id uuid,
  p_workspace_id uuid,
  p_filename text,
  p_file_type text,
  p_file_size integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document_id uuid;
  v_document jsonb;
  v_membership_exists boolean;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Workspace ID is required';
  END IF;

  IF p_filename IS NULL OR trim(p_filename) = '' THEN
    RAISE EXCEPTION 'Filename is required';
  END IF;

  -- Verify user has access to workspace
  SELECT EXISTS(
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  ) INTO v_membership_exists;

  IF NOT v_membership_exists THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this workspace';
  END IF;

  -- Create document record
  INSERT INTO documents (workspace_id, filename, file_type, file_size, status)
  VALUES (p_workspace_id, trim(p_filename), p_file_type, p_file_size, 'processing')
  RETURNING id INTO v_document_id;

  -- Return the created document
  SELECT jsonb_build_object(
    'id', d.id,
    'workspace_id', d.workspace_id,
    'filename', d.filename,
    'file_type', d.file_type,
    'file_size', d.file_size,
    'status', d.status,
    'created_at', d.created_at,
    'updated_at', d.updated_at
  ) INTO v_document
  FROM documents d
  WHERE d.id = v_document_id;

  RETURN v_document;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upload_document_for_user(uuid, uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION upload_document_for_user(uuid, uuid, text, text, integer) TO anon;
