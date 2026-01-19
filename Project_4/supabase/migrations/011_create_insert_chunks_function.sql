-- Create a SECURITY DEFINER function to insert document chunks
-- This bypasses RLS for async document processing
-- Migration 011: Insert Document Chunks Function

-- Drop existing function if exists
DROP FUNCTION IF EXISTS insert_document_chunks(jsonb);

-- Create the chunk insertion function
CREATE OR REPLACE FUNCTION insert_document_chunks(
  p_chunks jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_chunk jsonb;
BEGIN
  -- Validate input
  IF p_chunks IS NULL OR jsonb_array_length(p_chunks) = 0 THEN
    RAISE EXCEPTION 'Chunks array is required and cannot be empty';
  END IF;

  -- Insert each chunk
  FOR v_chunk IN SELECT * FROM jsonb_array_elements(p_chunks)
  LOOP
    INSERT INTO document_chunks (
      document_id,
      chunk_hash,
      content,
      chunk_index,
      page_number,
      heading_path,
      start_offset,
      end_offset,
      embedding
    ) VALUES (
      (v_chunk->>'document_id')::uuid,
      v_chunk->>'chunk_hash',
      v_chunk->>'content',
      (v_chunk->>'chunk_index')::integer,
      (v_chunk->>'page_number')::integer,
      CASE
        WHEN v_chunk->'heading_path' IS NULL THEN NULL
        WHEN jsonb_typeof(v_chunk->'heading_path') = 'array' THEN
          ARRAY(SELECT jsonb_array_elements_text(v_chunk->'heading_path'))
        ELSE
          ARRAY[v_chunk->>'heading_path']
      END,
      (v_chunk->>'start_offset')::integer,
      (v_chunk->>'end_offset')::integer,
      (v_chunk->>'embedding')::vector
    );

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN v_inserted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_document_chunks(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_document_chunks(jsonb) TO anon;
