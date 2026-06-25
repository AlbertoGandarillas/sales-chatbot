# Especificación del agente v2 — Multi-vertical

> Extiende `agent-spec.md` (v1). El agente deja de tener un único system prompt y un único set de tools; ahora se arman según el `vertical` del negocio y su `system_prompt_custom`.

## Composición del system prompt

`buildSystemPrompt(business)` concatena tres bloques:

```
[1] VERTICAL_TEMPLATES[business.vertical]   ← reglas base FIJAS (no editables desde UI)
[2] business.system_prompt_custom           ← texto libre editable por el dueño (puede estar vacío)
[3] Contexto runtime                        ← conversation_id, customer_phone, business_id
```

Bloque [3] (igual que v1):

```
CONVERSACIÓN ACTUAL:
- conversation_id: {uuid}
- customer_phone: {phone}
- business_id: {uuid}
- negocio: {business.name}
```

El bloque [2] se inserta bajo un encabezado claro para que el modelo lo trate como información del negocio, no como reglas que pueda contradecir:

```
INFORMACIÓN ESPECÍFICA DE ESTE NEGOCIO (proporcionada por el dueño):
{business.system_prompt_custom}
```

---

## `VERTICAL_TEMPLATES`

### `bakery` (idéntico a v1 — Cruje)

Es el mismo system prompt ya implementado y documentado en `agent-spec.md`. No se modifica su contenido. Se mueve a `lib/prompts/index.ts` como `VERTICAL_TEMPLATES.bakery` sin cambios de texto, para no romper la regresión de Cruje (M11).

### `retail` (nuevo — Betta y futuros Shopify)

```
Eres el asistente de ventas de {NOMBRE_NEGOCIO}, una tienda peruana. Preséntate como parte del equipo de la tienda.

PERSONALIDAD:
- Hablas en español peruano, cercano y con buena onda (estilo skate/urbano, sin exagerar).
- Tuteas al cliente. Mensajes cortos, ideales para WhatsApp.
- Usas "S/" para precios (ejemplo: S/ 159.00).

QUÉ PUEDES HACER:
1. Mostrar productos del catálogo (zapatillas y similares).
2. Tomar pedidos indicando el modelo, la talla y el color/material que el cliente quiere.
3. Consultar el estado de pedidos del cliente.
4. Derivar a una persona del equipo cuando haga falta.

REGLAS CRÍTICAS SOBRE TALLAS Y STOCK (muy importante):
- NUNCA inventes productos ni precios. Usa buscar_productos para consultar el catálogo real.
- El catálogo maneja RANGOS de talla disponibles (ej. "del 38 al 43"), NO tallas individuales con stock exacto.
- Comunica SIEMPRE el rango de tallas tal como aparece en el catálogo. NUNCA afirmes con certeza que una talla puntual está en stock.
- Cuando el cliente pida una talla específica, di que "está dentro del rango disponible" si corresponde, pero aclara que la confirmación final de esa talla y color exactos la hace el equipo al coordinar el pedido.
- Si un producto no tiene rango de talla claro en el catálogo, dilo con honestidad y ofrece que el equipo confirme.
- No prometas tiempos de entrega ni stock que no estén en los datos.

CÓMO TOMAR UN PEDIDO:
- Resume modelo, talla pedida y color/material antes de confirmar.
- Al confirmar, registra el pedido con esa talla/color como texto (no se valida contra stock unitario porque esa data no existe).
- Avisa que el equipo confirmará disponibilidad final de talla/color y coordinará pago y entrega.

FORMAS DE PAGO: Yape, Plin, transferencia o efectivo, según coordine el equipo.

Cuando el cliente salude por primera vez, dale la bienvenida y pregúntale qué modelo busca o para qué ocasión.
```

> `{NOMBRE_NEGOCIO}` se interpola desde `business.name`. El detalle operativo concreto (horarios, zonas de envío, etc.) lo aporta el dueño vía `system_prompt_custom`, no la plantilla base.

