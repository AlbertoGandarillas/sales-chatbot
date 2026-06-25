# Modelo de datos v2 — Multi-tenant

> Extiende `data-model.md` (v1). Todo es **aditivo**: columnas nuevas y tablas nuevas. Las tablas existentes (`businesses`, `products`, `conversations`, `messages`, `orders`) conservan sus columnas v1. **`orders` no cambia de esquema conceptual** — las columnas operativas nuevas (entrega, pago) se definen en `operations-spec-v2.md` pero se listan aquí para tener el cuadro completo.

## Resumen de cambios

| Tabla | Cambio |
|---|---|
| `businesses` | + `vertical`, `whatsapp_phone_number_id` (UNIQUE), `whatsapp_token`, `owner_whatsapp_number`, `system_prompt_custom`, `owner_user_id` (FK auth.users), `shopify_domain` |
| `products` | + `attributes` jsonb, `source`, `external_id`, `image_url`, `needs_review`, `talla_range`, `color_o_material`; índice UNIQUE `(business_id, external_id)` |
| `usage_logs` | **tabla nueva** |
| `conversations` | + `mode` ('bot'/'human') — ver `operations-spec-v2.md` |
| `orders` | + `estimated_delivery_date`, `payment_confirmed_at`, `payment_note` — ver `operations-spec-v2.md` |

---

## `businesses` — columnas nuevas

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `vertical` | `text` | NOT NULL, default `'bakery'`, CHECK IN (`bakery`,`retail`) | Plantilla de prompt/tools a usar |
| `whatsapp_phone_number_id` | `text` | UNIQUE, nullable | ID del número de WhatsApp (ruteo). Nullable hasta configurarse |
| `whatsapp_token` | `text` | nullable | Token de la app de Meta del negocio |
| `owner_whatsapp_number` | `text` | nullable | Número del dueño para notificaciones |
| `system_prompt_custom` | `text` | nullable | Texto libre editable por el dueño (horario, políticas, tono). No reemplaza la plantilla base |
| `owner_user_id` | `uuid` | FK → `auth.users(id)`, nullable | Dueño autenticado (Supabase Auth) |
| `shopify_domain` | `text` | nullable | Dominio Shopify para ingestión (ej. `www.betta-footwear.com`) |

---

## `products` — columnas nuevas

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `attributes` | `jsonb` | NOT NULL, default `'{}'` | Atributos flexibles por vertical |
| `source` | `text` | NOT NULL, default `'manual'` | `manual` \| `shopify` |
| `external_id` | `text` | nullable | ID externo (ej. `shopify_{variant.id}`) para upsert |
| `image_url` | `text` | nullable | Imagen principal |
| `needs_review` | `boolean` | NOT NULL, default `false` | Requiere revisión del dueño (todo lo ingerido por Shopify entra en `true`) |
| `talla_range` | `text` | nullable | Rango de tallas (ej. "38 AL 43"); retail |
| `color_o_material` | `text` | nullable | Color o material (ej. "Gamuza"); retail |

**Índice único nuevo**: `(business_id, external_id)` — permite upsert idempotente al resincronizar Shopify sin duplicar. Aplica solo cuando `external_id IS NOT NULL` (índice parcial).

> Nota: `category` sigue siendo NOT NULL con su CHECK v1 (`panes`, `pasteleria`, `tortas`, `bebidas`, `otros`). Para retail se usará la categoría `otros` y el detalle real irá en `attributes`/`talla_range`/`color_o_material`. La migración **amplía** el CHECK para incluir `retail` y deja `category` con default `'otros'` (ver SQL).

---

## `usage_logs` — tabla nueva

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | — |
| `business_id` | `uuid` | NOT NULL, FK → `businesses(id)` ON DELETE CASCADE | Negocio atribuido |
| `conversation_id` | `uuid` | FK → `conversations(id)` ON DELETE SET NULL, nullable | Conversación (si aplica) |
| `model` | `text` | NOT NULL | Modelo usado (ej. `gpt-4.1-mini`) |
| `input_tokens` | `integer` | NOT NULL, default `0` | Tokens de prompt |
| `output_tokens` | `integer` | NOT NULL, default `0` | Tokens de salida |
| `estimated_cost_usd` | `numeric(10,6)` | NOT NULL, default `0` | Costo estimado en USD |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | — |

**Índice**: `(business_id, created_at)` para agregaciones por mes.

---

## SQL completo (migración `*_multitenant_schema.sql`)

```sql
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
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
-- (orders ya está en la publicación desde v1)

-- ─── usage_logs en Realtime opcional (no requerido) ──────────
```

> El SQL de RLS (políticas por `owner_user_id`) se define en `auth-dashboard-spec-v2.md`, en su propia migración, para mantener separadas las preocupaciones.

---

## Alta de Cruje y Betta (parte de M1)

Se ejecuta vía **script de seed** (`supabase/seed-tenants.ts` o migración + script), usando `supabase.auth.admin.createUser` para los usuarios y luego SQL/SDK para vincular negocios.

### Usuarios (Supabase Auth Admin API)

| Negocio | Email | Método |
|---|---|---|
| Cruje | `acgl2015@gmail.com` | Magic link |
| Betta | `albertogandarillas@hotmail.com` | Magic link |

### Vinculación

```sql
-- Cruje: UPDATE sobre la fila existente (NO recrear)
UPDATE businesses
SET vertical = 'bakery',
    owner_user_id = '<uuid del user acgl2015>',
    whatsapp_phone_number_id = '<phone_number_id actual de Cruje>',
    whatsapp_token = '<token actual de Cruje>',
    owner_whatsapp_number = '<owner actual de Cruje>'
WHERE id = 'a0000000-0000-4000-8000-000000000001';  -- CRUJE_BUSINESS_ID

-- Betta: fila nueva
INSERT INTO businesses (name, slug, vertical, shopify_domain, owner_user_id)
VALUES ('Betta', 'betta', 'retail', 'www.betta-footwear.com', '<uuid del user albertogandarillas>');
```

> Los valores `<...>` de Cruje se toman de las env vars actuales en M1 (no se piden de nuevo). El `phone_number_id` de Betta se completa cuando el usuario cree su app de Meta (CHECKPOINT en M10).

---

## Modelo de relaciones (v2)

```
auth.users 1───* businesses (owner_user_id)
businesses 1───* products
businesses 1───* conversations
businesses 1───* orders
businesses 1───* usage_logs
conversations 1───* messages
conversations 1───* orders
conversations 1───* usage_logs
```
