-- ════════════════════════════════════════════════════════════════
-- Catálogo — imágenes en Supabase Storage (archivos, no blobs en BD)
-- Solo guardamos image_storage_path (ruta en bucket); el archivo vive en Storage.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_storage_path text;

COMMENT ON COLUMN products.image_storage_path IS
  'Ruta relativa en bucket product-images, ej. {business_id}/{product_id}/main.jpg';
COMMENT ON COLUMN products.image_url IS
  'URL pública (Shopify CDN, Supabase Storage o link manual). Secundaria si image_storage_path existe.';

-- Bucket público (lectura) para thumbnails y futura integración WhatsApp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lectura pública
DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Dueño: subir solo a su carpeta {business_id}/
DROP POLICY IF EXISTS "owner_insert_product_images" ON storage.objects;
CREATE POLICY "owner_insert_product_images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_update_product_images" ON storage.objects;
CREATE POLICY "owner_update_product_images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_delete_product_images" ON storage.objects;
CREATE POLICY "owner_delete_product_images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_user_id = auth.uid()
    )
  );
