# Spec — Rediseño visual premium Uru (landing + dashboard)

> **ESTADO: IMPLEMENTADO (v1)** — 2026-07-03
>
> Landing: rediseño premium completo. Dashboard: paleta nueva + estilo app funcional (sin glass pesado).
>
> **Alcance:** rediseño **visual** (estética premium) + alineación total al brandbook Uru **nuevo** (paleta azul/teal/rosa). **NO** cambia funcionalidad, esquema de BD, lógica del agente, webhook ni admin console.
>
> **Metodología:** spec-driven. **No implementar código** hasta aprobación explícita. Implementación fase por fase (R1–R8) con checkpoints.

---

## 1. Resumen ejecutivo

| Qué | Detalle |
|---|---|
| **Objetivo** | Acabado SaaS premium: glassmorphism, luces ambientales, gradientes de marca, microinteracciones, modo claro + oscuro |
| **Reemplazo** | Paleta esmeralda actual (`#00B37E`, menta `#F0FBF6`, etc.) → paleta nueva 100 % vía tokens |
| **Logo** | **Mantener forma** del isotipo U-burbuja existente; solo **recolorear** SVG |
| **Tipografía** | Nunito (marca/titulares/landing); Geist Sans (dashboard cuerpo/datos) |
| **Tagline** | "Vende sin parar" |
| **Voz** | Cálida, peruana, tuteo, frases cortas |

---

## 2. Qué es y qué NO es

### 2.1 Incluido

- Landing (`app/page.tsx` y componentes que usa)
- Dashboard tenant: Resumen, Conversaciones (+ detalle chat), Catálogo, Recurrentes, Perfil
- Auth de acceso tenant: Login, Signup, Forgot/Reset password, Onboarding, `AuthShell`
- Modo claro **y** modo oscuro con toggle
- Primitivos UI compartidos (`components/ui/*`)
- Logo recoloreado + favicon
- Tokens chat WhatsApp (`--wa-*`) alineados a paleta nueva

### 2.2 Excluido (v1 rediseño)

| Área | Motivo |
|---|---|
| `/admin/*` | Consola operador; spec aparte. Opcional pasada visual menor en R8+ si se aprueba |
| `/privacidad`, `/terminos` | Solo heredan tokens globales; sin rediseño de layout |
| Lógica agente, API, BD | Explícitamente fuera de alcance |
| Nuevas secciones de contenido en landing | Reestilizado, no reescritura de arquitectura |
| Elementos hand-drawn complejos | Documentados como mejora posterior (§12) |

---

## 3. Identidad de marca — Paleta nueva

### 3.1 Colores base (reemplazo total)

| Rol | Nombre | Hex | RGB |
|---|---|---|---|
| **Principal** | Azul | `#0078C8` | 0 120 200 |
| **Principal** | Teal | `#00B496` | 0 180 150 |
| **Secundario** | Rosa | `#F0B4AA` | 240 180 170 |
| **Secundario** | Amarillo | `#EBE182` | 235 225 130 |
| **Secundario** | Crema | `#F0E6DC` | 240 230 220 |
| **Oscuro base** | Carbón cálido | `#282828` | 40 40 40 |

### 3.2 Mapeo semántico → tokens CSS

