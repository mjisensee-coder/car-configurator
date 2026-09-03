-- E30 Forge — Postgres schema
--
-- Applied with `npm run db:schema` (idempotent). Seeded with `npm run db:seed`.
--
-- Money is stored as integer cents. The JSON catalog this replaced used
-- whole-dollar floats; the row mappers in src/server/queries.ts convert
-- back to dollars so the `Part` domain type is unchanged.

CREATE TABLE IF NOT EXISTS parts (
  id            TEXT PRIMARY KEY,
  category      TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  brand         TEXT        NOT NULL,
  price_cents   INTEGER     NOT NULL CHECK (price_cents >= 0),
  image         TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  vendor        TEXT        NOT NULL,
  affiliate_url TEXT        NOT NULL,
  -- Free-form 3D hints (hex, style key, spoke count...). The scene reads
  -- this; the schema deliberately does not constrain it, so a new part
  -- category needs no migration.
  render_hint   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wheel fitment. Modelled on how ModsNation makes "will it fit" answerable:
-- the spec fields are columns, not prose, so they can be filtered and
-- faceted. One row per wheel part; non-wheel parts have no row.
--
-- bolt_pattern / offset_mm / width_inches / tire_size are the four fields
-- that make a wheel orderable. diameter_inches and center_bore_mm are
-- included because a fitment query is not answerable without them
-- (diameter is only implicit in tire_size, and bore decides whether the
-- wheel seats on the hub at all).
CREATE TABLE IF NOT EXISTS wheel_fitment (
  part_id         TEXT PRIMARY KEY REFERENCES parts(id) ON DELETE CASCADE,
  bolt_pattern    TEXT         NOT NULL,   -- e.g. '4x100'
  offset_mm       INTEGER      NOT NULL,   -- ET, positive = wheel sits inboard
  width_inches    NUMERIC(4,1) NOT NULL,
  diameter_inches NUMERIC(4,1) NOT NULL,
  tire_size       TEXT         NOT NULL,   -- e.g. '205/45R16'
  center_bore_mm  NUMERIC(5,2),            -- E30 hub is 57.1
  stance          TEXT CHECK (stance IN ('square', 'staggered')),
  notes           TEXT
);

CREATE TABLE IF NOT EXISTS builds (
  id               TEXT PRIMARY KEY,
  name             TEXT        NOT NULL,
  creator          TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  screenshot       TEXT        NOT NULL,
  -- The whole serializable CarConfig. Kept as one document on purpose:
  -- it is the same shape that round-trips through the ?build= share link.
  config           JSONB       NOT NULL,
  total_cost_cents INTEGER     NOT NULL CHECK (total_cost_cents >= 0),
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parts_category_idx      ON parts (category);
CREATE INDEX IF NOT EXISTS parts_price_idx         ON parts (price_cents);
CREATE INDEX IF NOT EXISTS fitment_bolt_idx        ON wheel_fitment (bolt_pattern);
CREATE INDEX IF NOT EXISTS fitment_diameter_idx    ON wheel_fitment (diameter_inches);
