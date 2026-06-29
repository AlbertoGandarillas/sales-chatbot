-- Idempotencia de webhooks WhatsApp: evita procesar el mismo wamid dos veces.

CREATE TABLE IF NOT EXISTS processed_whatsapp_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  whatsapp_message_id text NOT NULL,
  processed_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_whatsapp_message_id UNIQUE (whatsapp_message_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_wa_business
  ON processed_whatsapp_messages(business_id, processed_at);