| Token semántico | Modo claro | Modo oscuro | Uso |
|---|---|---|---|
| `--brand-blue` | `#0078C8` | `#0078C8` | Primario, enlaces, CTAs |
| `--brand-teal` | `#00B496` | `#00B496` | Éxito, pedido cerrado, pago confirmado |
| `--brand-rose` | `#F0B4AA` | `#F0B4AA` | Acentos cálidos, fondos suaves |
| `--brand-yellow` | `#EBE182` | `#EBE182` | Destellos, badges acento (**no texto pequeño**) |
| `--brand-cream` | `#F0E6DC` | — | Fondos claros |
| `--background` | `#F0E6DC` o blanco `#FDFBF9` derivado | `#282828` | Fondo página |
| `--surface` | `#FFFFFF` | `#323235` | Tarjetas, paneles |
| `--surface-muted` | `#F0E6DC` / tinte crema | `#202022` | Secciones alternas |
| `--surface-elevated` | `#FFFFFF` + glass | `#1e1e1e` | Header flotante |
| `--foreground` | `#1a1a1e` (carbón) | `#F0E6DC` (crema cálido) | Texto principal |
| `--muted-foreground` | `#5c5c66` | `#b8b0a8` | Texto secundario |
| `--border` | tinte crema/rosa ~15 % | `#3b3b40` | Bordes |
| `--border-strong` | azul/teal 30 % | `#4a4a52` | Bordes activos |
| `--primary` | `= --brand-blue` | `= --brand-blue` | Botones primarios |
| `--primary-hover` | `#0066AA` | `#1a8fd4` | Hover primario |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | Texto sobre primario |
| `--secondary` | `= --brand-teal` | `= --brand-teal` | Acciones secundarias |
| `--success` | `= --brand-teal` | `= --brand-teal` | Estados OK |
| `--accent` | `= --brand-yellow` | `= --brand-yellow` | Highlights |
| `--accent-rose` | `= --brand-rose` | `= --brand-rose` | Acentos cálidos |
| `--ring` | `#0078C8` | `#00B496` | Foco teclado |
| `--danger` | *ver CP-D1* | *ver CP-D1* | Acciones destructivas |
| `--danger-surface` | *ver CP-D1* | *ver CP-D1* | Fondo alertas error |

**Regla:** ningún `#00B37E`, `#F0FBF6`, `#E4F7EE`, `#1E90D6` (legacy) en código tras R8.

### 3.3 Gradientes de marca (3 variaciones)

| Token / clase | Stops |
|---|---|
| `--gradient-1` / `.bg-gradient-1` | Rosa `#F0B4AA` → Teal `#00B496` → Azul `#0078C8` |
| `--gradient-2` / `.bg-gradient-2` | Azul `#0078C8` → Teal `#00B496` → Amarillo `#EBE182` |
| `--gradient-3` / `.bg-gradient-3` | Azul `#0078C8` → Crema `#F0E6DC` → Teal `#00B496` |

**Uso propuesto:**

| Contexto | Gradiente |
|---|---|
| Hero landing | Gradiente 2 + luces ambientales |
| CTA final landing | Gradiente 1 o 2 |
| Bordes hover tarjetas premium | Gradiente 1 (micro-borde) |
| Fondos de impacto secundarios | Gradiente 3 |

Migración nombres legacy → nuevos:

| Legacy (eliminar) | Nuevo |
|---|---|
| `.bg-gradient-citric` | `.bg-gradient-2` |
| `.bg-gradient-fresh` | `.bg-gradient-3` |
| `.bg-gradient-sale` | `.bg-gradient-1` |

### 3.4 Chat WhatsApp (`--wa-*`)

| Token | Modo claro | Modo oscuro |
|---|---|---|
| `--wa-header` | `#0078C8` | `#0078C8` |
| `--wa-header-subtle` | crema/teal 10 % | `#323235` |
| `--wa-chat-bg` | `#F0E6DC` / crema suave | `#282828` |
| `--wa-bubble-in` | `#FFFFFF` | `#323235` |
| `--wa-bubble-out-bot` | teal 12 % `#E6F7F4` | `#1e3d38` |
| `--wa-bubble-out-human` | azul 12 % `#E6F2FA` | `#1a3348` |
| `--wa-bubble-label` | `#0078C8` / `#00B496` | `#00B496` |

---

## 4. Tipografía

| Contexto | Fuente | Pesos |
|---|---|---|
| Marca, landing titulares, tagline | **Nunito** (`.font-brand`) | 400, 600, 700, 800, 900 |
| Dashboard UI, formularios, tablas, chat | **Geist Sans** (actual) | default |
| Código / IDs técnicos | Geist Mono | default |

**Cambio R1:** ampliar carga Nunito en `app/layout.tsx` para incluir peso **700** (hoy: 400, 600, 800, 900).

**Wordmark:** siempre `uru` minúsculas (componente `UruLogo`).

