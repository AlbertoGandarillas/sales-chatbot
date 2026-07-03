# Spec — Correcciones visuales landing Uru (3 fixes)

> **ESTADO: IMPLEMENTADO** (2026-07-03)
>
> **Alcance:** tres fixes puntuales en la landing (`app/page.tsx` + assets/tokens relacionados). **No** es rediseño, **no** cambia funcionalidad, estructura de secciones ni rutas.

---

## 1. Resumen

| Fix | Problema | Archivos principales |
|---|---|---|
| **LF-1** | Logo: U azul sobre teal no funciona | `public/brand/uru-isotipo.svg` |
| **LF-2** | CTAs blancos sin texto legible sobre gradiente | `app/page.tsx`, opcional utilidad CSS |
| **LF-3** | Header glass demasiado translúcido (tema claro) | `app/globals.css`, `app/page.tsx` |

---

## 2. Estado actual (auditoría)

### LF-1 — Logo

Archivo: `public/brand/uru-isotipo.svg`

| Elemento | Color actual | Problema |
|---|---|---|
| Fondo (rect 100×100) | `#00B496` (teal) | OK — mantener |
| Cuerpo burbuja (rect interior + cola) | `#F0E6DC` (crema) | Usuario pide U **blanca** |
| Trazo U | `#0078C8` (azul) | **Eliminar azul** |
| Punto actividad (outer) | `#F0E6DC` | Ajustar |
| Punto actividad (inner) | `#0078C8` (azul) | Cambiar a rosa `#F0B4AA` |

Componente consumidor: `components/brand/uru-logo.tsx` (sin cambio de forma; solo asset SVG).

Favicon: `app/layout.tsx` → mismo SVG.

### LF-2 — Botones sobre gradiente

**Causa raíz:** los CTAs usan `buttonVariants({ variant: 'primary' })`, que aplica `text-primary-foreground` (**blanco**), y luego intentan sobrescribir con `text-foreground` vía `cn()`. En la práctica el texto queda blanco sobre `bg-white` → invisible.

**Botones afectados en `app/page.tsx`:**

| Ubicación | Label | Clases actuales | Estado |
|---|---|---|---|
| Hero | "Empezar con Uru" | `variant: primary` + `bg-white` + `text-foreground` | **Roto** (texto invisible) |
| CTA final | "Crear cuenta gratis" | `variant: primary` + `bg-white` + `text-foreground` | **Roto** |
| Hero secundario | "Ver cómo funciona" | outline + `text-white` sobre gradiente | OK (texto blanco sobre botón semitransparente) |
| Header | "Crear cuenta gratis" | `variant: primary` (fondo azul) | OK |
| Header | "Iniciar sesión" | ghost | OK (sobre glass — depende de LF-3) |

**Botones NO sobre gradiente:** no tocar salvo herencia accidental.

### LF-3 — Header glass

Archivo: `app/globals.css`

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.65);  /* ~65% — demasiado translúcido */
}
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
}
```

Landing header: `app/page.tsx` L139 — `glass-panel` en barra fija `rounded-full`.

**Problema:** al hacer scroll, tarjetas y texto del hero se leen a través del nav.

Dark mode actual: `--glass-bg: rgba(40, 40, 40, 0.75)` — revisar si también requiere más opacidad.

---

## 3. Soluciones detalladas

### LF-1 — Logo: U blanca, destello rosa, sin azul

**Edición SVG** (`public/brand/uru-isotipo.svg`):

| Elemento | Nuevo fill/stroke |
|---|---|
| Fondo | `#00B496` — **sin cambio** |
| Rect interior burbuja | `#FFFFFF` (blanco) |
| Cola burbuja (polygon) | `#FFFFFF` |
| Trazo U (`path`) | `stroke="#FFFFFF"`, sin fill |
| Círculo actividad exterior | `#FFFFFF` (anillo blanco) |
| Círculo actividad interior (destello) | `#F0B4AA` |

**Prohibido:** cualquier `#0078C8` u otro azul dentro del SVG.

**Forma:** idéntica (viewBox, paths, rx — sin rediseño).

**Contraste:** blanco sobre `#00B496` ≈ 3.5:1 en trazo grueso (U iconográfica — aceptable para logo decorativo). Destello rosa sobre blanco/anillo visible en ambos temas.

**Verificación:** header claro (glass crema), footer claro, hero oscuro (gradiente) — el isotipo lleva su propio fondo teal, debe funcionar en todos.

---

