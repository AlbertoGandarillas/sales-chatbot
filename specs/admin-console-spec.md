# Spec — Consola de administración Uru (`/admin`)

> **ESTADO: IMPLEMENTADO** (2026-07-03, fases R0–R2)
>
> **Alcance:** panel web para el **operador de la plataforma** (tú), con login propio, gestión manual de tenants, visibilidad de errores (`error_logs`), métricas internas y operaciones que hoy requieren SQL/Supabase/Vercel. **No reemplaza** el dashboard del dueño (`/dashboard`).

---

## 1. Contexto y motivación

### 1.1 Situación actual (auditoría código, jul 2026)

| Necesidad operativa | Cómo se hace hoy | Dolor |
|---|---|---|
| Conectar WhatsApp de un negocio | SQL manual en `businesses.whatsapp_token` + `whatsapp_phone_number_id` | Perfil tenant dice *“No editable”* |
| Alta de Cruje / Betta | Onboarding self-serve **o** seed SQL | Self-serve **no** conecta WA (P0-4) |
| Ver errores en producción | Vercel logs / Sentry (recién añadido, paid) | Sin panel centralizado |
| Costo OpenAI por negocio | `usage_logs` (backend OK) | Sin UI admin; tenant ya no ve costo |
| Ver conversaciones/pedidos de un tenant | Login como dueño **o** Supabase Table Editor | Lento para soporte |
| Asignar dueño a negocio | `owner_user_id` en SQL | Manual |
| Legal / marca | `lib/legal-config.ts` hardcoded | Requiere deploy para cambiar |
| Recordatorios recurrentes | Cron + `CRON_SECRET` | Sin visibilidad de runs fallidos |
| Revisar webhook dedupe | Tabla `processed_whatsapp_messages` | Solo SQL |

### 1.2 Objetivo del admin console

Un solo lugar para **operar Uru como negocio SaaS** mientras el piloto crece (Cruje, Betta → más tenants), sin tocar Supabase Studio para tareas rutinarias.

---

## 2. Principios de diseño

1. **Separación estricta:** `/admin` ≠ `/dashboard`. Layout, nav y guard distintos.
2. **Auth explícita:** solo usuarios en `platform_admins`; no confiar en “email en env” solo.
3. **Service-role con cuidado:** Server Actions admin verifican sesión admin **antes** de usar `createServiceClient()`.
4. **Auditoría:** acciones destructivas/ sensibles → `admin_audit_logs` (quién, qué, cuándo).
5. **No romper tenants:** cambios en credenciales WA no invalidan sesiones de dueños; RLS tenant intacto.
6. **Spec-driven:** implementar por fases; aprobar checkpoints antes de codificar.

---

## 3. Autenticación y autorización

### 3.1 Modelo propuesto (CHECKPOINT A1)

**Recomendado:** Supabase Auth (mismo proyecto) + allowlist en BD.

