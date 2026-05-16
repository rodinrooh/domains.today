-- Atomic single-domain reveal. Uses FOR UPDATE SKIP LOCKED so
-- concurrent calls (overlapping cron runs) never flip the same row.
CREATE OR REPLACE FUNCTION public.reveal_next_domain()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_id BIGINT;
BEGIN
  UPDATE domains
  SET shown = true
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
