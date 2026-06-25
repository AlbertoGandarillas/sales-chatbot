# Auth + Dashboard v2

> Spec nuevo. Introduce Supabase Auth (magic link) y un dashboard multi-tenant donde cada dueño ve solo su propio negocio. Reemplaza al dashboard sin login del MVP v1.

## Autenticación

> **Actualización (2026-06-25):** el método principal es **email + contraseña** (`signInWithPassword`), con **magic link** (`signInWithOtp`) como alternativa opcional. Incluye registro con contraseña, recuperación (`resetPasswordForEmail` → `/reset-password`) y cambio de contraseña en el perfil. Ver entrada en `CHANGELOG.md`.

- Email + contraseña como método estándar; magic link opcional (toggle en `/login` y `/signup`).
- Recuperación de contraseña: `/forgot-password` → correo → `/auth/callback` → `/reset-password`.
- Cambio de contraseña: sección "Seguridad" en `/dashboard/perfil`.
- Un solo `owner_user_id` por negocio. **Sin roles de empleado** por ahora.
- El cliente del navegador usa `@supabase/ssr` para mantener la sesión en cookies y que las Server Actions/route handlers la lean.
- Rutas de auth: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/signout`.

> El flujo público de registro/login (landing, `/signup`, `/auth/callback`, `/onboarding`) está en `landing-signup-spec-v2.md`. Aquí se cubre el dashboard ya autenticado y las RLS.

## RLS — cada dueño ve solo lo suyo

Política base: una fila es accesible si pertenece a un `business` cuyo `owner_user_id = auth.uid()`.

```sql
-- Reemplaza las policies permisivas v1 (anon) por policies basadas en owner.

-- businesses: el dueño ve/edita su(s) negocio(s)
DROP POLICY IF EXISTS "anon_read_businesses" ON businesses;
CREATE POLICY "owner_rw_businesses" ON businesses
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- helper: subconsulta de negocios del usuario
-- products
DROP POLICY IF EXISTS "anon_read_products" ON products;
CREATE POLICY "owner_rw_products" ON products
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

-- conversations
CREATE POLICY "owner_rw_conversations" ON conversations
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

-- messages (via conversation -> business)
CREATE POLICY "owner_rw_messages" ON messages
  FOR ALL TO authenticated
  USING (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN businesses b ON b.id = c.business_id
    WHERE b.owner_user_id = auth.uid()))
  WITH CHECK (conversation_id IN (
    SELECT c.id FROM conversations c
    JOIN businesses b ON b.id = c.business_id
    WHERE b.owner_user_id = auth.uid()));

-- orders
DROP POLICY IF EXISTS "anon_read_orders" ON orders;
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "owner_rw_orders" ON orders
  FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

-- usage_logs (solo lectura para el dueño)
CREATE POLICY "owner_read_usage" ON usage_logs
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
```

> **Importante**: el **agente y el webhook siguen usando el cliente service-role**, que bypassa RLS. Las RLS solo afectan al dashboard (cliente autenticado en el navegador). Por eso quitar las policies `anon` no rompe el bot.

> El `INSERT` de `usage_logs` lo hace el servidor (service-role); por eso solo se define policy de `SELECT` para el dueño.

## Estructura de páginas del dashboard

Todas bajo `/dashboard/*`, protegidas: si no hay sesión → redirect a `/signup`. Si la sesión no tiene negocio → redirect a `/onboarding`.

### a. `/dashboard` (resumen)

- Conversaciones recientes (últimas N, con su `mode` bot/human).
- Pedidos recientes (últimos N).
- **Costo estimado del mes**: `SUM(estimated_cost_usd)` de `usage_logs` del mes actual (ver `usage-tracking-spec-v2.md`).
- Tarjetas con totales: pedidos pendientes, pedidos del mes, etc.

### b. `/dashboard/catalogo`

- Tabla de `products` del negocio.
- **CRUD**: crear, editar, eliminar, marcar disponible/no disponible (`available`).
- Filtro **"Por revisar"** (`needs_review = true`).
- Columnas relevantes según vertical: bakery muestra `category`/`price_soles`/`is_custom_order`; retail muestra `talla_range`/`color_o_material`/`image_url`.
- Botón **"Resincronizar catálogo"** — visible y funcional solo si `business.shopify_domain` está configurado (ver `catalog-ingestion-spec-v2.md`). Muestra resultado del resync.
- Al editar un producto `needs_review`, guardar lo marca `needs_review = false`.

### c. `/dashboard/perfil`

Formulario para editar campos del negocio:

- `name` (nombre del negocio)
- `system_prompt_custom` (textarea — info específica: horario, políticas, tono)
- `owner_whatsapp_number`
- Horario (texto libre; puede ir dentro de `system_prompt_custom` o como campo aparte si se decide; en este MVP va dentro de `system_prompt_custom`)
- `shopify_domain` (si vertical retail; editable aquí si no se completó en onboarding)

**No editable desde la UI**:
- Las reglas base del vertical (`VERTICAL_TEMPLATES`) — son fijas.
- `vertical`, `whatsapp_phone_number_id`, `whatsapp_token` — se gestionan fuera del MVP de perfil (configuración técnica).

### d. `/dashboard/conversaciones/[id]` (detalle — ver operations-spec-v2)

- Historial de mensajes.
- Toggle **"Pausar bot (tomar control)" / "Devolver al bot"** (`mode`).
- Cuando `mode = 'human'`: campo de texto para responder manualmente (envía por WhatsApp, guarda como `human_agent`).

## Lectura de datos en el dashboard

- Componentes server leen con el cliente autenticado (RLS aplica) o vía Server Actions.
- Realtime (pedidos y conversaciones) usa el cliente del navegador con anon key + sesión; las policies `authenticated` permiten la suscripción del dueño a sus filas.

## Criterios de aceptación

- [ ] Login con magic link funciona; logout disponible.
- [ ] Un dueño autenticado solo ve su negocio (probado con Cruje vs Betta).
- [ ] `/dashboard` muestra resumen con costo del mes.
- [ ] `/dashboard/catalogo` CRUD + filtro needs_review + (retail) botón resync.
- [ ] `/dashboard/perfil` edita `system_prompt_custom` y campos permitidos; no expone reglas base.
- [ ] El bot sigue funcionando (service-role no afectado por RLS).

## CHECKPOINT (al implementar M4)

```
CHECKPOINT — necesito que hagas esto antes de continuar:
En Supabase → Authentication → URL Configuration:
- Site URL: https://sales-chatbot-pink.vercel.app
- Redirect URLs (agregar):
    https://sales-chatbot-pink.vercel.app/auth/callback
    http://localhost:3000/auth/callback
En Authentication → Providers → Email: habilitar "Email" y activar magic link (Confirm email ON).
Avísame cuando esté listo.
```
