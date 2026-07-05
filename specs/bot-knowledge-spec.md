# Spec — Bot Studio (personalización universal del agente)

> **ESTADO: IMPLEMENTADO** (2026-07-05)
>
> Define cómo **cualquier negocio** (Cruje, Betta, futuros clientes) configura la voz, políticas y conocimiento de su bot, con el **mismo producto** para todos.
>
> **Referencias:** `agent-spec-v2.md`, `lib/prompts/index.ts`, `app/dashboard/perfil/perfil-form.tsx`

---

## 1. Principio rector

> **Un solo Bot Studio para todos los tenants.**  
> El tipo de catálogo (`manual` vs `shopify`) solo cambia **capacidades técnicas** (tools, reglas de tallas).  
> La personalización comercial (nombre, saludo, políticas, FAQs) es **idéntica** para panadería, retail Shopify o cualquier cliente nuevo.

Un documento largo como el de Betta (identidad + saludo + FAQs + políticas) es un **formato de contenido**, no un caso especial. Cruje puede traer el suyo; un bodega nueva también. Uru y el dueño lo cargan por el **mismo pipeline**.

---

## 2. Problema actual

| Orden | Capa hoy | Editable |
|------:|----------|----------|
| 1 | Plantilla `manual` / `shopify` | No |
| 2 | Encargos a medida | Checkbox |
| 3 | `system_prompt_custom` (textarea) | Sí, opaco |
| 4 | Reglas operativas Uru | No |
| 5 | Contexto runtime | No |

**Fallos:**

1. El dueño no ve qué trae el sistema ni qué puede cambiar.
2. Lo custom **no reemplaza** la plantilla: se **concatena** → conflictos (pagos, saludo, tono).
3. Un textarea no sirve para documentos largos (FAQs, políticas detalladas).
4. Betta y Cruje no tienen el mismo camino claro de configuración.
5. No hay importación estructurada ni vista previa.

---

## 3. Recomendación final (decisión de diseño)

### 3.1 ¿Reemplazar totalmente el prompt del sistema?

**No recomendado** dejar que el dueño pegue un prompt libre que **sustituya** todo. Motivos:

- Pierdes reglas de seguridad (no inventar precios, usar tools, promos reales, escalamiento).
- Cada tenant repetiría reglas técnicas mal copiadas.
- Imposible mantener ni auditar en producción.

### 3.2 Modelo adoptado: base mínima + overrides explícitos del negocio

```
┌──────────────────────────────────────────────────────────────┐
│  NÚCLEO URU (código, igual para todos, NO editable)          │
│  Seguridad · tools obligatorias · promos · handoff · runtime │
├──────────────────────────────────────────────────────────────┤
│  CAPACIDADES POR CATÁLOGO (código, visible, NO editable)     │
│  manual: pedidos simples, encargos                           │
│  shopify: rangos de talla, variantes                         │
├──────────────────────────────────────────────────────────────┤
│  CONFIGURACIÓN DEL NEGOCIO (dashboard, editable)             │
│  SOBREESCRIBE defaults comerciales de las plantillas         │
│  identidad · saludo · tono · envíos · pagos · devoluciones   │
├──────────────────────────────────────────────────────────────┤
│  CONOCIMIENTO (dashboard, editable)                          │
│  FAQs + artículos · recuperados bajo demanda (tool)          │
└──────────────────────────────────────────────────────────────┘
```

**Qué significa “sobreescribir” en la práctica:**

| Tema | Sin config del dueño | Con config del dueño |
|------|----------------------|----------------------|
| Nombre del bot | "asistente de {negocio}" | Lo que defina el dueño |
| Saludo | Default genérico por tipo catálogo | Saludo del dueño |
| Tono | Default plantilla | Tono del dueño |
| Pagos / envíos / cambios | *No hay texto en plantilla* (plantillas adelgazadas) | Políticas del dueño (**fuente de verdad**) |
| FAQs concretas | Tool busca en `business_faqs` | Respuestas del dueño |

Las plantillas `manual` / `shopify` se **adelgazan**: solo dejan reglas **técnicas** (cómo usar catálogo, tallas, pedidos). Todo lo **comercial** pasa al Bot Studio del dueño.

**Precedencia explícita (en UI y en prompt):**

> La configuración del negocio **prevalece** sobre cualquier default de plantilla en identidad, tono, saludo y políticas comerciales.  
> El conocimiento (FAQs/artículos) **prevalece** para preguntas concretas.  
> El núcleo Uru **siempre prevalece** en seguridad y uso de herramientas.

Esto cumple tu intuición (“cada uno sobreescribe las reglas actuales”) **sin** ceder el control de seguridad.

