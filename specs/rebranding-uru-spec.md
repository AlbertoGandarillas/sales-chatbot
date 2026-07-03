# Spec — Rebranding completo: Aynibot → Uru

> **ESTADO: IMPLEMENTADO** (2026-07-02)
>
> **Alcance:** solo marca (textos visibles) e identidad visual (tokens, tipografía de marca, logo, landing). **Sin cambios de funcionalidad**, variables internas, esquema BD ni nombre del repo.
>
> **Metodología:** aprobar este spec → implementar fase por fase (R2…R8) con checkpoint entre fases si se indica.

---

## 1. Resumen ejecutivo

| Antes | Después |
|---|---|
| Marca **Aynibot** | Marca **Uru** (wordmark **uru** minúsculas) |
| Paleta **terracota** (`#9a3412`) | Paleta **esmeralda + azul + amarillo** (brandbook v3) |
| Tipografía única **Geist** | **Geist** en dashboard/UI + **Nunito** en marca/landing |
| Isotipo placeholder **"A"** | Assets oficiales isotipo U-burbuja + wordmark **uru** |
| Tagline implícita / genérica | Tagline oficial: **"Vende sin parar"** |

---

## 2. Brandbook Uru v3 (referencia oficial)

### 2.1 Paleta cromática

| Rol | Nombre | Hex | RGB | Uso en tokens |
|---|---|---|---|---|
| Primario | Esmeralda | `#00B37E` | 0 179 126 | `--primary`, `--success`, `--ring` (propuesto) |
| Secundario | Azul | `#1E90D6` | 30 144 214 | `--info` / `--secondary` (nuevo token) |
| Acento | Amarillo sol | `#FFC633` | 255 198 51 | `--accent` (nuevo token) |
| Éxito | Verde éxito | `#00B37E` | = primario | `--success`, `--success-surface` |
| Fondo suave | Menta | `#E4F7EE` | — | `--surface-muted`, variantes |
| Fondo claro | Blanco menta | `#F0FBF6` | 240 251 246 | `--background` |
| Texto | Carbón | `#15211C` | 21 33 28 | `--foreground` (nunca negro puro) |

### 2.2 Gradientes (elemento distintivo)

| Nombre | Stops | Uso |
|---|---|---|
| **Cítrico** | Esmeralda → Azul → Amarillo sol | Hero landing, momentos de impacto |
| **Fresco suave** | Esmeralda → Azul → Menta | Fondos decorativos, secciones alternas |
| **Venta cerrada** | Esmeralda → Amarillo | Éxito, confirmaciones, CTAs secundarios de logro |

Definir como utilidades CSS reutilizables (ver Fase R5).

### 2.3 Tipografía

| Contexto | Fuente | Pesos |
|---|---|---|
| Marca, landing, titulares, tagline | **Nunito** (Google Fonts) | 400, 600, 800, 900 |
| Dashboard y UI funcional | **Geist Sans** (actual) | Sin cambio |
| Mono (si aplica) | **Geist Mono** (actual) | Sin cambio |

### 2.4 Logotipo

- **Isotipo:** "U" + burbuja de chat + destello (punto de actividad).
- **Wordmark:** siempre **uru** en minúsculas (no "Uru" ni "URU" en el logo).
- En prosa: **Uru** con mayúscula inicial cuando gramaticalmente corresponda.
- **Assets:** los proveerá el cliente (SVG/PNG). **No recrear el logo con CSS/SVG inventado.**

### 2.5 Tagline y voz

- **Tagline:** "Vende sin parar"
- **Tono:** cercano, cálido, peruano, tuteo, frases cortas tipo WhatsApp.
- **Sí:** "¡Hola! ¿Qué se te antoja hoy?", "Tu pedido quedó listo"
- **No:** "Estimado cliente…", "Su orden ha sido procesada exitosamente"

---

## 3. Checkpoints (aprobar antes de implementar fase indicada)

