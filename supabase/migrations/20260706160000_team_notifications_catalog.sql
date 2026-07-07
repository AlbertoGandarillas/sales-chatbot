-- ════════════════════════════════════════════════════════════════
-- TN-1 + TN-2: Equipo (roles), RLS por membership, notify_new_orders
-- ════════════════════════════════════════════════════════════════

-- ─── business_members ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('owner', 'catalog', 'operator')),
  invited_email text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members (user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business ON business_members (business_id);

ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

-- Bootstrap dueños existentes
INSERT INTO business_members (business_id, user_id, role)
SELECT id, owner_user_id, 'owner'
FROM businesses
WHERE owner_user_id IS NOT NULL
ON CONFLICT (business_id, user_id) DO NOTHING;

-- Auto-crear fila owner al registrar negocio nuevo
CREATE OR REPLACE FUNCTION bootstrap_business_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL THEN
    INSERT INTO business_members (business_id, user_id, role)
    VALUES (NEW.id, NEW.owner_user_id, 'owner')
    ON CONFLICT (business_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bootstrap_business_owner_member ON businesses;
CREATE TRIGGER trg_bootstrap_business_owner_member
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION bootstrap_business_owner_member();

-- ─── TN-2: preferencia notificación pedidos ───────────────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS notify_new_orders boolean NOT NULL DEFAULT true;

-- ─── Helpers RLS ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION user_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM business_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION user_owner_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM business_members
  WHERE user_id = auth.uid() AND role = 'owner'
$$;

CREATE OR REPLACE FUNCTION user_catalog_write_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM business_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'catalog')
$$;

CREATE OR REPLACE FUNCTION user_operator_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM business_members
  WHERE user_id = auth.uid() AND role = 'operator'
$$;

CREATE OR REPLACE FUNCTION user_ops_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM business_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'operator')
$$;

-- ─── business_members policies ────────────────────────────────
DROP POLICY IF EXISTS "member_read_team" ON business_members;
CREATE POLICY "member_read_team" ON business_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR business_id IN (SELECT user_owner_business_ids())
  );

DROP POLICY IF EXISTS "owner_insert_members" ON business_members;
CREATE POLICY "owner_insert_members" ON business_members
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id IN (SELECT user_owner_business_ids())
    AND role IN ('catalog', 'operator')
  );

DROP POLICY IF EXISTS "owner_delete_members" ON business_members;
CREATE POLICY "owner_delete_members" ON business_members
  FOR DELETE TO authenticated
  USING (
    business_id IN (SELECT user_owner_business_ids())
    AND role <> 'owner'
  );

-- ─── businesses ─────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_rw_businesses" ON businesses;

DROP POLICY IF EXISTS "member_read_businesses" ON businesses;
CREATE POLICY "member_read_businesses" ON businesses
  FOR SELECT TO authenticated
  USING (id IN (SELECT user_business_ids()));

DROP POLICY IF EXISTS "owner_update_businesses" ON businesses;
CREATE POLICY "owner_update_businesses" ON businesses
  FOR UPDATE TO authenticated
  USING (id IN (SELECT user_owner_business_ids()))
  WITH CHECK (id IN (SELECT user_owner_business_ids()));

-- ─── products ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_rw_products" ON products;

DROP POLICY IF EXISTS "catalog_rw_products" ON products;
CREATE POLICY "catalog_rw_products" ON products
  FOR ALL TO authenticated
  USING (business_id IN (SELECT user_catalog_write_business_ids()))
  WITH CHECK (business_id IN (SELECT user_catalog_write_business_ids()));

DROP POLICY IF EXISTS "operator_read_products" ON products;
CREATE POLICY "operator_read_products" ON products
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT user_operator_business_ids()));

-- ─── conversations ──────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_rw_conversations" ON conversations;

DROP POLICY IF EXISTS "ops_rw_conversations" ON conversations;
CREATE POLICY "ops_rw_conversations" ON conversations
  FOR ALL TO authenticated
  USING (business_id IN (SELECT user_ops_business_ids()))
  WITH CHECK (business_id IN (SELECT user_ops_business_ids()));

-- ─── messages ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_rw_messages" ON messages;

DROP POLICY IF EXISTS "ops_rw_messages" ON messages;
CREATE POLICY "ops_rw_messages" ON messages
  FOR ALL TO authenticated
  USING (conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE c.business_id IN (SELECT user_ops_business_ids())
  ))
  WITH CHECK (conversation_id IN (
    SELECT c.id FROM conversations c
    WHERE c.business_id IN (SELECT user_ops_business_ids())
  ));

-- ─── orders ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_rw_orders" ON orders;