---

## 5. Dirección estética premium

### 5.1 Recursos de estilo (implementar)

| Recurso | Dónde | Implementación |
|---|---|---|
| **Glassmorphism** | Header landing, header dashboard, tarjetas KPI destacadas | `bg-surface/70 backdrop-blur-xl border border-white/20` (claro) / `border-white/10` (oscuro) |
| **Luces ambientales** | Hero landing, opcional CTA | `absolute` divs con `radial-gradient` + `blur-3xl` de azul/teal/rosa, opacidad 20–35 % |
| **Borde gradiente hover** | Cards landing, métricas dashboard | Pseudo-elemento `::before` con gradient-1, `padding: 1px`, `mask-composite` |
| **Microinteracciones** | Botones, cards, nav | `transition` 150–250 ms, `hover:scale-[1.02]` en cards, `active:scale-[0.98]` botones |
| **Cápsulas** | Botones, badges, filtros, nav pills | `rounded-full` en primarios/CTA; `rounded-2xl` en cards |
| **prefers-reduced-motion** | Global | Mantener regla existente en `globals.css` |

### 5.2 Utilidades CSS nuevas (R1)

```css
.glass-panel { /* surface + blur + border semitransparente */ }
.glow-blue { /* radial ambient blue */ }
.glow-teal { /* radial ambient teal */ }
.glow-rose { /* radial ambient rose */ }
.gradient-border-hover { /* borde gradiente al hover */ }
.pill { /* rounded-full para filtros */ }
```

---

## 6. Modo claro y modo oscuro

### 6.1 Estado actual (auditoría)

- **No existe modo oscuro.** Solo `:root` con tokens light en `app/globals.css`.
- No hay `ThemeProvider`, toggle, ni `prefers-color-scheme` hook.
- `<html>` no tiene clase `dark` ni `data-theme`.

### 6.2 Implementación propuesta (R1 + R6)

| Pieza | Descripción |
|---|---|
| **Mecanismo** | Atributo `data-theme="light" \| "dark"` en `<html>` |
| **Persistencia** | `localStorage` key `uru-theme` |
| **Default** | `prefers-color-scheme: dark` del SO si no hay preferencia guardada |
| **Toggle** | Componente `ThemeToggle` en header dashboard; en landing header (icono sol/luna) |
| **Tokens** | `:root { ... }` = claro; `[data-theme="dark"] { ... }` = oscuro |
| **Tailwind v4** | Variables en `@theme inline` referenciando `var(--*)` — un solo puente |

### 6.3 Contraste WCAG AA (verificación obligatoria R6/R8)

| Combinación | Riesgo | Regla |
|---|---|---|
| Amarillo `#EBE182` como texto | **Alto** | Solo fondo/badge/acento |
| Rosa `#F0B4AA` como texto sobre crema | **Alto** | Solo fondo/decoración |
| Blanco sobre azul `#0078C8` | Medio | Verificar texto normal ≥ 4.5:1 (ajustar `--primary-hover` si hace falta) |
| Crema `#F0E6DC` sobre `#282828` | Bajo | Texto oscuro OK en claro; crema OK en oscuro |
| Teal `#00B496` texto blanco | Medio | OK para botones success; verificar en QA |

**Herramienta QA:** checklist manual + (opcional) axe DevTools en R8.

---

## 7. FASE 0 — Auditoría del codebase (sin código)

### 7.1 Tokens y tema actuales

| Archivo | Rol | Paleta actual |
|---|---|---|
| **`app/globals.css`** | **Único archivo de tokens** (Tailwind v4 `@theme inline`) | Esmeralda `#00B37E`, azul `#1E90D6`, amarillo `#FFC633`, fondos menta `#F0FBF6` / `#E4F7EE` |
| `tailwind.config.*` | **No existe** | — |
| `specs/design-system-v3-uru.md` | Documentación legacy esmeralda | Actualizar post-implementación |

**Tokens esmeralda a reemplazar (grep confirmado):** 20+ variables en `:root` + 3 gradientes + 7 tokens `--wa-*`.

