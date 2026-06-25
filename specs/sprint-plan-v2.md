# Plan de implementación v2 — Multi-tenant (M1–M11)

> Spec-driven. Cada fase se implementa solo tras aprobación, fase por fase, deteniéndose en los CHECKPOINT. No se avanza a la siguiente fase sin confirmación de que la anterior funciona. Los specs v1 (sin sufijo) son fuente de verdad de lo ya existente y **no se tocan**.

## Orden y dependencias

```
M1 (esquema + alta usuarios/negocios)
  └─ M2 (ruteo multi-tenant)
       └─ M3 (prompt + tools por vertical)
            ├─ M4 (Auth + RLS + login)
            │    └─ M5 (landing + signup + onboarding)
            │         └─ M6 (dashboard: resumen, catálogo, perfil)
            │              ├─ M7 (ingestión Shopify + resync)
            │              ├─ M8 (tracking de uso)
            │              └─ M9 (handoff + entrega + pagos)
            │                   └─ M10 (onboarding real de Betta)
            │                        └─ M11 (regresión Cruje)
```

---

## M1 — Esquema multi-tenant + alta de usuarios y negocios

**Specs**: `data-model-v2.md`, `architecture-v2.md`

**Primero (antes de todo lo demás)**: alta de usuarios y vinculación de negocios.

1. Migración de esquema (`*_multitenant_schema.sql`) con todas las columnas/tablas de `data-model-v2.md`.
2. Script de seed de tenants:
   - `supabase.auth.admin.createUser` para `acgl2015@gmail.com` (Cruje) y `albertogandarillas@hotmail.com` (Betta), **magic link** (sin password).
   - **Cruje**: `UPDATE` sobre la fila existente (id `a0000000-...0001`) — set `vertical='bakery'`, `owner_user_id`, y copiar `whatsapp_phone_number_id` / `whatsapp_token` / `owner_whatsapp_number` desde las env vars actuales. No recrear.
   - **Betta**: `INSERT` nueva fila (`vertical='retail'`, `shopify_domain='www.betta-footwear.com'`, `owner_user_id`).
3. Aplicar con Supabase CLI (`db push` / ejecutar script con service-role).

**CHECKPOINT** (Supabase Auth) — antes de generar magic links, configurar Site URL + Redirect URLs + Email provider (ver `auth-dashboard-spec-v2.md`).

**Criterio de aceptación**:
- [ ] Migración aplicada sin romper datos de Cruje.
- [ ] 2 usuarios creados en Auth.
- [ ] Cruje actualizado (conserva id, productos, conversaciones, pedidos).
- [ ] Betta creado con vertical retail y shopify_domain.

---

## M2 — Ruteo multi-tenant (webhook + agente)

**Specs**: `architecture-v2.md`

1. `lib/business-resolver.ts` con `resolveBusinessFromWebhook(payload)`.
2. `app/api/webhook/route.ts`: resolver negocio por `phone_number_id`; si no hay match → log + 200.
3. `lib/agent.ts`: `processIncomingMessage(business, phone, text)` usa `business.id`.
4. `lib/whatsapp.ts`: enviar con `business.whatsapp_token` / `whatsapp_phone_number_id` (fallback a env de Cruje en transición).

**Criterio de aceptación**:
- [ ] Mensaje al número de Cruje sigue respondiendo como antes.
- [ ] El endpoint distingue negocios por `phone_number_id`.
- [ ] Un `phone_number_id` desconocido no rompe el endpoint.

---

## M3 — Prompt por plantilla + tools condicionales

**Specs**: `agent-spec-v2.md`

1. `lib/prompts/index.ts`: `VERTICAL_TEMPLATES` (bakery = texto v1 exacto; retail nuevo) + `buildSystemPrompt(business)`.
2. `lib/tools/index.ts`: `getToolsForVertical(vertical)`.
3. `buscar_productos` y `crear_pedido` con comportamiento retail (rangos de talla, talla/color como texto).
4. Cruje usa bakery sin cambios.

**Criterio de aceptación**:
- [x] Cruje: comportamiento idéntico a v1 (plantilla `bakery` = texto v1 literal, mismas tools).
- [x] Retail: comunica rangos de talla, nunca stock unitario; no tiene `iniciar_encargo_personalizado`.

**Estado**: ✅ Completado. `lib/prompts/index.ts`, `lib/tools/index.ts` creados; `lib/agent.ts` refactorizado (typecheck OK).

---

