-- Pedidos recurrentes (Tier 1 + 2)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS recurring_order_id uuid;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_source_check
  CHECK (source IN ('chat', 'recurring', 'manual'));

CREATE TABLE IF NOT EXISTS recurring_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id   uuid REFERENCES conversations(id) ON DELETE SET NULL,
  customer_phone    text NOT NULL,
  customer_name     text,
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'paused', 'cancelled')),
  frequency         text NOT NULL
                      CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  day_of_week       smallint CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month      smallint CHECK (day_of_month >= 1 AND day_of_month <= 28),
  next_run_on       date NOT NULL,
  items             jsonb NOT NULL DEFAULT '[]',
  notes             text,
  last_reminder_at  timestamptz,
  last_confirmed_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (frequency IN ('weekly', 'biweekly') AND day_of_week IS NOT NULL)
    OR (frequency = 'monthly' AND day_of_month IS NOT NULL)
  )
);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_recurring_order_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_recurring_order_id_fkey
  FOREIGN KEY (recurring_order_id) REFERENCES recurring_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_orders_business_next
  ON recurring_orders (business_id, next_run_on)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_recurring_orders_customer
  ON recurring_orders (business_id, customer_phone);

CREATE TABLE IF NOT EXISTS recurring_order_runs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_order_id uuid NOT NULL REFERENCES recurring_orders(id) ON DELETE CASCADE,
  scheduled_for      date NOT NULL,
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'reminded', 'confirmed', 'skipped', 'expired')),
  order_id           uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_order_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_recurring_runs_scheduled
  ON recurring_order_runs (scheduled_for, status);

DROP TRIGGER IF EXISTS trg_recurring_orders_updated_at ON recurring_orders;
CREATE TRIGGER trg_recurring_orders_updated_at
  BEFORE UPDATE ON recurring_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE recurring_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_order_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_rw_recurring_orders" ON recurring_orders;
CREATE POLICY "owner_rw_recurring_orders" ON recurring_orders
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_rw_recurring_order_runs" ON recurring_order_runs;
CREATE POLICY "owner_rw_recurring_order_runs" ON recurring_order_runs
  FOR ALL TO authenticated
  USING (recurring_order_id IN (
    SELECT ro.id FROM recurring_orders ro
    JOIN businesses b ON b.id = ro.business_id
    WHERE b.owner_user_id = auth.uid()))
  WITH CHECK (recurring_order_id IN (
    SELECT ro.id FROM recurring_orders ro
    JOIN businesses b ON b.id = ro.business_id
    WHERE b.owner_user_id = auth.uid()));
