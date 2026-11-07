-- Dedicated payment database. Notion is a display projection of these rows.
-- Money moves only inside a transaction that locks payment_job_locks for the job.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_job_locks (
  job_id text PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Immutable contract revisions. A new row is inserted when what is owed changes.
-- Collected money is never stored here.
CREATE TABLE IF NOT EXISTS obligations (
  id text PRIMARY KEY,
  job_id text NOT NULL,
  slot text NOT NULL,
  revision integer NOT NULL,
  principal_cents integer NOT NULL CHECK (principal_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  fingerprint text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, slot, revision)
);

CREATE INDEX IF NOT EXISTS obligations_job_slot ON obligations (job_id, slot, revision DESC);

-- One row per collected payment. Refund figures are updated in the same job lock.
-- applied_principal_cents is the unambiguous credit. Ambiguous refunds do not change it.
CREATE TABLE IF NOT EXISTS receipts (
  id text PRIMARY KEY,
  job_id text NOT NULL,
  slot text NOT NULL,
  kind text NOT NULL,
  co_id text,
  source text NOT NULL,
  principal_cents integer NOT NULL CHECK (principal_cents >= 0),
  fee_cents integer NOT NULL CHECK (fee_cents >= 0),
  paid_cents integer NOT NULL CHECK (paid_cents >= 0),
  status text NOT NULL,
  needs_review boolean NOT NULL DEFAULT false,
  applied_principal_cents integer NOT NULL CHECK (applied_principal_cents >= 0),
  refunded_cents integer NOT NULL DEFAULT 0,
  refunded_principal_cents integer NOT NULL DEFAULT 0,
  refunded_fee_cents integer NOT NULL DEFAULT 0,
  stripe_payment_intent text,
  stripe_session text,
  stripe_charge text,
  obligation_id text,
  method text,
  note text,
  events text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS receipts_payment_intent
  ON receipts (stripe_payment_intent)
  WHERE stripe_payment_intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS receipts_job ON receipts (job_id, slot);

-- Reserved BEFORE Stripe is called. params_json is the exact create body, including expires_at.
CREATE TABLE IF NOT EXISTS checkout_attempts (
  id text PRIMARY KEY,
  job_id text NOT NULL,
  slot text NOT NULL,
  generation integer NOT NULL,
  obligation_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  params_json text NOT NULL,
  base_cents integer NOT NULL,
  fee_cents integer NOT NULL,
  total_cents integer NOT NULL,
  currency text NOT NULL,
  stripe_session_id text UNIQUE,
  url text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, slot, generation)
);

CREATE INDEX IF NOT EXISTS checkout_attempts_job ON checkout_attempts (job_id, slot, generation DESC);

CREATE TABLE IF NOT EXISTS pay_links (
  id text PRIMARY KEY,
  job_id text NOT NULL,
  slot text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pay_links_job ON pay_links (job_id, slot);

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  livemode boolean,
  account_id text,
  job_id text,
  applied boolean NOT NULL DEFAULT false,
  projection_ok boolean NOT NULL DEFAULT false,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ordered display writes. A failed row is retried; a duplicate webhook repairs it.
CREATE TABLE IF NOT EXISTS outbox (
  id bigserial PRIMARY KEY,
  job_id text NOT NULL,
  seq bigint NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, seq)
);

CREATE INDEX IF NOT EXISTS outbox_pending ON outbox (job_id, seq) WHERE status <> 'projected';
