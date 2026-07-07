# Spec — Equipo, notificaciones y catálogo rápido

> **ESTADO: IMPLEMENTADO** (2026-07-06)
>
> Tres mejoras surgidas en reunión con cliente piloto. **No cambian** el agente WhatsApp, el flujo del bot ni el modelo multi-tenant existente; extienden el dashboard y las notificaciones operativas.
>
> **Referencias:** `auth-dashboard-spec-v2.md`, `operations-spec-v2.md`, `bot-knowledge-spec.md`, `app/dashboard/catalogo/catalog-client.tsx`, `lib/whatsapp.ts`, `lib/agent.ts`

---

## 1. Resumen ejecutivo

| # | Necesidad del cliente | Solución propuesta | Fase |
|---|----------------------|-------------------|------|
| **A** | Niveles de acceso: alguien del equipo edita catálogo pero **no** Bot Studio ni config crítica | Roles de equipo (`business_members`) + RLS + guards en rutas | TN-1 |
| **B** | Enterarse de pedidos nuevos sin abrir el dashboard | WhatsApp al dueño/equipo (infra ya existe); luego preferencias y email opcional | TN-2 → TN-3 |
| **C** | Actualizar precio y disponibilidad desde la lista del catálogo | Edición inline en fila + botón **Editar** intacto para el formulario completo | TN-4 |

**Principio:** el dueño actual (`owner_user_id`) sigue funcionando igual. Los cambios son **aditivos**. Cruje, Betta y tenants existentes no pierden acceso.

---

## 2. Estado actual (auditoría)

### 2.1 Acceso

- Un usuario ↔ un negocio vía `businesses.owner_user_id`.
- RLS: `owner_user_id = auth.uid()` en todas las tablas del dashboard.
- Spec previo: *"Sin roles de empleado por ahora"* (`auth-dashboard-spec-v2.md`).
- **Consecuencia:** quien tiene login al dashboard puede editar **todo** (catálogo, Bot Studio, perfil, WhatsApp dueño).

### 2.2 Notificaciones hoy

| Evento | ¿Notifica fuera del dashboard? | Mecanismo |
|--------|-------------------------------|-----------|
| Encargo personalizado | Sí | `notifyOwner()` → WhatsApp `owner_whatsapp_number` |
| Escalamiento a humano | Sí | Idem |
| Pedido recurrente confirmado / manual | Sí | Idem |
| **Pedido nuevo vía bot (`crear_pedido`)** | **No** | Solo aparece en resumen → pedidos recientes |
| Pago confirmado en dashboard | No | Solo UI |
| Nueva conversación | No | Solo UI |

`notifyOwner()` ya está en `lib/whatsapp.ts` y usa el número del negocio + credenciales WA del tenant.

### 2.3 Catálogo hoy

- Lista de productos con precio **solo lectura** en la fila (`ProductPriceDisplay`).
- Disponibilidad: formulario POST `toggleAvailable` → botones **Ocultar / Mostrar**.
- Cambios de precio/nombre/promo: solo vía **Editar** → `ProductForm` completo.

---

## 3. Pilares y fases

```
TN-1  Roles de equipo (RLS + UI invitaciones + guards)
  ↓ CHECKPOINT
TN-2  Notificación WhatsApp: pedido nuevo (+ preferencias mínimas)
  ↓ CHECKPOINT
TN-3  Notificaciones ampliadas (múltiples destinatarios, email opcional)
  ↓ CHECKPOINT
TN-4  Catálogo: precio y disponibilidad inline
```

Cada fase es desplegable sola sin romper la anterior.

---

## 4. Pilar A — Niveles de acceso (TN-1)

### 4.1 Modelo de roles (MVP)

Tres roles fijos — suficientes para el feedback del cliente y escalables después.

| Rol | Código | Catálogo | Conversaciones | Pedidos | Recurrentes | Bot Studio | Perfil / negocio |
|-----|--------|----------|----------------|---------|-------------|------------|------------------|
| **Dueño** | `owner` | RW | RW | RW | RW | RW | RW |
| **Encargado catálogo** | `catalog` | RW | — | — | — | — | — |
| **Operador** | `operator` | R | RW | RW | R | — | — |

- **`catalog`:** caso del cliente — actualiza precios, stock/disponibilidad, productos; **no** toca bot, perfil ni credenciales.
- **`operator`:** atiende conversaciones y pedidos (fase posterior si el cliente lo pide); en TN-1 puede dejarse definido pero sin UI de invitación hasta TN-1b.
- **`owner`:** el único que invita/remueve miembros y edita Bot Studio, perfil y `owner_whatsapp_number`.

> TN-1 mínimo aprobable: solo **`owner`** + **`catalog`**. Rol `operator` en migración pero UI oculta hasta segunda iteración.

### 4.2 Modelo de datos

