# Landing + Signup + Onboarding v2

> Spec nuevo. Marca de cara al usuario: **"Aynibot"** (temporal, puede cambiar). Solo se usa en la landing/UI y metadata; no se renombra el repo ni el código.

## Páginas

| Ruta | Acceso | Propósito |
|---|---|---|
| `/` | Pública | Landing de Aynibot |
| `/signup` | Pública | Registro/login con magic link (misma operación) |
| `/auth/callback` | Pública | Completa la sesión tras el magic link |
| `/onboarding` | Autenticado sin negocio | Crear el primer negocio del usuario |

> La landing v1 actual en `/` (Next.js default / demo) se reemplaza por la landing de Aynibot. El dashboard se mueve a `/dashboard` (ya estaba ahí).

## `/` — Landing pública

- **Sin login.** Server component estático.
- Metadata: `title = "Aynibot — Agente de ventas por WhatsApp"`, description acorde.
- Contenido:
  - Título **Aynibot** + propuesta de valor: "Agente de ventas por WhatsApp para negocios en Perú. Atiende, cotiza y toma pedidos 24/7."
  - 1–2 casos de uso como ejemplos genéricos:
    - *Panaderías* (inspirado en Cruje, sin datos sensibles): "toma pedidos y encargos de tortas".
    - *Retail / tiendas Shopify* (inspirado en Betta): "responde por catálogo, tallas y modelos".
  - CTA principal: **"Crear cuenta gratis"** / **"Empezar con Aynibot"** → `/signup`.
  - Diseño moderno con Tailwind (hero, secciones, footer). Mobile-first.
- No expone datos reales de Cruje ni Betta (ni números, ni catálogos privados).

## `/signup` — Magic link

- Un solo input: **correo electrónico** + botón **"Enviar enlace de acceso"**.
- Acción: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '<origin>/auth/callback' } })`.
- Sirve para **registro y login** (es la misma operación con magic link).
- Tras enviar: mensaje "Te enviamos un enlace a tu correo. Ábrelo para entrar."
- Manejo de error visible si falla el envío.

## `/auth/callback` — Completar sesión

- Recibe el enlace de confirmación de Supabase, intercambia el código por sesión (`exchangeCodeForSession` o el helper SSR correspondiente).
- Tras establecer sesión, aplica la **lógica post-login** (abajo) y redirige.
- Si falla → redirect a `/signup?error=...`.

## Lógica post-login (redirección)

```
sesión establecida con auth.uid()
  └─ consultar businesses WHERE owner_user_id = auth.uid()
       ├─ 0 filas  → redirect /onboarding
       └─ >=1 fila → redirect /dashboard
```

## `/onboarding` — Crear primer negocio

- Solo accesible autenticado y sin negocio (si ya tiene → redirect `/dashboard`).
- Formulario simple:
  - **Nombre del negocio** (text, requerido)
  - **Vertical** (select: "Panadería" → `bakery` | "Retail / Tienda" → `retail`, requerido)
  - **Shopify domain** (text, opcional; solo se muestra/usa si vertical = retail) — puede completarse después en `/dashboard/perfil`
- Al enviar (Server Action):
  - Genera `slug` a partir del nombre (único; si colisiona, sufijo).
  - `INSERT INTO businesses (name, slug, vertical, shopify_domain, owner_user_id) VALUES (..., auth.uid())`.
  - Redirect a `/dashboard`.
- **No** pide credenciales de WhatsApp aquí (eso es configuración técnica posterior; el `phone_number_id` se vincula aparte).

> **Cruje y Betta NO pasan por este flujo**: sus filas se crean/actualizan en M1 vía seed (ver `data-model-v2.md`). El onboarding es para futuros clientes que se registren solos desde la landing.

## Middleware de protección

- `middleware.ts` (o checks en layout server) protege `/dashboard/*` y `/onboarding`.
- Sin sesión en ruta protegida → `/signup`.
- Las rutas públicas (`/`, `/signup`, `/auth/callback`) no se bloquean.

## Criterios de aceptación

- [ ] `/` muestra la landing de Aynibot sin requerir login.
- [ ] `/signup` envía magic link; el correo llega.
- [ ] `/auth/callback` establece sesión y redirige según tenga o no negocio.
- [ ] `/onboarding` crea negocio con `owner_user_id = auth.uid()` y vertical elegido.
- [ ] Usuario con negocio que entra a `/` o `/signup` puede llegar a `/dashboard`.
- [ ] Cruje y Betta entran directo a su dashboard (ya tienen negocio), sin pasar por onboarding.

## Dependencia de configuración

Reutiliza el mismo CHECKPOINT de Supabase Auth (Site URL + Redirect URLs + Email provider) definido en `auth-dashboard-spec-v2.md`. No requiere uno adicional.
