ALTER TABLE domains ADD COLUMN IF NOT EXISTS score INTEGER;

CREATE INDEX IF NOT EXISTS idx_domains_score_date
  ON domains (score DESC, date_added)
  WHERE shown = true AND score IS NOT NULL;
