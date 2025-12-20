CREATE TABLE IF NOT EXISTS events_raw (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  schema_version TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uniq_raw_event
    UNIQUE (tenant_id, provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_raw_created_at
ON events_raw (created_at);