```sql
CREATE TABLE business_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('owner', 'catalog', 'operator')),
  invited_email text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX idx_business_members_user ON business_members (user_id);
```

**Bootstrap (sin pérdida):**

```sql
INSERT INTO business_members (business_id, user_id, role)
SELECT id, owner_user_id, 'owner'
FROM businesses
WHERE owner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

`businesses.owner_user_id` **se conserva** como dueño primario (facturación, admin Uru, compatibilidad).

### 4.3 RLS — patrón nuevo

Función helper SQL:

```sql
CREATE OR REPLACE FUNCTION user_business_ids()
RETURNS SETOF uuid AS $$
  SELECT business_id FROM business_members WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Reemplazar subconsultas `owner_user_id = auth.uid()` por `business_id IN (SELECT user_business_ids())` en policies de dashboard.

**Policies por rol (aplicación + RLS defensivo):**

| Tabla | `owner` | `catalog` | `operator` |
|-------|---------|-----------|------------|
| `products` | ALL | ALL | SELECT |
| `businesses` | UPDATE (campos permitidos) | SELECT | SELECT |
| `business_faqs`, `business_knowledge_articles` | ALL | — | — |
| `conversations`, `messages` | ALL | — | ALL |
| `orders` | ALL | — | SELECT, UPDATE (status/pago) |
| `recurring_orders` | ALL | — | SELECT |

Implementación RLS pragmática TN-1:

1. Migrar policies a membership (`user_business_ids()`).
2. Restricciones finas por rol en **Server Actions** (`requireRole('catalog')`) — la UI no es suficiente sola.
3. RLS en `businesses`: miembros `catalog`/`operator` solo **SELECT**; UPDATE solo `owner`.

### 4.4 Invitaciones

**Flujo TN-1 (simple):**

1. Dueño en `/dashboard/perfil` → sección **Equipo**.
2. Ingresa email + rol (`catalog`).
3. El invitado **debe tener cuenta** en `/signup` (mismo flujo que admin console hoy).
4. Server Action `inviteTeamMember`: valida owner, busca `auth.users` por email, inserta `business_members`.
5. Si no existe usuario → mensaje: *"Pídele que cree cuenta con ese correo y vuelve a invitar"*.

**Fuera de TN-1:** magic link de invitación, múltiples negocios por usuario.

### 4.5 Guards de rutas (dashboard)

| Ruta | `owner` | `catalog` | `operator` |
|------|---------|-----------|------------|
| `/dashboard` | ✓ | ✓ (métricas limitadas) | ✓ |
| `/dashboard/catalogo` | ✓ | ✓ | R |
| `/dashboard/conversaciones/*` | ✓ | ✗ redirect | ✓ |
| `/dashboard/recurrentes` | ✓ | ✗ | R |
| `/dashboard/bot` | ✓ | ✗ | ✗ |
| `/dashboard/perfil` | ✓ | ✗ (solo ver nombre?) | ✗ |

Implementación: `lib/team-access.ts` con `getMembership()`, `requireDashboardRole()`; layout dashboard consulta rol y oculta ítems en `DashboardNav`.

### 4.6 Criterios de aceptación TN-1

- [ ] Dueño actual sigue con acceso total sin reconfigurar nada.
- [ ] Usuario `catalog` edita productos pero recibe 403 / redirect en `/dashboard/bot` y `/dashboard/perfil`.
- [ ] Usuario `catalog` no puede llamar Server Actions de `updateBotConfig`, `updateProfile`, etc.
- [ ] RLS: usuario A no ve productos del negocio B.
- [ ] Cruje/Betta: dueño puede invitar un encargado de catálogo.

---

## 5. Pilar B — Notificaciones (TN-2 y TN-3)

### 5.1 Recomendación: mejor canal por tipo de negocio

Para PYME Perú con WhatsApp como canal principal:

| Canal | Cuándo usarlo | Pros | Contras | Recomendación Uru |
|-------|---------------|------|---------|-------------------|
| **WhatsApp al dueño** | Pedidos, encargos, escalamientos | Inmediato, ya lo usan, **código existente** | Requiere `owner_whatsapp_number`; mensaje desde número del bot | **P0 — TN-2** |
| **WhatsApp a números del equipo** | Mismo + backup si dueño no ve | Misma infra | Varios números en lista allow Meta (dev) | **P1 — TN-3** |
| **Email** | Resumen diario, backup | No depende de WA | Menos inmediato; requiere SMTP (Resend/SendGrid) | **P2 — TN-3** |
| **Push / PWA** | Alertas en móvil | Tiempo real en app | Requiere PWA + permisos; más desarrollo | Backlog |
| **SMS** | — | Universal | Costo por mensaje | No recomendado v1 |

**Conclusión:** extender **`notifyOwner`** es la mejor relación costo/valor. El gap real hoy es que **`crear_pedido` no notifica**.

