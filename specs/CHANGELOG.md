# Changelog de specs — desvíos y decisiones

Registro de diferencias entre el **spec original** y la **implementación final** del MVP. Cuando un desvío se convierte en comportamiento oficial, el spec correspondiente se actualiza y esta entrada queda como historial.

---

## 2026-07-07 — Acciones por lote en catálogo (IMPLEMENTADO)

- Modo **Seleccionar** + barra flotante: mostrar, ocultar, eliminar, marcar revisados (manual + shopify).
- **Confirmar los N por revisar** global; botón **Revisado** por tarjeta.
- Modal eliminar con token `ELIMINAR`; límite 200 ids por lote.
- Archivos: `catalog-selection-context`, `catalog-floating-bar`, `catalog-product-card`, `catalog-confirm-dialog`, `catalog-types`, actions bulk.

---

## 2026-07-07 — Acciones por lote en catálogo (spec rev. 2, pendiente)

- Alcance: **manual + shopify** (Cruje y Betta); revisión solo donde `needs_review`; lote disponible/ocultar/eliminar para todos.
- UX: modo **Seleccionar** + tarjetas (no grilla WordPress) + barra flotante inferior.
- Spec: `catalog-batch-actions-spec.md` (CB-1 a CB-3).

---

## 2026-07-06 — Acciones por lote en catálogo (spec pendiente)

- Feedback Betta: confirmar todos/selección múltiple para quitar `needs_review`; lote disponible/ocultar/eliminar.
- Spec: `catalog-batch-actions-spec.md` (CB-1 a CB-3).

---

## 2026-07-06 — Equipo, notificaciones y catálogo inline (IMPLEMENTADO)

- Migración `20260706160000_team_notifications_catalog.sql`: `business_members`, RLS por membership, `notify_new_orders`.
- Roles: `owner`, `catalog`, `operator`; invitaciones en `/dashboard/perfil` → Equipo.
- Guards en rutas, nav filtrado por rol, Server Actions con `requireOwnerRole` / `requireCatalogWrite` / `requireOpsRole`.
- TN-2: `crear_pedido` notifica por WhatsApp al dueño (toggle en perfil).
- TN-4: edición inline de precio y disponibilidad en catálogo (`patchProductQuick`).
- Spec: `team-notifications-catalog-spec.md`.


---

## 2026-07-05 — Bot Studio (BK-1 + BK-2 + BK-3)

- Migración `20260705160000_bot_studio.sql`: columnas bot en `businesses`, tablas `business_faqs` y `business_knowledge_articles`.
- `system_prompt_custom` migrado a `bot_extra_notes` (sin pérdida); `resolveExtraNotes` sigue leyendo legacy si hace falta.
- `buildSystemPrompt()` refactorizado: núcleo Uru → capacidades → config negocio → operativo → runtime.
- Defaults de tono/saludo/pagos replican comportamiento previo cuando campos vacíos.
- Dashboard `/dashboard/bot`: identidad, políticas, FAQs, artículos, reglas del sistema, vista previa.
- Tool `buscar_conocimiento_negocio` (FAQs + políticas + artículos FTS).
- Admin: campos Bot Studio + import JSON; script `scripts/import-bot-knowledge.mjs`.
- Perfil: textarea `system_prompt_custom` movido a Bot Studio.
- Spec: `bot-knowledge-spec.md`.

---

- Tokens dark: `--primary` / `--info` / `--wa-header` teal (`#00B496` / `#008f77`); sin azul sólido.
- Badges semánticos `--badge-*` (light mantiene valores previos vía `:root`).
- `ModeToggle`: `.btn-wa-header-action` (crema sobre header teal).
- Burbujas: bot `#2d524c`, humano `#3d3538` + borde rosa; `--wa-bubble-label` `#8aebd4`.
- Destructivos CP-DEST A: rosa borde/texto más visible en dark.
- Spec: `dashboard-darkmode-fixes-spec.md`.

---

## 2026-07-03 — Landing fixes (logo, CTAs, header glass)

- LF-1: SVG isotipo — U blanca, destello rosa `#F0B4AA`, sin azul.
- LF-2: `.btn-on-gradient` para CTAs sobre gradiente (texto carbón legible).
- LF-3: Header glass 92% opaco + sombra (claro y oscuro).

---

