# Changelog de specs — desvíos y decisiones

Registro de diferencias entre el **spec original** y la **implementación final** del MVP. Cuando un desvío se convierte en comportamiento oficial, el spec correspondiente se actualiza y esta entrada queda como historial.

---

## 2026-06-24 — Webhook: `await` en lugar de respuesta inmediata

**Spec original** (`architecture.md`, Fase 3): responder `200 OK` de inmediato y procesar el agente en background.

**Implementación real**: el webhook hace `await processIncomingMessage()` antes de responder.

**Razón**: en Vercel (plan Hobby, ~10 s de ejecución), el procesamiento en background con `after()` se cortaba antes de que OpenAI respondiera. El mensaje del usuario se guardaba en BD pero nunca llegaba la respuesta por WhatsApp.

**Decisión adoptada**: Meta tolera hasta ~20 s para el ACK del webhook; es más fiable esperar al agente. Ver `architecture.md` actualizado.

---

## 2026-06-24 — Modelo OpenAI: `gpt-4.1-mini`

**Spec original** (`agent-spec.md`, Fase 5): `gpt-5.4-mini` con fallback `gpt-4o-mini`.

**Implementación real**: `gpt-4.1-mini` como modelo principal; fallback `gpt-4o-mini`.

**Razón**: la API key del usuario no tenía acceso a `gpt-5.4-mini`. Solo `user` messages aparecían en BD; el agente fallaba en la llamada a OpenAI.

**Decisión adoptada**: usar `gpt-4.1-mini` como estándar. Ver `agent-spec.md` actualizado.

---

## 2026-06-24 — Variables `NEXT_PUBLIC_*` en el cliente

**Spec original**: no documentado.

**Implementación real**: en `lib/supabase.ts`, las variables públicas deben leerse como `process.env.NEXT_PUBLIC_SUPABASE_URL` (acceso estático), no vía `process.env[name]`.

**Razón**: Next.js solo inyecta `NEXT_PUBLIC_*` en el bundle del navegador con acceso estático. El dashboard fallaba con "Missing NEXT_PUBLIC_SUPABASE_URL".

**Decisión adoptada**: documentado en `architecture.md` bajo `lib/supabase.ts`.

---

## 2026-06-24 — Meta webhook: suscripción al campo `messages`

**Spec original**: mencionaba "campos suscritos: messages" pero no enfatizaba que sin esto no llegan mensajes.

**Implementación real**: verificación del webhook (GET) funcionaba, pero mensajes del celular no llegaban hasta suscribir `messages` en la tabla de campos del webhook.

**Decisión adoptada**: añadido como paso obligatorio en `sprint-plan.md` Fase 4/7.

---

## 2026-06-24 — Vercel: env vars + redeploy

**Spec original**: documentaba variables pero no el redeploy obligatorio.

**Implementación real**: tras agregar variables en Vercel, el webhook seguía devolviendo 403 hasta hacer **Redeploy**.

**Decisión adoptada**: documentado en `production-checklist.md` y Fase 7 del sprint plan.

---

## 2026-06-24 — Agente: mensaje de fallback en errores

**Spec original**: no documentado.

**Implementación real**: si OpenAI o el envío fallan, el agente intenta enviar un mensaje de disculpa por WhatsApp y lo guarda como `assistant` en BD.

**Decisión adoptada**: documentado en `agent-spec.md` sección "Manejo de errores".

---

## 2026-06-24 — Migraciones: nombres con timestamp

**Spec original** (`data-model.md`): `00001_initial_schema.sql`.

**Implementación real**:
- `supabase/migrations/20250624100000_initial_schema.sql`
- `supabase/migrations/20250624100001_seed_cruje.sql`

**Razón**: convención del Supabase CLI (`supabase migration new`).

**Impacto**: ninguno en el esquema; solo nombres de archivo.

---

## 2026-06-24 — ID fijo del negocio Cruje

**Implementación real**: `CRUJE_BUSINESS_ID = 'a0000000-0000-4000-8000-000000000001'` en `lib/supabase.ts`, usado en seed y agente.

**Razón**: evitar lookup por slug en cada mensaje; el MVP tiene un solo negocio.
