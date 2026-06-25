# Landing Page v3 — Spec (ampliación)

> **Metodología spec-driven.** Este documento se aprueba ANTES de tocar código.
> Es una **ampliación** del landing existente (`app/page.tsx`), no un reemplazo.
> Todo el contenido es verificable contra el inventario real de funcionalidades.
> Diseño 100% sobre el sistema ya implementado (tokens terracota + `components/ui/`).

---

## 1. Objetivo

Elevar el landing de Aynibot con la **claridad expositiva** de un producto maduro
(estructura inspirada en yavendio.com/pe: cómo funciona → funcionalidades → para
quién → FAQ), pero con **contenido 100% verídico** de lo que Aynibot hace hoy.

### Reglas de contenido (no negociables)
- ❌ Sin cifras de impacto inventadas (marcas, facturación, % de conversión).
- ❌ Sin testimonios inexistentes.
- ❌ Sin integraciones no construidas (Instagram, Messenger, Mercado Pago, campañas
  masivas, recuperación de carritos, "coach de IA").
- ❌ Sin plan de precios self-serve con tiers (no existe billing). Ver CHECKPOINT 1.
- ✅ Cada afirmación rastreable al inventario A–I.

---

## 2. Estado actual (lo que NO se elimina)

`app/page.tsx` hoy tiene, en este orden:
1. **Header** (marca "A" + Aynibot, botones Iniciar sesión / Crear cuenta gratis).
2. **Hero** (badge "Hecho para negocios en Perú", H1, subtítulo, 2 CTAs).
3. **Casos de uso** (2 `<article>`: panaderías / retail Shopify) sobre `bg-surface-muted`.
4. **CTA final** (H2 + botón "Crear cuenta gratis").
5. **Footer** (copyright).

Todo esto **se conserva**. Las secciones nuevas se insertan en el flujo y la sección
de casos de uso (3) se **enriquece** (no se duplica).

### Orden final propuesto del landing
1. Header (se le añaden anclas de navegación — ver §4.0)
2. Hero (igual)
3. **Cómo funciona** (NUEVA)
4. **Funcionalidades** (NUEVA)
5. **Casos de uso** (AMPLIACIÓN de la sección existente: Cruje / Betta)
6. **Para qué negocios es** (NUEVA)
7. **Preguntas frecuentes** (NUEVA)
8. CTA final (igual, copy opcionalmente reforzado)
9. Footer (igual)

---

## 3. Sistema de diseño a reutilizar (sin estilos nuevos)

- **Tokens**: `bg-background`, `bg-surface`, `bg-surface-muted`, `text-foreground`,
  `text-muted`, `border-border`, `border-border-strong`, `bg-primary`,
  `text-primary`, `text-primary-foreground`, `rounded-card`, sombras `shadow-sm`/
  `hover:shadow-md`. Acento = terracota (`--primary`).
- **Componentes**: `Card` / `CardHeader` / `CardTitle` / `CardContent`, `Badge`
  (con `dot`), `buttonVariants()` para los `<Link>` CTA. Tipografía Geist heredada.
- **Patrones existentes**: mismas tarjetas `rounded-card border border-border bg-surface`,
  badges tipo "pill", glow `bg-primary/10 blur-3xl` del hero.
- **Accesibilidad**: foco visible global ya existe; respetar `prefers-reduced-motion`;
  contraste AA con los tokens; jerarquía de headings correcta (un solo `h1`, luego
  `h2` por sección, `h3` dentro).

### Componente nuevo necesario: `Accordion` (FAQ)
No existe acordeón. Se crea `components/ui/accordion.tsx` siguiendo el mismo patrón
de los demás primitivos:
- Implementación **nativa accesible** con `<details>`/`<summary>` (teclado y
  screen-reader gratis, sin JS, sin dependencias).
- Estilo con tokens: `rounded-card border border-border bg-surface`, `summary` con
  `cursor-pointer`, ícono chevron que rota (`transition-transform`, anulado por
  `prefers-reduced-motion`), `text-foreground` en pregunta y `text-muted` en
  respuesta.
- Se exporta desde `components/ui/index.ts`.
- API propuesta:
  ```tsx
  <Accordion>
    <AccordionItem question="¿…?">Respuesta…</AccordionItem>
  </Accordion>
  ```

---

## 4. Especificación por sección