## 2026-07-03 — Rediseño visual premium Uru (paleta azul/teal/rosa)

- Tokens v4 en `app/globals.css` (reemplazo total esmeralda).
- Modo claro + oscuro (`data-theme`, `ThemeToggle`, persistencia localStorage).
- Landing premium: header glass flotante, hero gradiente + glows, `.premium-card`, CTAs cápsula.
- Dashboard app-like: isotipo Uru, nav limpio, métricas simples, Geist intacto.
- Logo SVG recoloreado; botón destructivo rosa (CP-D1).
- Spec: `redesign-premium-uru-spec.md`.

---

## 2026-07-03 — Observabilidad custom + consola admin (R0–R2)

- Eliminado `@sentry/nextjs`; errores en tabla `error_logs` vía `lib/observability.ts`.
- Migración `20260703120000_platform_admin_observability.sql` (`error_logs`, `platform_admins`, `admin_audit_logs`, RLS admin).
- Panel `/admin`: login, overview, errores, negocios (general + WhatsApp).
- Bootstrap admin: `supabase/bootstrap-platform-admin.sql`.

---

## 2026-07-03 — Specs pendientes: observabilidad custom + consola admin

**Specs nuevos (PENDIENTE APROBACIÓN):**

- `observability-custom-spec.md` — reemplazar Sentry por tabla `error_logs` en Supabase.
- `admin-console-spec.md` — panel `/admin` con login propio, gestión negocios (WA creds), errores, usage, soporte.
- `admin-console-index.md` — índice.

**Decisión propuesta:** eliminar `@sentry/nextjs` en fase R0; UI admin en fases R1–R5.

---

## 2026-07-03 — Hardening P1/P0 parcial (rate limit, no-texto, 24h, Sentry, landing)

- **P1-5** `lib/rate-limit.ts`: límite inbound/min y respuestas bot/hora (env opcional).
- **P1-2** Webhook + `handleNonTextInbound`: respuesta cortés; placeholder en chat.
- **P0-3** `lib/whatsapp-session*.ts`: ventana 24h; bloqueo proactivo en reply manual y recordatorios recurrentes (`skipped`); error Meta 131047.
- **P1-4** Sentry opcional vía `SENTRY_DSN` + `instrumentation.ts`.
- **P1-1** Landing: copy dashboard sin “costo IA” (`usage_logs` intacto).

---

**Spec:** `rebranding-uru-spec.md`, `design-system-v3-uru.md`.

- Marca **Uru** (wordmark `uru`, tagline "Vende sin parar").
- Tokens esmeralda/azul/amarillo en `app/globals.css`; gradientes cítrico/fresco/venta.
- Nunito en landing/marca; Geist intacto en dashboard.
- Componente `components/brand/uru-logo.tsx` + `public/brand/uru-isotipo.svg` (brandbook v3).
- Chat conversación: tokens `--wa-*` alineados a paleta Uru.
- Legal: `companyName: 'Uru'`.

---

**Spec:** `recurring-orders-spec.md`. Migración `20260629120000_recurring_orders.sql`,
dashboard `/dashboard/recurrentes`, tools bot, cron `/api/cron/recurring-reminders`,
`vercel.json` cron 12:00 UTC (7:00 Lima). Requiere `CRON_SECRET` en producción.

---

## 2026-07-02 — Promociones Tier 1 (precio promo por producto)

**Spec:** `promotions-offers-spec.md`. Migración `20260628120000_product_promotions.sql`,
`lib/pricing.ts`, formulario catálogo, bot (`buscar_productos` + `crear_pedido`), tests.

---

## 2026-06-26 — Promociones y pedidos recurrentes (negocios pequeños)

**Índice:** `small-business-commerce-index.md`. Specs hijos:
`promotions-offers-spec.md` (precio promo + campaña semanal),
`recurring-orders-spec.md` (plantillas + recordatorio WA sin cobro auto).
**Sin código aún** — pendiente aprobación checkpoints CP-SBC1–7.

---

## 2026-06-26 — Catálogo imágenes + mensajes ricos WhatsApp

**Índice:** `catalog-images-whatsapp-index.md`. Upload Supabase, thumbnails dashboard,
mensajes nativos WA (product_list + ORDER). **Sin código aún.**

---

## 2026-06-26 — Production v1 hardening (P0-1, P0-2, P0-6, P0-7, P1-8/9/10/12)