| ID | Pregunta | Default propuesto | Bloquea |
|---|---|---|---|
| **CP-URU1** | Ícono / foto de perfil **WhatsApp Business**: ¿esmeralda `#00B37E` (coherente con paleta nueva) o conservar acento terracota solo ahí? | **Esmeralda** | Fase R6 |
| **CP-URU2** | ¿Actualizar specs históricos (`design-system-v2.md`, `landing-page-v3.md`, etc.) en el mismo PR o en commit aparte post-R8? | **Mismo PR, sección specs al final de R8** | Fase R8 |
| **CP-URU3** | Chat estilo WhatsApp en dashboard (`bg-emerald-700`, burbujas `#d9fdd3`): ¿mantener colores “nativos WA” o alinear header/burbujas al primario Uru? | **Alinear a esmeralda Uru** (casi igual visualmente) | Fase R3 |
| **CP-URU4** | ¿Open Graph / Twitter cards con imagen de marca? | **Sí, slot `/public/og-uru.png`** (asset pendiente) | Fase R2 |
| **CP-URU5** | Placeholder legal `companyName`: ¿`Uru` o razón social jurídica pendiente? | **`Uru` hasta tener RUC/razón social** | Fase R2 |

> **Acción requerida:** responder **CP-URU1** antes de Fase R6 (logo / ícono WA).

---

## 4. FASE R1 — Auditoría (solo lectura; incluida aquí)

Auditoría ejecutada el **2026-07-02** sobre el repo. **No se modificó código.**

### 4.1 Apariciones de "Aynibot" / "[Aynibot]" — código (cara al usuario)

| Archivo | Líneas / contexto | Acción R2 |
|---|---|---|
| `app/layout.tsx` | `metadata.title`: "Aynibot — Agente de ventas por WhatsApp" | → Uru + tagline en description |
| `app/page.tsx` | Header wordmark, hero copy (×4), footer © | → uru / Uru según contexto |
| `app/onboarding/page.tsx` | "empezar a usar Aynibot" | → Uru |
| `app/privacidad/page.tsx` | Header + cuerpo legal (×3) | → Uru |
| `app/terminos/page.tsx` | Header + cuerpo legal (×4) | → Uru |
| `app/globals.css` | Comentario línea 4 "Aynibot — Design tokens" | → Uru |
| `components/auth-shell.tsx` | Logo placeholder "A" + "Aynibot" | → componente Logo (R6) |
| `lib/legal-config.ts` | `companyName: '[Aynibot]'` | → `[Uru]` o `Uru` (CP-URU5) |

**Total código app/components/lib (usuario): 8 archivos, ~20 cadenas visibles.**

### 4.2 Apariciones en specs (documentación; actualizar en R8)

| Archivo | Notas |
|---|---|
| `specs/design-system-v2.md` | Título + referencia terracota |
| `specs/landing-signup-spec-v2.md` | Marca Aynibot explícita |
| `specs/landing-page-v3-spec.md` | Landing Aynibot + terracota |
| `specs/architecture-v2.md` | "Plataforma Aynibot" |
| `specs/sprint-plan-v2.md` | Historial M5 landing |
| `specs/CHANGELOG.md` | Entrada M5 |
| `specs/business-types-unification-spec.md` | 1 mención |
| `specs/production-v1-hardening-spec.md` | Legal placeholder |
| `specs/small-business-commerce-index.md` | Tablas comparativas |
| `specs/promotions-offers-spec.md` | "Promo Aynibot" → "Promo Uru" |
| `specs/whatsapp-rich-messages-spec.md` | "Campo Aynibot" → técnico, puede quedar o renombrar a "plataforma" |

**No renombrar:** nombre del repo `sales-chatbot`, variables de entorno, IDs internos.

### 4.3 Tokens de color actuales (terracota)

**Fuente única de verdad:** `app/globals.css`

| Token CSS | Valor actual (terracota) | Rol |
|---|---|---|
| `--background` | `#faf8f5` | Fondo app |
| `--surface` | `#ffffff` | Tarjetas |
| `--surface-muted` | `#f4f1ec` | Sub-zonas |
| `--foreground` | `#1c1917` | Texto principal |
| `--muted-foreground` | `#57534e` | Texto secundario |
| `--border` | `#e7e2da` | Bordes |
| `--border-strong` | `#b9b2a7` | Bordes input |
| `--primary` | `#9a3412` | **Terracota** |
| `--primary-foreground` | `#ffffff` | Texto sobre primario |
| `--primary-hover` | `#7c2d12` | Hover primario |
| `--ring` | `#c2410c` | Foco |
| `--success` | `#15803d` | Éxito (verde distinto) |
| `--success-surface` | `#ecfdf3` | Fondo éxito |
| `--warning` | `#b45309` | Advertencia |
| `--warning-surface` | `#fef6e7` | Fondo warning |
| `--danger` | `#b91c1c` | Error |
| `--danger-surface` | `#fef2f2` | Fondo error |
| `--info` | `#1d4ed8` | Info |
| `--info-surface` | `#eff4ff` | Fondo info |

