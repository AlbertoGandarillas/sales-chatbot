# Spec — Promociones y ofertas (día / semana)

> **ESTADO: Tier 1 IMPLEMENTADO** (2026-07-02) · Tier 2 pendiente
>
> Hijo de [`small-business-commerce-index.md`](./small-business-commerce-index.md).
> Enfoque: **pequeños negocios** que anuncian ofertas por WhatsApp sin motor de descuentos complejo.

---

## 1. Problema

Hoy cada producto tiene un solo `price_soles`. El dueño no puede:

- Marcar un precio rebajado temporal ("hoy S/ 2 en vez de S/ 2.50")
- Agrupar visualmente "ofertas de la semana"
- Dejar que el bot cite promos **reales** sin inventarlas

La categoría `ofertas` en el dashboard es solo texto libre; no implica descuento ni vigencia.

---

## 2. Inspiración e-commerce (qué tomamos y qué no)

### Patrones comunes en tiendas online

| Patrón | Ejemplo Shopify/Woo | ¿Lo adoptamos? |
|---|---|---|
| Precio comparativo | ~~S/ 10~~ **S/ 8** | ✅ Tier 1 |
| Ventana de tiempo | Sale termina domingo | ✅ Tier 1 (`promo_ends_at`) |
| Colección "Ofertas" | `/collections/sale` | ✅ categoría + filtro bot |
| Campaña destacada | Banner "Semana del pan" | ✅ Tier 2 (1 campaña activa) |
| Cupón `VERANO10` | 10% al checkout | ❌ v1 |
| BOGO / 3×2 | Regla de carrito | ❌ deferido |
| Descuento por categoría | -15% en bebidas | ❌ deferido — usar campaña Tier 2 |
| Flash sale con stock reservado | Countdown + inventario | ❌ — no hay stock unitario en bakery |

### Adaptación WhatsApp (Cruje / bodega / retail pequeño)

1. El dueño configura promos en el **dashboard** (no en Meta ni Shopify).
2. El bot **solo** menciona productos cuya promo esté vigente según BD.
3. Al armar el pedido, el servidor calcula el total con **precio efectivo** — el modelo no hace matemática de descuentos.

---

## 3. Alcance por tier

### Tier 1 — Precio promocional por producto (MVP)

**Datos:** columnas nuevas en `products`.

**UX dashboard:** en formulario de producto, sección colapsable "Promoción (opcional)".

**Bot:** `buscar_productos` devuelve precio normal, precio promo (si vigente), etiqueta opcional.

**Criterio:** suficiente para "oferta del día" producto a producto.

### Tier 2 — Campaña "Oferta de la semana" (opcional, post-MVP)

**Datos:** tabla `promotion_campaigns` + relación N:M con productos.

**UX:** pantalla `/dashboard/promociones` — crear campaña, elegir productos, fechas, marcar "destacada".

**Bot:** al saludar o si preguntan ofertas generales, menciona la campaña destacada y lista sus productos.

### Tier 3 — Mensaje rico WhatsApp (dependencia externa)

Enviar ofertas como `product_list` o imagen+caption según `whatsapp-rich-messages-spec.md`. **No bloquea** Tier 1–2.

---

## 4. Modelo de datos

### Tier 1 — migración `*_product_promotions.sql`

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS promo_price_soles numeric(10,2)
    CHECK (promo_price_soles IS NULL OR promo_price_soles >= 0),
  ADD COLUMN IF NOT EXISTS promo_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_label text;

-- promo_price_soles requerido si hay fechas de promo
ALTER TABLE products
  ADD CONSTRAINT products_promo_consistency CHECK (
    (promo_price_soles IS NULL AND promo_starts_at IS NULL AND promo_ends_at IS NULL)
    OR (promo_price_soles IS NOT NULL)
  );

-- promo debe ser menor que price_soles cuando ambos existen
ALTER TABLE products
  ADD CONSTRAINT products_promo_lt_price CHECK (
    promo_price_soles IS NULL OR promo_price_soles < price_soles
  );
```

| Columna | Descripción |
|---|---|
| `promo_price_soles` | Precio durante la promo. NULL = sin promo |
| `promo_starts_at` | Inicio (NULL = desde ya, al guardar) |
| `promo_ends_at` | Fin (NULL = sin caducidad — usar con moderación en UI) |
| `promo_label` | Texto corto opcional: "Oferta del día", "Combo martes" |

**Precio efectivo** (lógica app, no columna persistida):

```typescript
function effectivePrice(product: Product, at = new Date()): {
  price: number
  compareAt: number | null
  onPromo: boolean
  promoLabel: string | null
} {
  const { price_soles, promo_price_soles, promo_starts_at, promo_ends_at, promo_label } = product
  if (promo_price_soles == null) {
    return { price: price_soles, compareAt: null, onPromo: false, promoLabel: null }
  }
  const startOk = !promo_starts_at || at >= new Date(promo_starts_at)
  const endOk = !promo_ends_at || at <= new Date(promo_ends_at)
  if (startOk && endOk) {
    return {
      price: promo_price_soles,
      compareAt: price_soles,
      onPromo: true,
      promoLabel: promo_label,
    }
  }
  return { price: price_soles, compareAt: null, onPromo: false, promoLabel: null }
}
```

Archivo propuesto: `lib/pricing.ts` (exporta `effectivePrice`).

### Tier 2 — migración `*_promotion_campaigns.sql`

```sql
CREATE TABLE promotion_campaigns (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         text NOT NULL,              -- ej. "Semana del chicharrón"
  description  text,                       -- texto libre para el bot
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL,
  is_featured  boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE promotion_campaign_products (
  campaign_id uuid NOT NULL REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, product_id)
);

