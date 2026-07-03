# Spec — Production v1 Hardening (seguro, medible, operable)

> **ESTADO: IMPLEMENTADO (2026-06-26).** Checkpoints resueltos. Ver `CHANGELOG.md`.
>
> **Metodología spec-driven.** Este documento se aprueba ANTES de tocar código.
> Objetivo: cerrar el **camino más corto y seguro** a un v1 en producción con los
> ítems acordados, **sin romper** Cruje, Betta ni los flujos actuales del agente.

---

## 1. Resumen ejecutivo

### 1.1 Qué ya está listo (no reimplementar)
- Multi-tenant por `phone_number_id`, agente con tools, handoff humano, dashboard
  (conversaciones, catálogo, perfil, pagos manuales, fecha de entrega).
- Auth email/password + magic link, RLS por dueño, catálogo propio ↔ Shopify.
- Landing v3, runbook de alta de clientes, migración `catalog_source` aplicada.

### 1.2 Alcance de ESTE spec (8 ítems acordados)

| ID | Ítem | Prioridad | Estado actual |
|---|---|---|---|
| **P0-1** | Verificación de firma webhook (`X-Hub-Signature-256`) | P0 | ❌ No implementado |
| **P0-2** | Idempotencia / deduplicación de mensajes WhatsApp | P0 | ❌ No implementado |
| **P0-6** | Tope de rondas de tool-calling (`maxToolRounds`) | P0 | ❌ Loop infinito posible |
| **P0-7** | Política de privacidad + términos (legal mínimo) | P0 | ❌ No existen páginas |
| **P1-8** | Tracking de uso OpenAI → `usage_logs` | P1 | Tabla existe; **nunca se escribe** |
| **P1-9** | Gestión de estado de pedidos desde dashboard | P1 | Solo pago + fecha entrega |
| **P1-10** | `conversations.updated_at` al recibir/responder bot | P1 | Solo se actualiza en reply manual |
| **P1-12** | Bug `modelFallbackUsed` global | P1 | Variable de módulo compartida entre requests |

### 1.3 Fuera de alcance (pendiente post-v1 o operativo manual)

Estos **no** entran en esta implementación. Siguen siendo necesarios para un v1
“completo” en sentido comercial, pero no bloquean el hardening técnico acordado:

| ID | Ítem | Notas |
|---|---|---|
| P0-3 | Ventana 24 h de WhatsApp + plantillas aprobadas | Requiere templates en Meta; fuera de código por ahora |
| P0-4 | Alta self-serve de WhatsApp para nuevos negocios | Sigue manual vía runbook |
| P0-5 | App Review / número de producción Meta | Proceso Meta, no código |
| P1-11 | Mensajes no-texto (audio, imagen, sticker) | Respuesta cortés “solo texto por ahora” (opcional fase 2) |
| P1-13 | Observabilidad (Sentry, alertas) | Recomendado pronto; no en este sprint |
| P1-14 | Rate limiting / anti-abuso | Post-v1 |
| P1-15 | Multi-negocio por usuario | Modelo 1:1 hoy |
| P1-16 | Verify token por app Meta distinta | Documentado en runbook |
| P2 | Tests E2E, CI, SEO/OG, loading skeletons, etc. | Calidad continua |

---

## 2. Principios de implementación (no romper nada)

1. **Cambios aditivos**: migraciones SQL solo agregan tablas/columnas; no se eliminan
   columnas usadas en producción.
2. **Fail-safe en tracking**: si `logUsage` falla, el cliente **sigue** recibiendo
   respuesta (igual que hoy).
3. **Webhook**: rechazar firma inválida con **403**; duplicados con **200** (Meta no
   reintenta innecesariamente).
4. **Agente**: comportamiento idéntico salvo tope de tools y fix de fallback; mismos
   modelos (`gpt-4.1-mini` → `gpt-4o-mini`).
5. **Dashboard**: acciones nuevas de pedido son **opt-in** en UI existente (`OrderCard`);
   no se mueve navegación ni rutas.
6. **Legal**: páginas estáticas en español; copy revisable por el dueño del producto.

---

## 3. P0-1 — Verificación de firma del webhook

### Problema
Cualquiera que conozca la URL `/api/webhook` puede enviar POST falsos y disparar el
agente o gastar tokens de OpenAI.

### Solución
Validar el header `X-Hub-Signature-256` de Meta antes de procesar el body.