DROP POLICY IF EXISTS "owner_all_orders" ON orders;
CREATE POLICY "owner_all_orders" ON orders
  FOR ALL TO authenticated
  USING (business_id IN (SELECT user_owner_business_ids()))
  WITH CHECK (business_id IN (SELECT user_owner_business_ids()));

DROP POLICY IF EXISTS "operator_read_orders" ON orders;
CREATE POLICY "operator_read_orders" ON orders
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT user_operator_business_ids()));

DROP POLICY IF EXISTS "operator_update_orders" ON orders;
CREATE POLICY "operator_update_orders" ON orders
  FOR UPDATE TO authenticated
  USING (business_id IN (SELECT user_operator_business_ids()))
  WITH CHECK (business_id IN (SELECT user_operator_business_ids()));

-- ─── usage_logs ───────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_read_usage" ON usage_logs;

DROP POLICY IF EXISTS "member_read_usage" ON usage_logs;
CREATE POLICY "member_read_usage" ON usage_logs
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT user_ops_business_ids()));

-- ─── business_faqs ────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_rw_business_faqs" ON business_faqs;

DROP POLICY IF EXISTS "owner_rw_business_faqs_v2" ON business_faqs;
CREATE POLICY "owner_rw_business_faqs_v2" ON business_faqs
  FOR ALL TO authenticated
  USING (business_id IN (SELECT user_owner_business_ids()))
  WITH CHECK (business_id IN (SELECT user_owner_business_ids()));

-- ─── business_knowledge_articles ──────────────────────────────
DROP POLICY IF EXISTS "owner_rw_business_knowledge" ON business_knowledge_articles;

DROP POLICY IF EXISTS "owner_rw_business_knowledge_v2" ON business_knowledge_articles;
CREATE POLICY "owner_rw_business_knowledge_v2" ON business_knowledge_articles
  FOR ALL TO authenticated
  USING (business_id IN (SELECT user_owner_business_ids()))
  WITH CHECK (business_id IN (SELECT user_owner_business_ids()));

-- ─── recurring_orders ─────────────────────────────────────────
DROP POLICY IF EXISTS "owner_rw_recurring_orders" ON recurring_orders;

DROP POLICY IF EXISTS "owner_rw_recurring_orders_v2" ON recurring_orders;
CREATE POLICY "owner_rw_recurring_orders_v2" ON recurring_orders
  FOR ALL TO authenticated
  USING (business_id IN (SELECT user_owner_business_ids()))
  WITH CHECK (business_id IN (SELECT user_owner_business_ids()));

DROP POLICY IF EXISTS "operator_read_recurring_orders" ON recurring_orders;
CREATE POLICY "operator_read_recurring_orders" ON recurring_orders
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT user_operator_business_ids()));

-- ─── recurring_order_runs ─────────────────────────────────────
DROP POLICY IF EXISTS "owner_rw_recurring_order_runs" ON recurring_order_runs;

DROP POLICY IF EXISTS "owner_rw_recurring_order_runs_v2" ON recurring_order_runs;
CREATE POLICY "owner_rw_recurring_order_runs_v2" ON recurring_order_runs
  FOR ALL TO authenticated
  USING (recurring_order_id IN (
    SELECT id FROM recurring_orders
    WHERE business_id IN (SELECT user_owner_business_ids())
  ))
  WITH CHECK (recurring_order_id IN (
    SELECT id FROM recurring_orders
    WHERE business_id IN (SELECT user_owner_business_ids())
  ));

DROP POLICY IF EXISTS "operator_read_recurring_order_runs" ON recurring_order_runs;
CREATE POLICY "operator_read_recurring_order_runs" ON recurring_order_runs
  FOR SELECT TO authenticated
  USING (recurring_order_id IN (
    SELECT id FROM recurring_orders
    WHERE business_id IN (SELECT user_operator_business_ids())
  ));

-- ─── Storage product-images (catálogo write) ──────────────────
DROP POLICY IF EXISTS "owner_insert_product_images" ON storage.objects;
CREATE POLICY "catalog_insert_product_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses
      WHERE id IN (SELECT user_catalog_write_business_ids())
    )
  );

DROP POLICY IF EXISTS "owner_update_product_images" ON storage.objects;
CREATE POLICY "catalog_update_product_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses
      WHERE id IN (SELECT user_catalog_write_business_ids())
    )
  );

DROP POLICY IF EXISTS "owner_delete_product_images" ON storage.objects;
CREATE POLICY "catalog_delete_product_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses
      WHERE id IN (SELECT user_catalog_write_business_ids())
    )
  );
