-- Bot Studio: configuración estructurada del agente + FAQs + artículos

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS bot_name text,
  ADD COLUMN IF NOT EXISTS bot_greeting text,
  ADD COLUMN IF NOT EXISTS bot_tone text,
  ADD COLUMN IF NOT EXISTS policy_shipping text,
  ADD COLUMN IF NOT EXISTS policy_payment text,
  ADD COLUMN IF NOT EXISTS policy_returns text,
  ADD COLUMN IF NOT EXISTS bot_extra_notes text,
  ADD COLUMN IF NOT EXISTS bot_use_legacy_prompt boolean NOT NULL DEFAULT false;

-- Migrar contenido legacy sin pérdida
UPDATE businesses
SET bot_extra_notes = system_prompt_custom
WHERE system_prompt_custom IS NOT NULL
  AND (bot_extra_notes IS NULL OR trim(bot_extra_notes) = '');

-- ─── FAQs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_faqs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category     text NOT NULL DEFAULT 'general',
  question     text NOT NULL,
  answer       text NOT NULL,
  sort_order   int NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(question) <= 500),
  CHECK (char_length(answer) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_business_faqs_business_active
  ON business_faqs (business_id, is_active, sort_order);

ALTER TABLE business_faqs
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce(question, '') || ' ' || coalesce(answer, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_business_faqs_fts
  ON business_faqs USING gin (search_vector);

ALTER TABLE business_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_rw_business_faqs" ON business_faqs;
CREATE POLICY "owner_rw_business_faqs" ON business_faqs
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

-- ─── Artículos de conocimiento ───────────────────────────────
CREATE TABLE IF NOT EXISTS business_knowledge_articles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category     text NOT NULL DEFAULT 'general',
  title        text NOT NULL,
  content      text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(title) <= 200),
  CHECK (char_length(content) <= 12000)
);

CREATE INDEX IF NOT EXISTS idx_business_knowledge_business_active
  ON business_knowledge_articles (business_id, is_active);

ALTER TABLE business_knowledge_articles
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_business_knowledge_fts
  ON business_knowledge_articles USING gin (search_vector);

ALTER TABLE business_knowledge_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_rw_business_knowledge" ON business_knowledge_articles;
CREATE POLICY "owner_rw_business_knowledge" ON business_knowledge_articles
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