### 3.3 Igualdad entre Cruje, Betta y clientes nuevos

| Aspecto | Cruje (`manual`) | Betta (`shopify`) | Cliente nuevo |
|---------|------------------|-------------------|---------------|
| UI Bot Studio | Igual | Igual | Igual |
| Campos identidad/políticas | Igual | Igual | Igual |
| CRUD FAQs | Igual | Igual | Igual |
| Import JSON (admin) | Igual | Igual | Igual |
| Vista previa prompt | Igual | Igual | Igual |
| Diferencia técnica | Plantilla manual + encargos | Plantilla shopify + tallas | Según `catalog_source` al alta |

**Alta de contenido (dos caminos, mismo destino):**

1. **Self-serve:** dueño completa Bot Studio en dashboard.
2. **Asistido Uru:** operador importa JSON desde el documento del cliente (Word, Notion, WhatsApp export — da igual el origen).

No hay scripts ni flujos exclusivos por marca.

---

## 4. Alcance por fase

### Fase BK-1 — Bot Studio base (MVP)

| ID | Entrega |
|----|---------|
| BK-1.1 | Columnas estructuradas en `businesses` (§5) |
| BK-1.2 | Ruta `/dashboard/bot` (recomendada) o tabs en perfil — **misma UX todos** |
| BK-1.3 | Sección editable: identidad + políticas |
| BK-1.4 | Sección solo lectura: **Núcleo Uru** + **Capacidades** (según `catalog_source`) |
| BK-1.5 | Vista previa del prompt ensamblado |
| BK-1.6 | Refactor `buildSystemPrompt()` con precedencia §3.2 |
| BK-1.7 | Adelgazar `CATALOG_TEMPLATES` (quitar saludo/pagos/tone comercial genérico) |
| BK-1.8 | Migrar `system_prompt_custom` → `bot_extra_notes`; deprecar textarea en UI dueño |
| BK-1.9 | Admin `/admin/negocios/[id]`: mismos campos + vista previa |

### Fase BK-2 — Conocimiento estructurado

| ID | Entrega |
|----|---------|
| BK-2.1 | Tabla `business_faqs` + RLS |
| BK-2.2 | UI CRUD FAQs en `/dashboard/bot` (tab "Preguntas frecuentes") |
| BK-2.3 | Tool `buscar_conocimiento_negocio` (todos los tenants) |
| BK-2.4 | Import/export JSON genérico (admin + script CLI) |
| BK-2.5 | Guía de mapeo documento → campos (§8) |

### Fase BK-3 — Artículos largos (backlog)

| ID | Entrega |
|----|---------|
| BK-3.1 | Tabla `business_knowledge_articles` |
| BK-3.2 | Búsqueda semántica (`pgvector`) en la misma tool |
| BK-3.3 | UI editor de artículos |

Activar BK-3 cuando un negocio supere ~30 FAQs o necesite bloques >4 000 caracteres (ej. guías extensas, listas largas).

---

## 5. Modelo de datos

### 5.1 `businesses` — configuración del bot

```sql
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS bot_name text,
  ADD COLUMN IF NOT EXISTS bot_greeting text,
  ADD COLUMN IF NOT EXISTS bot_tone text,
  ADD COLUMN IF NOT EXISTS policy_shipping text,
  ADD COLUMN IF NOT EXISTS policy_payment text,
  ADD COLUMN IF NOT EXISTS policy_returns text,
  ADD COLUMN IF NOT EXISTS bot_extra_notes text,
  ADD COLUMN IF NOT EXISTS bot_use_legacy_prompt boolean NOT NULL DEFAULT false;

-- system_prompt_custom: conservar temporalmente; solo si bot_use_legacy_prompt = true
```

| Campo | Uso | Límite chars |
|-------|-----|-------------|
| `bot_name` | Cómo se presenta | 80 |
| `bot_greeting` | Primera interacción | 800 |
| `bot_tone` | Personalidad | 500 |
| `policy_shipping` | Envíos, zonas, tiempos, courier | 3 000 |
| `policy_payment` | Métodos aceptados y **restricciones** | 2 000 |
| `policy_returns` | Cambios y devoluciones | 2 000 |
| `bot_extra_notes` | Promos generales, horario, excepciones | 1 500 |

### 5.2 `business_faqs` (BK-2)

```sql
CREATE TABLE business_faqs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category     text NOT NULL DEFAULT 'general',
  question     text NOT NULL,
  answer       text NOT NULL,
  sort_order   int NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(question) <= 500),
  CHECK (char_length(answer) <= 4000)
);
-- FTS + RLS owner (igual que spec v1)
```

**Categorías UI:** `general`, `producto`, `envios`, `pagos`, `devoluciones`, `horario`, `tienda`, `ofertas`, `otros`.

