# Plan de implementación — Cruje MVP

Metodología: spec-driven. Cada fase se implementa siguiendo los specs en `/specs/` y solo avanza tras completar la anterior.

---

## Fase 0 — Specs ✅

**Entregables**: `architecture.md`, `data-model.md`, `agent-spec.md`, `sprint-plan.md`

**Criterio de aceptación**: Usuario revisa y aprueba los 4 archivos antes de escribir código.

---

## Fase 1 — Supabase (migraciones + cliente)

**Spec de referencia**: `data-model.md`

**Tareas**:

1. `npx supabase init` si no existe `/supabase`
2. Crear migración `supabase/migrations/00001_initial_schema.sql` con el SQL de `data-model.md`
3. Documentar comandos para el usuario:
   - `npx supabase login` (autenticación CLI)
   - `npx supabase link --project-ref <ref>` (enlazar proyecto remoto)
4. Tras confirmación del usuario: `npx supabase db push`
5. Crear seed (`supabase/seed.sql` o migración `00002_seed_cruje.sql`) con negocio Cruje + 8+ productos
6. Aplicar seed con CLI
7. Actualizar `lib/supabase.ts`:
   - Cliente público (anon key)
   - Cliente de servicio (`createServiceClient`) con service role key

**Checkpoint para el usuario**: solo login/link del CLI (las env vars de Supabase ya están configuradas).

**Criterio de aceptación**:
- [ ] Tablas creadas en Supabase remoto
- [ ] Seed con Cruje y catálogo visible en dashboard de Supabase
- [ ] `lib/supabase.ts` exporta ambos clientes

---

## Fase 2 — Variables de entorno completas

**Tareas**:

1. Crear `.env.local.example` con todas las variables documentadas
2. **Checkpoint consolidado** para el usuario (una sola vez):

   ```
   CHECKPOINT — necesito que pegues esto en .env.local:

   OPENAI_API_KEY=
   (OpenAI Platform → API Keys → Create new secret key)

   WHATSAPP_TOKEN=
   (Meta for Developers → tu app → WhatsApp → API Setup → Temporary access token o System User token permanente)

   WHATSAPP_PHONE_NUMBER_ID=
   (Meta for Developers → WhatsApp → API Setup → Phone number ID)

   WHATSAPP_VERIFY_TOKEN=
   (Lo inventas tú; string aleatorio seguro, ej: cruje_wh_verify_8f3k2m9x)

   OWNER_WHATSAPP_NUMBER=
   (Tu número con código de país, sin +, ej: 51999888777)
   ```

3. Esperar confirmación del usuario antes de continuar

**Criterio de aceptación**:
- [ ] `.env.local` con todas las variables
- [ ] `.env.local.example` en el repo (sin valores reales)

---

## Fase 3 — Webhook de WhatsApp

**Spec de referencia**: `architecture.md`

**Tareas**:

1. Crear `app/api/webhook/route.ts`
2. **GET**: verificación Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`)
3. **POST**: parsear payload, extraer mensajes de texto, llamar stub del agente, responder `200 OK` inmediato
4. Manejar solo mensajes `type: "text"`; ignorar status/delivery receipts

**Criterio de aceptación**:
- [ ] GET devuelve challenge cuando verify_token coincide
- [ ] POST responde 200 sin esperar al agente
- [ ] Logs muestran número y texto extraídos

---

## Fase 4 — Cliente de WhatsApp

**Spec de referencia**: `architecture.md`

**Tareas**:

1. Crear `lib/whatsapp.ts`
2. `sendWhatsAppMessage(to, text)` — POST Graph API v21.0
3. `notifyOwner(message)` — envía a `OWNER_WHATSAPP_NUMBER`
4. Documentar configuración en Meta for Developers (URL webhook, verify token, campos a suscribir)

**Criterio de aceptación**:
- [ ] Función de envío probada (puede ser script de prueba o integración en Fase 5)
- [ ] `notifyOwner` formatea mensajes legibles

**Configuración Meta (instrucciones al usuario)**:
- Webhook URL: `https://<tu-dominio-vercel>/api/webhook`
- Verify token: el valor de `WHATSAPP_VERIFY_TOKEN`
- Campos suscritos: `messages`
- Para desarrollo local: usar ngrok o similar, o probar directo en Vercel

---

## Fase 5 — Agente con OpenAI (function calling)

**Spec de referencia**: `agent-spec.md`

**Tareas**:

1. `npm install openai`
2. Crear `lib/agent.ts` con `processIncomingMessage(phone, text)`
3. Implementar las 4 tools según `agent-spec.md`
4. Ciclo multi-turno completo (tool_calls → ejecutar → reenviar → respuesta final)
5. Persistir mensajes en `messages`
6. Límite de 15 mensajes de historial
7. Modelo: `gpt-5.4-mini` (fallback `gpt-4o-mini`)
8. `iniciar_encargo_personalizado` llama a `notifyOwner()`
9. Conectar webhook con `processIncomingMessage`

**Criterio de aceptación**:
- [ ] Saludo responde con bienvenida de Cruje
- [ ] Búsqueda de productos devuelve catálogo real
- [ ] Pedido se guarda en `orders`
- [ ] Encargo personalizado notifica al dueño
- [ ] Consulta de estado devuelve pedidos de la conversación
- [ ] Mensajes persistidos en BD

**Checklist de pruebas (celular, número de prueba Meta)**:

| # | Acción del usuario | Resultado esperado |
|---|---|---|
| 1 | "Hola" | Bienvenida de Cruje, pregunta en qué ayudar |
| 2 | "¿Qué panes tienen?" | Lista productos de categoría panes con precios |
| 3 | "Quiero 2 panes de yema y 1 alfajor" → confirmar | Pedido creado, total en S/, estado pendiente |
| 4 | "Quiero una torta de cumpleaños mediana para el 15 de julio, que diga Feliz cumple Isa" | Encargo registrado; dueño recibe WhatsApp con detalle |
| 5 | "¿Cómo va mi pedido?" | Estado del pedido (pendiente/pago/entrega) |

---

## Fase 6 — Dashboard mínimo

**Spec de referencia**: `architecture.md`, `data-model.md`

**Tareas**:

1. Crear `app/dashboard/page.tsx`
2. Listar pedidos de Cruje ordenados por `created_at DESC`
3. Suscripción Supabase Realtime a `orders`
4. Botones: marcar pagado, marcar entregado
5. Sección separada o badge para encargos personalizados (`is_custom_order`)
6. UI mínima con Tailwind (tabla o cards)

**Criterio de aceptación**:
- [ ] Pedidos aparecen en tiempo real al crearse desde WhatsApp
- [ ] Marcar pago/entrega actualiza la BD y la UI
- [ ] Encargos personalizados visibles con detalle expandible

---

## Fase 7 — Pruebas end-to-end

**Tareas**:

1. Desplegar a Vercel con todas las env vars
2. Configurar webhook en Meta apuntando a producción
3. Ejecutar checklist de Fase 5 desde celular
4. Verificar dashboard refleja pedidos en vivo
5. Verificar notificación al dueño en encargo personalizado
6. Revisar logs en Vercel Functions para errores

**Criterio de aceptación**:
- [ ] Flujo completo funciona en producción
- [ ] Sin errores 5xx en webhook
- [ ] Tiempos de respuesta < 30 s (Meta timeout)

---

## Fase 8 — Checklist de migración a producción (solo documentación)

**No implementar código.** Documentar en `specs/production-checklist.md`:

- [ ] Cambiar número de prueba Meta por número de producción verificado
- [ ] Generar token permanente (System User) en Meta Business Suite
- [ ] Configurar webhook en producción con URL final
- [ ] Copiar todas las env vars a Vercel (Settings → Environment Variables)
- [ ] Activar RLS más restrictivo (autenticación en dashboard)
- [ ] Configurar dominio personalizado en Vercel
- [ ] Revisar límites de rate de OpenAI y Meta
- [ ] Backup de BD Supabase
- [ ] Monitoreo: Vercel Analytics + logs de Supabase
- [ ] Política de privacidad / consentimiento de datos (Perú — Ley de Protección de Datos Personales)

---

## Orden de dependencias

```
Fase 0 (specs)
  └─► Fase 1 (Supabase)
        └─► Fase 2 (env vars)
              ├─► Fase 3 (webhook)
              │     └─► Fase 4 (whatsapp client)
              │           └─► Fase 5 (agente)
              │                 ├─► Fase 6 (dashboard)
              │                 └─► Fase 7 (E2E)
              └─► Fase 8 (checklist, en paralelo al final)
```

---

## Archivos que se crearán por fase

| Fase | Archivos nuevos/modificados |
|---|---|
| 1 | `supabase/config.toml`, `supabase/migrations/*`, `supabase/seed.sql`, `lib/supabase.ts` |
| 2 | `.env.local.example` |
| 3 | `app/api/webhook/route.ts` |
| 4 | `lib/whatsapp.ts` |
| 5 | `lib/agent.ts`, `package.json` (openai) |
| 6 | `app/dashboard/page.tsx` |
| 7 | — (solo pruebas) |
| 8 | `specs/production-checklist.md` |
