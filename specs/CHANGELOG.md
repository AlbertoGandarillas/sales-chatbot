# Changelog de specs — desvíos y decisiones

Registro de diferencias entre el **spec original** y la **implementación final** del MVP. Cuando un desvío se convierte en comportamiento oficial, el spec correspondiente se actualiza y esta entrada queda como historial.

---

## 2026-06-24 — M4: Supabase Auth (magic link) + RLS por dueño

**Spec** (`auth-dashboard-spec-v2.md`, `sprint-plan-v2.md` M4).

**Implementación real**:
- `@supabase/ssr` instalado. Clientes nuevos: `lib/supabase/server.ts` (cookies, Server Components/Actions/route handlers) y `lib/supabase/client.ts` (navegador). El `lib/supabase.ts` v1 (anon + service-role) se conserva para el bot/webhook.
- Sesión/protección vía `proxy.ts` (no `middleware.ts`).
- Auth: `/login` (`signInWithOtp`), `/auth/callback` (soporta `code` PKCE y `token_hash`), `/auth/signout`.
- RLS: migración `20260624220000_rls_owner_policies.sql` — quita policies `anon` v1 y crea policies `authenticated` por `owner_user_id` en `businesses/products/conversations/messages/orders` y `SELECT` en `usage_logs`.
- Dashboard: `app/dashboard/layout.tsx` (guard de sesión + barra con negocio/logout); `app/dashboard/page.tsx` migrado al cliente autenticado del navegador.

**Desvíos respecto al plan**:
- `middleware.ts` → `proxy.ts`: Next 16 deprecó la convención `middleware`; se usa `proxy` para acatar la deprecación.
- `/auth/callback` se adelantó de M5 a M4 (necesario para probar el magic link).
- El bot/webhook siguen con service-role y **no** se ven afectados por RLS.

**Impacto operativo**: el dashboard ya no es accesible sin login; el dashboard anónimo v1 queda obsoleto. Requiere desplegar el código nuevo y configurar las Redirect URLs de Auth.

---

## 2026-06-24 — M3: prompt por plantilla + tools condicionales por vertical

**Spec** (`agent-spec-v2.md`, `sprint-plan-v2.md` M3): el prompt y las tools deben elegirse según `business.vertical`.

**Implementación real**:
- `lib/prompts/index.ts`: `VERTICAL_TEMPLATES` (`bakery` = texto idéntico al system prompt v1 de Cruje; `retail` = plantilla nueva con reglas de rangos de talla). `buildSystemPrompt(business, ctx)` concatena plantilla + `system_prompt_custom` del dueño + contexto de la conversación.
- `lib/tools/index.ts`: `getToolsForVertical(vertical)`. `bakery` → `buscar_productos`, `crear_pedido`, `iniciar_encargo_personalizado`, `consultar_estado_pedido`. `retail` → `buscar_productos`, `crear_pedido` (con `talla_solicitada`/`color_solicitado`), `consultar_estado_pedido` (sin encargo personalizado).
- `lib/agent.ts`: usa `buildSystemPrompt` y `getToolsForVertical`; `buscar_productos` retorna `talla_range`/`color_o_material`/`image_url` en retail; `crear_pedido` guarda talla/color como texto en los ítems.

**Decisión adoptada**: el texto bakery se mantiene literal para no regresionar a Cruje. `escalar_a_humano` se difiere a M9 (operaciones).

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
