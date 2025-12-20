CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,

  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uniq_subscription
    UNIQUE (tenant_id, provider, event_type)
);

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active
ON webhook_subscriptions (tenant_id, provider, is_active);