### 5.3 `business_knowledge_articles` (BK-3, opcional)

Artículos largos (markdown). Misma tool, misma UI tab "Artículos".

---

## 6. Composición del prompt (implementación)

### 6.1 Orden final

```text
1. NÚCLEO URU
   - No inventar precios · buscar_productos · promos reales · escalar_a_humano
   - buscar_conocimiento_negocio para FAQs/políticas (BK-2+)

2. CAPACIDADES ({catalog_source})
   - manual: catálogo propio, encargos si supports_custom_orders
   - shopify: rangos talla, variantes, flujo pedido retail
   - SIN identidad comercial genérica duplicada

3. CONFIGURACIÓN DEL NEGOCIO (override comercial)
   - Identidad: bot_name, bot_greeting, bot_tone
   - Políticas: shipping, payment, returns, extra_notes
   - Bloque explícito: "Esta configuración prevalece sobre defaults de plantilla."

4. OPERATIVO URU (igual todos)
   - Recurrentes · promociones · handoff · estimated_delivery_date

5. RUNTIME
   - conversation_id, customer_phone, business_id, negocio
```

### 6.2 Defaults cuando el dueño no configuró nada

Evitar regresión en Cruje y tenants vacíos:

```typescript
// Identidad
bot_name ?? `asistente de ventas de ${business.name}`

// Saludo — un default por catalog_source, sobreescribible
bot_greeting ?? DEFAULT_GREETING[business.catalog_source](business.name)

// Políticas vacías → instrucción al modelo:
// "Si preguntan envíos/pagos/cambios y no hay política configurada, di que el equipo coordina contigo; no inventes."
```

### 6.3 Qué se elimina de las plantillas actuales

De `standardTemplate` / `shopifyTemplate`:

- Bloque `PERSONALIDAD` comercial genérico → `bot_tone` + default
- Saludo final fijo → `bot_greeting` + default
- `FORMAS DE PAGO: …` en shopify → `policy_payment`
- Cualquier política comercial implícita

**Qué permanece en plantillas:** reglas de catálogo, tools, tallas (shopify), encargos (manual).

---

## 7. UI — Bot Studio (todos los clientes)

### 7.1 Navegación

Nueva entrada en shell dashboard: **Bot** → `/dashboard/bot`

| Tab | Contenido |
|-----|-----------|
| **Identidad y políticas** | Campos §5.1 |
| **Preguntas frecuentes** | CRUD FAQs (BK-2) |
| **Artículos** | BK-3 |
| **Reglas del sistema** | Solo lectura: Núcleo Uru + Capacidades activas |
| **Vista previa** | Prompt ensamblado + ~tokens |

Perfil (`/dashboard/perfil`) conserva: nombre negocio, WhatsApp dueño, Shopify, contraseña.

### 7.2 Copy estándar en UI

> **Tu bot, tu voz.** Configura cómo se presenta y qué políticas comunica.  
> Las reglas de Uru (catálogo real, pedidos, escalamiento) aplican a todos por seguridad.  
> **Tu configuración reemplaza los textos genéricos** en saludo, tono, envíos, pagos y FAQs.

### 7.3 Admin plataforma

Mismos campos + **Importar conocimiento** (JSON §8) + export + vista previa.  
Útil para onboarding asistido; no reemplaza self-serve del dueño.

---

## 8. Formato de importación universal (documento → Bot Studio)

Cualquier negocio. El operador (o un script) transforma el documento del cliente a JSON:

```json
{
  "bot_name": "…",
  "bot_greeting": "…",
  "bot_tone": "…",
  "policy_shipping": "…",
  "policy_payment": "…",
  "policy_returns": "…",
  "bot_extra_notes": "…",
  "faqs": [
    { "category": "envios", "question": "¿Hacen envíos?", "answer": "…" },
    { "category": "pagos", "question": "¿Aceptan efectivo?", "answer": "…" }
  ],
  "articles": [
    { "category": "otros", "title": "Guía de tallas", "content": "…" }
  ]
}
```

**Script genérico:** `scripts/import-bot-knowledge.mjs --business-id=<uuid> --file=cliente.json`

**Guía de mapeo** (documento tipo Betta, Cruje u otro):

| Sección del documento | Destino |
|----------------------|---------|
| Nombre / presentación del bot | `bot_name` |
| Bloque "Saludo" | `bot_greeting` |
| Tono / personalidad | `bot_tone` |
| Envíos, courier, costos | `policy_shipping` |
| Formas de pago, restricciones | `policy_payment` |
| Cambios, devoluciones | `policy_returns` |
| Ofertas generales, horarios | `bot_extra_notes` |
| FAQ numeradas (P: / R:) | `faqs[]` |
| Bloques largos temáticos | `articles[]` (BK-3) o varias FAQs |

