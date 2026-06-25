-- ════════════════════════════════════════════════════════════════
-- M4 — RLS por dueño (owner_user_id)
-- Reemplaza las policies permisivas v1 (anon) por policies basadas en
-- el dueño autenticado. El bot/webhook usan service-role y BYPASSEAN RLS,
-- por lo que quitar las policies anon NO afecta al agente.
-- ════════════════════════════════════════════════════════════════

-- ─── businesses ───────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_read_businesses" ON businesses;
DROP POLICY IF EXISTS "owner_rw_businesses" ON businesses;
CREATE POLICY "owner_rw_businesses" ON businesses
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ─── products ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_read_products" ON products;
DROP POLICY IF EXISTS "owner_rw_products" ON products;
CREATE POLICY "owner_rw_products" ON products
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

-- ─── conversations ────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_rw_conversations" ON conversations;
CREATE POLICY "owner_rw_conversations" ON conversations
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

-- ─── messages (via conversation -> business) ──────────────────
DROP POLICY IF EXISTS "owner_rw_messages" ON messages;
CREATE POLICY "owner_rw_messages" ON messages
  FOR ALL TO authenticated
  USING (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN businesses b ON b.id = c.business_id
    WHERE b.owner_user_id = auth.uid()))
  WITH CHECK (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN businesses b ON b.id = c.business_id
    WHERE b.owner_user_id = auth.uid()));

-- ─── orders ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_read_orders" ON orders;
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
DROP POLICY IF EXISTS "owner_rw_orders" ON orders;
CREATE POLICY "owner_rw_orders" ON orders
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

-- ─── usage_logs (solo lectura para el dueño; INSERT lo hace service-role) ───
DROP POLICY IF EXISTS "owner_read_usage" ON usage_logs;
CREATE POLICY "owner_read_usage" ON usage_logs
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
