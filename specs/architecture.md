# Arquitectura — Agente WhatsApp Cruje

## Diagrama de flujo

```
┌─────────────┐     mensaje      ┌──────────────────────────┐
│   Cliente   │ ───────────────► │  WhatsApp Cloud API      │
│  (WhatsApp) │                  │  (Meta Graph API)        │
└─────────────┘                  └────────────┬─────────────┘
       ▲                                      │ POST webhook
       │                                      ▼
       │                           ┌──────────────────────────┐
       │                           │  app/api/webhook/route.ts │
       │                           │  GET  → verificación Meta │
       │                           │  POST → recibe mensaje    │
       │                           └────────────┬─────────────┘
       │                                        │
       │                          await agente, luego 200 OK
       │                          (Meta tolera hasta ~20 s)
       │                                        ▼
       │                           ┌──────────────────────────┐
       │                           │       lib/agent.ts        │
       │                           │  1. Carga/crea conversación│
       │                           │  2. Guarda msg del cliente │
       │                           │  3. Llama OpenAI + tools   │
       │                           │  4. Ejecuta tools → Supabase│
       │                           │  5. Reenvía resultados al   │
       │                           │     modelo (multi-turno)   │
       │                           │  6. Guarda respuesta agente │
       │                           └──────┬───────────┬────────┘
       │                                  │           │
       │                                  ▼           ▼
       │                           ┌──────────┐  ┌──────────────┐
       │                           │ OpenAI   │  │ lib/supabase │
       │                           │ Chat API │  │ .ts          │
       │                           │ (tools)  │  │              │
       │                           └──────────┘  └──────┬───────┘
       │                                              │
       │                                              ▼
       │                                    ┌──────────────────┐
       │                                    │    Supabase      │
       │                                    │  (Postgres +     │
       │                                    │   Realtime)      │
       │                                    └────────┬─────────┘
       │                                             │
       │  texto de respuesta                         │ pedidos, mensajes
       │                                             ▼
       │                           ┌──────────────────────────┐
       └───────────────────────────│      lib/whatsapp.ts      │
                                   │  sendWhatsAppMessage()    │
                                   │  notifyOwner()            │
                                   └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Dashboard (app/dashboard/page.tsx)                             │
│  Suscripción Realtime a tabla orders → lista en vivo            │
│  Acciones: marcar pago / marcar entrega / ver encargos          │
└─────────────────────────────────────────────────────────────────┘
```

## Secuencia de un mensaje entrante

1. El cliente envía un mensaje de texto por WhatsApp.
2. Meta reenvía el payload al webhook (`POST /api/webhook`).
3. El webhook extrae `from` (número) y `text.body`, **espera** a que el agente termine (`await processIncomingMessage`), y luego responde `200 OK`. Meta tolera hasta ~20 s; en Vercel Hobby el procesamiento en background no es fiable.
4. El agente busca o crea una `conversation` asociada al número del cliente y al negocio Cruje.
5. El agente persiste el mensaje del cliente en `messages`.
6. El agente carga los últimos 15 mensajes de la conversación y los envía a OpenAI junto con el system prompt y las definiciones de tools.
7. Si OpenAI devuelve `tool_calls`, el agente ejecuta cada función contra Supabase (y `notifyOwner` cuando corresponda), agrega los resultados con `role: "tool"` al historial y vuelve a llamar al modelo hasta obtener una respuesta en texto.
8. El agente persiste la respuesta final en `messages`.
9. `sendWhatsAppMessage` envía el texto al cliente por la Graph API.

## Responsabilidades por módulo

### `lib/supabase.ts`

