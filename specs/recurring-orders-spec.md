# Spec — Pedidos recurrentes (clientes habituales)

> **ESTADO: Tier 1 + Tier 2 IMPLEMENTADO** (2026-07-02) · Tier 3 pendiente
>
> Hijo de [`small-business-commerce-index.md`](./small-business-commerce-index.md).
> Enfoque: panaderías, bodegas y tiendas pequeñas con clientes que piden **lo mismo cada semana** por WhatsApp — **sin** suscripción con cobro automático.

---

## 1. Problema

Negocios como Cruje tienen clientes de confianza:

- "Todos los martes: 2 panes integrales + 1 café"
- "Cada quince días torta mediana para la oficina"

Hoy cada pedido es **ad hoc**. El dueño debe recordar manualmente o el cliente debe escribir cada vez. No hay:

- Plantilla reutilizable por cliente
- Recordatorio automático
- Trazabilidad ("este pedido vino de un recurrente")

---

## 2. Inspiración e-commerce vs. nuestra adaptación

| Modelo grande | Limitación para PYME WhatsApp | Nuestra propuesta |
|---|---|---|
| Shopify Subscriptions / Recharge | Requiere pasarela, legal, churn | Confirmación manual cada ciclo |
| "Subscribe & save" 5% | Reglas de precio | Precio del catálogo al momento de confirmar (incluye promos vigentes) |
| Ordergroove / cron + warehouse | Logística integrada | Crea fila normal en `orders` tras "sí" del cliente |
| Lista de deseos recurrente Amazon | Self-service web | Bot + dashboard dueño |
| Contrato B2B factura mensual | Fuera de scope | Solo B2C WhatsApp |

**Principio:** un recurrente es una **plantilla + calendario + recordatorio**, no un pedido mágico cobrado solo.

---

## 3. Alcance por tier

### Tier 1 — Registro manual (MVP operativo)

- Tabla `recurring_orders` con ítems, frecuencia, próxima ejecución
- Dashboard: crear / editar / pausar / cancelar
- **Sin cron:** el dueño ve "próximos hoy" y crea pedido con un clic ("Generar pedido ahora")
- Bot puede **consultar** si el cliente tiene recurrente activo (tool lectura)

**Valor:** organización interna aunque el cliente siga escribiendo a mano.

### Tier 2 — Recordatorio WhatsApp + confirmación

- Cron diario encuentra recurrentes con `next_run_on = hoy`
- Envía mensaje al **cliente** pidiendo confirmación (plantilla o texto sesión abierta)
- Si cliente confirma ("sí", "dale", "confirmo") → bot llama `crear_pedido` con ítems de la plantilla
- Notifica al **dueño** como cualquier pedido nuevo
- Avanza `next_run_on` según frecuencia

### Tier 3 — Mejoras opcionales

- Cliente pausa desde WhatsApp ("salta esta semana")
- Variación de ítems en confirmación ("igual pero 3 panes")
- Métricas dashboard: recurrentes activos, tasa de confirmación

---

## 4. Modelo de datos

### Migración `*_recurring_orders.sql`

```sql
CREATE TABLE recurring_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id   uuid REFERENCES conversations(id) ON DELETE SET NULL,
  customer_phone    text NOT NULL,
  customer_name     text,
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'paused', 'cancelled')),
  frequency         text NOT NULL
                      CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  -- Para weekly/biweekly: 0=domingo … 6=sábado (timezone negocio)
  day_of_week       smallint CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- Para monthly: día del mes 1-28 (evitar 29-31)
  day_of_month      smallint CHECK (day_of_month >= 1 AND day_of_month <= 28),
  next_run_on         date NOT NULL,
  items               jsonb NOT NULL DEFAULT '[]',
  notes               text,
  last_reminder_at    timestamptz,
  last_confirmed_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (frequency IN ('weekly', 'biweekly') AND day_of_week IS NOT NULL)
    OR (frequency = 'monthly' AND day_of_month IS NOT NULL)
  )
);

CREATE INDEX idx_recurring_orders_business_next
  ON recurring_orders (business_id, next_run_on)
  WHERE status = 'active';

CREATE INDEX idx_recurring_orders_customer
  ON recurring_orders (business_id, customer_phone);
```

### Formato `items` (igual espíritu que `orders.items`)

