-- Fix M7: el upsert por (business_id, external_id) fallaba porque el índice
-- único era PARCIAL (WHERE external_id IS NOT NULL) y Postgres no lo acepta
-- como destino de ON CONFLICT inferido por columnas.
--
-- Se reemplaza por un índice único NO parcial. Los external_id NULL (productos
-- manuales) siguen permitidos porque en Postgres los NULL son distintos entre sí
-- en un índice único, así que no colisionan.

DROP INDEX IF EXISTS uq_products_business_external;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_business_external
  ON products(business_id, external_id);
