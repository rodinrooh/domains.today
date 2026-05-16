-- Run this once in the Supabase SQL Editor for the domains.today project

CREATE TABLE IF NOT EXISTS domains (
  id         BIGSERIAL PRIMARY KEY,
  domain     TEXT NOT NULL UNIQUE,
  date_added DATE NOT NULL,
  shown      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_domains_shown_id ON domains (shown, id ASC);

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_shown"
  ON domains
  FOR SELECT
  TO anon
  USING (shown = true);

CREATE POLICY "service_full_access"
  ON domains
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
