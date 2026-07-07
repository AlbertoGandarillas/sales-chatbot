# Spec — Acciones por lote y revisión rápida en catálogo

> **ESTADO: IMPLEMENTADO** (2026-07-07)
>
> Mejora UX del catálogo para **todos los clientes** (`catalog_source`: `manual` y `shopify`). Las acciones de revisión aplican donde exista `needs_review` (principalmente Shopify); las acciones operativas por lote (disponible, ocultar, eliminar) aplican a **ambos** verticales (ej. Cruje manual, Betta Shopify).
>
> **Referencias:** `catalog-ingestion-spec-v2.md`, `team-notifications-catalog-spec.md`, `design-system-v3-uru.md`, `catalog-client.tsx`

---

## 1. Problema

### 1.1 Catálogo Shopify (todos los clientes `shopify`)

Tras importar o resincronizar:

- Los productos entran con badge **Por revisar** (`needs_review = true`).
- Quitarlo hoy requiere **Editar → Guardar** uno por uno.
- Con decenas o cientos de SKUs (Betta y cualquier tienda Shopify) es inviable.

### 1.2 Catálogo manual (todos los clientes `manual`)

- Los productos creados a mano suelen tener `needs_review = false`.
- Igual necesitan **acciones por lote** operativas: poner varios **disponibles** u **ocultos**, o **eliminar** (ej. Cruje al limpiar temporada, rotar menú, quitar ítems descontinuados).
- Hoy solo existe eliminar **un producto a la vez**.

### 1.3 UX actual y anti-patrón a evitar

La lista ya usa **tarjetas** (`rounded-card`, thumbnail, badges) — alineado con el dashboard Uru. **No** convertir esto en:

- Tabla HTML con columnas checkbox / SKU / precio / acciones.
- Filas zebra tipo WordPress / WooCommerce admin.
- Checkboxes siempre visibles en cada fila (ruido visual).

El modo selección debe sentirse como **Gmail, Notion o Apple Photos**: opcional, limpio, barra flotante contextual.

---

## 2. Alcance por tipo de negocio

| Funcionalidad | `manual` | `shopify` |
|---------------|----------|-----------|
| Modo selección + lote **Mostrar / Ocultar** | ✓ | ✓ |
| Modo selección + lote **Eliminar** | ✓ | ✓ |
| Marcar **revisado** (individual o lote) | ✓ si el producto tiene `needs_review` | ✓ |
| **Confirmar todos por revisar** | ✓ si `reviewCount > 0` | ✓ (caso principal post-resync) |
| Copy sobre resync en confirmaciones | — | ✓ |

**Regla:** las acciones de lote operativas no dependen de `catalog_source`; solo las de **revisión** dependen del flag `needs_review` (casi siempre Shopify).

---

## 3. Objetivos

| # | Objetivo | Manual | Shopify | Prioridad |
|---|----------|--------|---------|-----------|
| O1 | Modo selección elegante (no grilla) | ✓ | ✓ | P0 |
| O2 | Lote: disponible / ocultar / eliminar | ✓ | ✓ | P0 |
| O3 | Marcar revisado individual (sin Editar) | si aplica | ✓ | P0 |
| O4 | Confirmar todos / lote revisados | si aplica | ✓ | P0 |
| O5 | Eliminar lote con confirmación fuerte | ✓ | ✓ | P1 |

**No romper:** tarjetas actuales, inline precio/disponibilidad, `saveProduct`, `resyncCatalog`, roles (`catalog` escribe, `operator` solo lectura).

---

## 4. Principios de UI/UX (design system Uru)

### 4.1 Lo que mantenemos

- Lista de **tarjetas** horizontales (thumbnail + nombre + badges + controles rápidos).
- **Filter chips** existentes: `Todos (N)` · `Por revisar (N)`.
- Tokens `rounded-card`, `border-border`, `primary` esmeralda, `Badge` semánticos.
- Edición inline de precio/disponibilidad sin cambios.

### 4.2 Lo que NO hacemos

| Anti-patrón | Alternativa Uru |
|-------------|-----------------|
| Tabla con `<table>` y 8 columnas | Tarjetas apiladas con `space-y-2` |
| Checkbox fijo a la izquierda siempre | Modo selección **activable** |
| Barra gris pegada bajo el header WP | **Barra flotante** (pill) sobre el contenido |
| Botones "Apply" en dropdown confuso | Acciones con icono + texto corto en la barra |
| Seleccionar = click en checkbox 2px | Tap en **toda la tarjeta** en modo selección |

### 4.3 Modo selección (patrón principal)

**Entrada:** botón **Seleccionar** en la barra de herramientas del catálogo (junto a Nuevo producto / Resincronizar). Solo si `canWrite`.

**Estado activo:**

- El botón pasa a **Listo** (sale del modo).
- Las tarjetas muestran:
  - Anillo sutil `ring-2 ring-primary/40` o borde izquierdo `border-l-4 border-primary` cuando están seleccionadas.
  - Icono check circular en la esquina del thumbnail (no checkbox HTML crudo en columna aparte).
