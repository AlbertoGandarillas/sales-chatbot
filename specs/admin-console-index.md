# Índice — Consola de administración Uru

> Specs del panel **platform admin** (operador de Uru), separado del dashboard de tenants (`/dashboard`).

| Spec | Contenido |
|---|---|
| [`observability-custom-spec.md`](./observability-custom-spec.md) | Reemplazo Sentry → `error_logs` |
| [`admin-console-spec.md`](./admin-console-spec.md) | Auth, rutas, funciones, fases, RLS |

## Audiencia

- **Tú (Alberto / operador Uru):** alta de Cruje/Betta, credenciales WhatsApp, ver errores, costos OpenAI, soporte.
- **No es para:** dueños de panaderías/tiendas (siguen en `/dashboard`).

## Decisión de producto (propuesta)

| Rol | Ruta | Auth |
|---|---|---|
| Dueño de negocio | `/dashboard/*` | Supabase Auth + `owner_user_id` |
| Admin plataforma | `/admin/*` | Supabase Auth + tabla `platform_admins` |

Un mismo email **puede** ser admin y dueño de un negocio; las rutas están separadas.