### Variable de entorno nueva
- `WHATSAPP_APP_SECRET` — App Secret de la app de Meta (Settings → Basic).

> En multi-tenant con **varias apps Meta**, hoy todos los negocios comparten la misma
> app/webhook; un solo secret alcanza. Si en el futuro hay apps distintas, ver P1-16.

### Algoritmo (Meta Cloud API)
1. Leer el **body crudo** (`await request.text()`), no `request.json()` primero.
2. Header: `X-Hub-Signature-256: sha256=<hex>`.
3. Calcular `HMAC-SHA256(app_secret, rawBody)` en hex.
4. Comparar con **timing-safe** equality (`crypto.timingSafeEqual`).
5. Si falta header o no coincide → **403 Forbidden** (sin procesar).
6. Si OK → `JSON.parse(rawBody)` y flujo actual.

### Archivos
- `lib/webhook-signature.ts` (nuevo): `verifyMetaWebhookSignature(rawBody, signatureHeader, appSecret): boolean`
- `app/api/webhook/route.ts`: usar body crudo + verificación en POST.

### Comportamiento en desarrollo
- Si `WHATSAPP_APP_SECRET` **no está definido** en `NODE_ENV=development`, log de
  advertencia y **omitir** verificación (facilita pruebas locales).
- En **production** (`VERCEL_ENV=production` o `NODE_ENV=production`), secret
  **obligatorio**; sin él → 500 con log claro (fail closed).

### Criterios de aceptación
- [ ] POST con firma válida (Meta real o test con secret) procesa igual que hoy.
- [ ] POST sin firma o firma incorrecta → 403, sin llamadas a OpenAI.
- [ ] GET de verificación del webhook **sin cambios**.

---

## 4. P0-2 — Deduplicación de mensajes (idempotencia)

### Problema
Meta reintenta webhooks si no recibe 200 a tiempo o hay errores transitorios. Sin
dedupe, el mismo mensaje puede procesarse 2+ veces → respuestas duplicadas y pedidos
duplicados.

### Solución
Registrar el ID único del mensaje de WhatsApp (`messages[].id`, formato `wamid...`)
antes de ejecutar el agente.

### Migración SQL
`supabase/migrations/<ts>_whatsapp_message_dedupe.sql`:

```sql
CREATE TABLE IF NOT EXISTS processed_whatsapp_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  whatsapp_message_id text NOT NULL,
  processed_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_whatsapp_message_id UNIQUE (whatsapp_message_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_wa_business
  ON processed_whatsapp_messages(business_id, processed_at);
```

- `whatsapp_message_id` es **globalmente único** en Meta → constraint UNIQUE simple.
- Sin RLS (solo service-role escribe desde webhook).

### Flujo en webhook (después de P0-1)
Por cada mensaje de texto entrante:
1. Extraer `message.id` (wamid). Si no existe → log warning, procesar igual (backward compat con payloads viejos en tests).
2. `INSERT INTO processed_whatsapp_messages ... ON CONFLICT (whatsapp_message_id) DO NOTHING RETURNING id`.
3. Si **no** se insertó fila → duplicado → log `[webhook] duplicado ignorado`, **continue** (no llamar agente).
4. Si insertó → procesar con `processIncomingMessage` como hoy.

### Módulo
- `lib/webhook-dedupe.ts` (nuevo): `claimWhatsAppMessage(businessId, wamid): Promise<boolean>` — retorna `true` si es nuevo, `false` si duplicado.

### Criterios de aceptación
- [ ] Mismo `wamid` dos veces → una sola respuesta del bot.
- [ ] Mensajes distintos → procesados normalmente.
- [ ] Cruje/Betta no pierden mensajes legítimos.

---

## 5. P0-6 — Tope de rondas de tool-calling

### Problema
En `lib/agent.ts`, `generateReply()` tiene un `while (tool_calls)` **sin límite**.
Un loop del modelo puede agotar tiempo de Vercel (60s) o costo de API.

### Solución
Constante `MAX_TOOL_ROUNDS = 8` (conservador; típico flujo usa 1–3).

```ts
let toolRound = 0
while (response.choices[0]?.message?.tool_calls?.length) {
  if (++toolRound > MAX_TOOL_ROUNDS) {
    console.warn('[agent] maxToolRounds alcanzado', { conversationId, toolRound })
    break
  }
  // ... ejecutar tools como hoy
}
```

