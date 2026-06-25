# Ingestión de catálogo v2 — Shopify

> Decisión de producto: el sistema **solo** soporta tiendas que corren sobre **Shopify**, vía el endpoint público `{dominio}/products.json`. No se implementa scraping de HTML genérico. Esto es deliberado, no temporal.

## Módulo `lib/shopify-ingestion.ts`

### Función principal

```ts
ingestShopifyCatalog(businessId: string, shopifyDomain: string): Promise<IngestResult>
```

- Reutilizable para cualquier negocio Shopify (no hardcodeado a Betta).
- Descarga `https://{shopifyDomain}/products.json?limit=250` (paginación si hay más).
- Mapea cada variante a una fila de `products` y hace **upsert** por `(business_id, external_id)`.

```ts
interface IngestResult {
  inserted: number
  updated: number
  needsReviewCount: number
  errors: string[]
}
```

## Mapeo Shopify → `products`

| Campo destino | Origen Shopify | Notas |
|---|---|---|
| `name` | `product.title` | — |
| `price_soles` | `variant.price` | `Number(variant.price)` |
| `talla_range` | `variant.option1` | Si es null/"Default Title" → intentar extraer de `body_html` |
| `color_o_material` | `variant.option2` | Si existe; sino null |
| `available` | `variant.available` | boolean |
| `image_url` | `product.images[0].src` | null si no hay imágenes |
| `external_id` | `` `shopify_${variant.id}` `` | Clave de upsert |
| `source` | constante `'shopify'` | — |
| `category` | constante `'retail'` | El detalle real va en talla/color/attributes |
| `needs_review` | **siempre `true`** | Sin excepción (ver abajo) |
| `attributes` | objeto con extras | Ver abajo |
| `description` | `product.body_html` (texto plano) | Se limpia HTML básico |

### `attributes` (jsonb) sugerido

```json
{
  "shopify_product_id": 123456,
  "shopify_variant_id": 789012,
  "handle": "zapatilla-x",
  "raw_option1": "38 AL 43",
  "raw_option2": "Gamuza",
  "size_parsed_from": "option1 | body_html | none"
}
```

## Estructura real de Betta (verificada)

- La mayoría de productos tienen **una sola variante** que representa un **rango** de tallas (`option1 = "38 AL 43"`).
- Shopify público solo expone `available: true/false` por variante — **no hay cantidad de stock exacta**.
- Algunos productos no usan opciones estructuradas: variante `"Default Title"` y la talla aparece como **texto libre** en `body_html` (ej. "Tallas disponibles del 39 al 43").
- Algunos productos sí tienen segunda opción (material "Gamuza", o color).

## Manejo de `option1` ausente o "Default Title"

```
si option1 es null o "Default Title":
    intentar extraer rango de body_html con regex simple:
       patrones: /del\s*(\d{2})\s*al\s*(\d{2})/i  ó  /(\d{2})\s*al\s*(\d{2})/i
    si match con confianza:
       talla_range = "{X} AL {Y}"
       attributes.size_parsed_from = "body_html"
    si no:
       talla_range = null
       attributes.size_parsed_from = "none"
       attributes.review_note = "No se pudo extraer rango de talla automáticamente"
sino:
    talla_range = option1
    attributes.size_parsed_from = "option1"
```

> **Regla absoluta**: todo lo ingerido por este script entra con `needs_review = true`, sin importar si el parseo fue exitoso o no. El dueño revisa y confirma desde `/dashboard/catalogo` (filtro `needs_review`).

## Upsert idempotente (resincronización)

- Clave: índice único `(business_id, external_id)`.
- Al correr de nuevo:
  - Variantes existentes → **UPDATE** de `price_soles`, `available`, `talla_range`, `color_o_material`, `image_url`, `name`.
  - Variantes nuevas → **INSERT**.
  - No se eliminan filas que ya no estén en Shopify (en este MVP); opcionalmente se marcan `available = false` si desaparecen (mejora futura, fuera de alcance).
- `needs_review` se vuelve a poner `true` en cada resync (el dueño revisa los cambios).

## Disparador desde la UI

- **Server Action** o **API route** `POST /api/catalog/resync` (o Server Action `resyncCatalog(businessId)`).
- Invocada desde el botón **"Resincronizar catálogo"** en `/dashboard/catalogo`.
- Solo disponible si `business.shopify_domain` está configurado.
- Protegida por sesión: el `business` debe pertenecer al `auth.uid()` actual (RLS + verificación en el handler).
- Devuelve el `IngestResult` para mostrar feedback ("X insertados, Y actualizados, Z por revisar").
- Ejecutar con el cliente service-role en el servidor (la escritura masiva no depende de RLS del usuario).

## Errores y límites

- Timeout de fetch razonable; si `products.json` falla (404, dominio inválido) → `errors` con mensaje claro, no se borra nada.
- `maxDuration` ampliado en la route si el catálogo es grande.
- Validación: `shopifyDomain` sin `https://` ni rutas; se normaliza a host.

## Criterios de aceptación

- [ ] `ingestShopifyCatalog` corre contra `www.betta-footwear.com` y crea filas con `source='shopify'`, `needs_review=true`.
- [ ] Productos con rango en `option1` guardan `talla_range` correcto.
- [ ] Productos "Default Title" intentan extraer de `body_html`; si no, `talla_range=null` + nota.
- [ ] Resync no duplica filas (upsert por `external_id`).
- [ ] Botón en el dashboard dispara el resync y muestra el resultado.