```sql
CREATE TABLE platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

| Paso | Acción |
|---|---|
| Bootstrap | Crear usuario en Supabase Auth (email + password tuyo) |
| Seed | `INSERT INTO platform_admins (user_id, email) VALUES (...)` |
| Login | **`/admin/login`** — form email/password (`signInWithPassword`) |
| Guard | Middleware/`proxy.ts`: rutas `/admin/*` exigen sesión + fila en `platform_admins` |

**Alternativa descartada en v1:** tabla `admin_users` con bcrypt separada de Supabase — duplica auth sin beneficio.

**Alternativa descartada:** solo `ADMIN_EMAILS` en env — sin audit trail, fácil de olvidar en rotación.

### 3.2 Rutas auth

| Ruta | Pública | Notas |
|---|---|---|
| `/admin/login` | Sí | Solo admins; error genérico si credenciales inválidas |
| `/admin` | No | Redirect → `/admin/overview` |
| `/admin/*` | No | Guard admin |
| `/dashboard/*` | No | Sin cambios (guard tenant) |

### 3.3 Función helper

```typescript
// lib/admin-auth.ts
export async function requirePlatformAdmin(): Promise<{ userId: string; email: string }>
// Lanza redirect /admin/login o 403
```

Usar en **todas** las Server Actions y layouts bajo `app/admin/`.

### 3.4 RLS para tablas admin-only

```sql
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
  );
$$;

-- error_logs, admin_audit_logs, usage_logs (lectura global admin):
CREATE POLICY "platform_admin_read_error_logs" ON error_logs
  FOR SELECT TO authenticated
  USING (is_platform_admin());
```

INSERT en `error_logs` sigue solo vía service-role (observability spec).

---

## 4. Mapa de funciones admin → tu negocio

### 4.1 Matriz completa (priorizada)

| ID | Función admin | Por qué la necesitas | Datos / acciones | Fase |
|---|---|---|---|---|
| **A-01** | Overview / KPIs | Pulso de la plataforma | Negocios activos, msgs 24h, errores 24h, costo OpenAI mes | R2 |
| **A-02** | Listar negocios | Ver Cruje, Betta, futuros | Tabla `businesses` | R2 |
| **A-03** | Editar negocio | Config manual post-alta | nombre, slug, catalog_source, supports_custom_orders, shopify_domain, system_prompt_custom, owner_whatsapp_number | R2 |
| **A-04** | **Credenciales WhatsApp** | Core P0-4 self-ops | `whatsapp_phone_number_id`, `whatsapp_token` (masked + reveal) | R2 |
| **A-05** | Asignar / cambiar dueño | Vincular login tenant | `owner_user_id` por email lookup en `auth.users` | R3 |
| **A-06** | Crear negocio vacío | Alta sin depender de onboarding | INSERT business + slug único | R3 |
| **A-07** | Listar errores | Observabilidad custom | `error_logs` filtros source/level/fecha/negocio | R1 |
| **A-08** | Detalle error | Debug | stack + context JSON | R1 |
| **A-09** | Usage OpenAI global | Facturación interna / control costos | `usage_logs` agregado por negocio/mes | R3 |
| **A-10** | Usage por negocio | “¿Cuánto gasta Cruje?” | Gráfico/tabla por día | R3 |
| **A-11** | Ver conversaciones (read-only) | Soporte | Lista por negocio, link a detalle | R4 |
| **A-12** | Ver mensajes conversación | Debug sin impersonar | Read-only chat | R4 |
| **A-13** | Ver pedidos (read-only) | Soporte / disputas | Filtro status, negocio | R4 |
| **A-14** | Forzar modo bot/human | Recuperar conversación atascada | UPDATE `conversations.mode` | R4 |
| **A-15** | Disparar sync Shopify | Betta sin pedir al cliente | Reusar `shopify-ingestion` | R4 |
| **A-16** | Recurrentes — ver runs | Cron recordatorios | `recurring_order_runs` skipped/failed | R4 |
| **A-17** | Webhook health | Duplicados / volumen | Count `processed_whatsapp_messages` 24h | R4 |
| **A-18** | Audit log admin | Seguridad / trazabilidad | `admin_audit_logs` | R2 |
| **A-19** | Config legal plataforma | Sin redeploy | Mover `LEGAL` a tabla `platform_settings` o editar en admin | R5 |
| **A-20** | Invitar admin adicional | Socio / dev | INSERT `platform_admins` | R5 |
| **A-21** | Export CSV errores/usage | Contabilidad | Download | R5 |

### 4.2 Qué NO entra en v1 admin (explícito)

| Función | Motivo |
|---|---|
| Editar catálogo productos | Lo hace el dueño en `/dashboard/catalogo` |
| Responder WhatsApp como admin | Usar dashboard tenant o modo humano del dueño |
| Borrar negocio / GDPR erase | Proceso manual SQL con checklist legal |
| Meta Embedded Signup | Spec futuro; admin solo pega credenciales en v1 |
| Plantillas WhatsApp 24h | Spec futuro P0-3 fase 2 |
| Facturación / cobro a clientes | Fuera de producto actual |

### 4.3 Cruje vs Betta — funciones que más usarás

| Operación | Cruje | Betta |
|---|---|---|
| Editar WA token + phone ID | ✅ | ✅ |
| Ver errores webhook | ✅ | ✅ |
| Usage OpenAI | ✅ | ✅ |
| Sync Shopify manual | — | ✅ (A-15) |
| Ver encargos / pedidos custom | ✅ | — |
| Recordatorios recurrentes | ✅ si activos | ✅ si activos |

---

## 5. Estructura UI (rutas)

```
/admin
├── /admin/login
├── /admin/overview          ← A-01 KPIs
├── /admin/negocios          ← A-02 list
├── /admin/negocios/[id]     ← A-03, A-04, A-05, tabs
│     ├── ?tab=general
│     ├── ?tab=whatsapp
│     ├── ?tab=usage         ← A-10
│     ├── ?tab=conversaciones ← A-11
│     └── ?tab=pedidos       ← A-13
├── /admin/errores           ← A-07, A-08
├── /admin/usage             ← A-09 global
├── /admin/auditoria         ← A-18
└── /admin/configuracion     ← A-19, A-20 (R5)
```

**Identidad visual:** misma design system Uru (`globals.css` tokens), nav compacto, badge **“Admin”** visible, **Geist** (no Nunito — UI operativa).

---

## 6. Esquema BD adicional

### 6.1 `admin_audit_logs`

```sql
CREATE TABLE admin_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action      text NOT NULL,       -- 'business.update_whatsapp', 'business.create', ...
  target_type text,                -- 'business', 'conversation', ...
  target_id   uuid,
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_audit_created ON admin_audit_logs(created_at DESC);
```

RLS: SELECT solo `is_platform_admin()`. INSERT vía service-role en Server Actions.

### 6.2 `platform_settings` (opcional R5)

```sql
CREATE TABLE platform_settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- keys: 'legal', 'feature_flags', ...
```

---

## 7. Seguridad

| Riesgo | Mitigación |
|---|---|
| Exfiltrar `whatsapp_token` | Masked por defecto; reveal con click + audit log |
| Admin route sin guard | `requirePlatformAdmin()` en layout + proxy |
| CSRF en Server Actions | Next.js built-in |
| Tenant accede `/admin` | Redirect 403; no policy admin en RLS tenant |
| Log de secrets en `error_logs` | Sanitizer en `captureError` (strip keys: token, secret, authorization) |

---

## 8. Fases de implementación

### R0 — Remover Sentry + `error_logs` (observability-custom-spec.md)

- Migración `error_logs`
- Reescribir `lib/observability.ts`
- Eliminar paquete Sentry
- **Entregable:** errores persistidos; sin UI aún

### R1 — Admin mínimo: auth + errores

- `platform_admins` + seed tu usuario
- `/admin/login`, layout, guard
- `/admin/errores` (lista + detalle)
- **Entregable:** puedes ver errores en prod

### R2 — Gestión de negocios (core operativo)

- `/admin/overview` KPIs básicos
- `/admin/negocios` list + edit general + **tab WhatsApp** (A-04)
- `admin_audit_logs` en acciones sensibles
- **Entregable:** conectar WA sin SQL

### R3 — Alta y ownership

- Crear negocio (A-06)
- Asignar dueño por email (A-05)
- `/admin/usage` global + tab usage por negocio
- **Entregable:** onboarding operativo end-to-end desde admin

### R4 — Soporte read-only

- Conversaciones, pedidos, toggle mode, Shopify sync, recurrentes runs
- **Entregable:** soporte sin Supabase Studio

### R5 — Pulido

- Config legal, segundo admin, export CSV
- **Entregable:** operación madura

---

## 9. Checkpoints (aprobar antes de implementar)

| ID | Pregunta | Propuesta default |
|---|---|---|
| **CP-A1** | ¿Login admin en `/admin/login` separado del `/login` tenant? | **Sí** — evita confusión |
| **CP-A2** | ¿Un solo admin (tú) o varios desde R1? | **Uno** bootstrap; A-20 en R5 |
| **CP-A3** | ¿Admin puede ver contenido de mensajes (PII)? | **Sí read-only** para soporte; audit log |
| **CP-A4** | ¿Mover `legal-config.ts` a BD en R5 o antes? | **R5** — no bloqueante |
| **CP-A5** | ¿Implementar R0–R2 en un PR o separados? | **PR1: R0+R1**, **PR2: R2** |

---

## 10. Criterios de aceptación globales

- [ ] Tenant en `/dashboard` no ve enlaces ni rutas admin.
- [ ] Usuario autenticado no-admin → `/admin` responde 403 o redirect login.
- [ ] Editar WA credenciales desde admin → bot envía/recibe en < 5 min (sin SQL).
- [ ] Error en webhook → visible en `/admin/errores` en < 1 min.
- [ ] Acciones sensibles generan fila en `admin_audit_logs`.
- [ ] `npm run build` + tests verdes; sin `@sentry/nextjs`.

---

## 11. Archivos previstos (implementación)

| Área | Archivos nuevos |
|---|---|
| Auth | `lib/admin-auth.ts`, `app/admin/login/page.tsx`, `app/admin/layout.tsx` |
| UI | `app/admin/overview/page.tsx`, `negocios/`, `errores/`, `usage/` |
| Actions | `app/admin/negocios/actions.ts`, `app/admin/errores/...` |
| BD | migraciones `platform_admins`, `error_logs`, `admin_audit_logs` |
| Proxy | `proxy.ts` — matcher `/admin/:path*` |
| Docs | actualizar `runbook-alta-clientes.md`, `CHANGELOG.md` |

---

## 12. Relación con specs existentes

| Spec | Relación |
|---|---|
| `observability-custom-spec.md` | Prerequisito R0 |
| `production-v1-hardening-spec.md` | P1-13 Sentry → **reemplazado** por este enfoque |
| `auth-dashboard-spec-v2.md` | Tenant auth sin cambios |
| `runbook-alta-clientes.md` | Runbook migrará a flujos admin R2–R3 |
| `usage-tracking-spec-v2.md` | Admin lee `usage_logs`; tenant no |

---

## 13. Aprobación

| Fase | Aprobado | Fecha | Notas |
|---|---|---|---|
| Spec completo | ☐ | | |
| CP-A1 login separado | ☐ | | |
| CP-A2 single admin | ☐ | | |
| CP-A3 ver mensajes PII | ☐ | | |
| Inicio R0 | ☐ | | |

> **Siguiente paso:** revisa este spec + `observability-custom-spec.md`, responde checkpoints, y confirma aprobación para implementar **R0 → R1** primero.