**Spec** (`production-v1-hardening-spec.md`). Camino corto a v1 seguro, medible y
operable. Checkpoints: placeholders legales, motivo obligatorio al cancelar pedido.

- **P0-1 Firma webhook**: `lib/webhook-signature.ts` + body crudo en POST; obligatorio
  en production con `WHATSAPP_APP_SECRET`.
- **P0-2 Dedupe**: tabla `processed_whatsapp_messages` + `lib/webhook-dedupe.ts`.
- **P0-6 maxToolRounds**: tope 8 en `lib/agent.ts`.
- **P0-7 Legal**: `/privacidad`, `/terminos`, `lib/legal-config.ts` (placeholders),
  links en landing y signup.
- **P1-8 Usage**: `lib/usage-tracking.ts` → `usage_logs` tras cada turno del bot.
- **P1-9 Pedidos**: confirmar, cancelar (motivo obligatorio), marcar entregado en
  `OrderCard`.
- **P1-10 updated_at**: `touchConversation` en `saveMessage`.
- **P1-12 Fallback bug**: variable local por request; eliminado `wasModelFallbackUsed`.

---

## 2026-06-26 — Catálogo escalable y migrable (catalog_source) — Fase 1

**Spec** (`business-types-unification-spec.md`). Se reemplaza el `vertical` fijo
(`bakery`/`retail`) por un **origen de catálogo mutable** + capacidad, para que un
negocio pueda **empezar con catálogo propio y migrar a Shopify** sin rehacer cuenta ni
WhatsApp. Decisiones aprobadas: 1(a), 2(a), 3(a), 4(a), 5(a).

- **DB** (`20260626120000_catalog_source.sql`, no destructiva): nueva columna
  `businesses.catalog_source ∈ {manual, shopify}` (default `manual`) + flag
  `supports_custom_orders`; backfill desde `vertical` (`retail→shopify`); se relaja el
  `CHECK` de `products.category` (texto libre); se **elimina** la columna `vertical`.
- **Modelo**: el origen del catálogo es **mutable**; las variantes (talla/color) pasan
  a ser **atributos de producto** disponibles para todos; catálogo **híbrido** vía
  `products.source`.
- **Migración manual→Shopify**: el dueño agrega su dominio en Perfil y al
  **Resincronizar** el catálogo el negocio pasa a `catalog_source='shopify'`; los
  productos manuales se conservan.
- **Agente**: prompt genérico para catálogo propio + prompt Shopify, seleccionados por
  `catalog_source`; encargos a medida por `supports_custom_orders`; `getToolsFor()`
  arma las tools por configuración. `buscar_productos` siempre devuelve columnas de
  variante.
- **Dashboard**: onboarding ("Catálogo propio" / "Tienda Shopify"), perfil (sección
  "Origen del catálogo" + conectar Shopify + toggle encargos), catálogo (categoría de
  texto libre, variantes opcionales para todos, botón resync por origen).
- **Landing**: copy "Negocios con catálogo propio (panaderías, bodegas, tiendas…)" +
  "Tiendas Shopify"; mensaje de escalabilidad y FAQ de migración.
- **Scripts/specs**: `seed/verify/check` y runbook actualizados a `catalog_source`.

Verificado: `tsc` + `next build` verdes; migración aplicada (Cruje=`manual`,
Betta=`shopify`) sin pérdida de datos. Cruje y Betta operan igual.

---

## 2026-06-25 — Landing v3 (ampliación expositiva, sin cambios de lógica)

**Spec** (`landing-page-v3-spec.md`). Ampliación del landing existente conservando
hero, CTA final y footer. Contenido 100% verificable contra el inventario real de
funcionalidades (sin cifras, testimonios ni integraciones inexistentes).

- **Secciones nuevas en `app/page.tsx`**: "Cómo funciona" (4 pasos), "Funcionalidades"
  (grid de 6 `Card` con badges de categoría), "Casos de uso" enriquecido (Cruje /
  Betta nombrados como negocios reales, sin cifras), "Para qué negocios es" (con nota
  honesta de alcance) y "Preguntas frecuentes" (acordeón).
- **Header**: anclas de navegación (`#como-funciona`, `#funcionalidades`, `#faq`)
  visibles en `md+`, header sticky con `backdrop-blur`; secciones con `scroll-mt`.