Propagación vía `@theme inline` → utilidades Tailwind (`bg-primary`, `text-muted`, etc.).

**Documentación espejo:** `specs/design-system-v2.md` (desactualizar en R8).

### 4.4 Colores hardcodeados fuera de tokens (deuda visual)

| Archivo | Colores | Acción |
|---|---|---|
| `app/dashboard/conversaciones/[id]/page.tsx` | `bg-emerald-700`, `bg-emerald-200`, `bg-[#efeae2]`, `bg-[#d9fdd3]`, clases `stone-*` | R3: migrar header a token primario; burbujas WA pueden quedar como excepción documentada o tokens `--wa-*` |
| `app/dashboard/conversaciones/[id]/conversation-client.tsx` | `text-emerald-900`, `hover:bg-emerald-50` | R3: tokens semánticos |

**No se encontraron** hex terracota (`#9a3412`, `#7c2d12`, `#c2410c`) fuera de `globals.css`.

### 4.5 Tipografía actual

| Archivo | Definición |
|---|---|
| `app/layout.tsx` | `Geist` + `Geist_Mono` via `next/font/google` → `--font-geist-sans`, `--font-geist-mono` |
| `app/globals.css` | `@theme --font-sans: var(--font-geist-sans)` |
| `body` | `font-family: var(--font-sans)` |

**Nunito:** no está cargada hoy.

### 4.6 Componentes que renderizan marca / logo

| Ubicación | Implementación actual |
|---|---|
| `app/page.tsx` | `<span>A</span>` + texto "Aynibot" (header) |
| `components/auth-shell.tsx` | Idem (login, signup, reset password) |
| `app/privacidad/page.tsx`, `app/terminos/page.tsx` | Texto "Aynibot" como link a `/` (sin isotipo) |
| `app/dashboard/layout.tsx` | **Inicial del negocio** (`business.name[0]`), no marca plataforma — **no cambiar a uru** (correcto: muestra tenant) |

**Favicon / OG:** no hay `public/` ni `app/icon.tsx` en el repo; Next.js usa favicon por defecto. **Crear slots en R6/R2.**

### 4.7 Alcance estimado

| Categoría | Archivos a tocar (implementación) |
|---|---|
| Texto marca | ~8 TSX + 1 TS |
| Tokens CSS | 1 (`globals.css`) + posible `design-system-v3-uru.md` |
| Tipografía | `app/layout.tsx` + clases utilitarias landing |
| Logo component | nuevo `components/brand/` |
| Landing rebrand | `app/page.tsx` (principal) |
| Specs docs | ~11 archivos (R8) |

---

## 5. FASE R2 — Cambio de nombre (texto)

### 5.1 Reglas de mayúsculas

| Contexto | Forma |
|---|---|
| Wordmark / logo / header marca | **uru** |
| Prosa, legal, frases | **Uru** |
| Metadata title | `Uru — Vende sin parar` (o similar acordado) |
| Copyright footer | `© {year} Uru` |
| `legal-config.companyName` | `Uru` (CP-URU5) |

### 5.2 Metadata (`app/layout.tsx`)

```typescript
title: "Uru — Vende sin parar"
description: "Agente de ventas por WhatsApp para negocios en Perú. Atiende, cotiza y toma pedidos 24/7."
openGraph: { title, description, siteName: "Uru" }  // si CP-URU4 aprobado
```

### 5.3 Copy landing (ejemplos de reemplazo)

| Antes | Después (borrador) |
|---|---|
| "Empezar con Aynibot" | "Empezar con Uru" |
| "Aynibot responde a tus clientes…" | "Uru responde a tus clientes…" |
| "Lo que Aynibot hace hoy" | "Lo que Uru hace hoy" |
| "Dos negocios reales ya operando con Aynibot" | "…con Uru" |

Aplicar **voz cálida** del brandbook en hero y CTAs (revisión copy ligera, no re-arquitectura de secciones).

### 5.4 Fuera de alcance R2

- Renombrar repo, paquete npm, variables `process.env`, tablas BD, slugs de rutas.
- Cambiar `sales-chatbot` en URLs de Vercel.

### 5.5 Criterios de aceptación R2

- [ ] `grep -i aynibot app/ components/ lib/` → 0 resultados (excepto comentarios históricos si quedan temporalmente)
- [ ] Metadata y `<title>` muestran Uru
- [ ] Legal usa `LEGAL.companyName` actualizado
- [ ] `tsc` + `next build` verdes