## M4 — Supabase Auth + RLS + login

**Specs**: `auth-dashboard-spec-v2.md`

1. Cliente SSR de Supabase (sesión en cookies).
2. Migración de RLS (policies por `owner_user_id`); quitar policies `anon` v1.
3. Verificar que el bot (service-role) sigue funcionando.
4. Páginas base de sesión / logout.

**Criterio de aceptación**:
- [x] Login con magic link funciona (`/login` → correo → `/auth/callback`).
- [x] RLS: cada dueño ve solo su negocio (policies por `owner_user_id`).
- [x] El bot no se ve afectado por RLS (usa service-role, bypassa RLS).

**Estado**: ✅ Completado. `@supabase/ssr` instalado; `lib/supabase/server.ts` + `lib/supabase/client.ts`; `proxy.ts` (sesión + protección `/dashboard`); `/login`, `/auth/callback`, `/auth/signout`; migración `20260624220000_rls_owner_policies.sql` aplicada; dashboard usa cliente autenticado con guard de sesión en `layout.tsx`. Build OK.
> Nota: `/auth/callback` se adelantó de M5 a M4 porque el login con magic link no es testeable sin él. M5 reutiliza este callback y añade landing/signup/onboarding.

---

## M5 — Landing + signup + callback + onboarding

**Specs**: `landing-signup-spec-v2.md`

1. `/` landing Aynibot.
2. `/signup` (signInWithOtp).
3. `/auth/callback` (exchange + redirección por negocio).
4. `/onboarding` (crear negocio).
5. `middleware.ts` de protección.

**Criterio de aceptación**:
- [x] Flujo completo: landing → signup → correo → callback → onboarding/dashboard.
- [x] Cruje y Betta entran directo a dashboard (sin onboarding).

**Estado**: ✅ Completado. `/` landing Aynibot; `/signup` (magic link); `/auth/callback` (de M4); `/onboarding` (form + Server Action `createBusiness`); `proxy.ts` protege `/dashboard` y `/onboarding`. `/login` quedó como alias → `/signup`. La redirección onboarding-vs-dashboard la resuelve el guard de `app/dashboard/layout.tsx`. Build OK.

---

## M6 — Dashboard: resumen + catálogo + perfil

**Specs**: `auth-dashboard-spec-v2.md`, `usage-tracking-spec-v2.md`

1. `/dashboard` resumen (conversaciones, pedidos, costo del mes).
2. `/dashboard/catalogo` CRUD + filtro needs_review + botón resync (condicional shopify_domain).
3. `/dashboard/perfil` editar `system_prompt_custom` y campos permitidos.

**Criterio de aceptación**:
- [x] CRUD de catálogo funciona por negocio (crear/editar/eliminar/mostrar-ocultar, filtro "Por revisar").
- [x] Perfil edita `name`, `system_prompt_custom`, `owner_whatsapp_number` y `shopify_domain` (retail); no expone reglas base ni credenciales.
- [x] Resumen muestra conversaciones y pedidos recientes, tarjetas (pendientes, del mes) y costo del mes (de `usage_logs`).

**Estado**: ✅ Completado. `lib/dashboard.ts` (`getOwnerBusiness`); `app/dashboard/layout.tsx` con nav (Resumen/Catálogo/Perfil); `/dashboard` resumen (server); `/dashboard/catalogo` (Server Actions CRUD + filtro needs_review + botón resync deshabilitado hasta M7); `/dashboard/perfil` (Server Action). Build + typecheck OK. Botón "Resincronizar" visible solo si hay `shopify_domain` pero queda **deshabilitado** hasta M7.

---

## M7 — Ingestión Shopify + botón de resync

**Specs**: `catalog-ingestion-spec-v2.md`

1. `lib/shopify-ingestion.ts` con `ingestShopifyCatalog(businessId, shopifyDomain)`.
2. Server Action / API route `resyncCatalog`.
3. Botón en `/dashboard/catalogo`.
4. Upsert por `(business_id, external_id)`, `needs_review=true`, parseo de tallas.

**Criterio de aceptación**:
- [x] Resync trae catálogo Shopify sin duplicar (upsert por `business_id,external_id`).
- [x] Tallas en rango / parseadas de body_html / null+review según el caso (validado en dry-run contra Betta: 20 `option1`, 1 `body_html`, 1 `none`).

