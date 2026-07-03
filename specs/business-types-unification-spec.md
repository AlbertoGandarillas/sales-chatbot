# Spec — Catálogo escalable y migrable (catálogo propio ↔ Shopify)

> **ESTADO: Fase 1 IMPLEMENTADA (2026-06-26).** Decisiones aprobadas 1(a)–5(a).
> Migración aplicada sin pérdida de datos (Cruje=`manual`, Betta=`shopify`).
> Ver `CHANGELOG.md`.
>
> **Metodología spec-driven.** Se aprueba ANTES de tocar código.
>
> **Premisa nueva (de la conversación):** Uru es para **negocios que venden**.
> El tipo de negocio **no es una identidad fija**: un negocio puede **empezar con un
> catálogo propio** (inventario sencillo, sin e-commerce) y **más adelante migrar a
> Shopify** sin rehacer su cuenta, su WhatsApp ni sus conversaciones. El diseño debe
> ser **escalable** a futuros orígenes de catálogo.
>
> **Cambio de fondo respecto a la idea anterior:** dejamos de modelar esto como un
> `vertical` inmutable (`bakery`/`retail`) y pasamos a un **origen de catálogo
> mutable** (`catalog_source`) que el negocio puede cambiar en el tiempo.

---

## 1. Diagnóstico (estado actual)

Hoy existe `businesses.vertical ∈ {bakery, retail}`, elegido en el onboarding y tratado
como permanente. Problemas para la visión escalable:

1. **Es inmutable de facto**: no hay flujo para "pasar de catálogo propio a Shopify".
2. **Mezcla 3 conceptos** en un solo enum:
   - *De dónde salen los productos* (manual vs sincronizado).
   - *Si el negocio hace encargos a medida* (panadería sí; una tienda quizá no).
   - *Si los productos tienen variantes talla/color* (hoy atado a "retail").
3. **Copy atado a rubro** (panadería/zapatillas), cuando la herramienta sirve a
   bodegas, tiendas, etc.

Dato a favor: **`products.source ∈ {manual, shopify}` ya existe por producto**. Es la
base perfecta para permitir catálogos **híbridos** y migraciones sin pérdida.

(Inventario completo de archivos que tocan el vertical: ver §7.)

---

## 2. Modelo propuesto (escalable y migrable)

Separar los 3 conceptos que hoy están fusionados:

### 2.1 `catalog_source` — origen del catálogo (MUTABLE)
`businesses.catalog_source text NOT NULL DEFAULT 'manual'`
- Valores hoy: `'manual'` | `'shopify'`. **Extensible** mañana (`woocommerce`, `csv`…)
  agregando un valor, sin tocar el modelo.
- **Se puede cambiar en cualquier momento** desde el dashboard → habilita la migración.
- Controla: si se muestra el botón "Resincronizar", si los productos sincronizados son
  de solo-lectura, y el **perfil por defecto** del agente.

### 2.2 Capacidades del negocio (flags, no rubro)
- `supports_custom_orders boolean NOT NULL DEFAULT true`
  → habilita la herramienta de **encargos/pedidos a medida** (tortas, pedidos
  especiales). Editable por el dueño. (Una bodega lo puede apagar; una pastelería lo
  deja prendido.)
- Variantes (talla/color): **se tratan como atributos del producto**, no del negocio.
  Si un producto tiene `talla_range`/`color_o_material`, el agente los comunica. Así un
  negocio de catálogo propio que venda zapatillas también puede usar tallas **sin
  necesitar Shopify**.

### 2.3 Catálogo híbrido (clave para migrar sin dolor)
- Los productos conservan su `source` (`manual` | `shopify`).
- Un mismo negocio puede tener **productos manuales y de Shopify a la vez**.
- El agente busca sobre **todos los productos disponibles**, sin importar el origen.
- Migrar de manual→Shopify **no borra** lo cargado a mano: se suma el catálogo
  sincronizado; el dueño decide si oculta/archiva lo viejo.

> Resultado: **un solo motor "todo en uno"**. La diferencia entre negocios se vuelve
> *configuración* (origen + capacidades + datos de producto), no una bifurcación rígida.

---

## 3. Flujo de migración "Catálogo propio → Shopify" (de primera clase)

En **Dashboard → Perfil → Conectar Shopify**:
1. El dueño ingresa su `shopify_domain` y guarda.
2. Pulsa **"Sincronizar ahora"** → se ingesta el catálogo (lógica actual de
   `ingestShopifyCatalog`, productos quedan `needs_review`).
