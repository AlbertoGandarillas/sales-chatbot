# Spec — Correcciones modo oscuro del dashboard Uru

> **ESTADO: IMPLEMENTADO** (2026-07-03)
>
> **Decisión:** CP-DEST **Opción A** (rosa borde). Header chat `#008f77`. Solo `[data-theme="dark"]`; light sin cambios.

---

## 1. Resumen ejecutivo

| Problema raíz | Impacto |
|---|---|
| `--primary` en dark sigue siendo **azul `#0078C8`** | Nav, links, chips, badges, header chat |
| `--wa-header` azul | Banner conversación choca con marca sin azul |
| `ModeToggle` con `bg-white` hardcodeado + `variant secondary` | Botón invisible (texto blanco sobre blanco) |
| Burbujas bot `#1e3d38` / humano `#1a3348` (tinte azul) | Chat pesado e incoherente |
| Badges usan `text-success` / `text-warning` saturados sobre fondos oscuros | Poco contraste y estados indistinguibles |
| `--info` azul en alerts recurrentes | Fuera de paleta marca |

**Estrategia:** redefinir tokens **solo en `[data-theme="dark"]`**, ajustes mínimos en componentes con clases hardcodeadas (`ModeToggle`), y tokens semánticos de badge/botón que en light mantienen valores actuales.

---

## 2. Paleta recordatorio (modo oscuro)

| Rol | Hex | Uso en dashboard dark |
|---|---|---|
| Teal | `#00B496` | Primario, éxito, header chat, CTAs positivos |
| Rosa | `#F0B4AA` | Destructivo suave, burbuja humano (tinte) |
| Amarillo | `#EBE182` | **Solo** fondos tenues / acentos — no texto pequeño puro |
| Crema | `#F0E6DC` | Texto principal |
| Fondo | `#282828` | Base |
| Superficies | `#323235`, `#202022`, `#1e1e1e` | Jerarquía |
| Bordes | `#3b3b40`, `#4a4a52` | Separadores |
| Azul `#0078C8` | **Prohibido** en componentes sólidos dark | Solo gradientes landing (fuera de alcance) |

---

## 3. FASE 0 — Auditoría por pantalla (modo oscuro)

### 3.1 Shell global (todas las rutas `/dashboard/*`)

| Componente | Problema | Corrección propuesta |
|---|---|---|
| `dashboard-nav.tsx` activo | `border-primary text-primary` → **azul** | Dark: `--primary` → teal `#00B496` |
| `dashboard/layout.tsx` badge catálogo | `tone="primary"` → azul tenue | Hereda `--primary` teal en dark |
| Links `text-primary` (Resumen, etc.) | Azul | Hereda `--primary` teal |
| `ThemeToggle` | OK (bordes surface) | Sin cambio |
| Fondo `--background` `#282828` | OK | Sin cambio |

### 3.2 Resumen (`/dashboard`)

| Componente | Problema | Corrección |
|---|---|---|
| MetricCards | OK con tokens surface | Sin cambio |
| Links "Ver todas" | `text-primary` azul | Token `--primary` teal |
| Badge modo humano | `tone="warning"` — amarillo `#EBE182` como texto sobre `#3d3820` | Token `--badge-warning-fg` crema-ámbar legible |
| Badge bot | `neutral` — OK | Sin cambio |
| Listas conversaciones/pedidos | hover `surface-muted` — OK | Sin cambio |

### 3.3 Conversaciones — lista (`/dashboard/conversaciones`)

| Componente | Problema | Corrección |
|---|---|---|
| Filas lista | OK (surface + border) | Sin cambio |
| Badge "Humano" | `warning` — bajo contraste / confusión con éxito | Sistema badge §5 |
| Badge "Bot" | `neutral` — OK | Sin cambio |

### 3.4 Conversaciones — detalle (`/dashboard/conversaciones/[id]`)

