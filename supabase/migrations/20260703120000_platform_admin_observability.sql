-- Observabilidad custom + consola admin plataforma

-- ─── error_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid REFERENCES businesses(id) ON DELETE SET NULL,
  source       text NOT NULL,
  level        text NOT NULL DEFAULT 'error'
                 CHECK (level IN ('debug', 'info', 'warning', 'error')),
  message      text NOT NULL,
  stack        text,
  context      jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_business_created ON error_logs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source, created_at DESC);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- ─── platform_admins ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- ─── admin_audit_logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action        text NOT NULL,
  target_type   text,
  target_id     uuid,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── helper: is_platform_admin ────────────────────────────────
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
  );
$$;

-- ─── RLS policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "platform_admin_read_self" ON platform_admins;
CREATE POLICY "platform_admin_read_self" ON platform_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "platform_admin_read_error_logs" ON error_logs;
CREATE POLICY "platform_admin_read_error_logs" ON error_logs
  FOR SELECT TO authenticated
  USING (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_read_audit" ON admin_audit_logs;
CREATE POLICY "platform_admin_read_audit" ON admin_audit_logs
  FOR SELECT TO authenticated
  USING (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_read_all_businesses" ON businesses;
CREATE POLICY "platform_admin_read_all_businesses" ON businesses
  FOR SELECT TO authenticated
  USING (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_update_businesses" ON businesses;
CREATE POLICY "platform_admin_update_businesses" ON businesses
  FOR UPDATE TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_read_usage" ON usage_logs;
CREATE POLICY "platform_admin_read_usage" ON usage_logs
  FOR SELECT TO authenticated
  USING (is_platform_admin());

-- Bootstrap: crear usuario en Supabase Auth, luego:
-- INSERT INTO platform_admins (user_id, email) VALUES ('<uuid>', 'tu@email.com');
