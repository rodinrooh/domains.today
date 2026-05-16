ALTER TABLE domains ADD COLUMN IF NOT EXISTS shown_at TIMESTAMPTZ;

-- Existing shown=true rows keep shown_at = NULL → displayed as "---" on the frontend.
-- New reveals will get shown_at = NOW() stamped atomically.
CREATE OR REPLACE FUNCTION public.reveal_next_domain()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_id BIGINT;
BEGIN
  UPDATE domains
  SET shown = true, shown_at = NOW()
  WHERE id = (
    SELECT id FROM domains
    WHERE shown = false
    ORDER BY id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO next_id;
  RETURN next_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reveal_next_domain() TO service_role;
