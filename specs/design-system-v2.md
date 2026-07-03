# Design System v2 — Aynibot

> **Superseded by** `design-system-v3-uru.md` (2026-07-02). Conservado como referencia histórica.

> Rediseño UI/UX integral sin cambiar lógica de negocio. Stack real: Next.js 16 +
> React 19 + **Tailwind CSS v4** (config CSS-first vía `@theme`), fuentes Geist.
> **No usa shadcn/ui**; se creó una capa de primitivos propia y ligera en
> `components/ui/` (sin dependencias nuevas) que consume tokens semánticos.

## Dirección visual

Cálido, claro y confiable. Neutral cálido (off-white) + acento de marca
**terracota** (`--primary`), verde reservado a estados de éxito. Diferencia del
"look genérico shadcn" y del verde-WhatsApp.

## Tokens (CSS variables → utilidades Tailwind)

Definidos en `app/globals.css` (`:root` + `@theme inline`). Los componentes usan
utilidades semánticas (`bg-surface`, `text-muted`, `border-border`,
`bg-primary text-primary-foreground`, `rounded-card`, etc.), **nunca** colores
hardcodeados.

| Token | Uso | AA |
|---|---|---|
| `--background` `#faf8f5` | fondo app | — |
| `--surface` `#ffffff` / `--surface-muted` `#f4f1ec` | tarjetas / sub-zonas | — |
| `--foreground` `#1c1917` / `--muted-foreground` `#57534e` | texto / texto secundario | 16:1 / 7:1 |
| `--border` `#e7e2da` / `--border-strong` `#b9b2a7` | bordes / bordes de input (≥3:1) | 1.4.11 |
| `--primary` `#9a3412` / `--primary-hover` `#7c2d12` | marca / hover | 6.4:1 |
| `--ring` `#c2410c` | foco visible | — |
| `--success` `#15803d` / `--warning` `#b45309` / `--danger` `#b91c1c` / `--info` `#1d4ed8` | estados (+ surfaces) | 4.8–6.3:1 |
| `--radius` `0.75rem` | radio base (`rounded-card`) | — |

Reglas globales en `globals.css`: foco visible (`:focus-visible` outline con
`--ring`), `::placeholder` con contraste AA, y `prefers-reduced-motion`.

## Primitivos (`components/ui/`)

`Button` (+ `buttonVariants`), `Card`/`CardHeader`/`CardTitle`/`CardContent`,
`Badge` (con `dot` para no depender solo del color), `Input`/`Textarea`, `Field`
(+ `Label`, con error `role="alert"`), `Alert` (con `aria-live`), `EmptyState`,
`Skeleton`, `PageHeader`. Util `lib/cn.ts` para componer clases.

`AuthShell` (`components/auth-shell.tsx`) y `DashboardNav`
(`app/dashboard/dashboard-nav.tsx`, con `aria-current`) son chrome compartido.

## Accesibilidad (WCAG 2.2 AA)

- 1.4.3 contraste de texto, 1.4.11 contraste no-textual (bordes de input).
- 2.4.7/2.4.11 foco visible global por teclado.
- 1.4.1 estados con texto + forma (badges con punto), no solo color.
- 3.1.1 `html lang="es"`.
- 2.3.3 `prefers-reduced-motion`.
- 4.1.3 mensajes de estado anunciados (`Alert live`, `role`/`aria-live`).
- 2.5.8 tamaños de objetivo (botones `h-8`+).

## Invariante

No se modificó lógica, contratos, rutas ni flujos: solo presentación. `tsc` +
`next build` verdes tras el rediseño.
