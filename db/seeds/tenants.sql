-- ============================
-- tenants.sql
-- Seed initial tenants
-- ============================

INSERT INTO tenants (id, name, status)
VALUES
  ('stashfin', 'Stashfin', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;