### 5.2 Eventos a notificar

| Evento | TN-2 (P0) | TN-3 (opcional) |
|--------|-----------|-----------------|
| Nuevo pedido (`crear_pedido`) | WhatsApp dueño | + números equipo |
| Encargo personalizado | Ya existe | Preferencia on/off |
| Escalamiento humano | Ya existe | Idem |
| Pedido recurrente creado | Ya existe | Idem |
| Pago marcado confirmado | — | WhatsApp opcional |
| Resumen diario (pedidos pendientes) | — | Email cron |

### 5.3 Implementación TN-2 (mínima, sin romper nada)

**Código:**

1. Tras `createCatalogOrder` exitoso en `lib/agent.ts` → `crearPedido`, llamar `notifyOwner()` con mensaje estándar:

```
🛒 Nuevo pedido — {negocio}
Total: S/ {total}
Cliente: {phone}
Ítems: {resumen corto}
Ver: {link dashboard conversación si aplica}
ID: {order_id}
```

2. Envolver en `try/catch` — **fallo de notificación no debe revertir el pedido** (mismo patrón que recurrentes).

3. Requisito operativo (ya documentado en perfil): `owner_whatsapp_number` configurado. Si falta → log warning, pedido igual se crea.

**Config mínima (opcional TN-2):**

```sql
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS notify_new_orders boolean NOT NULL DEFAULT true;
```

Toggle en `/dashboard/perfil` (solo `owner`): *"Avisarme por WhatsApp cuando entra un pedido nuevo"*.

### 5.4 Implementación TN-3 (ampliada)

