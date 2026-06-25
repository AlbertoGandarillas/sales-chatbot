# Plan de implementación — Cruje MVP

Metodología: spec-driven. Cada fase se implementa siguiendo los specs en `/specs/` y solo avanza tras completar la anterior.

---

## Fase 0 — Specs ✅

**Entregables**: `architecture.md`, `data-model.md`, `agent-spec.md`, `sprint-plan.md`

**Criterio de aceptación**: Usuario revisa y aprueba los 4 archivos antes de escribir código.

---

## Fase 1 — Supabase (migraciones + cliente) ✅

**Spec de referencia**: `data-model.md`

**Archivos implementados**:
- `supabase/migrations/20250624100000_initial_schema.sql`
- `supabase/migrations/20250624100001_seed_cruje.sql`
- `lib/supabase.ts`

**Criterio de aceptación**:
- [x] Tablas creadas en Supabase remoto
- [x] Seed con Cruje y catálogo visible en dashboard de Supabase
- [x] `lib/supabase.ts` exporta ambos clientes

---

## Fase 2 — Variables de entorno completas ✅

**Archivos implementados**: `.env.local.example`

**Criterio de aceptación**:
- [x] `.env` / `.env.local` con todas las variables
- [x] `.env.local.example` en el repo (sin valores reales)
- [x] Variables copiadas a Vercel + redeploy

---

## Fase 3 — Webhook de WhatsApp ✅

**Archivos implementados**: `app/api/webhook/route.ts`

**Comportamiento implementado** (ver `CHANGELOG.md`):
- GET: verificación Meta con `.trim()` en tokens
- POST: `await processIncomingMessage()` y luego `200 OK` (no fire-and-forget)

**Criterio de aceptación**:
- [x] GET devuelve challenge cuando verify_token coincide
- [x] POST procesa mensajes y responde 200
- [x] Logs muestran número y texto extraídos

---

## Fase 4 — Cliente de WhatsApp ✅

**Archivos implementados**: `lib/whatsapp.ts`

**Configuración Meta (obligatorio)**:
- Webhook URL: `https://sales-chatbot-pink.vercel.app/api/webhook`
- Verify token: valor de `WHATSAPP_VERIFY_TOKEN`
- **Suscribir campo `messages`** en la tabla de campos del webhook (sin esto no llegan mensajes del celular)

**Criterio de aceptación**:
- [x] `sendWhatsAppMessage` envía mensajes
- [x] `notifyOwner` formatea mensajes legibles
- [x] Webhook verificado en Meta
- [x] Campo `messages` suscrito

---

## Fase 5 — Agente con OpenAI (function calling) ✅

**Archivos implementados**: `lib/agent.ts`, `package.json` (openai)

**Modelo**: `gpt-4.1-mini` (fallback `gpt-4o-mini`) — ver `CHANGELOG.md`

**Criterio de aceptación**:
- [x] Saludo responde con bienvenida de Cruje
- [x] Búsqueda de productos devuelve catálogo real
- [x] Pedido se guarda en `orders`
- [x] Encargo personalizado notifica al dueño
- [x] Consulta de estado devuelve pedidos de la conversación
- [x] Mensajes persistidos en BD

**Checklist de pruebas (celular, número de prueba Meta)**:

| # | Acción del usuario | Resultado esperado |
|---|---|---|
| 1 | "Hola" | Bienvenida de Cruje, pregunta en qué ayudar |
| 2 | "¿Qué panes tienen?" | Lista productos de categoría panes con precios |
| 3 | "Quiero 2 panes de yema y 1 alfajor" → confirmar | Pedido creado, total en S/, estado pendiente |
| 4 | "Quiero una torta de cumpleaños mediana para el 15 de julio, que diga Feliz cumple Isa" | Encargo registrado; dueño recibe WhatsApp con detalle |
| 5 | "¿Cómo va mi pedido?" | Estado del pedido (pendiente/pago/entrega) |

---

## Fase 6 — Dashboard mínimo ✅

**Archivos implementados**: `app/dashboard/page.tsx`

**Criterio de aceptación**:
- [x] Pedidos aparecen en tiempo real al crearse desde WhatsApp
- [x] Marcar pago/entrega actualiza la BD y la UI
- [x] Encargos personalizados visibles con detalle

---

## Fase 7 — Pruebas end-to-end ✅

**URL producción**: `https://sales-chatbot-pink.vercel.app`

**Criterio de aceptación**:
- [x] Flujo completo funciona en producción
- [x] Sin errores 5xx en webhook
- [x] Respuesta por WhatsApp en < 20 s

---

## Fase 8 — Checklist de migración a producción (documentación) 📋

**Archivo**: `specs/production-checklist.md` — creado, pendiente de ejecutar en producción real.

---

## Orden de dependencias

```
Fase 0 (specs)
  └─► Fase 1 (Supabase)
        └─► Fase 2 (env vars)
              ├─► Fase 3 (webhook)
              │     └─► Fase 4 (whatsapp client)
              │           └─► Fase 5 (agente)
              │                 ├─► Fase 6 (dashboard)
              │                 └─► Fase 7 (E2E)
              └─► Fase 8 (checklist, en paralelo al final)
```

---

## Archivos que se crearán por fase

| Fase | Archivos |
|---|---|
| 1 | `supabase/config.toml`, `supabase/migrations/20250624100000_*.sql`, `supabase/migrations/20250624100001_*.sql`, `lib/supabase.ts` |
| 2 | `.env.local.example` |
| 3 | `app/api/webhook/route.ts` |
| 4 | `lib/whatsapp.ts` |
| 5 | `lib/agent.ts`, `package.json` (openai) |
| 6 | `app/dashboard/page.tsx` |
| 7 | — (pruebas E2E en producción) |
| 8 | `specs/production-checklist.md` |
| docs | `specs/README.md`, `specs/CHANGELOG.md` |
