# Índice — Promociones y pedidos recurrentes (negocios pequeños)

> **ESTADO: PENDIENTE DE APROBACIÓN** (2026-06-26)
>
> Plan spec-driven para dos capacidades surgidas en reunión con Cruje (Oswaldo):
> 1. **Promociones / ofertas del día o de la semana**
> 2. **Pedidos recurrentes** (clientes que piden lo mismo cada semana)
>
> **Principio rector:** adaptar ideas de e-commerce **sin** la complejidad de Shopify/WooCommerce. El canal principal sigue siendo **WhatsApp + bot + dashboard simple**.

---

## 1. Contexto — qué pidió el negocio

| Tema | Ejemplo real (panadería / bodega) | Lo que **no** necesitan aún |
|---|---|---|
| Ofertas | "Pan con chicharrón a S/ 2 hoy", "Combo semanal" | Cupones, reglas de carrito, descuentos por categoría automáticos |
| Promos visibles | Cliente pregunta "¿qué ofertas tienen?" | Campañas de email, A/B testing, segmentación |
| Recurrentes | "Cada martes 2 panes integrales y 1 café" | Suscripción con cobro automático, dunning, paquetería recurrente |

Estos specs **complementan** (no reemplazan):

- `catalog-images-whatsapp-index.md` — imágenes + mensajes ricos al mostrar ofertas
- `operations-spec-v2.md` — confirmación manual de pago, entrega
- `agent-spec-v2.md` — tools del bot
- `business-types-unification-spec.md` — catálogo manual / Shopify híbrido

---

## 2. Cómo lo hace un e-commerce grande vs. nuestra adaptación

### Promociones

| E-commerce tradicional | Aynibot (propuesta simple) |
|---|---|
| Motor de reglas (%, fijo, BOGO, mínimo de compra) | **Precio promocional** opcional por producto + fechas |
| Colecciones dinámicas "Sale" | Categoría **`ofertas`** (ya existe en UI) + badge "En oferta" |
| Oferta del día en homepage | Campaña ligera: **nombre + vigencia + productos** (máx. 1 activa "destacada") |
| Cupón al checkout | **No v1** — el precio ya viene rebajado en catálogo |
| Descuento en carrito | Bot calcula total con `precio_efectivo` al crear pedido |

### Pedidos recurrentes

| E-commerce / SaaS suscripción | Aynibot (propuesta simple) |
|---|---|
| Cobro automático tarjeta / wallet | **Confirmación por WhatsApp** cada ciclo (Yape manual) |
| Frecuencia + SKU + dirección guardados | Plantilla `recurring_orders`: ítems, frecuencia, próxima fecha |
| Pausar / cancelar self-service | Cliente escribe al bot; dueño pausa en dashboard |
| Recordatorio email push | WhatsApp al **cliente** ("¿confirmas tu pedido de esta semana?") + aviso al **dueño** |
| Logística automática | Dueño confirma y crea pedido normal (`orders`) — sin inventario reservado |

---

## 3. Specs hijos

| Spec | Alcance | Complejidad |
|---|---|---|
| [`promotions-offers-spec.md`](./promotions-offers-spec.md) | Precio promo, vigencia, oferta destacada, bot + dashboard | **Baja–media** |
| [`recurring-orders-spec.md`](./recurring-orders-spec.md) | Plantillas recurrentes, recordatorios, confirmación → pedido | **Media** (sin cobro auto) |

---

## 4. Dependencias entre features

```
Catálogo base (products) ──► Promociones (precio efectivo)
        │                           │
        │                           └─► Bot: buscar_productos muestra promo
        │
        └─► Pedido normal (orders) ◄── Recurrentes (confirmación crea order)
                    │
                    └─► operations-spec-v2 (pago Yape, entrega)
```

**Orden recomendado de implementación:**

| Fase | Spec | Por qué primero |
|---|---|---|
| **P1** | Promociones — Tier 1 | Solo columnas en `products`; valor inmediato en catálogo y bot |
| **P2** | Promociones — Tier 2 | Campaña "oferta de la semana" (tabla pequeña) |
| **R1** | Recurrentes — Tier 1 | Registrar intención + plantilla manual en dashboard |
| **R2** | Recurrentes — Tier 2 | Recordatorio WhatsApp + confirmación → `crear_pedido` |
| **R3** | Recurrentes — Tier 3 | Cron diario + métricas en dashboard (opcional) |

