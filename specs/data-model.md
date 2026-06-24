# Modelo de datos — Cruje

## Diagrama de relaciones

```
businesses 1───* products
businesses 1───* conversations
businesses 1───* orders
conversations 1───* messages
conversations 1───* orders
```

---

## Tabla: `businesses`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Identificador del negocio |
| `name` | `text` | NOT NULL | Nombre comercial ("Cruje") |
| `slug` | `text` | NOT NULL, UNIQUE | Slug para URLs internas |
| `description` | `text` | nullable | Descripción breve del negocio |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Fecha de creación |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Última actualización |

---

## Tabla: `products`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Identificador del producto |
| `business_id` | `uuid` | NOT NULL, FK → `businesses(id)` ON DELETE CASCADE | Negocio dueño |
| `name` | `text` | NOT NULL | Nombre del producto |
| `description` | `text` | nullable | Descripción para el catálogo |
| `category` | `text` | NOT NULL | Categoría: `panes`, `pasteleria`, `tortas`, `bebidas`, `otros` |
| `price_soles` | `numeric(10,2)` | NOT NULL, CHECK `>= 0` | Precio en soles |
| `is_custom_order` | `boolean` | NOT NULL, default `false` | `true` si requiere encargo personalizado |
| `available` | `boolean` | NOT NULL, default `true` | Disponible para venta |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Fecha de creación |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Última actualización |

---

## Tabla: `conversations`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Identificador de conversación |
| `business_id` | `uuid` | NOT NULL, FK → `businesses(id)` ON DELETE CASCADE | Negocio |
| `customer_phone` | `text` | NOT NULL | Número WhatsApp del cliente (ej. `51999888777`) |
| `customer_name` | `text` | nullable | Nombre si el cliente lo proporciona |
| `status` | `text` | NOT NULL, default `'active'` | `active` \| `closed` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Inicio de conversación |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Última actividad |

**Índice único**: `(business_id, customer_phone)` — una conversación activa por cliente y negocio.

---

## Tabla: `messages`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Identificador del mensaje |
| `conversation_id` | `uuid` | NOT NULL, FK → `conversations(id)` ON DELETE CASCADE | Conversación |
| `role` | `text` | NOT NULL | `user` \| `assistant` \| `tool` |
| `content` | `text` | NOT NULL | Contenido del mensaje |
| `tool_name` | `text` | nullable | Nombre de la tool si `role = 'tool'` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Timestamp del mensaje |

**Índice**: `(conversation_id, created_at)` — para cargar historial ordenado.

---

## Tabla: `orders`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Identificador del pedido |
| `business_id` | `uuid` | NOT NULL, FK → `businesses(id)` ON DELETE CASCADE | Negocio |
| `conversation_id` | `uuid` | NOT NULL, FK → `conversations(id)` ON DELETE CASCADE | Conversación origen |
| `status` | `text` | NOT NULL, default `'pending'` | `pending` \| `confirmed` \| `cancelled` |
| `items` | `jsonb` | NOT NULL, default `'[]'` | Array de ítems del pedido (ver esquema JSON abajo) |
| `total_soles` | `numeric(10,2)` | NOT NULL, default `0`, CHECK `>= 0` | Total en soles |
| `is_custom_order` | `boolean` | NOT NULL, default `false` | Encargo personalizado |
| `custom_order_details` | `jsonb` | nullable | Detalle de encargo (ver esquema JSON abajo) |
| `payment_status` | `text` | NOT NULL, default `'unpaid'` | `unpaid` \| `paid` |
| `delivery_status` | `text` | NOT NULL, default `'pending'` | `pending` \| `delivered` |
| `notes` | `text` | nullable | Notas internas |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Fecha del pedido |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Última actualización |

### Esquema JSON: `items`

```json
[
  {
    "product_id": "uuid",
    "name": "Pan de yema",
    "quantity": 2,
    "unit_price": 3.50
  }
]
```

### Esquema JSON: `custom_order_details`

```json
{
  "tipo": "cumpleaños",
  "tamaño": "mediana (12 porciones)",
  "fecha_entrega": "2026-07-15",
  "mensaje_en_torta": "Feliz cumple Isa",
  "notas": "Sin nueces, relleno de fresa"
}
```

---

## SQL completo (migración)

```sql
-- Cruje MVP: schema inicial
-- Migration: 00001_initial_schema.sql

-- Extensión para búsqueda de texto (opcional, útil para buscar_productos)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── businesses ───────────────────────────────────────────────
CREATE TABLE businesses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── products ─────────────────────────────────────────────────
CREATE TABLE products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  category        text NOT NULL CHECK (category IN ('panes', 'pasteleria', 'tortas', 'bebidas', 'otros')),
  price_soles     numeric(10,2) NOT NULL CHECK (price_soles >= 0),
  is_custom_order boolean NOT NULL DEFAULT false,
  available       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- ─── conversations ────────────────────────────────────────────
CREATE TABLE conversations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  customer_name  text,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, customer_phone)
);

CREATE INDEX idx_conversations_business_id ON conversations(business_id);

-- ─── messages ─────────────────────────────────────────────────
CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content         text NOT NULL,
  tool_name       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);

-- ─── orders ───────────────────────────────────────────────────
CREATE TABLE orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id      uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  items                jsonb NOT NULL DEFAULT '[]',
  total_soles          numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_soles >= 0),
  is_custom_order      boolean NOT NULL DEFAULT false,
  custom_order_details jsonb,
  payment_status       text NOT NULL DEFAULT 'unpaid'
                         CHECK (payment_status IN ('unpaid', 'paid')),
  delivery_status      text NOT NULL DEFAULT 'pending'
                         CHECK (delivery_status IN ('pending', 'delivered')),
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_business_id ON orders(business_id);
CREATE INDEX idx_orders_conversation_id ON orders(conversation_id);
CREATE INDEX idx_orders_is_custom ON orders(is_custom_order) WHERE is_custom_order = true;

-- ─── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Realtime (habilitar para dashboard) ──────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ─── RLS (MVP: lectura/escritura abierta para anon y service role) ──
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_businesses" ON businesses FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_products" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_orders" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- service_role bypassa RLS por defecto; no necesita políticas adicionales
```

---

## Datos de seed (referencia)

El seed insertará el negocio **Cruje** y al menos 8 productos:

| Producto | Categoría | Precio (S/) | Custom |
|---|---|---:|---|
| Pan de yema | panes | 3.50 | no |
| Pan francés (unidad) | panes | 1.00 | no |
| Croissant de mantequilla | pasteleria | 5.00 | no |
| Alfajor de manjar | pasteleria | 4.50 | no |
| Queque de vainilla (porción) | pasteleria | 6.00 | no |
| Empanada de pollo | otros | 4.00 | no |
| Chicha morada (vaso) | bebidas | 3.00 | no |
| Torta personalizada | tortas | 0.00 | **sí** |