**Utilidades existentes:** `.bg-gradient-citric|fresh|sale`, `.font-brand`, focus-visible global, `prefers-reduced-motion`.

### 7.2 Modo oscuro

| Pregunta | Respuesta |
|---|---|
| ¿Existe? | **No** |
| ¿Hay que agregarlo? | **Sí, desde cero** (variables dark + toggle + persistencia) |

### 7.3 Logo Uru existente

| Asset | Ruta | Colores actuales (hardcoded en SVG) |
|---|---|---|
| **Isotipo SVG** | `public/brand/uru-isotipo.svg` | Fondo `#00B37E`, burbuja `#F0FBF6`, trazo U `#00B37E`, punto `#1E90D6` |
| **Componente React** | `components/brand/uru-logo.tsx` | `<Image src="/brand/uru-isotipo.svg">` + wordmark Nunito "uru" |
| **Favicon** | `app/layout.tsx` → `icons.icon: /brand/uru-isotipo.svg` | Mismo SVG |

**Recolor propuesto (sin cambiar paths/forma):**

| Elemento SVG | Actual | Nuevo |
|---|---|---|
| Fondo burbuja (rect 100×100) | `#00B37E` | `#00B496` (teal) |
| Interior chat (rect + cola) | `#F0FBF6` | `#F0E6DC` (crema) |
| Trazo U | `#00B37E` | `#0078C8` (azul) |
| Punto notificación | `#1E90D6` | `#0078C8` (azul) |

**Variante oscuro (R7):** `public/brand/uru-isotipo-dark.svg` — crema `#F0E6DC` interior, fondo `#323235` o teal, para contraste sobre `#282828`. Toggle vía `UruLogo` prop `theme` o CSS `picture/source`.

### 7.4 Inventario de componentes a reestilizar

#### Landing

| Archivo | Contenido / notas |
|---|---|
| `app/page.tsx` | Monolítico: header sticky, hero gradiente, 7 secciones, footer |
| `components/brand/uru-logo.tsx` | Logo + wordmark |
| `components/ui/button.tsx` | CTAs header/hero |
| `components/ui/badge.tsx` | Etiquetas secciones |
| `components/ui/card.tsx` | Features, tipos negocio |
| `components/ui/accordion.tsx` | FAQ |

#### Dashboard — shell

| Archivo | Contenido |
|---|---|
| `app/dashboard/layout.tsx` | Header sticky (avatar letra, nombre, badge vertical, logout) |
| `app/dashboard/dashboard-nav.tsx` | Nav tabs horizontal |

#### Dashboard — páginas

| Ruta | Archivos |
|---|---|
| Resumen | `app/dashboard/page.tsx` |
| Conversaciones lista | `app/dashboard/conversaciones/page.tsx` |
| Conversación detalle | `app/dashboard/conversaciones/[id]/page.tsx`, `conversation-client.tsx` |
| Catálogo | `app/dashboard/catalogo/page.tsx`, `catalog-client.tsx`, `error.tsx` |
| Recurrentes | `app/dashboard/recurrentes/page.tsx`, `recurrentes-client.tsx` |
| Perfil | `app/dashboard/perfil/page.tsx`, `perfil-form.tsx`, `change-password-form.tsx` |

#### Auth / acceso (consistencia con login)

| Archivo | Notas |
|---|---|
| `app/login/page.tsx` | Login tenant |
| `app/signup/page.tsx` | Registro |
| `app/forgot-password/page.tsx` | Recuperación |
| `app/reset-password/page.tsx` | Nueva clave |
| `app/onboarding/page.tsx` | Post-registro |
| `app/onboarding/onboarding-form.tsx` | Form crear negocio |
| `components/auth-shell.tsx` | Layout auth compartido |

#### Catálogo — subcomponentes

| Archivo | Notas |
|---|---|
| `components/catalog/product-thumbnail.tsx` | Miniaturas |
| `components/catalog/product-image-field.tsx` | Upload imagen |

#### Primitivos UI (`components/ui/`)