Promociones y recurrentes **pueden implementarse en paralelo** tras P1, porque no comparten tablas.

---

## 5. Checkpoints globales (aprobar antes de codear)

| ID | Pregunta | Default propuesto |
|---|---|---|
| CP-SBC1 | ¿Cupones / códigos de descuento? | **No v1** — solo precio promo visible |
| CP-SBC2 | ¿Descuento porcentual además de precio fijo promo? | **No v1** — solo `promo_price_soles` numérico |
| CP-SBC3 | ¿Varias campañas activas a la vez? | **Sí**, pero **una sola "destacada"** para el saludo del bot |
| CP-SBC4 | ¿Recurrentes crean pedido automático sin confirmar? | **No** — siempre confirmación del cliente (WhatsApp) |
| CP-SBC5 | ¿Quién dispara el recordatorio recurrente? | **Cron diario** (Vercel Cron / Supabase pg_cron) a hora configurable por negocio |
| CP-SBC6 | ¿Aplica a catálogo Shopify? | **Sí** — promo es capa Aynibot sobre producto local; no sobrescribe precio Shopify en origen |
| CP-SBC7 | ¿Mostrar ofertas con product_list WA? | **Después** de `whatsapp-rich-messages-spec.md` Tier 1 |

---

## 6. Lo que explícitamente queda **fuera** (deferido)

Documentado en `cruje-omnichannel-deferred.md` (crear si no existe) o como nota aquí:

- Cupones, bundles configurables, "compra 2 lleva 3"
- Descuentos por volumen / mínimo de compra
- Suscripción con cobro automático (Niubiz, Mercado Pago recurrente)
- Integración con Meta Ads para promos
- Sincronizar promos hacia Shopify/Meta Catalog (manual en v1)

---

## 7. Matriz de archivos (visión global)

| Archivo | Promos | Recurrentes |
|---|---|---|
| `supabase/migrations/*_product_promotions.sql` | ✅ | — |
| `supabase/migrations/*_promotion_campaigns.sql` | Tier 2 | — |
| `supabase/migrations/*_recurring_orders.sql` | — | ✅ |
| `lib/pricing.ts` | `effectivePrice(product, now)` | — |
| `lib/promotions.ts` | helpers vigencia | — |
| `lib/recurring-orders.ts` | — | CRUD + next run date |
| `app/dashboard/catalogo/*` | campos promo en form | — |
| `app/dashboard/promociones/*` | Tier 2 UI campaña | — |
| `app/dashboard/recurrentes/*` | — | lista + pausar |
| `app/api/cron/recurring-reminders/route.ts` | — | Tier 2 |
| `lib/tools/index.ts` | buscar incluye promo | `gestionar_pedido_recurrente` |
| `lib/agent.ts` | mencionar oferta destacada | flujo confirmación |
| `lib/prompts/index.ts` | reglas "no inventar promos" | reglas recurrentes |

---

## 8. Criterios de éxito integrados

**Promociones**

- [ ] Dueño marca producto con precio promo y fecha fin → dashboard muestra precio tachado + promo
- [ ] Cliente pregunta "¿qué ofertas hay?" → bot lista productos con promo vigente (precio efectivo)
- [ ] `crear_pedido` usa precio promo si aplica; total coherente con lo que vio el cliente
- [ ] Promo vencida deja de mostrarse sin borrar datos históricos

**Recurrentes**

- [ ] Dueño registra "cada martes: 2× pan integral" para un cliente
- [ ] El martes el cliente recibe WhatsApp de confirmación; al responder "sí" se crea pedido `pending`
- [ ] Dueño puede pausar recurrente desde dashboard
- [ ] Pedido generado aparece en conversación y panel de pedidos como cualquier otro

---

## 9. Estimación orientativa (solo planificación)

| Fase | Esfuerzo | Riesgo |
|---|---|---|
| P1 Promos producto | 1–2 días | Bajo |
| P2 Campaña semanal | 1–2 días | Bajo |
| R1 Recurrente manual | 1 día | Bajo |
| R2 Recordatorio WA | 2–3 días | Medio (cron + idempotencia) |
| Integración product_list ofertas | +1 día | Depende Meta Catalog |

---

## 10. Referencias

- Reunión piloto Cruje — promos panadería, clientes de confianza semanales
- Patrón Shopify "Compare at price" / "Sale price" — inspiración, no dependencia
- Patrón suscripción WhatsApp LATAM — confirmación manual prevalece sobre cobro auto
