CREATE TABLE IF NOT EXISTS event_deliveries (
  id UUID PRIMARY KEY,

  tenant_id TEXT NOT NULL
    REFERENCES tenants(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,

  subscription_id UUID NOT NULL
    REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,

  status TEXT NOT NULL CHECK (
    status IN (
      'PENDING',
      'PROCESSING',
      'SUCCESS',
      'FAILED',
      'DLQ'
    )
  ),

  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  next_retry_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uniq_event_subscription
    UNIQUE (event_id, subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_event_deliveries_event
ON event_deliveries (event_id);

CREATE INDEX IF NOT EXISTS idx_event_deliveries_status
ON event_deliveries (status);

CREATE INDEX IF NOT EXISTS idx_event_deliveries_retry
ON event_deliveries (status, next_retry_at);