| Componente | Estado actual | Cambios R2 |
|---|---|---|
| `button.tsx` | `rounded-lg`, variantes primary/outline/danger | Cápsulas en primary/CTA; glass en outline landing; danger → CP-D1 |
| `card.tsx` | Borde simple, shadow-sm | Glass opcional; gradient-border-hover |
| `badge.tsx` | `rounded-full` ✓ | Tonos nuevos (teal success, azul primary) |
| `input.tsx` | `rounded-lg`, border-strong | Focus ring azul; dark surfaces |
| `field.tsx` | Labels | Sin cambio estructural |
| `alert.tsx` | danger/success/warning surfaces | Tokens nuevos; danger → CP-D1 |
| `empty-state.tsx` | Ilustración texto | Acento crema/rosa sutil |
| `skeleton.tsx` | Pulse gris | Adaptar a dark |
| `page-header.tsx` | Título + actions | Nunito en título dashboard (opcional CP-D3) |
| `accordion.tsx` | FAQ landing | Hover/focus premium |

#### Root

| Archivo | Cambios |
|---|---|
| `app/layout.tsx` | Nunito 700; ThemeProvider wrapper; favicon dark/light |
| `app/globals.css` | Reescritura tokens light + dark + utilidades premium |

### 7.5 Colores huérfanos / deuda visual detectada

| Ubicación | Problema |
|---|---|
| `catalog-client.tsx` L478 | `Button variant="danger"` rojo `#C62828` — fuera de paleta |
| `recurrentes-client.tsx` | Botones `variant="danger"` |
| `conversation-client.tsx` | Cancelar pedido `variant="danger"` |
| `dashboard/layout.tsx` L26 | Avatar con inicial en `bg-primary` (esmeralda) — **CP-D3:** ¿reemplazar por isotipo Uru? |
| Hero landing L196 | CTA `bg-white text-foreground` — revisar contraste con nueva crema |
| Hardcoded `border-white/30` en hero | OK; revisar en dark si landing soporta hero oscuro |

---

## 8. Fases de implementación

### R1 — Tokens y tema base

**Entregables:**

- [ ] Reescribir `app/globals.css`: paleta nueva, gradientes 1–3, tokens `--wa-*`, utilidades glass/glow
- [ ] Bloque `[data-theme="dark"]` completo
- [ ] `components/theme/theme-provider.tsx` + `theme-toggle.tsx`
- [ ] Integrar provider en `app/layout.tsx`
- [ ] Nunito pesos 400/600/700/800/900
- [ ] Deprecar clases `.bg-gradient-citric|fresh|sale` (alias temporales → redirigen a nuevas, eliminar en R8)

**Checkpoint R1:** revisar tokens en Storyboard estático (página `/dev/tokens` temporal **opcional** — solo si apruebas; si no, screenshot checklist).

---

### R2 — Primitivos UI

**Entregables:**

- [ ] `Button`: primary cápsula azul; secondary teal outline; ghost; focus visible; hover scale sutil
- [ ] `Card`: variante `glass`; hover gradient border
- [ ] `Badge`: primary=azul, success=teal, warning=ámbar derivado (no amarillo texto)
- [ ] `Input`/`Textarea`: fondos dark; focus `--ring`
- [ ] `Alert`: superficies crema/rosa suaves en info; danger según CP-D1
- [ ] `Skeleton`, `EmptyState`, `Accordion`, `PageHeader`

**No tocar aún:** páginas completas (solo primitivos).

---

### R3 — Landing premium

**Entregables:**

- [ ] Header flotante glassmorphism (sticky, blur, borde sutil)
- [ ] Hero: gradiente 2 + 2–3 luces ambientales blur; tagline Nunito "Vende sin parar"; CTAs cápsula
- [ ] Secciones existentes reestilizadas (Cómo funciona, Funcionalidades, Casos, Para quién, FAQ, CTA final)
- [ ] Cards con hover gradient border + shadow suave
- [ ] Footer en crema/blanco coherente
- [ ] Toggle tema en header landing
- [ ] Copy: **sin cambios de contenido** salvo micro-ajustes de voz si hace falta