---

## 6. FASE R3 — Migración de paleta (tokens centralizados)

### 6.1 Principio

**Un solo archivo:** `app/globals.css` (`:root` + `@theme inline`). Los componentes siguen usando utilidades semánticas; **no** buscar/reemplazar hex en cada TSX salvo excepciones documentadas (chat WA).

### 6.2 Mapeo propuesto terracota → Uru

| Token | Valor nuevo | Notas |
|---|---|---|
| `--background` | `#F0FBF6` | Blanco menta |
| `--surface` | `#FFFFFF` | Blanco puro tarjetas |
| `--surface-muted` | `#E4F7EE` | Menta |
| `--foreground` | `#15211C` | Carbón |
| `--muted-foreground` | `#3D5349` | Derivado carbón ~70% (verificar AA ≥4.5:1) |
| `--border` | `#C5E8D8` | Borde menta oscurecido |
| `--border-strong` | `#7BC4A8` | Borde input ≥3:1 |
| `--primary` | `#00B37E` | Esmeralda |
| `--primary-foreground` | `#FFFFFF` | |
| `--primary-hover` | `#009966` | ~8% más oscuro (calcular exacto en impl.) |
| `--ring` | `#00B37E` | Foco = primario |
| `--success` | `#00B37E` | = primario |
| `--success-surface` | `#E4F7EE` | Menta |
| `--warning` | `#B45309` | Mantener legible sobre blanco (ajustar si hace falta) |
| `--warning-surface` | `#FFF8E6` | Tinte amarillo suave |
| `--danger` | `#C62828` | Mantener accesible |
| `--danger-surface` | `#FFEBEE` | |
| `--info` | `#1E90D6` | Azul secundario |
| `--info-surface` | `#E8F4FD` | |

### 6.3 Tokens nuevos (opcionales en `:root`)

```css
--secondary: #1E90D6;
--accent: #FFC633;
--accent-foreground: #15211C;
```

Exponer en `@theme` como `--color-secondary`, `--color-accent` para landing/gradientes.

### 6.4 Contraste WCAG AA (verificar en implementación)

| Par | Objetivo |
|---|---|
| `--foreground` sobre `--background` | ≥ 4.5:1 |
| `--foreground` sobre `--surface` | ≥ 4.5:1 |
| `--muted-foreground` sobre `--background` | ≥ 4.5:1 |
| `--primary-foreground` sobre `--primary` | ≥ 4.5:1 |
| `--border-strong` vs `--surface` (UI components) | ≥ 3:1 (1.4.11) |
| Texto sobre gradiente cítrico (hero) | Usar texto carbón/blanco según zona; validar por sección |

Documentar ratios medidos en PR o en `specs/design-system-v3-uru.md`.

### 6.5 Chat WhatsApp (excepción)

Crear tokens opcionales `--wa-chat-bg`, `--wa-bubble-out`, `--wa-bubble-in`, `--wa-header` mapeados a esmeralda Uru + neutros WA, para eliminar `emerald-*` y hex sueltos en `conversaciones/[id]/page.tsx`.

### 6.6 Criterios de aceptación R3

- [ ] `globals.css` actualizado; ningún `--primary: #9a3412`
- [ ] Dashboard, login, catálogo usan tokens (sin regresión visual grave)
- [ ] Contraste AA verificado en combinaciones críticas
- [ ] Chat conversación usa tokens `--wa-*` o primario Uru

---

## 7. FASE R4 — Tipografía

### 7.1 Implementación

1. En `app/layout.tsx`:
   - Mantener `Geist` / `Geist_Mono` como hoy.
   - Agregar `Nunito` con `subsets: ['latin']`, `weight: ['400','600','800','900']`, variable `--font-nunito`.

2. En `globals.css`:
   ```css
   --font-brand: var(--font-nunito);
   ```

3. Clase utilitaria (Tailwind v4):
   ```css
   .font-brand { font-family: var(--font-brand), var(--font-sans), sans-serif; }
   ```

### 7.2 Dónde aplicar Nunito

| Sí (`.font-brand`) | No (Geist actual) |
|---|---|
| Landing: hero, titulares sección, tagline | Dashboard nav, tablas, forms |
| Auth shell: wordmark **uru** | Inputs, botones dashboard |
| Legal: títulos H1/H2 opcional | Conversation chat UI |
| Onboarding: título principal | Metadata monospace |