Ejemplos ilustrativos (mismo pipeline):

- **Retail Shopify:** identidad + 20 FAQs envío/pago + artículo largo opcional.
- **Panadería manual:** tono cálido + encargos tortas en FAQs + horario en `bot_extra_notes`.
- **Bodega nueva:** solo 5 FAQs + políticas mínimas — campos opcionales, defaults del sistema.

---

## 9. Tool `buscar_conocimiento_negocio` (BK-2)

Disponible para **todos** los `catalog_source`.

**Busca en orden:**

1. FAQs activas (FTS español, top 5)
2. Snippets de `policy_*` si la query matchea keywords
3. (BK-3) Artículos por similitud semántica

**Instrucción en núcleo Uru:**

> Antes de responder sobre envíos, pagos, devoluciones, horario, tienda física u otras políticas, usa `buscar_conocimiento_negocio`. No contradigas lo que devuelva.

---

## 10. Migración

| Paso | Acción |
|------|--------|
| 1 | Migración columnas §5.1 |
| 2 | `UPDATE businesses SET bot_extra_notes = system_prompt_custom WHERE …` |
| 3 | UI nueva; ocultar `system_prompt_custom` al dueño |
| 4 | Negocios con contenido legacy: operador reparte documento existente a campos + FAQs vía import JSON |
| 5 | `bot_use_legacy_prompt = true` solo si hace falta rollback temporal |
| 6 | Tras estabilizar: dejar de leer `system_prompt_custom` en `buildSystemPrompt` |

**Cruje / Betta:** mismos pasos. Sin tratamiento especial en código.

---

## 11. Criterios de aceptación

### BK-1

- [ ] Cruje y Betta ven la misma UI `/dashboard/bot`.
- [ ] Dueño edita identidad/políticas; vista previa refleja overrides.
- [ ] Plantilla visible en solo lectura difiere solo en bloque Capacidades (`manual` vs `shopify`).
- [ ] Tenant sin config: comportamiento ≥ equivalente al actual (defaults).
- [ ] Tenant con `policy_payment` explícita: bot no contradice esa política.
- [ ] Admin: mismos campos + import/export preparado (BK-2 puede completar import FAQs).

### BK-2

- [ ] CRUD FAQs; RLS por owner.
- [ ] Tool devuelve FAQs de **ese** negocio únicamente.
- [ ] Import JSON funciona para cualquier `business_id`.
- [ ] Prompt base sin FAQs inline; longitud típica < ~2 500 tokens.

### BK-3

- [ ] Artículos largos recuperables; misma UX todos los tenants.

---

## 12. Fuera de alcance

- Prompt 100 % libre que reemplace el núcleo Uru.
- Reglas de seguridad editables por el dueño.
- Flujos distintos por marca (no Betta-only scripts en producción).
- Multi-idioma, A/B testing, elección de modelo.

---

## 13. Plan de implementación

```
BK-1  → Bot Studio + buildSystemPrompt + plantillas adelgazadas
        CHECKPOINT: vista previa Cruje (manual) y Betta (shopify) vacíos vs configurados

BK-2  → FAQs + tool + import JSON genérico
        CHECKPOINT: import documento real de un cliente piloto (cualquiera)

BK-3  → Artículos + embeddings (si hace falta volumen)
```

---

## 14. Resumen ejecutivo

**Implementación recomendada:**

1. **Tratar a todos los clientes igual** — un Bot Studio, un import JSON, una tool.
2. **`catalog_source` solo define capacidades técnicas**, no el camino de personalización.
3. **“Sobreescribir” = overrides comerciales explícitos**, no reemplazar el núcleo de seguridad Uru.
4. **Documentos largos → campos estructurados + FAQs + artículos**, no un textarea.
5. **Onboarding:** self-serve en dashboard o import asistido — **mismo esquema de datos**.

Así Cruje puede tener su tono de panadería, Betta su Betto y sus 20 FAQs, y un cliente nuevo empieza vacío con defaults sensatos — **mismo producto, distinto contenido**.

---

## 15. Referencias cruzadas

| Documento | Actualizar al implementar |
|-----------|---------------------------|
| `agent-spec-v2.md` | Composición prompt + tool |
| `auth-dashboard-spec-v2.md` | Ruta `/dashboard/bot` |
| `admin-console-spec.md` | Import/export conocimiento |
| `data-model-v2.md` | Columnas y tablas |
| `runbook-alta-clientes.md` | Paso: cargar Bot Studio / import JSON |
| `CHANGELOG.md` | Deprecación `system_prompt_custom` |