| Componente | Problema | Corrección |
|---|---|---|
| **Header chat** `bg-wa-header` | **Azul `#0078C8`** | `--wa-header: #008f77` o `#00B496` (teal; verificar AA texto blanco) |
| Texto header `text-primary-foreground` | OK si header teal + blanco | Mantener blanco sobre teal |
| Chip recurrente en header | `Badge success` — verde oscuro sobre verde oscuro | Tokens badge §5 |
| **`ModeToggle`** "Pausar bot…" | `variant="secondary"` + `bg-white` + conflicto → **texto invisible** | Clase semántica `.btn-wa-header`: fondo crema/blanco + texto carbón `#1a1a1e`, **sin** variant secondary; o teal sólido + blanco |
| Burbuja **cliente** | `#323235` — OK | Mantener / ligero ajuste `#3a3a3e` |
| Burbuja **bot** | `#1e3d38` — verde casi negro, pesado | `--wa-bubble-out-bot: #2d524c` (teal apagado profundidad media) |
| Burbuja **humano** | `#1a3348` — **tinte azul** | `--wa-bubble-out-human: #3d3538` + borde opcional `border-accent-rose/40` |
| Label bot/humano | `text-wa-bubble-label` teal — OK | Sin cambio |
| Timestamp | `text-muted` — OK | Sin cambio |
| **Confirmar pedido** / **Confirmar pago** | `variant="success"` → `bg-success` teal + `text-white` | Verificar AA; si falla usar `--btn-success-fg` |
| **Enviar** (reply) | Igual success | Idem |
| Badges pedido (Pendiente/Pagado/Pago pendiente/Entrega) | Colores dispares, amarillo vs verde confusos | Sistema §5 |
| **Cancelar pedido** | `variant="danger"` rosa tenue — poco visible | CP-DEST §6 |
| **Marcar entregado** / outline | Borde `#4a4a52` — aceptable | Reforzar `--border-strong` si hace falta |
| Input date / textarea focus | `focus-visible:border-primary` azul | Hereda primary teal |
| Pago confirmado banner | `bg-success-surface text-success` — bajo contraste | `--success-surface` + `--badge-success-fg` |

### 3.5 Catálogo (`/dashboard/catalogo`)

| Componente | Problema | Corrección |
|---|---|---|
| FilterChip activo | `bg-primary` azul | Primary teal (token) |
| Botón "Nuevo producto" | `variant primary` azul | Primary teal |
| Precio promo `text-success` | Teal sobre surface — marginal | `--text-success-emphasis` en dark |
| Badge "Por revisar" | `warning` | Sistema badge §5 |
| Badge "Disponible" | `success` | Sistema badge §5 |
| **Eliminar** | `variant="danger"` — rosa apagado | CP-DEST |
| Checkbox `accent-primary` | Azul nativo browser | `--primary` teal ayuda parcialmente; documentar |

### 3.6 Recurrentes (`/dashboard/recurrentes`)

| Componente | Problema | Corrección |
|---|---|---|
| Filter chips activos | `bg-primary` azul | Primary teal |
| Alert "Hoy tocan…" | `tone="info"` → fondo `#1a3348` **azul** | Dark: `--info` → teal tenue; `--info-surface: #1f4038` |
| Badge Activo/Pausado | success/warning | Sistema badge §5 |
| Badge "Hoy" | `primary` azul | Primary teal |
| **Cancelar** recurrente | `variant="danger"` | CP-DEST |

### 3.7 Perfil (`/dashboard/perfil`)

| Componente | Problema | Corrección |
|---|---|---|
| Formulario | surfaces OK | Sin cambio |
| Checkbox `accent-primary` | Azul | Hereda primary teal |
| Alert success/error | OK con tokens danger/success ajustados | Tokens §4 |

### 3.8 Login / Auth (`/login`, `/signup`, `AuthShell`)

| Componente | Problema | Corrección |
|---|---|---|
| Links primarios | `text-primary` azul | Primary teal en dark |
| Botón submit primary | Azul | Primary teal |
| Fondo auth | `--background` `#282828` — OK | Sin cambio |

> **Nota:** Admin (`/admin/*`) hereda tokens globales; mejorará automáticamente con dark tokens. Fuera de alcance de QA explícito.

---

## 4. Problemas confirmados (usuario) + causa técnica

### DM-1 — Botón "Pausar bot" invisible

**Archivo:** `conversation-client.tsx` L120-127

```tsx
<SubmitButton variant="secondary" className="border border-white/40 bg-white text-foreground ..." />
```

`secondary` aplica `text-secondary-foreground` (blanco). `tailwind-merge` no siempre gana vs `text-foreground` según orden → **texto blanco sobre `bg-white`**.

**Fix:** eliminar `variant="secondary"`; usar clase tokenizada `.btn-wa-header-action` definida en `globals.css` solo relevante en contexto header (fondo `#F0E6DC` o blanco + texto `#1a1a1e`).

### DM-2 — Header conversación azul

**Archivo:** `page.tsx` L109 — `bg-wa-header`

**Token dark actual:** `--wa-header: #0078c8`