### 7.3 Criterios de aceptación R4

- [ ] Nunito carga sin FOIT excesivo (next/font)
- [ ] Dashboard conserva Geist en body
- [ ] Landing titulares usan Nunito 800/900

---

## 8. FASE R5 — Gradientes y elementos gráficos

### 8.1 Definición en `globals.css`

```css
:root {
  --gradient-citric: linear-gradient(135deg, #00B37E 0%, #1E90D6 50%, #FFC633 100%);
  --gradient-fresh: linear-gradient(135deg, #00B37E 0%, #1E90D6 60%, #E4F7EE 100%);
  --gradient-sale: linear-gradient(135deg, #00B37E 0%, #FFC633 100%);
}

.bg-gradient-citric { background: var(--gradient-citric); }
.bg-gradient-fresh { background: var(--gradient-fresh); }
.bg-gradient-sale { background: var(--gradient-sale); }
```

### 8.2 Aplicación

| Elemento | Gradiente |
|---|---|
| Hero landing | **Cítrico** (+ overlay legibilidad texto) |
| Sección CTA final | **Venta cerrada** o cítrico suave |
| Badges / highlights opcionales | Acento amarillo |

### 8.3 Trama burbujas de chat (brandbook)

**Mejora posterior (no bloqueante):** patrón SVG/CSS de burbujas en fondos. Documentar en `design-system-v3-uru.md` como P2 visual.

### 8.4 Criterios de aceptación R5

- [ ] 3 gradientes definidos como utilidades
- [ ] Hero landing usa gradiente cítrico
- [ ] Texto hero legible (contraste)

---

## 9. FASE R6 — Logo e íconos

### 9.1 Componente nuevo

```
components/brand/uru-logo.tsx
components/brand/uru-isotipo.tsx
```

**Props:** `variant: 'full' | 'isotipo'`, `size: 'sm' | 'md' | 'lg'`, `className?`

**Assets esperados (cliente):**

| Archivo | Uso |
|---|---|
| `public/brand/uru-isotipo.svg` | Isotipo U-burbuja |
| `public/brand/uru-wordmark.svg` | Wordmark **uru** |
| `public/brand/uru-logo-full.svg` | Isotipo + wordmark |
| `public/favicon.ico` o `app/icon.png` | Favicon |
| `public/brand/uru-og.png` (1200×630) | Open Graph (CP-URU4) |
| `public/brand/uru-wa-profile.png` | Foto perfil WhatsApp (640×640) — color según **CP-URU1** |

**Placeholder hasta assets:**

```tsx
{/* PLACEHOLDER_URU_LOGO — reemplazar cuando existan assets en /public/brand/ */}
<div className="flex items-center gap-2 font-brand text-xl font-black tracking-tight">
  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">u</span>
  <span>uru</span>
</div>
```

Marcado claramente en código y en este spec.

### 9.2 Dónde aplicar

| Ubicación | Componente |
|---|---|
| Landing header | `<UruLogo variant="full" />` |
| Auth shell | `<UruLogo variant="full" size="md" />` |
| Legal header | `<UruLogo variant="full" size="sm" />` o link texto **uru** |
| Dashboard layout | **Sin cambio** (muestra nombre del negocio tenant) |
| Favicon | `app/icon.tsx` o `public/favicon.ico` → asset |
| WhatsApp perfil | **Manual** en Meta Business Suite con PNG provisto |

### 9.3 Criterios de aceptación R6

- [ ] Componente logo con slots documentados
- [ ] Placeholder visible hasta reemplazo de assets
- [ ] Favicon apunta a asset (o placeholder esmeralda temporal)
- [ ] CP-URU1 resuelto para ícono WA

---

## 10. FASE R7 — Landing (rebranding visual completo)

### 10.1 Alcance

- Aplicar identidad Uru a `app/page.tsx` **sin re-arquitectura de secciones** (mantener: header, hero, cómo funciona, funcionalidades, FAQ, footer).
- Hero: gradiente cítrico, wordmark **uru**, tagline **"Vende sin parar"**, Nunito en titulares.
- CTAs: primario esmeralda; secundarios outline.
- Eliminar blob decorativo terracota (`bg-primary/10 blur`) → sustituir por elemento acorde (gradiente / fresco suave).
- Copy alineado a voz cálida (tuteo, frases cortas).

### 10.2 Fuera de alcance R7