```json
[
  {
    "product_id": "uuid",
    "name": "Pan integral",
    "quantity": 2,
    "unit_price_soles": null
  }
]
```

`unit_price_soles` en plantilla es **opcional** — al generar pedido se resuelve con `effectivePrice()` del catálogo actual.

### Tabla puente opcional (Tier 2) — idempotencia recordatorios

```sql
CREATE TABLE recurring_order_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_order_id  uuid NOT NULL REFERENCES recurring_orders(id) ON DELETE CASCADE,
  scheduled_for       date NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'reminded', 'confirmed', 'skipped', 'expired')),
  order_id            uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_order_id, scheduled_for)
);
```

Evita enviar dos recordatorios el mismo día si el cron se ejecuta dos veces.

---

## 5. Reglas de negocio

### Frecuencias

| Valor | Significado | Cálculo next_run_on tras confirmar |
|---|---|---|
| `weekly` | Cada semana mismo día | +7 días |
| `biweekly` | Cada 2 semanas | +14 días |
| `monthly` | Mismo día del mes | +1 mes (clamp día 28) |

**Timezone:** usar `America/Lima` por defecto; futuro: columna `businesses.timezone`.

### Estados

| status | Efecto |
|---|---|
| `active` | Aparece en cron y dashboard |
| `paused` | No recordatorios; dueño reactiva |
| `cancelled` | Histórico; no cron |

### Confirmación del cliente (Tier 2)

Ventana de **24 h** desde el recordatorio:

- Respuestas afirmativas detectadas por el agente (no regex rígido en v1 — instrucción en prompt)
- Negativas: "no esta semana" → `skipped`, reprogramar `next_run_on` sin crear pedido
- Sin respuesta: `expired`, aviso al dueño, **no** crear pedido automático

### Relación con pedidos normales

Cada confirmación crea **una fila nueva** en `orders`:

```json
{
  "source": "recurring",
  "recurring_order_id": "uuid",
  "recurring_run_id": "uuid"
}
```

Campos propuestos en `orders` (migración aditiva):

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'chat'
    CHECK (source IN ('chat', 'recurring', 'manual')),
  ADD COLUMN IF NOT EXISTS recurring_order_id uuid
    REFERENCES recurring_orders(id) ON DELETE SET NULL;
```

---

## 6. Dashboard — `/dashboard/recurrentes`

### Lista

Columnas: Cliente | Resumen ítems | Frecuencia | Próximo | Estado | Acciones

Filtros: Activos | Pausados | Próximos 7 días

### Formulario crear/editar

| Campo | Notas |
|---|---|
| Cliente | Teléfono WA (prefijo +51); autocompletar conversaciones existentes |
| Ítems | Multi-select productos + cantidad (como mini-carrito) |
| Frecuencia | weekly / biweekly / monthly |
| Día | selector según frecuencia |
| Primera fecha | `next_run_on` |
| Notas internas | entrega, preferencias |

### Acciones

- **Pausar / Reactivar / Cancelar**
- **Generar pedido ahora** (Tier 1) — crea `orders` sin esperar confirmación cliente; útil si el cliente ya avisó por teléfono
- **Enviar recordatorio ya** (Tier 2, manual override)

Badge en detalle de conversación si el cliente tiene recurrente activo.

---

## 7. Agente y tools

### Nueva tool: `consultar_pedido_recurrente` (lectura)

```json
{
  "name": "consultar_pedido_recurrente",
  "description": "Consulta si este cliente tiene un pedido recurrente activo (plantilla semanal/quincenal). Usar cuando pregunte por su pedido fijo, suscripción, o 'lo de siempre'.",
  "parameters": { "type": "object", "properties": {} }
}
```

Retorna: frecuencia, ítems, próxima fecha, estado.

### Nueva tool: `confirmar_pedido_recurrente` (Tier 2)

Solo invocable cuando existe `recurring_order_runs` con `status='reminded'` para hoy y esta conversación.

```json
{
  "name": "confirmar_pedido_recurrente",
  "parameters": {
    "confirmado": { "type": "boolean" },
    "notas_cliente": { "type": "string" }
  }
}
```

Lógica servidor:

1. Validar run pendiente
2. Si `confirmado=true` → `crear_pedido` interno con ítems + marcar run `confirmed` + link `order_id`
3. Si false → run `skipped`, bump `next_run_on`

### Prompt — bloque recurrentes

```
PEDIDOS RECURRENTES:
- Algunos clientes tienen un pedido periódico configurado (consultar_pedido_recurrente).
- Si recibiste un recordatorio de confirmación hoy, interpreta "sí/dale/confirmo" como confirmación y usa confirmar_pedido_recurrente.
- Si quieren cambiar cantidades permanentemente, escala a humano o indica que el dueño actualizará la plantilla.
- Nunca prometas un pedido recurrente nuevo sin que el dueño lo configure en el sistema (escalar_a_humano para altas).
```

### Alta de nuevo recurrente vía chat

**No automático en v1.** Flujo:

1. Cliente: "Quiero lo mismo cada martes"
2. Bot recopila ítems y confirma intención
3. Bot escala a humano **o** envía notificación al dueño con resumen
4. Dueño crea la plantilla en dashboard (Tier 1)

Tier 3 opcional: tool `proponer_pedido_recurrente` que deja borrador para aprobación del dueño en dashboard.

---

## 8. Cron — `app/api/cron/recurring-reminders/route.ts`

**Schedule:** diario 07:00 `America/Lima` (configurable env `CRON_SECRET`).

Pseudoflujo:

```
FOR each business WITH active recurring_orders WHERE next_run_on = today:
  INSERT recurring_order_runs (pending) ON CONFLICT DO NOTHING
  IF run.status = pending:
    sendWhatsAppMessage(customer, template_reminder)
    UPDATE run SET status = 'reminded', recurring_orders.last_reminder_at = now()
    notifyOwner("Recordatorio enviado a {phone}")