- **Tap en tarjeta** = alternar selección (no abre Editar).
- Los controles inline (precio, switch disponible, Editar, Eliminar individual) se **ocultan** en modo selección para evitar conflictos.

**Seleccionar visibles:** chip/link en la barra flotante o menú `⋯` del modo: *"Todos en esta vista (N)"* — respeta filtro activo (Todos / Por revisar).

**Salida:** **Listo**, Esc, o barra *"Limpiar"*.

### 4.4 Barra flotante de acciones (bulk)

Aparece **solo** en modo selección cuando `selectedCount > 0`.

**Posición:** fija abajo-centro, `max-w-lg`, `rounded-full` o `rounded-2xl`, sombra suave, fondo `bg-surface` + `border-border`, safe-area en móvil.

**Contenido:**

```
┌──────────────────────────────────────────────────────────┐
│  12 seleccionados   [Limpiar]                            │
│  [Revisados*] [Mostrar] [Ocultar]  [Eliminar]            │
└──────────────────────────────────────────────────────────┘
```

- **Revisados** — visible solo si al menos un seleccionado tiene `needs_review` (o siempre en Shopify con selección desde filtro Por revisar). En manual puro sin pendientes, el botón no aparece.
- **Mostrar** / **Ocultar** — siempre en modo selección.
- **Eliminar** — tono `danger`, abre modal (§5.4).

Animación: `translate-y` suave al aparecer; no bloquear scroll de la lista.

### 4.5 Acciones sin modo selección (rápidas)

**Por tarjeta**, fuera del modo selección:

| Control | Cuándo | Acción |
|---------|--------|--------|
| Badge **Por revisar** clickeable o botón **✓ Revisado** | `needs_review` | `markProductReviewed` |
| Menú **⋯** (opcional CB-2) | `canWrite` | Revisado · Ocultar/Mostrar · Eliminar |

Preferencia implementación: botón compacto **Revisado** (`variant="outline" size="sm"`) junto al badge, sin menú extra en CB-1.

### 4.6 Confirmar todos por revisar (global)

**Ubicación:** debajo de los filter chips, **no** en la barra flotante.

**Visible si:** `canWrite && reviewCount > 0` (cualquier `catalog_source`).

**Control:** `Button variant="outline"` con icono check — *"Confirmar los N por revisar"*.

**Confirmación (dialog Uru, no `alert()`):**

- Shopify: *"¿Marcar N productos como revisados? Si resincronizas Shopify, los actualizados volverán a pedir revisión."*
- Manual (si algún día hay pendientes): *"¿Marcar N productos como revisados?"*

**Alcance:** todos los `needs_review = true` del negocio (no solo visibles).

### 4.7 Wireframe conceptual (no grilla)

```
┌─ Catálogo ─────────────────────── [Seleccionar] [Resync*] [Nuevo] ─┐
│  [Todos (45)]  [Por revisar (12)]                                   │
│  [ Confirmar los 12 por revisar ]        ← solo si reviewCount > 0  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─ tarjeta ─────────────────────────────────────────────────────┐ │
│  │ [img✓]  Brownie chocolate   Por revisar   S/ 25  [Revisado]   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─ tarjeta (seleccionada, ring primary) ─────────────────────────┐ │
│  │ [img●]  Torta vainilla      S/ 80   disponible ●               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│         ╭─────────────────────────────────────────────╮             │
│         │ 2 seleccionados  [Mostrar][Ocultar][Eliminar]│  ← flotante│
│         ╰─────────────────────────────────────────────╯             │
└─────────────────────────────────────────────────────────────────────┘
```

`*` Resync solo si `shopify`.

### 4.8 Responsive

- Móvil: barra flotante en una fila con scroll horizontal de acciones si hace falta; texto "N seleccionados" compacto.
- Modo selección: área táctil mínima 44px en tarjeta.
- Modal eliminar: full-width en móvil, centrado en desktop.

### 4.9 Accesibilidad

- Modo selección: `aria-pressed` en botón Seleccionar; tarjetas con `aria-selected`.
- Barra flotante: `role="toolbar"` + `aria-label="Acciones sobre productos seleccionados"`.
- Anuncios `aria-live` tras acción exitosa (*"12 productos ocultos"*).

---

## 5. Backend — Server Actions

Sin cambios de contrato respecto a rev. 1; aplican a **todos** los productos del negocio sin filtrar por `source`.

### 5.1 Tipos

```ts
export type BulkCatalogAction =
  | 'mark_reviewed'
  | 'set_available'
  | 'set_unavailable'
  | 'delete'

export type CatalogBulkState = {
  error: string | null
  ok: boolean
  affected?: number
}
```

Todas usan `requireCatalogWrite()`.

### 5.2 `markProductReviewed` (individual)

- Input: `id`
- Update: `{ needs_review: false }`
- Válido para `source` `manual` o `shopify`

### 5.3 `markAllProductsReviewed` (global)

- Todos los del negocio con `needs_review = true`
- Retorna `affected`

### 5.4 `bulkCatalogProducts` (selección)