Tras el break, si no hay `content` final, devolver mensaje fijo al cliente:
*"Disculpa, necesito un momento más para revisar tu consulta. ¿Puedes repetir lo que necesitas?"*

### Archivos
- `lib/agent.ts` únicamente.

### Criterios de aceptación
- [ ] Flujos normales (buscar → crear pedido) siguen funcionando.
- [ ] Simular loop infinito (test manual o mock) termina en ≤8 rondas.
- [ ] No timeout silencioso en Vercel por loop largo.

---

## 6. P0-7 — Política de privacidad y términos de uso

### Problema
Operar en Perú con datos de clientes (teléfonos, mensajes, pedidos) requiere aviso
legal mínimo (Ley N.° 29733 — protección de datos personales) y condiciones de uso
del servicio Uru.

### Solución
Dos páginas estáticas públicas, en español, enlazadas desde la app.

### Rutas nuevas
| Ruta | Contenido |
|---|---|
| `/privacidad` | Política de privacidad |
| `/terminos` | Términos de uso del servicio |

### Contenido mínimo (honesto, sin inventar certificaciones)

**Privacidad** debe cubrir:
- Responsable del tratamiento (CHECKPOINT 1: razón social / contacto).
- Qué datos se recogen: teléfono WhatsApp, contenido de mensajes, pedidos, datos del
  negocio (catálogo, configuración).
- Finalidad: operar el agente de ventas y el dashboard para el comercio.
- Base: ejecución del servicio contratado con el negocio; interés del comercio frente
  al cliente final.
- Encargados/subprocesadores: Supabase (BD), Vercel (hosting), OpenAI (IA), Meta
  (WhatsApp Cloud API).
- Retención: mientras dure la relación comercial + plazo razonable; solicitud de
  eliminación vía contacto del responsable.
- Derechos ARCO (acceso, rectificación, cancelación, oposición) vía email de contacto.
- No venta de datos a terceros para marketing.
- Fecha de última actualización.

**Términos** debe cubrir:
- Descripción del servicio (agente WhatsApp + dashboard; no procesador de pagos).
- El comercio es responsable de precios, stock, entregas y cumplimiento frente a su cliente.
- Uso aceptable (no spam, contenido ilegal, abuso del API).
- Disponibilidad "best effort"; dependencia de Meta/OpenAI.
- Limitación de responsabilidad razonable (sin garantías de conversión/ventas).
- Modificaciones con aviso en la plataforma.
- Ley aplicable: Perú.

### Enlaces en la UI
- **Footer** de landing (`app/page.tsx`): links a `/privacidad` y `/terminos`.
- **Signup** (`app/signup/page.tsx`): texto bajo el botón — *"Al registrarte aceptas
  los [Términos](/terminos) y la [Política de privacidad](/privacidad)."*
- Opcional: footer mínimo en `AuthShell` (mismos links).

### Diseño
- Misma tipografía/tokens (`bg-background`, `text-muted`, `max-w-3xl`, prose simple).
- Sin componentes nuevos; `PageHeader` + secciones `<h2>`.

### CHECKPOINT 1 — Datos legales
Antes de publicar copy final, confirmar:
- Nombre / razón social del responsable (ej. "Uru" o persona jurídica).
- Email de contacto legal (ej. `legal@...` o el tuyo).
- ¿Incluir RUC o domicilio fiscal en el texto?

*(El spec permite implementar con placeholders `[RAZÓN SOCIAL]` y `[EMAIL LEGAL]`
reemplazables en un solo bloque de constantes `lib/legal-config.ts`.)*

### Criterios de aceptación
- [ ] Rutas públicas accesibles sin login.
- [ ] Enlaces visibles en landing y signup.
- [ ] Copy en español, coherente con lo que la app **realmente** hace hoy.

---

## 7. P1-8 — Tracking de uso OpenAI (`usage_logs`)

### Problema
El dashboard muestra "Costo estimado del mes" pero `usage_logs` **nunca recibe filas**
→ siempre `$ 0.0000`.

### Solución
Implementar `lib/usage-tracking.ts` (alineado con `usage-tracking-spec-v2.md` existente).

### API del módulo

```ts
// lib/usage-tracking.ts
export async function logUsage(params: {
  businessId: string
  conversationId?: string
  model: string
  inputTokens: number
  outputTokens: number
}): Promise<void>

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number
```