### LF-2 — Botones legibles sobre gradiente

**Regla:**

| Fondo del botón | Color del texto |
|---|---|
| Blanco / claro (`#FFFFFF`, crema) | Carbón `#1a1a1e` **o** teal `#00B496` (preferir carbón para AA) |
| Color sólido oscuro (primary azul) | Blanco |
| Semitransparente sobre gradiente | Blanco (como "Ver cómo funciona") |

**Implementación propuesta (mínima):**

1. **No usar** `variant: 'primary'` en CTAs con `bg-white`.
2. Opción A (recomendada): clase utilitaria en `globals.css`:

```css
.btn-on-gradient {
  background: #ffffff;
  color: #1a1a1e;
  font-weight: 600;
}
.btn-on-gradient:hover {
  background: rgba(255, 255, 255, 0.95);
  color: #1a1a1e;
}
```

3. Aplicar en hero + CTA final junto con clases pill/shadow existentes.
4. Header "Crear cuenta gratis": mantener `variant: primary` (azul + texto blanco) — no está sobre gradiente directo.

**Contraste WCAG AA (objetivo):**

| Par | Ratio esperado |
|---|---|
| `#1a1a1e` sobre `#FFFFFF` | ~16:1 ✓ |
| `#FFFFFF` sobre `#0078C8` (header CTA) | ~4.5:1 ✓ (verificar en QA) |
| `#FFFFFF` sobre `bg-white/10` (secundario hero) | N/A — texto sobre gradiente detrás del botón; borde blanco/40 da separación |

**Archivos:** `app/page.tsx`, opcional `app/globals.css` (`.btn-on-gradient`).

**No tocar:** `components/ui/button.tsx` globalmente (solo landing overrides).

---

### LF-3 — Header más opaco y legible

**Tokens light** (`app/globals.css`):

```css
:root, [data-theme="light"] {
  --glass-bg: rgba(250, 246, 242, 0.92);  /* crema ~92% */
  --glass-border: rgba(232, 221, 212, 0.9);
  --glass-shadow: 0 4px 24px rgba(26, 26, 30, 0.08);
}
```

**Tokens dark:**

```css
[data-theme="dark"] {
  --glass-bg: rgba(50, 50, 53, 0.92);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
}
```

**Clase `.glass-panel`:**

```css
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}
```

**Landing header** (`app/page.tsx`): opcional `border-b border-border/40` si hace falta más separación al scroll (evaluar tras token update).

**Links nav** en header: ya usan `text-muted` / hover `text-foreground` — con fondo 92% opaco deben ser legibles. Sin cambio de copy.

**Objetivo:** cristal con blur, pero contenido de fondo **no** readable through.

---

## 4. Fuera de alcance

- Dashboard, admin, auth (excepto favicon compartido vía SVG)
- Rediseño de secciones, copy, gradientes hero
- Nuevo variant global de Button
- Elementos hand-drawn

---

## 5. Criterios de aceptación

- [ ] SVG sin azul; U blanca; destello `#F0B4AA`; fondo teal intacto
- [ ] "Empezar con Uru" y "Crear cuenta gratis" (CTA final) con texto **visible** en claro y oscuro
- [ ] Header legible al scroll sobre hero y secciones (claro + oscuro)
- [ ] `npm run build` verde
- [ ] Sin cambios funcionales (links, rutas, secciones)

---

## 6. Plan de implementación (post-aprobación)

| Paso | Acción | Estimación |
|---|---|---|
| 1 | Editar `uru-isotipo.svg` | 5 min |
| 2 | `.btn-on-gradient` + fix 2 CTAs en `page.tsx` | 10 min |
| 3 | Tokens `--glass-*` + shadow en `globals.css` | 10 min |
| 4 | Verificación visual claro/oscuro | 5 min |

**Un solo PR** — alcance pequeño.

---

## 7. Aprobación

| Item | Aprobado | Notas |
|---|---|---|
| LF-1 Logo (U blanca, rosa destello) | ☐ | |
| LF-2 CTAs (`#1a1a1e` sobre blanco) | ☐ | |
| LF-3 Glass 92% + sombra | ☐ | |
| Iniciar implementación | ☐ | |

> Responde **"aprobado"** (o ajustes) para implementar.

---

## 8. Relación con otros specs

| Spec | Relación |
|---|---|
| `redesign-premium-uru-spec.md` | Corrige deuda visual post-implementación v1 |
| `design-system-v3-uru.md` | Logo doc desactualizado hasta LF-1 |
