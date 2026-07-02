-- Promociones Tier 1: precio promocional opcional por producto

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS promo_price_soles numeric(10,2)
    CHECK (promo_price_soles IS NULL OR promo_price_soles >= 0),
  ADD COLUMN IF NOT EXISTS promo_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_label text;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_promo_consistency;
ALTER TABLE products
  ADD CONSTRAINT products_promo_consistency CHECK (
    (promo_price_soles IS NULL AND promo_starts_at IS NULL AND promo_ends_at IS NULL AND promo_label IS NULL)
    OR (promo_price_soles IS NOT NULL)
  );

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_promo_lt_price;
ALTER TABLE products
  ADD CONSTRAINT products_promo_lt_price CHECK (
    promo_price_soles IS NULL OR promo_price_soles < price_soles
  );

COMMENT ON COLUMN products.promo_price_soles IS 'Precio durante promoción; NULL = sin promo';
COMMENT ON COLUMN products.promo_starts_at IS 'Inicio promo (NULL = vigente desde ya)';
COMMENT ON COLUMN products.promo_ends_at IS 'Fin promo (NULL = sin caducidad)';
