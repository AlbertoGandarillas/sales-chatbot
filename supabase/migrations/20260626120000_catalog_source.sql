-- Catálogo escalable y migrable: reemplaza el `vertical` fijo por `catalog_source`
-- mutable + capacidad `supports_custom_orders`. No destructivo.

-- ─── businesses: nuevo modelo de catálogo ────────────────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS catalog_source text NOT NULL DEFAULT 'manual'
    CHECK (catalog_source IN ('manual','shopify')),
  ADD COLUMN IF NOT EXISTS supports_custom_orders boolean NOT NULL DEFAULT true;

-- Backfill desde el enum viejo (si la columna `vertical` aún existe).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'vertical'
  ) THEN
    UPDATE businesses
      SET catalog_source = CASE WHEN vertical = 'retail' THEN 'shopify' ELSE 'manual' END;
    -- Las tiendas Shopify por defecto no hacen encargos a medida.
    UPDATE businesses
      SET supports_custom_orders = false
      WHERE vertical = 'retail';
  END IF;
END $$;

-- ─── products: categoría de texto libre (catálogo propio genérico) ──
-- Se elimina el CHECK fijo de panadería para soportar cualquier rubro.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ALTER COLUMN category SET DEFAULT 'otros';

-- ─── Eliminar la columna `vertical` (reemplazada por catalog_source) ──
ALTER TABLE businesses DROP COLUMN IF EXISTS vertical;