```sql
CREATE TABLE business_notification_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  channel      text NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  destination  text NOT NULL,  -- E.164 o email
  events       text[] NOT NULL DEFAULT '{new_order,handoff,custom_order}',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

- `lib/notifications.ts`: `notifyBusinessEvent(business, event, message)` → itera destinatarios + fallback `owner_whatsapp_number`.
- UI en `/dashboard/perfil` → pestaña **Notificaciones**.
- Email: variable `RESEND_API_KEY` o similar; plantilla texto simple.

### 5.5 Qué necesitas para implementar

| Requisito | TN-2 | TN-3 |
|-----------|------|------|
| `owner_whatsapp_number` del negocio | Obligatorio | Obligatorio para WA |
| Bot WA activo (`whatsapp_token`, `phone_number_id`) | Sí | Sí |
| Números destino en allowlist Meta (modo dev) | Sí | Sí |
| Proveedor email (Resend, etc.) | No | Sí para email |
| Cron (resumen diario) | No | Opcional |
| Plantillas Meta fuera de 24 h | No* | No* |

\* Notificar al **dueño** es mensaje **saliente** desde el número del negocio hacia un tercero; no requiere ventana de 24 h del cliente. No usa plantilla de marketing si es mensaje transaccional interno (verificar política Meta en producción).

### 5.6 Criterios de aceptación TN-2

- [ ] Pedido creado por bot → dueño recibe WhatsApp en &lt; 30 s (si número configurado).
- [ ] Si falla WA, pedido **sigue existiendo** en dashboard.
- [ ] Encargos y escalamientos siguen notificando igual.
- [ ] Toggle `notify_new_orders` desactiva solo pedidos nuevos, no encargos.

---

## 6. Pilar C — Catálogo inline (TN-4)

### 6.1 Objetivo UX

En la **lista principal** del catálogo (`/dashboard/catalogo`):

| Campo | Comportamiento nuevo | Comportamiento que se mantiene |
|-------|---------------------|--------------------------------|
| **Disponibilidad** | Toggle/switch en la fila; guardado al cambiar | — |
| **Precio** | Input numérico inline (`S/`), guardar al blur o Enter | — |
| **Nombre, descripción, promo, imagen, tallas** | — | Botón **Editar** → `ProductForm` actual |
| **Eliminar** | — | Botón Eliminar actual |

### 6.2 Server Action nueva

```ts
// app/dashboard/catalogo/actions.ts
export async function patchProductQuick(
  _prev: CatalogState,
  formData: FormData
): Promise<CatalogState>
```

**Campos aceptados (uno o dos por llamada):**

- `id` (obligatorio)
- `price_soles` (opcional, ≥ 0)
- `available` (opcional, boolean)

Validaciones:

- Mismo scope RLS / rol: `owner` o `catalog`.
- `is_custom_order === true` → rechazar cambio de `price_soles`.
- Producto debe pertenecer al `business_id` del miembro.
- No tocar promos en quick patch (solo en formulario Editar).

### 6.3 UI — componente `ProductRowQuickControls`

- Switch `available` con `useTransition` + `patchProductQuick`.
- Input precio con formato `S/`, debounce 400 ms o save on blur.
- Estados por fila: `idle | saving | saved | error` (texto pequeño).
- Accesibilidad: `aria-live` en error.
- Mobile: input precio ancho mínimo 88px; switch alineado a la derecha.

**Eliminar** botones **Ocultar/Mostrar** actuales (reemplazados por switch).

### 6.4 Productos Shopify

- Permitir inline **precio** y **disponibilidad** local (igual que hoy en formulario completo).
- Resync Shopify puede sobrescribir precios — hint en UI: *"El precio local se actualiza aquí; resincronizar puede traer valores de Shopify"*.

### 6.5 Criterios de aceptación TN-4

- [ ] Cambiar precio en lista persiste sin abrir Editar.
- [ ] Toggle disponibilidad persiste al instante.
- [ ] Botón Editar abre el mismo formulario de hoy.
- [ ] Encargos a medida: precio inline deshabilitado (muestra "—").
- [ ] Rol `catalog` puede usar inline patch.
- [ ] Rol sin acceso catálogo no puede invocar action.

---

## 7. Compatibilidad — qué NO debe romperse

| Área | Garantía |
|------|----------|
| Agente / webhook | Sin cambios de contrato en tools; solo añadir `notifyOwner` post-pedido |
| Dueño único actual | `owner_user_id` + fila `business_members` owner automática |
| RLS existente | Migración reemplaza policy en transacción; probar Cruje/Betta |
| Bot Studio | Solo añade guard; sin cambio de prompt |
| Catálogo completo | `saveProduct`, `deleteProduct`, `resyncCatalog` intactos |
| Admin `/admin` | Sin cambio en TN-1 (platform admin separado) |

**Orden de despliegue seguro:**

1. Migración `business_members` + bootstrap owners.
2. Actualizar RLS + helpers de rol.
3. UI equipo + guards (antes de dar acceso a catálogo).
4. Notificación pedido nuevo (feature flag `notify_new_orders`).
5. Catálogo inline (solo UI + action nueva).

---

## 8. Archivos previstos

| Fase | Archivos principales |
|------|---------------------|
| TN-1 | `supabase/migrations/*_business_members.sql`, `lib/team-access.ts`, `app/dashboard/perfil/team-section.tsx`, `app/dashboard/layout.tsx`, `dashboard-nav.tsx`, policies RLS, Server Actions guards |
| TN-2 | `lib/agent.ts`, `lib/notifications.ts` (opcional), `businesses.notify_new_orders`, `perfil-form.tsx` |
| TN-3 | `business_notification_recipients`, `lib/email.ts`, perfil notificaciones |
| TN-4 | `catalog-client.tsx`, `ProductRowQuickControls.tsx`, `patchProductQuick` en `actions.ts` |

---

## 9. Fuera de alcance

- Permisos granulares custom (ACL por checkbox).
- Invitación por link sin cuenta previa.
- App móvil nativa o push notifications.
- Notificaciones al **cliente** final (distinto de recurrentes/marketing).
- Edición inline de promos, nombre o imagen (solo precio + disponibilidad).
- Cambiar quién es `owner_user_id` desde el dashboard (solo admin Uru).

---

## 10. Plan sugerido y checkpoints

```
TN-1  Equipo (owner + catalog)     → CHECKPOINT: invitar usuario prueba, verificar bloqueo Bot Studio
TN-2  WA pedido nuevo              → CHECKPOINT: pedido de prueba por WhatsApp, dueño recibe mensaje
TN-4  Catálogo inline              → CHECKPOINT: cliente cambia precio sin Editar
TN-3  Multi-destinatario + email   → CHECKPOINT: cuando haya 2+ personas operando el negocio
```

TN-4 puede ir en paralelo con TN-2 (sin dependencia). TN-1 debería ir **antes** de dar acceso de equipo a clientes reales.

---

## 11. Referencias cruzadas

| Documento | Actualizar al implementar |
|-----------|---------------------------|
| `auth-dashboard-spec-v2.md` | Roles, RLS membership |
| `operations-spec-v2.md` | Notificación pedido nuevo |
| `data-model-v2.md` | `business_members`, notification tables |
| `runbook-alta-clientes.md` | Invitar equipo + configurar WA notificaciones |
| `CHANGELOG.md` | Entradas por fase |

---

## 12. Resumen para el cliente

1. **Equipo:** podrás invitar a alguien solo para catálogo; Bot Studio y perfil quedan solo para el dueño.
2. **Avisos:** lo más efectivo es **WhatsApp** (ya lo usan); primero activamos aviso en **cada pedido nuevo**; después más números o email si hace falta.
3. **Catálogo:** precio y disponibilidad se cambian en la misma lista; **Editar** sigue para todo lo demás.

Nada de esto cambia cómo el bot atiende a tus clientes por WhatsApp.