- Tabla de precios local (USD / 1M tokens):
  - `gpt-4.1-mini`: input 0.40, output 1.60
  - `gpt-4o-mini`: input 0.15, output 0.60
- Modelo desconocido → usar precios de `gpt-4o-mini` + log warning.
- Insert con service-role; **try/catch** interno — nunca propagar error al agente.

### Integración en `lib/agent.ts`
- Acumular `prompt_tokens` + `completion_tokens` de **todas** las llamadas
  `createChatCompletion` en un turno (incluidas rondas de tools).
- Tras enviar respuesta exitosa al cliente (o fallback de error), llamar **una vez**:
  `logUsage({ businessId, conversationId, model, inputTokens, outputTokens })`.
- No registrar si el turno terminó en modo `human` sin llamada a OpenAI.

### Dashboard
- Sin cambios de UI: la query existente en `app/dashboard/page.tsx` empezará a sumar
  valores reales automáticamente.

### Criterios de aceptación
- [ ] Tras un mensaje procesado por el bot, ≥1 fila en `usage_logs` con `business_id` correcto.
- [ ] Costo > 0 para conversaciones reales.
- [ ] Fallo simulado en insert no impide respuesta WhatsApp.
- [ ] Cruje y Betta acumulan por separado.

---

## 8. P1-9 — Gestión de estado de pedidos (dashboard)

### Problema
`orders.status` admite `pending | confirmed | cancelled` y `delivery_status` admite
`pending | delivered`, pero el dashboard **solo** permite fecha de entrega y confirmar
pago — no confirmar/cancelar pedido ni marcar entregado.

### Solución
Ampliar `OrderCard` y `app/dashboard/conversaciones/[id]/actions.ts`.

### Transiciones permitidas

| Campo | De | A | Acción UI |
|---|---|---|---|
| `status` | `pending` | `confirmed` | Botón "Confirmar pedido" |
| `status` | `pending` | `cancelled` | Botón "Cancelar pedido" (con confirmación) |
| `status` | `confirmed` | `cancelled` | Botón "Cancelar" (opcional, mismo action) |
| `delivery_status` | `pending` | `delivered` | Botón "Marcar entregado" (visible si `status=confirmed`) |

- No permitir `cancelled` → `confirmed` (irreversible en v1).
- `delivery_status` solo relevante tras confirmación (UI: ocultar "Marcar entregado" si `pending` o `cancelled`).

### Server Actions nuevas

```ts
export async function updateOrderStatus(formData: FormData): Promise<void>
// fields: orderId, conversationId, nextStatus: 'confirmed' | 'cancelled'
// si nextStatus === 'cancelled' → cancelReason obligatorio (non-empty)

export async function markOrderDelivered(formData: FormData): Promise<void>
// fields: orderId, conversationId
```

- Validar que el pedido pertenece al negocio del usuario (RLS).
- Validar transición permitida; si inválida, no-op silencioso + log.
- `revalidatePath` del detalle de conversación.

### UI (`conversation-client.tsx` → `OrderCard`)
- Badges con labels en español (ya parcialmente en dashboard resumen):
  - `pending` → Pendiente, `confirmed` → Confirmado, `cancelled` → Cancelado
  - `delivery_status`: Pendiente de entrega / Entregado
- Botones con `SubmitButton` existente; cancelar con estilo danger suave.
- **Cancelar:** formulario con campo **Motivo de cancelación** (`textarea`, **obligatorio**).
  Al enviar, guardar en `orders.notes` como `"Cancelado: {motivo}"` y `status = cancelled`.
  Sin motivo → error de validación en servidor y mensaje en UI.

### Agente
- `consultar_estado_pedido` ya lee `status` y `estimated_delivery_date` — seguirá
  reflejando los nuevos estados sin cambios de contrato.

### Criterios de aceptación
- [ ] Dueño puede confirmar y cancelar pedidos desde el chat.
- [ ] Dueño puede marcar entregado un pedido confirmado.
- [ ] Cliente que pregunta estado recibe texto actualizado ("confirmado", "cancelado", etc.).
- [ ] RLS impide tocar pedidos de otro negocio.

---

## 9. P1-10 — Actualizar `conversations.updated_at` en actividad del bot

### Problema
El trigger `trg_conversations_updated_at` solo corre en **UPDATE** de `conversations`,
no cuando se insertan mensajes. `saveMessage` del agente no toca la conversación →
"Conversaciones recientes" no sube al top cuando el bot responde.

