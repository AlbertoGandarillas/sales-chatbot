# Spec — Catálogo: imágenes (URL + upload Supabase + thumbnails)

> **ESTADO: PENDIENTE DE APROBACIÓN**
> **Índice:** [`catalog-images-whatsapp-index.md`](./catalog-images-whatsapp-index.md)
> **Depende de:** nada (implementable primero)

---

## 1. Estado actual

| Pieza | Estado |
|---|---|
| `products.image_url` | ✅ Existe; Shopify lo llena en ingestión |
| Formulario manual | Solo input texto URL (`catalog-client.tsx` ~156) |
| Lista catálogo | Sin miniatura (solo nombre/precio) |
| Supabase Storage | ❌ No configurado en migraciones del repo |

---

## 2. Objetivo

1. Catálogo **manual**: pegar URL **o** subir imagen a Supabase Storage.
2. **Thumbnail** en lista de productos y preview al crear/editar.
3. Regla clara cuando existen **ambos** (URL + archivo subido).

---

## 3. Modelo de datos

### 3.1 Migración `supabase/migrations/<ts>_product_images_storage.sql`

```sql
-- Columna nueva (ruta en bucket, no URL completa)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_storage_path text;

COMMENT ON COLUMN products.image_storage_path IS
  'Ruta en bucket product-images, ej. {business_id}/{product_id}/main.webp';
COMMENT ON COLUMN products.image_url IS
  'URL externa (Shopify CDN, link manual). Secundaria si image_storage_path existe.';
```

**No eliminar `image_url`:** Shopify y URLs externas siguen usándola.

### 3.2 Supabase Storage bucket

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
```

**CP-IMG1:** bucket **público** (lectura) para que Meta Catalog y WhatsApp puedan fetchear imágenes.

### 3.3 RLS Storage

Políticas en `storage.objects`:

| Operación | Quién | Condición |
|---|---|---|
| SELECT (public read) | `anon`, `authenticated` | `bucket_id = 'product-images'` |
| INSERT | `authenticated` | path prefix = `{business_id}/` del dueño |
| UPDATE / DELETE | `authenticated` | mismo prefix |

El `business_id` en path se valida contra `businesses.owner_user_id = auth.uid()`.

Path convention:

```
product-images/{business_id}/{product_id}/main.{ext}
```

Al crear producto nuevo sin `id` aún: insert fila → upload → update path (two-step) **o** upload con UUID temporal pre-generado.

---

## 4. Regla de precedencia (CP-IMG2)

Función `lib/product-image.ts`:

```typescript
export interface ProductImageFields {
  image_url: string | null
  image_storage_path: string | null
}

/** URL pública para <img>, WhatsApp y Meta Catalog. */
export function getProductImagePublicUrl(
  product: ProductImageFields,
  supabaseUrl: string
): string | null

export type ImageSource = 'storage' | 'external' | 'none'

export function resolveProductImage(product: ProductImageFields): {
  url: string | null
  source: ImageSource
}
```

| `image_storage_path` | `image_url` | **Gana** | UI badge (opcional) |
|---|---|---|---|
| ✅ | ✅ | **Storage** | "Imagen subida" |
| ✅ | ❌ | Storage | — |
| ❌ | ✅ | URL externa | "URL externa" |
| ❌ | ❌ | none | Placeholder |

**Al subir archivo nuevo:**

1. Subir a Storage.
2. Set `image_storage_path`.
3. Set `image_url` = URL pública Supabase derivada (para compat WhatsApp/Meta sin duplicar lógica).
4. **No borrar** URL externa anterior del form si el usuario la escribió — se guarda en DB pero `resolveProductImage` prioriza storage.

**Al guardar solo URL (sin file input):**

1. Si no hay archivo en request → `image_url` = valor form.
2. Si usuario **borra** upload explícitamente ("Quitar imagen subida") → delete storage object + null `image_storage_path`; vuelve a usar `image_url` si existe.

**Al re-sync Shopify:**

- Shopify overwrite `image_url` (CDN).
- **No tocar** `image_storage_path` si el dueño subió imagen manual encima (manual wins).

---

## 5. Upload — servidor

### 5.1 Límites (CP-IMG3)

- Max **2 MB**
- MIME: `image/jpeg`, `image/png`, `image/webp`
- Rechazar SVG (XSS)

### 5.2 `lib/supabase/storage.ts` (nuevo)

```typescript
export async function uploadProductImage(
  businessId: string,
  productId: string,
  file: File | Blob,
  contentType: string
): Promise<{ path: string; publicUrl: string }>