**Estado**: ✅ Completado. `lib/shopify-ingestion.ts` (`fetchShopifyProducts`, `mapShopifyProductsToRows`, `parseSize`, `htmlToText`, `ingestShopifyCatalog`); Server Action `resyncCatalog` (verifica dueño + service-role); botón "Resincronizar catálogo" activo en `/dashboard/catalogo` con feedback (insertados/actualizados/por revisar); `maxDuration=60` en la página. Dry-run validado con `scripts/test-shopify.mjs`. La carga real del catálogo de Betta se ejecuta en **M10**.

---

## M8 — Tracking de uso

**Specs**: `usage-tracking-spec-v2.md`

1. `lib/usage-tracking.ts` (`logUsage`, `getMonthlyUsage`).
2. Integrar en `lib/agent.ts`.
3. Mostrar costo en `/dashboard`.

**Criterio de aceptación**:
- [ ] Cada mensaje registra uso por negocio.
- [ ] Fallo de tracking no rompe la respuesta.

---

## M9 — Handoff humano + fecha de entrega + confirmación de pagos

**Specs**: `operations-spec-v2.md`

1. Tool `escalar_a_humano` + lógica `mode='human'` en webhook/agente.
2. Dashboard: toggle pausar/reactivar bot + respuesta manual (`human_agent`).
3. `estimated_delivery_date` editable + en `consultar_estado_pedido`.
4. Confirmación de pago manual + `payment_note`.

**Criterio de aceptación**:
- [ ] Handoff funciona end-to-end (escala, notifica, bot calla, dueño responde).
- [ ] Fecha de entrega editable y comunicada por el agente.
- [ ] Confirmación de pago manual con nota.

---

## M10 — Onboarding real de Betta

**Specs**: `catalog-ingestion-spec-v2.md`, `architecture-v2.md`

1. Usuario crea segunda app de Meta (número de prueba nuevo) y apunta webhook a la misma URL.
2. **CHECKPOINT**: pegar/registrar `whatsapp_phone_number_id` y `whatsapp_token` de Betta (en `businesses`, no env).
3. Resync del catálogo real de Betta desde `www.betta-footwear.com`.
4. Prueba E2E: mensaje al número de Betta → responde con vertical retail.

**CHECKPOINT** (Meta + credenciales Betta) — se pedirá al llegar aquí.

**Criterio de aceptación**:
- [ ] Mensaje al número de Betta rutea a Betta y responde como retail.
- [ ] Catálogo de Betta visible en su dashboard con needs_review.
- [ ] Cruje sigue funcionando en paralelo.

---

## M11 — Regresión completa de Cruje

**Specs**: todos los v1 + `agent-spec-v2.md` (sección regresión)

1. Re-ejecutar el checklist de pruebas v1 de Cruje (saludo, catálogo, pedido, encargo personalizado, estado).
2. Verificar que el dashboard de Cruje (ahora con login) muestra sus pedidos históricos.
3. Verificar notificación al dueño en encargo personalizado.
4. Confirmar que `VERTICAL_TEMPLATES.bakery` === prompt v1.

**Criterio de aceptación**:
- [ ] Los 5 flujos de Cruje funcionan igual que antes de la migración.
- [ ] Datos históricos intactos.
- [ ] Sin regresiones de comportamiento.

---

## Tabla de archivos por fase

| Fase | Archivos nuevos/modificados |
|---|---|
| M1 | `supabase/migrations/*_multitenant_schema.sql`, script de seed de tenants |
| M2 | `lib/business-resolver.ts`, `app/api/webhook/route.ts`, `lib/agent.ts`, `lib/whatsapp.ts` |
| M3 | `lib/prompts/index.ts`, `lib/tools/index.ts`, `lib/agent.ts` |
| M4 | cliente SSR Supabase, `supabase/migrations/*_rls.sql` |
| M5 | `app/page.tsx`, `app/signup/`, `app/auth/callback/`, `app/onboarding/`, `middleware.ts` |
| M6 | `app/dashboard/page.tsx`, `app/dashboard/catalogo/`, `app/dashboard/perfil/` |
| M7 | `lib/shopify-ingestion.ts`, `app/api/catalog/resync` (o Server Action) |
| M8 | `lib/usage-tracking.ts`, `lib/agent.ts`, `app/dashboard/page.tsx` |
| M9 | `lib/tools/index.ts`, `lib/agent.ts`, `app/api/webhook/route.ts`, `app/dashboard/conversaciones/[id]/` |
| M10 | datos (Betta) + CHECKPOINT credenciales |
| M11 | — (pruebas de regresión) |