### Solución (elegida: touch explícito en agente)
En `saveMessage()` (o al final de `processIncomingMessage`), después de insertar
mensaje `user` o `assistant`:

```ts
await db
  .from('conversations')
  .update({ updated_at: new Date().toISOString() })
  .eq('id', conversationId)
```

- También en modo `human` cuando solo llega mensaje user (para que el dueño vea
  conversación activa arriba).
- **No** duplicar en `sendManualReply` (ya lo hace); verificar que no haya doble update
  problemático (idempotente, OK).

### Alternativa descartada (por ahora)
Trigger en `messages` AFTER INSERT → UPDATE parent. Más automático pero afecta también
mensajes `tool`/`human_agent` con lógica extra; el touch explícito es más predecible.

### Criterios de aceptación
- [ ] Tras mensaje cliente + respuesta bot, la conversación aparece primera en dashboard.
- [ ] Orden en `/dashboard/conversaciones` coherente con última actividad.

---

## 10. P1-12 — Bug `modelFallbackUsed` global

### Problema
```ts
let modelFallbackUsed = false  // módulo global
```
En Vercel, requests concurrentes comparten estado → un fallback de la request A puede
afectar la request B dentro del loop de tools (`if (!modelFallbackUsed && ...)`).

`wasModelFallbackUsed()` no se usa en ningún otro archivo (dead export).

### Solución
1. Eliminar variable global del módulo.
2. En `generateReply`, usar variable local `let usedFallback = false`.
3. Retornar `{ reply: string, usedFallback: boolean, model: string, usage: {...} }`
   (objeto interno; no hace falta exportar `wasModelFallbackUsed` si no hay consumidores).
4. Eliminar export `wasModelFallbackUsed()` o dejarlo como deprecated que siempre retorna
   `false` — **preferido: eliminar** si grep confirma cero usos.

### Criterios de aceptación
- [ ] Dos webhooks simultáneos no comparten estado de fallback.
- [ ] Fallback de modelo sigue funcionando igual en un solo request.
- [ ] `tsc` limpio tras eliminar export.

---

## 11. Orden de implementación recomendado

Fases pequeñas, cada una verificable sin romper la anterior:

| Fase | Ítems | Riesgo |
|---|---|---|
| **A** | P1-12 (fallback local) + P0-6 (maxToolRounds) | Bajo — solo `lib/agent.ts` |
| **B** | P1-10 (updated_at) + P1-8 (usage tracking) | Bajo — agente + módulo nuevo |
| **C** | P0-2 (dedupe) — migración + webhook | Medio — probar con Meta test |
| **D** | P0-1 (firma webhook) + env `WHATSAPP_APP_SECRET` | Medio — configurar Vercel |
| **E** | P1-9 (estados pedido) — actions + UI | Bajo — dashboard |
| **F** | P0-7 (legal) — páginas + links | Bajo — estático |

Tras cada fase: `tsc`, `next build`, prueba manual webhook + un "hola" en WhatsApp.

---

## 12. Variables de entorno (resumen)

| Variable | Nueva | Uso |
|---|---|---|
| `WHATSAPP_APP_SECRET` | ✅ Sí | Firma webhook (obligatoria en production) |
| Resto existentes | — | Sin cambios |

Documentar en runbook / README interno: agregar secret en Vercel y redeploy.

---

## 13. Archivos afectados (estimado)

| Archivo | Cambio |
|---|---|
| `supabase/migrations/<ts>_whatsapp_message_dedupe.sql` | Nueva tabla dedupe |
| `lib/webhook-signature.ts` | Nuevo |
| `lib/webhook-dedupe.ts` | Nuevo |
| `lib/usage-tracking.ts` | Nuevo |
| `lib/legal-config.ts` | Nuevo (constantes legales) |
| `lib/agent.ts` | maxToolRounds, usage, updated_at, fallback fix |
| `app/api/webhook/route.ts` | Firma + dedupe + pasar wamid |
| `app/dashboard/conversaciones/[id]/actions.ts` | Order status actions |
| `app/dashboard/conversaciones/[id]/conversation-client.tsx` | Botones pedido |
| `app/privacidad/page.tsx` | Nuevo |
| `app/terminos/page.tsx` | Nuevo |
| `app/page.tsx` | Links footer legal |
| `app/signup/page.tsx` | Aceptación términos |
| `components/auth-shell.tsx` | Links legales opcionales |
| `specs/CHANGELOG.md` | Entrada post-implementación |
| `specs/production-checklist.md` | Marcar ítems completados |

