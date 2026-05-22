-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── sessions ──────────────────────────────────────────────────────────────────
-- One row per client-side conversation (keyed by the UUID the browser generates)
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT        PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── inference_logs ────────────────────────────────────────────────────────────
-- One row per LLM request. Stores raw metadata + extracted fields
-- (estimated_cost_usd, words_per_second) computed at ingestion time.
CREATE TABLE IF NOT EXISTS inference_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID        NOT NULL UNIQUE,
  session_id          TEXT        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  provider            TEXT        NOT NULL,
  model               TEXT        NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ NOT NULL,
  latency_ms          INTEGER     NOT NULL,
  status              TEXT        NOT NULL CHECK (status IN ('success', 'error')),
  error_message       TEXT,
  input_messages      INTEGER     NOT NULL,
  input_preview       TEXT,
  output_preview      TEXT,
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  total_tokens        INTEGER,
  -- extracted metadata
  estimated_cost_usd  NUMERIC(12, 8),
  words_per_second    NUMERIC(10, 2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inference_logs_session   ON inference_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_inference_logs_started   ON inference_logs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_inference_logs_model     ON inference_logs (model);

-- ── messages ──────────────────────────────────────────────────────────────────
-- Stores the new user message + assistant response produced by each request.
-- Each inference creates exactly 2 rows (one user, one assistant).
-- Full conversation history is not re-stored on every request, avoiding redundancy.
CREATE TABLE IF NOT EXISTS messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID        NOT NULL REFERENCES inference_logs(request_id) ON DELETE CASCADE,
  session_id  TEXT        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session    ON messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_request    ON messages (request_id);