- Exportar dos clientes del SDK `@supabase/supabase-js`:
  - **Cliente público** (`createClient` con `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — para el dashboard en el navegador.
  - **Cliente de servicio** (`createServiceClient` con `SUPABASE_SERVICE_ROLE_KEY`) — para el agente en el servidor (bypass RLS).
- **Importante (Next.js)**: las variables `NEXT_PUBLIC_*` deben leerse con acceso estático (`process.env.NEXT_PUBLIC_SUPABASE_URL`), no vía `process.env[nombreVariable]`, o no se inyectan en el bundle del navegador.
- Constante `CRUJE_BUSINESS_ID` para el único negocio del MVP.
- No contiene lógica de negocio; solo instanciación de clientes.

### `lib/whatsapp.ts`

- `sendWhatsAppMessage(to: string, text: string): Promise<void>` — POST a `https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages` con Bearer `WHATSAPP_TOKEN`.
- `notifyOwner(message: string): Promise<void>` — llama a `sendWhatsAppMessage` hacia `OWNER_WHATSAPP_NUMBER`.
- Manejo de errores con logging; no lanza excepciones no capturadas hacia el webhook.

### `lib/agent.ts`

- `processIncomingMessage(customerPhone: string, text: string): Promise<void>` — punto de entrada principal.
- Gestión de conversación (get-or-create por `customer_phone` + `business_id`).
- Persistencia de mensajes (`user` / `assistant`).
- Ciclo completo de function calling multi-turno con OpenAI.
- Implementación de las 4 tools: `buscar_productos`, `crear_pedido`, `iniciar_encargo_personalizado`, `consultar_estado_pedido`.
- Límite de historial: últimos 15 mensajes enviados al modelo.
- Modelo: `gpt-4.1-mini` (fallback `gpt-4o-mini`).
- Si falla OpenAI o el envío, intenta enviar mensaje de disculpa al cliente y guardarlo en BD.

### `app/api/webhook/route.ts`

- **GET**: verificación del webhook de Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`). Compara `hub.verify_token` contra `WHATSAPP_VERIFY_TOKEN` (con `.trim()`); si coincide, devuelve `hub.challenge` como texto plano con status 200.
- **POST**: parsea el body JSON de Meta, extrae mensajes de texto entrantes, ignora otros tipos de evento (status, etc.), **await** `processIncomingMessage`, luego responde `200 OK`.
- `export const maxDuration = 60` (límite de función en Vercel; en Hobby el tope efectivo es menor).

### `app/dashboard/page.tsx`

- Página cliente (`'use client'`) que lista pedidos del negocio Cruje.
- Suscripción Supabase Realtime a cambios en `orders`.
- Filtros o secciones: pedidos regulares vs. encargos personalizados (`is_custom_order = true`).
- Acciones por pedido: marcar como pagado (`payment_status`), marcar como entregado (`delivery_status`).
- Sin autenticación en el MVP (protección futura vía middleware o RLS).

## Variables de entorno requeridas

| Variable | Uso | Módulo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto | `lib/supabase.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública | `lib/supabase.ts`, dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (servidor) | `lib/supabase.ts`, agente |
| `OPENAI_API_KEY` | API de OpenAI | `lib/agent.ts` |
| `WHATSAPP_TOKEN` | Token permanente de Meta | `lib/whatsapp.ts` |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de WhatsApp | `lib/whatsapp.ts` |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación del webhook | `app/api/webhook/route.ts` |
| `OWNER_WHATSAPP_NUMBER` | Número del dueño (notificaciones) | `lib/whatsapp.ts` |

## Decisiones de diseño

- **Webhook await (no fire-and-forget)**: el spec original proponía responder 200 OK inmediato; en la implementación se hace `await` al agente porque Vercel Hobby cortaba el procesamiento en background. Meta tolera ~20 s. Ver `CHANGELOG.md`.
- **Service role en servidor**: el agente necesita escribir sin sesión de usuario; el dashboard usa anon key con políticas RLS permisivas en el MVP.
- **Sin librería de WhatsApp**: fetch directo a Graph API para minimizar dependencias.
- **Historial limitado a 15 mensajes**: control de costos de tokens en OpenAI.
- **Moneda**: soles peruanos (`price_soles`, `total_soles`); el agente comunica precios en formato "S/ X.XX".
- **Meta webhook**: además de verificar la URL, hay que suscribir el campo **`messages`** o no llegan mensajes del celular.
- **Vercel**: tras agregar variables de entorno, es obligatorio **Redeploy** para que el código las vea.
