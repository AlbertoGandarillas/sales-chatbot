# Spec — Observabilidad custom (reemplazo de Sentry)

> **ESTADO: IMPLEMENTADO** (2026-07-03, fases R0–R2)
>
> **Alcance:** eliminar `@sentry/nextjs` e implementar logging de errores en Supabase (`error_logs`), reutilizando `lib/observability.ts` como API única. Sin cambiar flujos del agente, webhook ni dashboard de tenants.

---

## 1. Resumen

| Antes | Después |
|---|---|
| Sentry opcional (`SENTRY_DSN`) | **Sin dependencia externa** |
| Errores solo en consola si no hay DSN | **`error_logs` en Supabase** + consola siempre |
| Admin sin visibilidad centralizada | Errores visibles en **Consola Admin** (spec aparte) |

---

## 2. Principios

1. **Fail-safe:** si falla el INSERT en `error_logs`, el flujo de negocio **continúa** (igual que `logUsage`).
2. **API estable:** mantener `captureError(error, context?)` y `captureMessage(message, level?, context?)` — solo cambia la implementación interna.
3. **Service-role para INSERT:** igual que `usage_logs`; tenants **no** insertan errores vía RLS.
4. **Sin PII innecesaria:** no guardar tokens, bodies completos de webhook ni contenido de mensajes en `context` (sanitizar en call sites).

---

## 3. Esquema BD

Migración: `supabase/migrations/<ts>_error_logs.sql`

```sql
CREATE TABLE error_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid REFERENCES businesses(id) ON DELETE SET NULL,
  source       text NOT NULL,          -- 'webhook' | 'agent' | 'cron' | 'whatsapp' | 'admin' | ...
  level        text NOT NULL DEFAULT 'error'
                 CHECK (level IN ('debug', 'info', 'warning', 'error')),
  message      text NOT NULL,
  stack        text,
  context      jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_business_created ON error_logs(business_id, created_at DESC);
CREATE INDEX idx_error_logs_source ON error_logs(source, created_at DESC);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Solo platform admins leen (ver admin-console-spec.md)
-- INSERT: service-role únicamente (sin policy INSERT para authenticated)
```

Retención sugerida (operativa, no en v1 código): borrar > 90 días vía cron o manual en Supabase.

---

## 4. Implementación `lib/observability.ts`

```typescript
export async function captureError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void>

export async function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): Promise<void>
```

Comportamiento:

1. `console.error` / `console.warn` según level (siempre).
2. Normalizar: `message`, `stack` (si `Error`), `source` desde `context.scope` o `'unknown'`.
3. `createServiceClient().from('error_logs').insert(...)` en try/catch silencioso.
4. Truncar `message` a 2000 chars, `stack` a 8000, `context` JSON ≤ 16 KB.

Variable opcional:

- `ERROR_LOGGING_ENABLED=true` (default **true** en production, **true** en dev) — permite desactivar INSERT localmente.

---

## 5. Archivos a eliminar (fase implementación)

| Archivo | Acción |
|---|---|
| `sentry.server.config.ts` | Eliminar |
| `sentry.edge.config.ts` | Eliminar |
| `instrumentation.ts` | Eliminar o reducir a vacío (si Next lo exige, dejar stub sin Sentry) |
| `@sentry/nextjs` en `package.json` | Desinstalar |
| `SENTRY_DSN` en `.env.local.example` | Eliminar |

**Call sites existentes (mantener imports):**

- `app/api/webhook/route.ts` — `captureError`
- `lib/agent.ts` — `captureError`
- `lib/recurring-orders.ts` — `captureMessage` → pasa a persistir en `error_logs` con level `warning`

---

## 6. Contexto estándar por source

| source | context sugerido |
|---|---|
| `webhook` | `{ businessId, messageType, from }` |
| `agent` | `{ businessId, conversationId, customerPhone }` |
| `cron-recurring` | `{ businessId, recurringOrderId }` |
| `whatsapp-send` | `{ businessId, conversationId, code }` |
| `admin` | `{ adminUserId, action }` |

---

## 7. Criterios de aceptación

- [ ] `npm run build` sin `@sentry/nextjs`.
- [ ] Error simulado en webhook → fila en `error_logs`.
- [ ] Fallo de INSERT no rompe respuesta al cliente WhatsApp.
- [ ] Tenants **no** pueden leer `error_logs` vía API anon/authenticated normal.
- [ ] Admin puede listar errores (consola admin).

---

## 8. Fuera de alcance

- Alertas email/Slack automáticas.
- Agrupación/deduplicación de errores (Issue tracking).
- Dashboard de errores para **dueños de negocio** (solo admin plataforma).

---

## 9. Relación con otros specs

- UI de errores → `admin-console-spec.md` § Errores.
- Índice → `admin-console-index.md`.