- **Componente nuevo** `components/ui/accordion.tsx`: `Accordion`/`AccordionItem`
  nativos (`<details>`/`<summary>`), accesibles por teclado, mismos tokens y radio;
  exportado en `components/ui/index.ts`.
- **Decisiones de contenido (checkpoints)**: precios abiertos ("Conversemos y armamos
  un plan a tu medida", sin tiers); anclas activadas; Cruje y Betta nombrados.

Solo presentación: sin migraciones, rutas, datos ni cambios de comportamiento.

---

## 2026-06-25 — Rediseño UI/UX (design system, sin cambios de lógica)

**Spec** (`design-system-v2.md`). Mejora visual integral manteniendo intactos
lógica, contratos, rutas y flujos. **Aclaración**: la app no usaba shadcn/ui (solo
Tailwind v4 + clases sueltas); se introdujo una capa de primitivos propia.

- **F0 Fundaciones**: `app/globals.css` con tokens semánticos (`:root` + `@theme`),
  acento **terracota**; `html lang="es"` (fix WCAG 3.1.1); foco visible global
  (`:focus-visible`), `::placeholder` AA y `prefers-reduced-motion`.
- **F1 Primitivos** (`components/ui/`, sin deps nuevas): `Button`, `Card`, `Badge`
  (con `dot`), `Input`/`Textarea`, `Field`/`Label`, `Alert` (`aria-live`),
  `EmptyState`, `Skeleton`, `PageHeader`; util `lib/cn.ts`.
- **F2 Chrome**: `dashboard/layout.tsx` con marca + `DashboardNav` (estado activo,
  `aria-current`); `AuthShell` compartido.
- **F3 Pantallas migradas a tokens/primitivos**: login, signup, forgot/reset,
  onboarding, perfil (+ cambio de contraseña), dashboard resumen (métricas, empty
  states), catálogo (chips con `aria-pressed`, formularios, badges), conversaciones
  (lista + chat; se conserva a propósito el look WhatsApp del hilo), y landing
  (hero premium; copy de "sin contraseñas" corregido a email+password).
- **F4**: auditoría a11y (contraste, foco, estados no solo color, mensajes con
  `role`/`aria-live`) + `tsc` y `next build` verdes.

Sin migraciones ni cambios de comportamiento.

---

## 2026-06-25 — M9: Handoff humano + fecha de entrega + pagos + detalle de conversación

**Spec** (`operations-spec-v2.md`). Las columnas (`conversations.mode`,
`orders.estimated_delivery_date`, `orders.payment_confirmed_at`,
`orders.payment_note`, rol `human_agent`) ya existían desde la migración M1, así
que **no hizo falta migración nueva**.

**Handoff a humano**:
- Tool `escalar_a_humano(motivo)` añadida a ambos verticales (`lib/tools/index.ts`).
- `lib/agent.ts`: handler `escalarAHumano` → `UPDATE conversations SET mode='human'`,
  `notifyOwner(motivo, cliente, conversación)` y devuelve al modelo la instrucción
  de avisar al cliente (el bot nunca queda en silencio en ese turno).
- `getOrCreateConversation` ahora devuelve `{ id, mode }`. En
  `processIncomingMessage`, si `mode==='human'` el mensaje del cliente se guarda
  pero **el bot no responde** (lo atiende el dueño desde el dashboard).

**Fecha de entrega**:
- `consultar_estado_pedido` incluye `estimated_delivery_date`.
- Instrucción operativa agregada en `buildSystemPrompt` (común a ambos verticales,
  **sin tocar el texto literal de `BAKERY_TEMPLATE`** para preservar la regresión de
  Cruje): comunica la fecha si existe, no inventarla si no.

**Detalle de conversación (estilo WhatsApp)** — pedido del usuario:
- `/dashboard/conversaciones`: lista de todas las conversaciones del negocio (RLS).
- `/dashboard/conversaciones/[id]`: vista de chat con burbujas (entrante blanco a la
  izquierda; bot verde claro y `human_agent` verde a la derecha), encabezado verde,
  toggle **Pausar bot / Devolver al bot**, caja de respuesta manual (solo en modo
  humano) que envía por WhatsApp con las credenciales del negocio y guarda el mensaje
  como `human_agent`, y panel lateral de **pedidos** con fecha de entrega editable y
  **Confirmar pago** + `payment_note`.
- Server Actions en `[id]/actions.ts` (`toggleMode`, `sendManualReply`,
  `setDeliveryDate`, `confirmPayment`), todas RLS-scoped al dueño autenticado.
- Nav del dashboard con enlace "Conversaciones"; las conversaciones y pedidos
  recientes del resumen ahora enlazan al detalle.

Build + typecheck OK.

---

## 2026-06-25 — Fix M7 (upsert) + Accesibilidad WCAG 2 AA

**Bug resync catálogo.** Al pulsar "Resincronizar catálogo" fallaba con
`there is no unique or exclusion constraint matching the ON CONFLICT specification`.
Causa: el índice `uq_products_business_external` era **parcial**
(`WHERE external_id IS NOT NULL`) y Postgres no lo acepta como destino de
`ON CONFLICT (business_id, external_id)` inferido por columnas.

- Migración `20260625120000_products_unique_external_full.sql`: reemplaza el
  índice por uno **no parcial** sobre `(business_id, external_id)`. Los productos
  manuales con `external_id NULL` siguen permitidos (los NULL son distintos entre
  sí en un índice único de Postgres). Aplicada con `supabase db push`.

**Accesibilidad (contraste de texto).** Reportado por test de contraste.

- `text-stone-400` (~2.5:1 sobre blanco, falla) y `text-stone-500` → `text-stone-600`
  (~7:1, pasa AA/AAA) en todos los componentes: landing, login, signup,
  forgot/reset password, onboarding, dashboard (resumen, catálogo, perfil, layout).
- `globals.css`: `::placeholder` con color fijo `#78716c` (≥4.5:1) y se quitó el
  override `prefers-color-scheme: dark` que ponía texto claro sobre superficies
  blancas (la app es de tema claro).
- Colores de estado (`text-red-600` 4.8:1, `text-green-700` 4.9:1,
  `bg-amber-100/text-amber-800`) ya cumplían AA y se mantienen.

---

## 2026-06-25 — Auth: login email+password (magic link pasa a opcional)

**Cambio de alcance pedido por el usuario.** El spec v2 definía solo magic link; ahora el método principal es **email + contraseña**, con magic link como alternativa.

**Implementación real**:
- `/login`: `signInWithPassword` + toggle "Entrar con enlace mágico" (`signInWithOtp`) + enlace a recuperación.
- `/signup`: registro con `signUp` (email+password, valida confirmación y longitud) + toggle magic link. Si el proyecto no exige confirmación de correo, entra directo a `/onboarding`; si la exige, muestra "revisa tu correo".
- `/forgot-password`: `resetPasswordForEmail` con `redirectTo=/auth/callback?next=/reset-password`.
- `/reset-password`: `updateUser({ password })` (requiere sesión de recovery; protegida por proxy).
- `/dashboard/perfil`: sección "Seguridad" con `ChangePasswordForm` (`updateUser({ password })`).
- `proxy.ts`: rutas protegidas → redirigen a `/login` (antes `/signup`); protege también `/reset-password`; authenticated en `/login`/`/signup` → `/dashboard`.
- `/auth/callback` (de M4) ya cubre `code` y `token_hash` (incluye `type=recovery`), así que sirve para magic link y para el enlace de reseteo.
- Landing: "Iniciar sesión" → `/login`; "Crear cuenta" → `/signup`.

**Datos de prueba**: `scripts/set-passwords.mjs` asignó la contraseña **`password2026`** a `acgl2015@gmail.com` (Cruje) y `albertogandarillas@hotmail.com` (Betta), mismos correos.

**Nota**: para registro instantáneo sin confirmar correo, en Supabase → Authentication → Providers → Email se puede desactivar "Confirm email". El rate limit del correo integrado sigue aplicando al magic link y a los correos de confirmación/reseteo (se mitiga con SMTP propio).

---

## 2026-06-25 — M7: Ingestión Shopify + resync

**Spec** (`catalog-ingestion-spec-v2.md`).

**Implementación real**:
- `lib/shopify-ingestion.ts`: `fetchShopifyProducts(domain)` (pagina `/products.json?limit=250`), `mapShopifyProductsToRows` (pura), `parseSize` (option1 → body_html → none), `htmlToText`, e `ingestShopifyCatalog(businessId, domain)` que clasifica insert/update y hace **upsert por `(business_id, external_id)`** con service-role. Todo entra con `needs_review=true`.
- Server Action `resyncCatalog` en `app/dashboard/catalogo/actions.ts`: obtiene el negocio del dueño (RLS), exige `shopify_domain`, ejecuta la ingestión y devuelve `IngestResult`.
- Botón "Resincronizar catálogo" activado (antes deshabilitado en M6), con feedback "X nuevos · Y actualizados · Z por revisar". `maxDuration=60` en la página.
- `scripts/test-shopify.mjs`: dry-run de validación (no escribe BD).

**Validación con datos reales** (Betta, pág. 1: 22 variantes): 20 con rango en `option1`, 1 extraído de `body_html`, 1 sin rango (`null` + nota de revisión). Confirma los 3 caminos del spec.

**Nota de alcance**: M7 construye y valida la capacidad sin poblar la BD de Betta; la **carga real** del catálogo de Betta es **M10**.

---

## 2026-06-24 — M6: Dashboard (resumen + catálogo + perfil) + limpieza

**Spec** (`auth-dashboard-spec-v2.md`).

**Implementación real**:
- `lib/dashboard.ts` → `getOwnerBusiness()` (lee la fila del dueño vía RLS).
- `app/dashboard/layout.tsx`: barra con negocio/vertical/logout + nav (Resumen / Catálogo / Perfil).
- `/dashboard` (resumen, server): tarjetas (pedidos pendientes, pedidos del mes, costo del mes desde `usage_logs`) + conversaciones recientes (con `mode` bot/humano) + pedidos recientes. Todo de solo lectura.
- `/dashboard/catalogo`: tabla + Server Actions `saveProduct`/`deleteProduct`/`toggleAvailable`. Crear/editar con formulario por vertical (bakery: categoría + encargo; retail: `talla_range`/`color_o_material`/`image_url`). Filtro "Por revisar" (`needs_review`); al guardar se pone `needs_review=false`.
- `/dashboard/perfil`: Server Action `updateProfile` (edita `name`, `system_prompt_custom`, `owner_whatsapp_number`, y `shopify_domain` solo en retail). No expone reglas base ni credenciales WhatsApp.

**Desvíos respecto al plan**:
- El `/dashboard` v1 era un panel client realtime con acciones de pago/entrega; se reemplazó por el **resumen** de M6. Las acciones de pago/entrega se reconstruyen en **M9** (operaciones).
- El botón "Resincronizar catálogo" se muestra solo si hay `shopify_domain` pero queda **deshabilitado** hasta **M7** (cuando exista `ingestShopifyCatalog`).
- Limpieza solicitada: se eliminaron `app/supabase-demo/`, `lib/db-service.ts` y los SVG por defecto de create-next-app en `public/`. (Tras borrar la demo hubo que limpiar `.next` por tipos generados obsoletos.)

---

## 2026-06-24 — M5: Landing Aynibot + signup + onboarding

**Spec** (`landing-signup-spec-v2.md`).

**Implementación real**:
- `/` reemplaza la landing default por la de **Aynibot** (hero, casos de uso panadería/retail, CTA → `/signup`). Metadata actualizada en `app/layout.tsx`.
- `/signup`: formulario de magic link (`signInWithOtp` con `emailRedirectTo=/auth/callback`). Sirve para registro y login.
- `/onboarding`: guard (autenticado + sin negocio) + `OnboardingForm` (cliente) + Server Action `createBusiness` que genera `slug` (reintento ante colisión `23505`) e inserta con `owner_user_id = auth.uid()`.
- `proxy.ts`: protege `/dashboard/*` y `/onboarding/*` (sin sesión → `/signup`); authenticated en `/signup`/`/login` → `/dashboard`.

**Desvíos respecto al plan**:
- El formulario canónico quedó en `/signup`; `/login` (creado en M4) ahora es un **alias que redirige a `/signup`** preservando query.
- La lógica post-login (onboarding vs dashboard) no se puso en `/auth/callback`; la resuelve el guard de `app/dashboard/layout.tsx` (sin negocio → `/onboarding`). Resultado equivalente con una sola fuente de verdad.
- WhatsApp **no** se pide en onboarding (es config técnica posterior), según spec.

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