**Fix:** `--wa-header: #00B496` (o `#008f77` si AA exige más profundidad — verificar en implementación).

### DM-3 — Burbujas chat

**Tokens dark actuales:**

| Token | Actual | Propuesto |
|---|---|---|
| `--wa-bubble-in` | `#323235` | `#3a3a3e` (neutro, ligero lift) |
| `--wa-bubble-out-bot` | `#1e3d38` | `#2d524c` |
| `--wa-bubble-out-human` | `#1a3348` | `#3d3538` + utilidad `.wa-bubble-human { border: 1px solid rgba(240,180,170,0.35) }` |

### DM-4 — Botones success (Confirmar pedido)

**Archivo:** `button.tsx` — `success: 'bg-success text-white'`

En dark `--success` es `#00B496`. Ratio blanco sobre teal ≈ **3.2:1** (texto grande UI — borderline AA normal text).

**Fix dark:** `--btn-success-bg: #00B496`; `--btn-success-fg: #ffffff`; si AA falla en QA → `--btn-success-fg: #1a1a1e` con fondo `#7ddec8` (teal claro) **solo en dark**.

### DM-5 — Badges de estado

**Archivo:** `badge.tsx` — tonos acoplados a `--success`, `--warning` como **color de texto**.

**Problemas dark:**

| Tone | Clases | Problema |
|---|---|---|
| success | `bg-success-surface text-success` | Verde sobre verde oscuro ~2.5:1 |
| warning | `bg-warning-surface text-warning` | Amarillo puro como texto — inconsistente |
| primary | `bg-primary/10 text-primary` | Azul |
| danger | `bg-danger-surface text-danger` | Rosa sobre rosa 12% — bajo contraste |

### DM-6 — Botones destructivos / secundarios apagados

Danger usa rosa tenue — correcto en filosofía marca pero **poco visible** en dark.

---

## 5. Sistema de badges (modo oscuro)

Nuevos tokens **solo en `[data-theme="dark"]`** (+ defaults en `:root` que preservan light):

| Token | Light (default = actual) | Dark |
|---|---|---|
| `--badge-neutral-bg` | (usa surface-muted) | `#3b3b40` |
| `--badge-neutral-fg` | foreground | `#f0e6dc` |
| `--badge-success-bg` | `#e6f7f4` | `#1f4038` |
| `--badge-success-fg` | `#00b496` | `#8aebd4` |
| `--badge-warning-bg` | `#faf6e8` | `#3d3820` |
| `--badge-warning-fg` | `#9a6700` | `#f5eeb8` |
| `--badge-danger-bg` | rosa 35% | `rgba(240,180,170,0.18)` |
| `--badge-danger-fg` | `#8b4a42` | `#f0b4aa` |
| `--badge-primary-bg` | primary/10 | `rgba(0,180,150,0.18)` |
| `--badge-primary-fg` | primary | `#8aebd4` |
| `--badge-info-bg` | info-surface | `#1f4038` |
| `--badge-info-fg` | info | `#8aebd4` |

**Actualizar `badge.tsx`** para usar `bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]` etc., con fallbacks en `:root` iguales al comportamiento light actual → **light sin cambio visual**.

**Mapeo estados pedido:**

| Estado | Tone |
|---|---|
| Pendiente / Pendiente entrega | `neutral` |
| Confirmado / Pagado / Entregado | `success` |
| Pago pendiente | `warning` |
| Cancelado | `danger` |
| Modo humano (lista) | `warning` |
| Modo bot | `neutral` |

---

## 6. CP-DEST — Acciones destructivas (CHECKPOINT)

**Propuesta recomendada (A)** — coherente con light / landing-fixes:

| Propiedad | Valor dark |
|---|---|
| Fondo | `transparent` o `rgba(240,180,170,0.08)` |
| Borde | `#F0B4AA` (`--danger-border`) |
| Texto | `#F0B4AA` o crema `#F0E6DC` |
| Hover | `bg-accent-rose/20` |

**Sin rojo Material.** Suficiente contraste sobre `#323235` (~4.5:1 rosa sobre oscuro para texto ≥14px).

**Alternativa B:** coral controlado `#C76B5A` **solo** texto destructivo — más urgente visualmente.

**Alternativa C:** outline neutro crema + icono — menos énfasis.

> **Aprobar A / B / C** antes de implementar en Cancelar pedido, Eliminar producto, Cancelar recurrente.

---

## 7. Tokens dark propuestos (bloque `[data-theme="dark"]` completo)

