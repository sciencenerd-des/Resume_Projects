-- Create a SECURITY DEFINER function to update document status
-- This bypasses RLS for async document processing updates
-- Migration 010: Document Status Update Function

-- Drop existing function if exists
DROP FUNCTION IF EXISTS update_document_status(uuid, text, integer, text);

-- Create the document status update function
CREATE OR REPLACE FUNCTION update_document_status(
  p_document_id uuid,
  p_status text,
  p_chunk_count integer DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF p_document_id IS NULL THEN
    RAISE EXCEPTION 'Document ID is required';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('uploading', 'processing', 'ready', 'error') THEN
    RAISE EXCEPTION 'Invalid status: must be uploading, processing, ready, or error';
  END IF;

  -- Update the document
  UPDATE documents
  SET
    status = p_status,
    chunk_count = COALESCE(p_chunk_count, chunk_count),
    error_message = p_error_message,
    updated_at = now()
  WHERE id = p_document_id;

  -- Check if document was found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found: %', p_document_id;
  END IF;

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_document_status(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_document_status(uuid, text, integer, text) TO anon;