---

## `getToolsForVertical(vertical)`

| Tool | bakery | retail | Notas |
|---|:---:|:---:|---|
| `buscar_productos` | ✅ | ✅ | Comportamiento ajustado por vertical (ver abajo) |
| `crear_pedido` | ✅ | ✅ | retail registra talla/color como texto |
| `iniciar_encargo_personalizado` | ✅ | ❌ | Solo bakery (tortas) |
| `consultar_estado_pedido` | ✅ | ✅ | Incluye `estimated_delivery_date` (ver operations-spec-v2) |
| `escalar_a_humano` | ✅ | ✅ | Handoff (ver operations-spec-v2) |

---

## Tools modificadas / nuevas

### `buscar_productos` (modificada para retail)

**bakery**: idéntico a v1 (busca en `name`, `category`, `description`).

**retail**: además busca en `talla_range` y `color_o_material`, y el resultado **siempre incluye `talla_range` tal cual está en BD**. Nunca se transforma en talla puntual.

Resultado retail (por producto):
```json
{
  "id": "uuid",
  "name": "Zapatilla X",
  "price_soles": 159.00,
  "talla_range": "38 AL 43",
  "color_o_material": "Gamuza",
  "image_url": "https://...",
  "available": true,
  "needs_review": false
}
```

Definición OpenAI (sin cambios de firma; `query` string). La diferencia es la lógica del servidor según `business.vertical`.

### `crear_pedido` (modificada para retail)

**bakery**: idéntico a v1 (valida `product_id`, calcula total con `price_soles`).

**retail**: cada ítem acepta además `talla_solicitada` y `color_solicitado` como texto libre; se guardan en el item del pedido. **No** se valida contra stock unitario (no existe esa data). El total se calcula con `price_soles` del producto.

Item de pedido retail:
```json
{
  "product_id": "uuid",
  "name": "Zapatilla X",
  "quantity": 1,
  "unit_price": 159.00,
  "talla_solicitada": "41",
  "color_solicitado": "Gamuza negra"
}
```

Definición OpenAI (retail) añade a cada item:
```json
{
  "talla_solicitada": { "type": "string", "description": "Talla que pide el cliente (texto)" },
  "color_solicitado": { "type": "string", "description": "Color o material pedido (texto, opcional)" }
}
```
`required` del item retail: `["product_id", "quantity", "talla_solicitada"]`.

### `escalar_a_humano` (nueva, ambos verticales)

Definida en `operations-spec-v2.md`. Resumen: pone `conversation.mode = 'human'`, notifica al dueño, y el agente responde al cliente avisando que alguien del equipo lo atenderá antes de detenerse.

### `consultar_estado_pedido` (modificada)

Incluye `estimated_delivery_date` en el JSON cuando exista (ver `operations-spec-v2.md`).

---

## Ciclo multi-turno

Sin cambios respecto a v1: `tool_calls → ejecutar → role:"tool" → rellamar → respuesta final`. Modelo `gpt-4.1-mini` (fallback `gpt-4o-mini`). Historial: últimos 15 mensajes (`user` + `assistant` + `human_agent`).

> Nota: los mensajes con `role = 'human_agent'` (respuestas manuales del dueño) se incluyen en el historial como contexto `assistant` al rearmar el prompt, para que el bot no pierda el hilo si se reactiva.

---

## Manejo de errores

Igual que v1: si OpenAI o el envío fallan, se intenta enviar un mensaje de disculpa y se persiste. El registro de uso (`logUsage`) se hace **solo** cuando hubo respuesta de OpenAI con `usage` disponible.

---

## Regresión Cruje (criterio para M3/M11)

- `VERTICAL_TEMPLATES.bakery` === texto del system prompt de `agent-spec.md` v1 (carácter por carácter).
- Las 4 tools de bakery se comportan idénticamente a v1.
- Un mensaje a Cruje produce exactamente el mismo tipo de respuestas que antes de la migración.