-- Solo una campaña destacada activa por negocio (índice parcial)
CREATE UNIQUE INDEX uq_one_featured_campaign_per_business
  ON promotion_campaigns (business_id)
  WHERE is_featured = true;
```

> **Nota:** la promo por producto (Tier 1) y la campaña (Tier 2) pueden coexistir. El precio efectivo sigue saliendo de Tier 1; la campaña es **agrupación y copy**, no una segunda regla de precio.

---

## 5. Dashboard

### Tier 1 — formulario producto (`catalog-client.tsx`)

Campos nuevos (sección "Promoción"):

| Campo | Tipo | Validación |
|---|---|---|
| Precio promocional | number | `< price_soles`, opcional |
| Válida desde | datetime-local | opcional |
| Válida hasta | datetime-local | opcional, ≥ desde |
| Etiqueta | text | máx 40 chars |

**Lista de productos:**

- Badge **En oferta** si `effectivePrice.onPromo`
- Mostrar ~~S/ X~~ **S/ Y** en la fila

### Tier 2 — `/dashboard/promociones`

Vista simple (tabla + modal):

- Crear / editar / desactivar campaña
- Multi-select productos del catálogo
- Toggle "Destacar en WhatsApp" (`is_featured`)
- Preview texto que usará el bot

**Sin** editor WYSIWYG, sin imágenes de banner en v1 (opcional: `description` texto plano).

---

## 6. Agente y tools

### Cambios en `buscar_productos`

Resultado por producto (campos nuevos):

```json
{
  "id": "uuid",
  "name": "Pan con chicharrón",
  "price_soles": 2.50,
  "effective_price_soles": 2.00,
  "compare_at_soles": 2.50,
  "on_promo": true,
  "promo_label": "Oferta del día",
  "promo_ends_at": "2026-06-26T23:59:59-05:00"
}
```

Filtro opcional en tool (Tier 2):

```json
"solo_ofertas": {
  "type": "boolean",
  "description": "Si true, solo productos con promoción vigente o en campaña activa"
}
```

### Cambios en `crear_pedido`

- Al resolver ítems por `product_id`, usar **`effective_price_soles`** en el snapshot del pedido (`items[].unit_price_soles`).
- Guardar también `items[].compare_at_soles` y `items[].promo_label` para historial (auditoría simple).

### Prompt (`lib/prompts/index.ts`)

Bloque adicional (catálogo manual y Shopify):

```
PROMOCIONES:
- Solo menciona ofertas que aparezcan en buscar_productos con on_promo=true o en la campaña destacada del negocio.
- Muestra precio efectivo y, si hay compare_at, menciona el precio anterior.
- Si promo_ends_at está cerca, puedes decir "válido hasta …" en lenguaje natural.
- Nunca inventes descuentos ni porcentajes que no estén en los datos.
```

### Saludo proactivo (opcional Tier 2)

Si hay campaña `is_featured` vigente, el bot puede añadir una línea:

> *"Esta semana tenemos {campaign.name}: {campaign.description}. ¿Te muestro los productos?"*

Configurable: `businesses.system_prompt_custom` puede desactivar saludos promocionales.

---

## 7. Productos Shopify (`catalog_source = shopify`)

- El precio base sigue viniendo del sync Shopify (`price_soles`).
- **Promo Aynibot** es una capa local: el dueño puede poner `promo_price_soles` en productos `source='shopify'` desde el dashboard (override temporal).
- Resync Shopify **no borra** columnas promo si el producto ya existía (upsert preserva promo local — documentar en `catalog-ingestion-spec-v2.md`).

---

## 8. Casos borde

| Caso | Comportamiento |
|---|---|
| Promo expira mientras conversan | Próximo `buscar_productos` ya no muestra promo; si pedido pendiente, usar precio al momento de `crear_pedido` |
| `promo_price >= price_soles` | Rechazar en formulario (CHECK BD) |
| Producto no disponible (`available=false`) | No listar en ofertas aunque tenga promo |
| Cliente pide "10% off" | Bot explica que solo hay ofertas publicadas en catálogo |
| Encargo personalizado (`is_custom_order`) | Sin promo automática — precio se acuerda en conversación |

---

## 9. Criterios de aceptación

### Tier 1

- [x] Migración aplicada; productos existentes sin promo siguen igual
- [x] Formulario guarda promo con validación cliente + servidor
- [x] Lista catálogo muestra badge y precios tachados
- [x] `buscar_productos` incluye campos de promo
- [x] `crear_pedido` totaliza con precio efectivo
- [x] Tests unitarios `effectivePrice` (vigente, futura, expirada, sin promo)

### Tier 2

- [ ] CRUD campañas con RLS por `owner_user_id`
- [ ] Una sola campaña destacada por negocio
- [ ] Bot lista productos de campaña cuando `solo_ofertas=true`
- [ ] Dashboard promociones accesible desde nav lateral

---

## 10. Fuera de alcance (recordatorio)

- Cupones, % dinámico, bundles
- Sync promo → Meta Catalog (manual: dueño actualiza catálogo Meta si usa Tier 1 WA)
- Notificaciones push masivas "¡Nueva oferta!" a todos los clientes (deferido — requiere opt-in / plantillas Meta)