**CTAs:** mantener "Crear cuenta gratis" / "Empezar con Uru" / "Iniciar sesión".

---

### R4 — Dashboard shell

**Entregables:**

- [ ] Header glass: logo Uru isotipo + nombre negocio + badge vertical
- [ ] Nav pills con estado activo (azul/teal)
- [ ] Theme toggle
- [ ] Fondo dashboard `--background` crema (claro) / `#282828` (oscuro)
- [ ] **CP-D3:** decisión avatar letra vs isotipo

---

### R5 — Dashboard páginas

| Página | Trabajo |
|---|---|
| **Resumen** | MetricCards glass + gradient hover; tipografía clara |
| **Conversaciones lista** | Filas hover premium; badges modo bot/humano |
| **Conversación detalle** | Header WA azul; burbujas tokens `--wa-*`; botón Pausar bot / Modo humano claro |
| **Catálogo** | Product cards; formulario; botón Eliminar → CP-D1 |
| **Recurrentes** | Tabla/cards; acciones destructivas → CP-D1 |
| **Perfil** | Form sections con cards glass ligeras |

---

### R6 — Pasada modo oscuro completa

- [ ] Landing en dark: hero legible (gradientes más profundos, texto blanco/crema)
- [ ] Dashboard todas las rutas en dark
- [ ] Auth pages en dark
- [ ] Chat: burbujas legibles sobre `#282828`
- [ ] Tabla contraste WCAG AA documentada

---

### R7 — Logo recolor + favicon

- [ ] Actualizar `public/brand/uru-isotipo.svg` (paleta nueva)
- [ ] Crear `uru-isotipo-dark.svg` si necesario
- [ ] `UruLogo`: variant `theme="auto"`
- [ ] Favicon: `icons` en layout (light default; considerar SVG dinámico o PNG 32px)
- [ ] Dashboard header + landing header usan logo recoloreado

**Prohibido:** rediseñar forma del isotipo.

---

### R8 — QA visual + accesibilidad

**Checklist:**

- [ ] Recorrer 14 pantallas × 2 modos (lista §7.4)
- [ ] Grep: cero `#00B37E`, `#00b37e`, `#F0FBF6`, `#E4F7EE`, `#1E90D6`, `#FFC633` en TSX/CSS (excepto spec histórico)
- [ ] WCAG AA pares críticos (§6.3)
- [ ] `prefers-reduced-motion` sin animaciones invasivas
- [ ] Focus visible en todos los interactivos
- [ ] Actualizar `specs/design-system-v3-uru.md` → **v4 premium** o nuevo `design-system-v4-premium-uru.md`
- [ ] Entrada en `specs/CHANGELOG.md`

---

## 9. Checkpoints (aprobar antes de implementar fase)

| ID | Pregunta | Propuesta default |
|---|---|---|
| **CP-D1** | Tratamiento botón **Eliminar** / acciones destructivas | **Opción A (recomendada):** outline rosa `#F0B4AA` + texto carbón/azul oscuro; hover: fondo rosa 20 % + borde teal; **sin rojo Material**. Icono opcional. Alertas error: fondo rosa suave + texto azul oscuro. |
| **CP-D2** | Ubicación toggle tema | Header dashboard **y** header landing (icono). Auth hereda del layout root. |
| **CP-D3** | Avatar dashboard (letra inicial vs logo) | **Isotipo Uru pequeño** junto al nombre del negocio; eliminar cuadrado esmeralda con letra. |
| **CP-D4** | Elementos hand-drawn brandbook | **Diferir** a fase posterior documentada (§12). Hero sin onda hand-drawn en v1. |
| **CP-D5** | Fondo claro base | **Crema `#F0E6DC`** como `--background` vs blanco `#FDFBF9` + crema en `--surface-muted`. Recomendación: **crema full background** (más distintivo premium). |
| **CP-D6** | ¿Incluir `/admin/*` en rediseño? | **No en v1** — hereda tokens globales automáticamente. |

---

