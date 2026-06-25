-- Cruje MVP v2: esquema multi-tenant (aditivo, no destructivo)

-- ─── businesses: columnas multi-tenant ───────────────────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS vertical text NOT NULL DEFAULT 'bakery'
    CHECK (vertical IN ('bakery', 'retail')),
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_token text,
  ADD COLUMN IF NOT EXISTS owner_whatsapp_number text,
  ADD COLUMN IF NOT EXISTS system_prompt_custom text,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS shopify_domain text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_businesses_phone_number_id
  ON businesses(whatsapp_phone_number_id)
  WHERE whatsapp_phone_number_id IS NOT NULL;

-- ─── products: ampliar category e incluir campos retail ───────
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products
  ALTER COLUMN category SET DEFAULT 'otros',
  ADD CONSTRAINT products_category_check
    CHECK (category IN ('panes','pasteleria','tortas','bebidas','otros','retail'));

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','shopify')),
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS talla_range text,
  ADD COLUMN IF NOT EXISTS color_o_material text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_business_external
  ON products(business_id, external_id)
  WHERE external_id IS NOT NULL;

-- ─── usage_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_logs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id    uuid REFERENCES conversations(id) ON DELETE SET NULL,
  model              text NOT NULL,
  input_tokens       integer NOT NULL DEFAULT 0,
  output_tokens      integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_business_created
  ON usage_logs(business_id, created_at);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- ─── conversations: handoff a humano (ver operations-spec-v2) ──
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'bot'
    CHECK (mode IN ('bot','human'));

-- ─── orders: entrega y pago (ver operations-spec-v2) ──────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS estimated_delivery_date date,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_note text;

-- ─── messages: permitir role 'human_agent' ───────────────────
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_role_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_role_check
    CHECK (role IN ('user','assistant','tool','human_agent'));

-- ─── Realtime para nuevas vistas del dashboard ───────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
