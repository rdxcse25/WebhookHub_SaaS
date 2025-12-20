DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'event_status'
  ) THEN
    CREATE TYPE event_status AS ENUM (
      'RECEIVED',
      'PROCESSING',
      'SUCCESS',
      'FAILED',
      'DLQ'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS events_state (
  id UUID PRIMARY KEY,

  tenant_id TEXT NOT NULL
    REFERENCES tenants(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,

  status event_status NOT NULL,

  retry_count INTEGER NOT NULL DEFAULT 0,
  error_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT uniq_event_state
    UNIQUE (tenant_id, provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_state_status
  ON events_state (status);

CREATE INDEX IF NOT EXISTS idx_events_state_updated_at
  ON events_state (updated_at);
