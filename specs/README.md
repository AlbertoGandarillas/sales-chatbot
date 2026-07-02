# Specs — Cruje MVP

Documentación **spec-driven** del agente WhatsApp de Cruje. Los specs describen el diseño acordado; el código en `/lib`, `/app` y `/supabase` es la implementación.

## Archivos

| Archivo | Contenido |
|---|---|
| `architecture.md` | Flujo, módulos, variables de entorno, decisiones de diseño |
| `data-model.md` | Esquema de BD, SQL de referencia, seed |
| `agent-spec.md` | System prompt, tools, ciclo multi-turno |
| `sprint-plan.md` | Fases de implementación y criterios de aceptación |
| `production-checklist.md` | Pasos para salir del MVP a producción |
| `catalog-images-whatsapp-index.md` | Índice: imágenes catálogo + mensajes ricos WA |
| `catalog-images-storage-spec.md` | Upload Supabase, URL, thumbnails, precedencia |
| `whatsapp-rich-messages-spec.md` | product_list, ORDER confirmación (Cruje) |
| `CHANGELOG.md` | Desvíos entre spec original e implementación real |

## Cómo mantener los specs actualizados

### Regla de oro

> **El spec es la fuente de verdad del diseño. Si el código cambia el comportamiento, actualiza el spec en el mismo PR/commit (o inmediatamente después).**

### Flujo recomendado

```
1. Cambio pequeño sin cambio de diseño  → solo código
2. Cambio de comportamiento acordado     → actualizar spec relevante + código
3. Descubrimiento durante implementación → anotar en CHANGELOG.md + actualizar spec
4. Nueva feature                         → nuevo párrafo/sección en spec ANTES o JUNTO al código
```

### Qué actualizar según el tipo de cambio

| Si cambias… | Actualiza… |
|---|---|
| Tablas, columnas, RLS | `data-model.md` + nueva migración en `supabase/migrations/` |
| Flujo webhook, módulos, env vars | `architecture.md` |
| Prompt, tools, modelo OpenAI | `agent-spec.md` |
| Nueva fase o feature | `sprint-plan.md` |
| Comportamiento distinto al spec original | `CHANGELOG.md` (entrada con fecha y razón) |
| Pasos para producción | `production-checklist.md` |

### CHANGELOG vs editar el spec

- **`CHANGELOG.md`**: registra *por qué* algo difiere del plan original (decisiones tomadas bajo presión, límites de Vercel, API keys, etc.).
- **Editar el spec**: cuando el nuevo comportamiento es el **estándar oficial** de ahora en adelante.

Ejemplo: el spec original decía "responder 200 OK inmediato". En Vercel Hobby eso cortaba el agente. Se documentó en CHANGELOG y se actualizó `architecture.md` a "await hasta terminar (Meta tolera ~20 s)".

### Checklist antes de cerrar una tarea

- [ ] ¿Cambió el comportamiento visible para el usuario o integraciones?
- [ ] ¿Cambió el esquema de BD?
- [ ] ¿Cambió alguna variable de entorno?
- [ ] ¿Cambió el modelo, prompt o tools del agente?
- [ ] Si sí a alguna → actualizar el spec correspondiente + entrada en CHANGELOG si hubo desvío

### Estado del MVP (2026-06-24)

Fases 0–7 **completadas**. Fase 8 (producción) documentada, pendiente de ejecutar.
