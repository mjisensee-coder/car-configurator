-- Postgres-only indexes. Split out of schema.sql because the in-memory
-- Postgres used by `npm run db:verify` cannot plan GIN. Applied by
-- `npm run db:schema` against a real server, skipped by the verifier.
CREATE INDEX IF NOT EXISTS builds_tags_idx ON builds USING GIN (tags);