3. El sistema cambia `catalog_source` a `'shopify'`.
4. Los productos manuales previos **siguen ahí** (puede ocultarlos cuando quiera).
5. El agente, al leer `catalog_source='shopify'`, adopta el manejo de variantes
   (rangos de talla, color) automáticamente. **No se reconfigura WhatsApp.**

(Reversible: puede volver a `'manual'` si desconecta Shopify; los productos
sincronizados quedan como históricos o se ocultan.)

---

## 4. Cómo queda el agente (un motor, configurable)

El agente arma su comportamiento a partir de **configuración**, no de un rubro:

| Entrada | Efecto |
|---|---|
| `catalog_source` | Perfil base del prompt (genérico vs énfasis en variantes/Shopify) y selección de columnas en `buscar_productos`. |
| `supports_custom_orders` | Incluye o no la tool `iniciar_encargo_personalizado`. |
| Datos del producto (`talla_range`, `color_o_material`) | El agente comunica rangos cuando existen, sin importar el origen. |

**Estrategia por fases (para no romper Cruje/Betta hoy):**
- **Fase 1 (este cambio):** dos plantillas de prompt seleccionadas por `catalog_source`
  (`standard` genérica + `shopify`), capacidades por flag, categorías libres, migración
  habilitada. Bajo riesgo: Cruje y Betta siguen igual.
- **Fase 2 (futura, opcional):** unificar en **una sola plantilla adaptativa** que se
  arme por flags/datos. Mejora elegancia; se hace cuando haya más tenants para validar.

---

## 5. Cambios por capa (Fase 1)

### 5.1 Base de datos — migración aditiva y no destructiva
`supabase/migrations/<ts>_catalog_source.sql`:
- `ALTER TABLE businesses ADD COLUMN catalog_source text NOT NULL DEFAULT 'manual'
  CHECK (catalog_source IN ('manual','shopify'));`
- Backfill desde el enum viejo: `UPDATE ... SET catalog_source = CASE vertical
  WHEN 'retail' THEN 'shopify' ELSE 'manual' END;`
- `ALTER TABLE businesses ADD COLUMN supports_custom_orders boolean NOT NULL DEFAULT true;`
  y `UPDATE ... SET supports_custom_orders = false WHERE catalog_source='shopify';`
- Mantener `vertical` por compatibilidad temporal (deprecado) **o** eliminarlo tras el
  refactor — ver CHECKPOINT 2.
- Relajar `products.category`: quitar el `CHECK` fijo de panadería; texto libre, default
  `'otros'`. (No se borra ninguna fila.)

### 5.2 Tipos / resolución
- `lib/business-resolver.ts`: agregar `catalog_source: 'manual' | 'shopify'` y
  `supports_custom_orders: boolean` a `Business` y a `BUSINESS_COLUMNS`.
- Introducir `type CatalogSource = 'manual' | 'shopify'`.

### 5.3 Prompts (`lib/prompts/index.ts`)
- `standardTemplate(businessName)` **genérica** (cualquier negocio con catálogo propio).
- `shopifyTemplate(businessName)` = el actual retail (renombrado).
- Selección por `catalog_source`. La línea de encargos se incluye según
  `supports_custom_orders`. Cruje conserva tono vía `system_prompt_custom`.

### 5.4 Tools (`lib/tools/index.ts`) + Agente (`lib/agent.ts`)
- `getToolsFor(business)` recibe el negocio: arma tools por `catalog_source` y agrega
  `iniciar_encargo_personalizado` solo si `supports_custom_orders`.
- `buscarProductos`: incluir columnas de variante cuando `catalog_source='shopify'`
  (igual que hoy). (Fase 2: incluir variantes si existen, sin importar origen.)

### 5.5 Catálogo (dashboard)
- `catalog-client.tsx`: el botón "Resincronizar" aparece si `catalog_source='shopify'`
  (o si hay `shopify_domain`). Formulario de producto: categoría **texto libre**;
  campos talla/color/imagen **opcionales para todos** (no solo Shopify).
- `catalogo/actions.ts`: quitar validación contra `BAKERY_CATEGORIES`; categoría libre
  saneada, default `'otros'`. Productos creados a mano → `source='manual'`.

### 5.6 Onboarding y Perfil
- **Onboarding** (punto de partida, no etiqueta permanente):
  - `manual` → **"Catálogo propio"** (hint: panadería, bodega, tienda… cargas a mano).
  - `shopify` → **"Tienda Shopify"** (hint: sincronizamos tu catálogo). Pide dominio.
  - Texto: "Podrás conectar Shopify más adelante" para dejar clara la escalabilidad.