- Nuevas secciones de pricing, testimonios inventados, animaciones complejas.
- Cambiar flujo signup/onboarding.

### 10.3 Criterios de aceptación R7

- [ ] Landing refleja paleta Uru + gradiente + Nunito + tagline
- [ ] Estructura de anclas (#como-funciona, etc.) intacta
- [ ] Links legales y CTAs funcionan
- [ ] Responsive sin regresiones

---

## 11. FASE R8 — QA visual y documentación

### 11.1 Checklist grep

```bash
# Debe retornar 0 en código de producción:
rg -i "aynibot" app/ components/ lib/
rg "#9a3412|#7c2d12|#c2410c" app/ components/
```

### 11.2 Pantallas clave (smoke visual)

| Pantalla | Verificar |
|---|---|
| `/` Landing | Gradiente, uru, tagline, Nunito |
| `/signup`, `/login` | Auth shell + logo |
| `/dashboard` | Geist intacto, tokens nuevos |
| `/dashboard/catalogo` | Badges, botones primarios |
| `/dashboard/conversaciones/[id]` | Chat + header |
| `/dashboard/perfil` | Forms |
| `/privacidad`, `/terminos` | Uru + legal |

### 11.3 Accesibilidad

- [ ] Foco visible (`--ring`) sigue perceptible
- [ ] `prefers-reduced-motion` intacto
- [ ] Badges con `dot` (no solo color)
- [ ] Contraste AA documentado

### 11.4 Actualización specs

- Crear `specs/design-system-v3-uru.md` (nuevo estándar).
- Marcar `design-system-v2.md` como superseded o actualizar encabezado.
- Entrada en `specs/CHANGELOG.md`.
- Actualizar menciones Aynibot en specs listados en §4.2 (texto "Uru" / "plataforma").
- Agregar entrada en `specs/README.md`.

### 11.5 Criterios de aceptación R8

- [ ] QA checklist completo
- [ ] `tsc` + `next build` + `npm test` verdes
- [ ] CHANGELOG + design system v3 publicados

---

## 12. Orden de implementación recomendado

```
R2 (texto) ──► R3 (tokens) ──► R4 (Nunito) ──► R5 (gradientes)
       │                                              │
       └──────────────────► R6 (logo placeholder) ◄──┘
                                    │
                                    ▼
                              R7 (landing)
                                    │
                                    ▼
                              R8 (QA + specs)
```

**Dependencias:**
- R7 depende de R3, R4, R5, R6 (placeholder).
- R6 assets finales pueden swaparse sin rehacer R7 si el componente está bien abstraído.

**Entregables por PR (sugerido):**
1. PR1: R2 + R3 (nombre + tokens) — mayor impacto
2. PR2: R4 + R5 + R6 placeholder
3. PR3: R7 landing
4. PR4: R8 + specs + assets finales del cliente

O un solo PR si prefieres atomicidad de marca.

---

## 13. Invariantes (no romper)

- Lógica agente, webhook, tools, BD, RLS, cron recurrentes.
- Nombre del repositorio y variables internas.
- Dashboard muestra **nombre del negocio** del tenant, no "uru" como plataforma.
- Geist en UI operativa del dashboard.
- No inventar SVG del logo oficial.

---

## 14. Entregables post-aprobación

| Entregable | Fase |
|---|---|
| Tokens Uru en `globals.css` | R3 |
| `components/brand/uru-logo.tsx` | R6 |
| Landing rebrand | R7 |
| `specs/design-system-v3-uru.md` | R8 |
| Assets en `/public/brand/*` | Cliente + R6 |

---

## 15. Aprobación

| Checkpoint / fase | Aprobado | Fecha | Notas |
|---|---|---|---|
| **CP-URU1** (ícono WA) | ☑ | 2026-07-02 | Esmeralda — sin terracota |
| **CP-URU3** (chat WA colors) | ☑ | 2026-07-02 | Tokens `--wa-*` alineados a Uru |
| **CP-URU5** (legal name) | ☑ | 2026-07-02 | `Uru` |
| **CP-URU2** (specs históricos) | ☑ | 2026-07-02 | Actualizados en R8 |
| Spec completo | ☑ | 2026-07-02 | |
| Inicio R2–R8 | ☑ | 2026-07-02 | |

> **Siguiente paso:** revisa este spec, responde los checkpoints (especialmente **CP-URU1**), y confirma aprobación para comenzar implementación fase R2.