- `ids` (1–200), `action`, `confirm_token` = `ELIMINAR` solo para delete
- Validar que todos los ids ∈ `business_id` del miembro
- Delete: misma lógica storage que `deleteProduct`

**Modal eliminar** — copy según mezcla de fuentes en la selección:

- Si hay algún `source === 'shopify'`: aviso de que resync puede recrearlos.
- Si solo `manual`: *"Esta acción no se puede deshacer."*

### 5.5 `patchProductQuick`

Sin cambio; no toca `needs_review`.

---

## 6. Componentes nuevos

| Archivo | Responsabilidad |
|---------|-----------------|
| `catalog-selection-context.tsx` | Estado `selectionMode`, `selectedIds`, helpers |
| `catalog-floating-bar.tsx` | Barra flotante; acciones según §4.4 y tipo selección |
| `catalog-product-card.tsx` | Tarjeta extraída de `catalog-client`; modos normal / selección |
| `catalog-confirm-dialog.tsx` | Reutilizable: confirmar todos, eliminar lote |
| `catalog-client.tsx` | Orquestación, filter chips, botón Seleccionar |

**No crear** `catalog-table.tsx` ni layout de grilla.

---

## 7. Fases de implementación

```
CB-1  Modo selección + barra flotante (mostrar/ocultar/eliminar) — manual + shopify
  ↓ CHECKPOINT: Cruje selecciona 3 productos y oculta
CB-2  Revisado individual + confirmar todos + lote mark_reviewed
  ↓ CHECKPOINT: Betta confirma todos post-resync
CB-3  Modal eliminar pulido + feedback aria-live + polish animaciones
```

CB-1 prioriza valor para **manual**; CB-2 para **shopify**. Mismo código, distinta visibilidad de controles de revisión.

---

## 8. Criterios de aceptación

### CB-1 (lote operativo — todos los clientes)
- [ ] Cruje (`manual`): modo Seleccionar → 3 tarjetas → **Ocultar** → bot no ofrece esos productos.
- [ ] Cruje: lote **Eliminar** con modal `ELIMINAR`.
- [ ] Betta (`shopify`): mismas acciones de disponible/eliminar en lote.
- [ ] UI sigue siendo tarjetas; no hay `<table>`.
- [ ] `operator` no ve botón Seleccionar.

### CB-2 (revisión — shopify + cualquiera con pendientes)
- [ ] **Revisado** en tarjeta quita badge sin Editar.
- [ ] **Confirmar los N por revisar** afecta todo el negocio.
- [ ] Resync Shopify vuelve a marcar actualizados (ingestión sin cambio).
- [ ] En manual sin `needs_review`, botones de revisión no aparecen.

### CB-3 (pulido)
- [ ] Barra flotante usable en móvil.
- [ ] Máx. 200 ids; mensaje claro si se excede.
- [ ] Delete borra imágenes storage.

---

## 9. Compatibilidad

| Área | Garantía |
|------|----------|
| Catálogo manual Cruje | Lote disponible/eliminar; sin resync |
| Catálogo Shopify Betta | Lote + flujo revisión post-resync |
| Inline edit | Sin cambio fuera de modo selección |
| Bot | `available` controla oferta; `needs_review` solo dashboard |

---

## 10. Fuera de alcance

- Vista grilla / tabla / columnas ordenables.
- Drag-select o shift+click rango (desktop nice-to-have futuro).
- Deshacer acciones por lote.
- Auto-marcar revisado al editar precio inline.
- Acciones lote desde admin `/admin`.

---

## 11. Archivos previstos

| Fase | Archivos |
|------|----------|
| CB-1 | `catalog-selection-context.tsx`, `catalog-floating-bar.tsx`, `catalog-product-card.tsx`, `actions.ts` (`bulkCatalogProducts`), `catalog-client.tsx` |
| CB-2 | `actions.ts` (`markProductReviewed`, `markAllProductsReviewed`), `catalog-confirm-dialog.tsx` |
| CB-3 | Polish CSS, `aria-live`, tests manuales Cruje + Betta |

---

## 12. Referencias cruzadas

| Documento | Actualizar al implementar |
|-----------|---------------------------|
| `catalog-ingestion-spec-v2.md` | Post-resync → confirmar todos (shopify) |
| `auth-dashboard-spec-v2.md` | Modo selección, lote manual + shopify |
| `team-notifications-catalog-spec.md` | Rol `catalog` usa lote |
| `CHANGELOG.md` | CB-1…CB-3 |

---

## 13. Resumen por cliente

**Cruje (manual):** activa **Seleccionar**, marca tortas/panes, **Ocultar** o **Eliminar** en lote para rotar menú — sin pantalla tipo WordPress.

**Betta (shopify):** tras resync, **Confirmar los N por revisar** o selecciona subset; mismo modo para ocultar temporada o limpiar; eliminar con cuidado (resync puede traer de vuelta ítems Shopify).

**Cualquier cliente:** una sola UX de catálogo; la UI adapta qué botones muestra según `needs_review` y `catalog_source`, no dos pantallas distintas.