export async function deleteProductImage(path: string): Promise<void>
```

Usa **service role** en server action (validando ownership antes) o Supabase client autenticado con RLS.

### 5.3 `saveProduct` en `actions.ts`

Cambiar a soporte multipart:

```typescript
// Opción A (recomendada Next.js 15+): formData con file
const file = formData.get('image_file') as File | null
if (file && file.size > 0) {
  // validate → upload → set image_storage_path + image_url public
}
const urlInput = nullable(formData, 'image_url')
if (!file?.size && urlInput) {
  payload.image_url = urlInput
}
```

Server Action debe declarar form con `encType="multipart/form-data"` en cliente.

---

## 6. UI Dashboard

### 6.1 Componente `components/catalog/product-image-field.tsx` (nuevo)

Props: `product?: Product`, `defaultUrl`, `defaultStoragePath`

Contiene:

- Input URL (existente)
- Input file `accept="image/jpeg,image/png,image/webp"`
- **Preview** 96×96 con `resolveProductImage`
- Botón "Quitar imagen" (limpia storage + preview)
- Hint: "Si subes archivo, tiene prioridad sobre la URL."

### 6.2 Lista `catalog-client.tsx`

En cada `<article>` de producto, antes del nombre:

```tsx
<ProductThumbnail product={p} size={48} />
```

`ProductThumbnail`: placeholder gris si none; `onError` → placeholder; `loading="lazy"`.

Usar `<img>` nativo (como en `production-v1-platform-quality-spec` P2-5) — `next/image` solo si dominios Supabase en `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    // Shopify CDN patterns existentes si aplica
  ],
}
```

### 6.3 Formulario crear/editar

Reemplazar Field URL solo por `<ProductImageField />`.

---

## 7. Agente (cambio mínimo en Spec A)

`buscarProductos` ya selecciona `image_url`. Extender:

```typescript
const columns = '..., image_url, image_storage_path'
// En respuesta tool, incluir image_public_url computada por getProductImagePublicUrl
```

El bot **puede** mencionar productos con imagen en JSON; envío WA rico queda Spec B.

---

## 8. Variables de entorno

Sin nuevas obligatorias (usa `NEXT_PUBLIC_SUPABASE_URL` existente).

Opcional:

```env
PRODUCT_IMAGE_MAX_BYTES=2097152
```

---

## 9. Archivos de implementación

| Archivo | Acción |
|---|---|
| `supabase/migrations/<ts>_product_images_storage.sql` | Crear |
| `lib/product-image.ts` | Crear |
| `lib/supabase/storage.ts` | Crear |
| `app/dashboard/catalogo/actions.ts` | Multipart + upload |
| `app/dashboard/catalogo/catalog-client.tsx` | Thumbnails + form |
| `components/catalog/product-image-field.tsx` | Crear |
| `components/catalog/product-thumbnail.tsx` | Crear |
| `app/dashboard/catalogo/page.tsx` | Select `image_storage_path` |
| `lib/agent.ts` | Columnas + public URL en tool result |
| `lib/shopify-ingestion.ts` | No cambiar overwrite rules |
| `next.config.ts` | remotePatterns Supabase |

---

## 10. Criterios de aceptación

- [ ] Subir PNG manual → thumbnail en lista < 5s tras guardar
- [ ] Editar producto: preview correcto
- [ ] URL Shopify sin upload → thumbnail CDN funciona
- [ ] Producto con ambos: muestra imagen subida
- [ ] Quitar imagen subida → vuelve URL externa si había
- [ ] Archivo > 2MB → error claro en formulario
- [ ] Usuario B no puede subir a carpeta de negocio A (RLS)
- [ ] Delete producto → (opcional v1) borrar objeto storage huérfano

---

## 11. Tests (Vitest)

| Caso | Función |
|---|---|
| storage + url → storage wins | `resolveProductImage` |
| solo url | external |
| solo storage path | storage |
| neither | none |
| public URL format | `getProductImagePublicUrl` |

---

## 12. Fuera de alcance

- Resize automático / WebP conversion (nice-to-have v1.1)
- Múltiples imágenes por producto
- CDN custom fuera de Supabase