## 10. CP-D1 — Acción destructiva (detalle para aprobación)

Hoy `Button variant="danger"` usa `--danger: #C62828` (rojo genérico).

**Propuesta coherente con marca:**

```css
--danger: #B85C50;           /* rosa-teja derivado de #F0B4AA, más oscuro para texto */
--danger-surface: #F0B4AA33; /* rosa 20 % */
--danger-border: #F0B4AA;
--danger-foreground: #1a1a1e;
```

**Botón Eliminar (catálogo):**

- Variante `outline` con borde rosa + texto carbón
- Hover: `bg-accent-rose/20`
- Confirmación implícita: mantener comportamiento actual (submit directo) — **sin modal nuevo** (fuera de alcance)

**Alternativas si rechazas A:**

| Opción | Descripción |
|---|---|
| B | Solo outline azul + icono papelera; texto "Eliminar" en muted |
| C | Teal outline + copy "Quitar del catálogo" (menos agresivo) |

---

## 11. Arquitectura técnica (referencia implementación)

```
app/layout.tsx
  └── ThemeProvider (client)
        └── children (landing | dashboard | auth)

app/globals.css
  ├── :root { light tokens }
  ├── [data-theme="dark"] { dark tokens }
  ├── @theme inline { tailwind bridge }
  └── utilities: .glass-panel, .bg-gradient-{1,2,3}, .gradient-border-hover

components/theme/
  ├── theme-provider.tsx   # context + localStorage + system
  └── theme-toggle.tsx     # sun/moon button
```

**Sin cambiar:** rutas, Server Actions, RLS, agente.

---

## 12. Mejoras posteriores (documentadas, no v1)

| Elemento | Descripción |
|---|---|
| Onda divisora hand-drawn | SVG separador entre secciones landing |
| Círculo imperfecto en titulares | Decoración Nunito display |
| Flecha scroll dibujada | Indicador hero |
| `/admin` pasada visual dedicada | Nav + tablas admin |
| Página `/dev/tokens` | Storybook ligero interno |
| OG image premium | `public/brand/uru-og.png` |

---

## 13. Criterios de aceptación global

- [ ] Paleta esmeralda **100 % eliminada** de UI activa
- [ ] Modo claro y oscuro funcionales con toggle persistente
- [ ] Logo: misma forma, colores nuevos; favicon actualizado
- [ ] Landing mantiene todas las secciones actuales, look premium
- [ ] Dashboard 5 módulos + auth visualmente coherentes
- [ ] WCAG AA verificado en pares críticos (§6.3)
- [ ] Cero cambios en BD, API webhook, lógica agente
- [ ] Build + tests existentes verdes

---

## 14. Orden de PRs sugerido

| PR | Fases | Descripción |
|---|---|---|
| PR1 | R1 + R2 | Tokens, dark mode infra, primitivos |
| PR2 | R3 + R7 | Landing + logo SVG |
| PR3 | R4 + R5 | Dashboard shell + páginas |
| PR4 | R6 + R8 | Dark QA + accesibilidad + docs |

---

## 15. Aprobación

| Item | Aprobado | Fecha | Notas |
|---|---|---|---|
| Spec completo | ☐ | | |
| CP-D1 destructivo | ☐ | | Opción A / B / C |
| CP-D2 toggle ubicación | ☐ | | |
| CP-D3 avatar → isotipo | ☐ | | |
| CP-D4 hand-drawn defer | ☐ | | |
| CP-D5 fondo crema | ☐ | | |
| CP-D6 admin fuera v1 | ☐ | | |
| Inicio R1 | ☐ | | |

> **Siguiente paso:** revisa este spec, responde checkpoints CP-D1 a CP-D6, y confirma **"aprobado"** para comenzar R1.

---

## 16. Relación con specs existentes

| Spec | Relación |
|---|---|
| `design-system-v3-uru.md` | Supersedido por paleta premium (actualizar post-R8) |
| `rebranding-uru-spec.md` | Histórico esmeralda; este spec es **segundo rebrand visual** |
| `specs/README.md` | Añadir entrada al aprobar |