---

## 14. Criterios de aceptación globales (Definition of Done v1 hardening)

- [ ] Webhook rechaza payloads no firmados en production.
- [ ] Reintentos de Meta no duplican respuestas ni pedidos.
- [ ] Agente acotado a ≤8 rondas de tools por mensaje.
- [ ] Páginas legales publicadas y enlazadas.
- [ ] Dashboard muestra costo IA del mes > 0 tras uso real.
- [ ] Dueño gestiona confirmar/cancelar/entregar pedidos.
- [ ] Conversaciones recientes ordenadas por última actividad real.
- [ ] Sin regresión: Cruje y Betta responden; handoff, catálogo y pagos manuales OK.
- [ ] `tsc` + `next build` verdes.

---

## 15. CHECKPOINTS — RESUELTOS (2026-06-26)

**CHECKPOINT 1 — Datos legales (P0-7)** ✅  
Usar **placeholders** en `lib/legal-config.ts` (`[RAZÓN SOCIAL]`, `[EMAIL LEGAL]`, etc.)
para reemplazo manual antes de producción pública.

**CHECKPOINT 2 — `WHATSAPP_APP_SECRET`** ✅  
El operador lo agregará en Vercel cuando implemente la fase D. Ver §15.1 abajo.

**CHECKPOINT 3 — Cancelar pedido** ✅  
**Motivo obligatorio**: al cancelar, el dueño debe ingresar una nota/motivo (campo
requerido). Se guarda en `orders.notes` (o columna dedicada si hace falta distinguir;
v1: append/prefix en `notes` con prefijo `"Cancelado: "` + motivo).

### 15.1 Guía: qué es `WHATSAPP_APP_SECRET` y dónde conseguirla

**Para qué sirve:** Meta firma cada POST al webhook con HMAC-SHA256 usando el **App
Secret** de tu aplicación. Tu servidor recalcula la firma y la compara con el header
`X-Hub-Signature-256`. Así solo Meta (o quien tenga el secret) puede enviar eventos
válidos a `/api/webhook`. Sin esto, cualquiera con la URL podría simular mensajes y
gastar tokens de OpenAI.

**No confundir con:**
| Variable | Para qué |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | Solo el **GET** de verificación del webhook (challenge). Lo inventas tú. |
| `WHATSAPP_TOKEN` | Enviar mensajes **salientes** por Graph API. Token del System User. |
| `WHATSAPP_APP_SECRET` | Validar que los POST **entrantes** al webhook vienen de Meta. |

**Dónde conseguirla:**
1. [developers.facebook.com](https://developers.facebook.com) → **My Apps** → tu app de WhatsApp.
2. **App settings → Basic** (Configuración básica).
3. Campo **App secret** → **Show** (puede pedir contraseña de Facebook).
4. Copiar el valor (cadena alfanumérica, ~32 caracteres).

**Dónde ponerla:**
- Local: `.env` → `WHATSAPP_APP_SECRET=tu_secret_aqui`
- Vercel: **Settings → Environment Variables** → agregar para Production (y Preview si quieres probar firmas en preview).
- **Redeploy** después de agregarla.

**Importante:** Es la misma app para Cruje y Betta si comparten una sola Meta App en
el webhook. Si cada cliente tuviera su propia Meta App distinta, haría falta un secret
por app (P1-16, fuera de alcance v1).

---

## 16. Qué quedará pendiente DESPUÉS de este spec (v1 comercial completo)

Para transparencia, tras implementar estos 8 ítems **aún faltaría** (prioridad sugerida):

1. **P0-5** — Número WhatsApp de producción + App Review Meta (operativo).
2. **P0-3** — Plantillas para mensajes fuera de ventana 24 h.
3. **P1-11** — Respuesta amable a audio/imagen ("por ahora solo texto").
4. **P1-13** — Sentry o similar para errores en webhook/agente.
5. **P1-14** — Rate limit básico en webhook por IP/negocio.
6. **P2** — Tests automatizados del webhook y agente; CI.

Con los 8 ítems de este spec tendrás un v1 **técnicamente seguro, medible y operable**
para los primeros clientes reales, asumiendo el alta manual de WhatsApp del runbook.
