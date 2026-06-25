# Tracking de uso de OpenAI v2 (ítem 7)

> **Nota de origen**: tu lista de specs numeraba 1–6, 8, 9 (sin un "7"). Como la feature F (tracking de uso) y el módulo `lib/usage-tracking.ts` aparecen en `architecture-v2.md`, creé este spec para ocupar el ítem 7 y documentarlo con su propia definición. Si prefieres no tener un spec dedicado y que esto viva dentro de `data-model-v2.md` + `architecture-v2.md`, descártalo y lo integro.

## Objetivo

Atribuir el consumo de OpenAI (tokens y costo estimado) a cada negocio, para mostrarlo en el dashboard. Una sola cuenta OpenAI (`OPENAI_API_KEY` global); la separación se hace a nivel de datos en `usage_logs`.

## Módulo `lib/usage-tracking.ts`

```ts
logUsage(params: {
  businessId: string
  conversationId?: string
  model: string
  inputTokens: number
  outputTokens: number
}): Promise<void>
```

- Calcula `estimated_cost_usd` con la tabla de precios local.
- Inserta una fila en `usage_logs` con el cliente service-role.
- **No** lanza error hacia el agente si falla (el tracking no debe romper la respuesta al cliente); loguea y continúa.

```ts
getMonthlyUsage(businessId: string): Promise<{
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
}>
```

- Agrega `usage_logs` del mes actual para el resumen del dashboard.

## Tabla de precios (estimación)

Constante en el módulo (USD por 1M tokens), editable cuando cambien precios:

```ts
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },   // USD / 1M tokens (estimado)
  'gpt-4o-mini':  { input: 0.15, output: 0.60 },
}
// costo = (input/1e6)*input_price + (output/1e6)*output_price
```

> Los valores son estimaciones para mostrar una cifra orientativa al dueño, no facturación exacta. Si el modelo no está en `PRICING`, usar el del fallback y marcar nota.

## Integración en `lib/agent.ts`

- Tras cada llamada a OpenAI que devuelva `response.usage`, acumular `prompt_tokens`/`completion_tokens`.
- En un turno con varias llamadas (multi-turno con tools), **sumar todas** y registrar una sola fila al final, o una por llamada (decisión de implementación; el spec acepta agregada por mensaje del cliente para simplicidad).
- Llamar `logUsage` con `business.id` y `conversationId`.

```
procesar mensaje
  ├─ llamada(s) a OpenAI  → acumular usage
  ├─ enviar respuesta al cliente
  └─ logUsage(businessId, conversationId, model, inputTokens, outputTokens)
```

## Visualización en el dashboard

- `/dashboard` (resumen): tarjeta **"Costo estimado del mes"** = `getMonthlyUsage(business.id).estimatedCostUsd` formateado en USD.
- Opcional: total de tokens del mes y número de mensajes procesados.
- Lectura vía RLS (`owner_read_usage`), o vía Server Action con service-role filtrando por el negocio del usuario.

## Criterios de aceptación

- [ ] Cada mensaje procesado por el bot agrega una fila en `usage_logs` con el `business_id` correcto.
- [ ] El costo estimado se calcula con la tabla de precios.
- [ ] El dashboard muestra el costo del mes por negocio.
- [ ] Un fallo en `logUsage` no impide responder al cliente.
- [ ] Cruje y Betta acumulan uso por separado.