Cambios respecto al bloque actual:

```css
[data-theme="dark"] {
  /* Marca: teal como primario (NO azul) */
  --primary: #00b496;
  --primary-hover: #00a084;
  --primary-foreground: #ffffff;

  --info: #00b496;
  --info-surface: #1f4038;

  /* Chat WA */
  --wa-header: #008f77;           /* teal profundo; AA con blanco */
  --wa-header-fg: #ffffff;
  --wa-bubble-in: #3a3a3e;
  --wa-bubble-out-bot: #2d524c;
  --wa-bubble-out-human: #3d3538;
  --wa-bubble-human-border: rgba(240, 180, 170, 0.35);

  /* Botones */
  --btn-success-bg: #00b496;
  --btn-success-fg: #ffffff;
  --btn-wa-header-bg: #f0e6dc;
  --btn-wa-header-fg: #1a1a1e;

  /* Badges — ver §5 */
  /* ... */

  /* Ring/focus */
  --ring: #00b496;

  /* NO modificar variables del bloque :root / light */
}
```

**`:root` / `[data-theme="light"]`:** **sin cambios.**

---

## 8. Archivos a tocar (implementación)

| Archivo | Cambio |
|---|---|
| `app/globals.css` | Rebloque dark + utilidades `.btn-wa-header-action`, `.wa-bubble-human` |
| `components/ui/badge.tsx` | Tokens semánticos badge (fallbacks light) |
| `components/ui/button.tsx` | Opcional: success usa `var(--btn-success-bg/fg)` con defaults light |
| `app/dashboard/conversaciones/[id]/conversation-client.tsx` | `ModeToggle` — quitar hardcode blanco |
| `app/dashboard/conversaciones/[id]/page.tsx` | Opcional: `text-wa-header-fg` si se tokeniza |
| `app/dashboard/conversaciones/[id]/conversation-client.tsx` | Clase burbuja humano con borde rosa |

**NO tocar:** `app/page.tsx` (landing), contenido light tokens.

---

## 9. Verificación WCAG AA (checklist post-implementación)

| Par | Objetivo |
|---|---|
| Crema `#F0E6DC` sobre `#282828` | ✓ ~11:1 |
| Crema sobre `#323235` | ✓ |
| Blanco sobre `#008f77` header | Verificar ≥4.5:1 (normal) |
| `#8aebd4` sobre `#1f4038` badge success | ≥4.5:1 |
| `#f5eeb8` sobre `#3d3820` badge warning | ≥4.5:1 |
| `#F0B4AA` sobre `#323235` destructive | ≥4.5:1 large text |
| Texto botón Pausar bot (`#1a1a1e` sobre `#F0E6DC`) | ✓ |
| Burbujas: foreground sobre bot/human/in | ≥4.5:1 cada una |

---

## 10. Fases de implementación

| Fase | Entregable |
|---|---|
| **D1** | Tokens dark en `globals.css` (primary, wa-*, badges, buttons) |
| **D2** | `badge.tsx` + verificar light sin regresión |
| **D3** | `ModeToggle` + burbuja humano |
| **D4** | QA visual 7 pantallas × dark; grep azul `#0078c8` en componentes dashboard |

**Un PR.** Estimación: ~2h.

---

## 11. Criterios de aceptación

- [x] Modo claro **pixel-identical** (snapshot manual o comparación side-by-side)
- [x] Cero componentes sólidos azules en dashboard dark
- [x] "Pausar bot" legible
- [x] Header chat teal
- [x] Burbujas coherentes (3 tipos distinguibles)
- [x] Badges pedido distinguibles y legibles
- [x] Confirmar/Cancelar/Destructivos legibles
- [x] Build verde

---

## 12. Aprobación

| Item | Aprobado |
|---|---|
| Spec + auditoría Fase 0 | ☑ |
| CP-DEST destructivas — **Opción A** (rosa borde) | ☑ |
| CP-DEST — Opción B (coral) | ☐ |
| CP-DEST — Opción C (neutro) | ☐ |
| Header chat `#008f77` vs `#00B496` | ☑ `#008f77` |
| Iniciar implementación | ☑ |

> Responde **"aprobado"** + opción CP-DEST (A/B/C) para implementar.

---

## 13. Relación con specs

| Spec | Relación |
|---|---|
| `redesign-premium-uru-spec.md` | Origen tokens v4; este spec corrige deuda dark dashboard |
| `landing-fixes-spec.md` | No afectado (light landing) |