### 4.0 Header — anclas de navegación (mejora menor)
Añadir, solo en `sm:` hacia arriba, enlaces de ancla antes de los botones:
`Cómo funciona` (#como-funciona), `Funcionalidades` (#funcionalidades),
`Preguntas` (#faq). Estilo `text-sm text-muted hover:text-foreground`. En móvil se
ocultan (los botones quedan). Cada sección nueva lleva su `id` para el scroll.

### 4.1 "Cómo funciona" (`id="como-funciona"`)
- **Fuente**: inventario A, E, B, C, H.
- **Layout**: H2 + grid de 4 pasos (`grid sm:grid-cols-2 lg:grid-cols-4`), cada paso
  en una tarjeta con un círculo `bg-primary text-primary-foreground` numerado (1–4).
- **Copy (borrador verídico)**:
  - **Paso 1 — Conecta tu WhatsApp**: "Usa tu número de WhatsApp Business sobre la
    API oficial de Meta (Cloud API). Nada de bots no oficiales."
  - **Paso 2 — Arma tu catálogo**: "Carga tus productos a mano, o sincronízalos
    automáticamente desde Shopify si tienes tienda."
  - **Paso 3 — El agente atiende**: "Responde, cotiza, toma pedidos y registra
    encargos personalizados 24/7, con la info real de tu catálogo."
  - **Paso 4 — Tú supervisas**: "Sigues todo desde el dashboard y tomas el control
    de cualquier conversación cuando lo necesites."

### 4.2 "Funcionalidades" (`id="funcionalidades"`)
- **Fuente**: inventario B, C, D, E, F (una tarjeta por punto).
- **Layout**: H2 + grid de tarjetas `Card` (`grid sm:grid-cols-2 lg:grid-cols-3`).
- **Tarjetas (título + 1–2 líneas, honesto)**:
  1. **Agente de ventas con IA** (B): "Busca productos, cotiza, toma pedidos y
     consulta el estado con fecha estimada de entrega — sin inventar precios."
  2. **Encargos y variantes** (B): "Gestiona encargos personalizados en panaderías
     y comunica rangos de talla/color en retail."
  3. **Control humano cuando hace falta** (C): "Pausa el bot y responde tú desde el
     dashboard; o el agente escala solo cuando algo se sale de su alcance."
  4. **Dashboard de operación** (D): "Resumen de pedidos y costo de IA del mes,
     conversaciones en vivo estilo chat, catálogo y perfil del negocio."
  5. **Catálogo sincronizado con Shopify** (E): "Lee tus productos desde Shopify y
     se actualiza con un botón. (Solo tiendas Shopify.)"
  6. **Confirmación de pagos** (F): "Marca pagos de Yape o depósito como confirmados,
     con una nota de referencia. Verificación manual, sin procesar comprobantes."
- Nota: cada tarjeta puede llevar un `Badge` de categoría (p.ej. "IA", "Operación",
  "Catálogo", "Pagos") usando los tonos existentes; sin color nuevo.

### 4.3 "Casos de uso" — ampliación de la sección existente
- **Fuente**: inventario I (Cruje, Betta) — **sin cifras ni datos reales**.
- Se mantienen las 2 tarjetas, pero se enriquecen:
  - `Badge` de vertical ("Panadería" / "Retail Shopify").
  - Título del negocio como **ejemplo de tipo** ("Cruje — panadería", "Betta —
    retail de zapatillas en Shopify").
  - Descripción del **tipo de flujo** que automatiza, no resultados:
    - **Cruje**: "Toma pedidos del catálogo y arma encargos de tortas con fecha de
      entrega, avisando al dueño cuando entra un pedido especial."
    - **Betta**: "Sincroniza el catálogo desde Shopify y atiende consultas de modelo,
      talla y color, armando el pedido para que el equipo confirme disponibilidad."
  - Frase de encuadre honesta: "Dos negocios reales ya operando con Aynibot."
    (Sin números.)

### 4.4 "Para qué negocios es" (`id="para-quien"`)
- **Fuente**: inventario A, E + honestidad de alcance.
- **Layout**: H2 + 2 tarjetas (panaderías / tiendas Shopify) + **nota honesta** en
  un recuadro `bg-surface-muted text-muted`:
  - Tarjeta 1: "Panaderías y pastelerías — catálogo + encargos personalizados."
  - Tarjeta 2: "Tiendas Shopify (retail) — catálogo de productos con variantes de
    talla y color."
  - **Nota**: "Hoy Aynibot está enfocado en estos dos tipos de negocio. Si el tuyo
    es distinto, escríbenos y lo evaluamos." (Evita el "para cualquier negocio".)

### 4.5 "Preguntas frecuentes" (`id="faq"`)
- **Fuente**: inventario E, C, H, F + CHECKPOINT 1.
- **Layout**: H2 + `Accordion` (nuevo componente).
- **Preguntas y respuestas (borrador verídico)**:
  1. **¿Necesito tener mi tienda en Shopify?** — "Solo si quieres el catálogo
     sincronizado de retail. Las panaderías cargan su catálogo a mano y no necesitan
     Shopify."
  2. **¿Qué pasa si un cliente necesita algo muy particular?** — "El agente deriva la
     conversación a una persona, o tú tomas el control desde el dashboard y respondes
     directamente por WhatsApp."
  3. **¿Es un WhatsApp oficial o hay riesgo de bloqueo?** — "Es oficial: funciona
     sobre la API de WhatsApp de Meta (Cloud API), no un bot no oficial."
  4. **¿Cómo se confirman los pagos?** — "Por ahora con Yape o depósito: tu cliente
     paga y tú confirmas el pago manualmente desde el dashboard, con una nota de
     referencia. No procesamos comprobantes automáticamente."
  5. **¿Cómo se cobra el servicio?** — (depende de CHECKPOINT 1) borrador honesto:
     "Conversemos sobre tu negocio y armamos un plan a tu medida."

### 4.6 CTA final
- Se conserva el CTA "Crear cuenta gratis". Copy opcionalmente reforzado
  (criterio del implementador), por ejemplo: "Empieza con tu catálogo y tu WhatsApp;
  nosotros te acompañamos en la conexión." Mismo botón y ruta `/signup`.

---

## 5. Archivos afectados

| Archivo | Cambio |
|---|---|
| `app/page.tsx` | Añadir secciones 4.1–4.5, anclas de header, enriquecer casos de uso. Conservar hero/CTA/footer. |
| `components/ui/accordion.tsx` | **Nuevo** primitivo `Accordion`/`AccordionItem` (nativo `<details>`). |
| `components/ui/index.ts` | Exportar `Accordion`, `AccordionItem`. |
| `specs/CHANGELOG.md` | Entrada del cambio (tras implementar). |

Sin cambios en lógica, rutas, datos ni componentes de negocio. Solo presentación.

---

## 6. Fuera de alcance (explícito)
- Sección "Planes y precios" con tiers fijos (no hay billing self-serve).
- Cualquier integración no construida.
- Cifras, testimonios, logos de clientes.
- Cambios en el sistema de diseño (paleta/tokens).

---

## 7. Criterios de aceptación
- [ ] Las secciones nuevas usan solo tokens/componentes existentes (sin paleta nueva).
- [ ] Todo el copy es verificable contra el inventario A–I; cero cifras inventadas.
- [ ] FAQ accesible por teclado (`<details>`), respeta `prefers-reduced-motion`.
- [ ] Jerarquía de headings correcta y contraste AA.
- [ ] El hero, CTA y footer actuales se conservan.
- [ ] `tsc` + `next build` verdes.

---

## 8. CHECKPOINTS (requieren tu decisión antes de implementar)

**CHECKPOINT 1 — Precios en el FAQ y/o sección de precios**
¿Cómo trato el tema de precios?
- (a) Mantenerlo abierto: "Conversemos y armamos un plan a tu medida" (sin sección
  de precios). ← *recomendado, es lo verídico hoy*
- (b) Igual abierto, pero añadir un **rango referencial** (dime el rango y la unidad,
  p.ej. "desde S/ X al mes" o "según volumen de conversaciones").
- (c) Otra indicación tuya.

**CHECKPOINT 2 — Anclas de navegación en el header**
¿Agrego los enlaces de ancla (Cómo funciona / Funcionalidades / Preguntas) en el
header? (mejora la navegación; en móvil se ocultan). Sí / No.

**CHECKPOINT 3 — Nombrar a Cruje y Betta**
¿Los menciono por nombre como ejemplos de tipo de negocio (sin cifras ni datos), o
prefieres describirlos genéricamente ("una panadería", "una tienda de zapatillas en
Shopify") sin nombres propios?