- **Perfil**: sección **"Origen del catálogo"** con el estado actual y acción
  **"Conectar/!Sincronizar Shopify"** (flujo §3). Toggle **"Acepto encargos a medida"**
  (`supports_custom_orders`).

### 5.7 Landing
- "Para qué negocios es": Tarjeta 1 = "Negocios con **catálogo propio** — panaderías,
  bodegas, tiendas y cualquier inventario sencillo"; Tarjeta 2 = "**Tiendas Shopify**".
- Mensaje de escalabilidad: "Empieza con tu catálogo propio y conecta Shopify cuando
  crezcas." Casos de uso Cruje (catálogo propio) / Betta (Shopify).

### 5.8 Scripts y specs
- `seed-tenants.mjs`, `verify-tenants.mjs`, `check-businesses.mjs`: setear
  `catalog_source` (Cruje `manual`, Betta `shopify`).
- Actualizar `data-model-v2.md`, `agent-spec-v2.md`, `catalog-ingestion-spec-v2.md`,
  `runbook-alta-clientes.md`, `CHANGELOG.md`.

---

## 6. CHECKPOINTS (decide antes de implementar)

**CHECKPOINT 1 — Adoptar `catalog_source` mutable (en vez de `vertical` fijo)**
- (a) Sí: `catalog_source` mutable + flag `supports_custom_orders` + migración como
  flujo. ← *recomendado (escalable)*
- (b) No, mantener `vertical` fijo y solo permitir cambiarlo manualmente en perfil.

**CHECKPOINT 2 — Qué hacer con la columna `vertical`**
- (a) Reemplazarla por `catalog_source` y **eliminar `vertical`** tras el refactor.
  ← *recomendado, más limpio*
- (b) Conservar `vertical` deprecada un tiempo por seguridad.

**CHECKPOINT 3 — Catálogo híbrido (manual + Shopify a la vez)**
- (a) Permitir híbrido apoyándonos en `products.source`; al migrar no se borra lo
  manual. ← *recomendado*
- (b) Forzar un solo origen; al conectar Shopify, archivar/ocultar los manuales.

**CHECKPOINT 4 — Alcance ahora**
- (a) Fase 1 completa (modelo + migración + prompts por source + categorías libres +
  copy landing). ← *recomendado*
- (b) Solo backend del modelo ahora; UI de migración y landing después.

**CHECKPOINT 5 — Variantes (talla/color) para catálogo propio**
- (a) Hacer talla/color **campos opcionales para todos** desde ya (un negocio manual
  podría vender ropa/zapatos sin Shopify). ← *recomendado*
- (b) Dejar variantes solo para Shopify por ahora.

---

## 7. Compatibilidad / regresión
- Migración **no destructiva**: agrega columnas, hace backfill, relaja un `CHECK`.
  Ninguna fila se elimina.
- Cruje: mismo comportamiento (tono vía `system_prompt_custom`, `manual`,
  `supports_custom_orders=true`).
- Betta: `shopify`, variantes y sync intactos.

## 8. Criterios de aceptación
- [ ] Un negocio puede crearse como **catálogo propio** y luego **conectar Shopify**
      desde el perfil, **sin perder** sus productos manuales ni reconfigurar WhatsApp.
- [ ] El agente adapta su comportamiento al `catalog_source` y a `supports_custom_orders`.
- [ ] Catálogo propio admite categorías libres y (opcional) variantes.
- [ ] Cruje y Betta siguen operando igual.
- [ ] `tsc` + `next build` verdes; migración sin pérdida de datos.

## 9. Fuera de alcance (por ahora)
- Conectores adicionales (WooCommerce, CSV) — el modelo queda listo para sumarlos.
- Unificación total del prompt en una sola plantilla adaptativa (Fase 2).
- Self-serve de credenciales de WhatsApp (sigue manual; ver runbook).

---

### Resumen ejecutivo
La mejor solución no es "dos rubros", sino **un solo producto de ventas con un catálogo
configurable**: el negocio elige un **origen de catálogo** (`manual` o `shopify`) que
**puede cambiar cuando quiera**, con capacidades por **flags** (encargos a medida) y
variantes a nivel de **producto**. Esto hace la migración *catálogo propio → Shopify*
un flujo natural y deja la puerta abierta a más orígenes sin rediseñar nada.
Necesito tus respuestas a los **CHECKPOINTS 1–5** para implementar la Fase 1.