```

Plantilla mensaje (texto sesión, v1):

> Hola {nombre} 👋 ¿Confirmas tu pedido de hoy? {resumen ítems}. Responde *sí* para confirmar o cuéntanos si quieres cambiar algo.

**Seguridad:** header `Authorization: Bearer ${CRON_SECRET}`; Vercel Cron solo en production.

---

## 9. Integración con promociones

Al confirmar recurrente, precios se calculan con `effectivePrice()` **en ese momento**. Si el pan integral está en promo esa semana, el pedido refleja el precio promo. El dueño ve el total antes de preparar (pedido `pending`).

---

## 10. Casos borde

| Caso | Comportamiento |
|---|---|
| Producto descontinuado / unavailable | Pedido se crea igual con nota; bot avisa que el equipo confirmará sustituto |
| Cliente confirma pero falta pago | Flujo normal Yape (`operations-spec-v2`) |
| Dos recurrentes mismo cliente | Permitido (ej. pan martes, torta viernes) — lista en consulta |
| Cambio de número WA | Dueño edita `customer_phone` en dashboard |
| Bot en `mode=human` | Recordatorio se envía; confirmación la toma humano o se reactiva bot |

---

## 11. Criterios de aceptación

### Tier 1

- [x] CRUD recurrentes en dashboard con RLS
- [x] "Generar pedido ahora" crea `orders` con `source='recurring'`
- [x] `consultar_pedido_recurrente` funciona en conversación de prueba
- [x] Badge en conversación si hay recurrente activo

### Tier 2

- [x] Cron idempotente; un recordatorio por run/día
- [x] Confirmación cliente crea pedido y avanza `next_run_on`
- [x] "No esta semana" marca skipped sin pedido
- [x] Sin respuesta 24h → expired + notificación dueño

### Tier 3 (opcional)

- [ ] Cliente puede preguntar "¿cuándo es mi próximo pedido?"
- [ ] Dashboard muestra tasa confirmación últimos 30 días

---

## 12. Fuera de alcance

- Cobro automático recurrente (tarjeta, Yape automático)
- Inventario reservado por adelantado
- Multi-dirección entrega por recurrente
- API pública para integraciones ERP
- Recurrentes sin confirmación ("silencioso") — explícitamente rechazado en CP-SBC4

---

## 13. Ejemplo end-to-end (Cruje)

1. **Lunes:** Oswaldo crea recurrente — cliente María, cada martes, 2× pan integral, 1× americano.
2. **Martes 07:00:** cron envía recordatorio a María.
3. **Martes 07:15:** María responde "Sí dale".
4. Bot confirma, crea pedido S/ X.XX (precio del día), notifica a Oswaldo.
5. Oswaldo prepara, confirma pago Yape como siempre.
6. `next_run_on` pasa al martes siguiente.
