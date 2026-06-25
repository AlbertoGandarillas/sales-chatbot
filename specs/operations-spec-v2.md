# Operaciones v2 — Handoff, entrega y pagos

> Spec nuevo. Tres capacidades operativas: handoff a humano, fecha estimada de entrega, y confirmación manual de pago Yape/depósito. Aplican a ambos verticales.

---

## 1. Handoff a humano

### Migración

```sql
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'bot'
    CHECK (mode IN ('bot','human'));
```

(Definida también en `data-model-v2.md`.)

### Tool `escalar_a_humano` (ambos verticales)

```json
{
  "type": "function",
  "function": {
    "name": "escalar_a_humano",
    "description": "Deriva la conversación a una persona del equipo cuando el cliente lo pide explícitamente, está molesto, o el caso excede lo que puedes resolver (reclamos, casos especiales, negociación). Tras llamarla, avisa al cliente que alguien lo atenderá.",
    "parameters": {
      "type": "object",
      "properties": {
        "motivo": {
          "type": "string",
          "description": "Motivo breve de la derivación (para el dueño)"
        }
      },
      "required": ["motivo"]
    }
  }
}
```

**Lógica en servidor**:
1. `UPDATE conversations SET mode = 'human' WHERE id = conversation_id`.
2. `notifyOwner()` con el motivo, el `customer_phone` y el nombre del negocio.
3. Retorna al modelo un resultado indicando que se escaló, para que **responda al cliente** algo como: *"Listo, en un momento te escribe alguien del equipo de {negocio} para ayudarte 🙌"*. El agente **nunca queda en silencio** sin avisar.

### Comportamiento del webhook/agente con `mode = 'human'`

En `app/api/webhook/route.ts` / `lib/agent.ts`:

```
resolver negocio → cargar/crear conversación → guardar mensaje del cliente (siempre)
  └─ si conversation.mode === 'human':
        NO invocar OpenAI, NO generar respuesta automática
        (el mensaje queda guardado para que el dueño lo lea en el dashboard)
  └─ si conversation.mode === 'bot':
        flujo normal del agente
```

### Dashboard — control manual

En `/dashboard/conversaciones/[id]`:
- Toggle **"Pausar bot (tomar control)"** / **"Devolver al bot"** → cambia `mode` entre `human` y `bot`. Funciona en cualquier momento, haya escalado el bot o no.
- Cuando `mode = 'human'`: campo de texto para responder manualmente. Al enviar:
  - `sendWhatsAppMessage(customerPhone, texto)` con las credenciales del negocio.
  - Guarda el mensaje en `messages` con `role = 'human_agent'` (distinguible en el historial; ya permitido por el CHECK en `data-model-v2.md`).

### Criterios de aceptación

- [ ] `escalar_a_humano` pone `mode='human'`, notifica al dueño y el bot avisa al cliente.
- [ ] Con `mode='human'`, los mensajes entrantes se guardan pero el bot no responde.
- [ ] El dueño puede pausar/reactivar el bot manualmente.
- [ ] El dueño puede responder manualmente y el mensaje llega por WhatsApp y queda como `human_agent`.

---

## 2. Fecha estimada de entrega

### Migración

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS estimated_delivery_date date;
```

### Dashboard

- En el detalle de cada pedido, campo **editable** `estimated_delivery_date` (date picker). Guarda con el cliente autenticado (RLS).

### Tool `consultar_estado_pedido` (modificada)

- Incluye `estimated_delivery_date` en el JSON de cada pedido cuando exista:

```json
{
  "order_id": "uuid",
  "status": "confirmed",
  "payment_status": "paid",
  "delivery_status": "pending",
  "estimated_delivery_date": "2026-07-02",
  "total_soles": 159.00,
  "items_summary": "1x Zapatilla X (talla 41)"
}
```

- El system prompt (ambos verticales) instruye: *si el cliente pregunta por el estado y hay `estimated_delivery_date`, comunícala tal cual (ej. "tu pedido llegaría el 2 de julio")*. Si no hay fecha, no inventarla.

### Criterios de aceptación

- [ ] El dueño puede fijar/editar la fecha estimada en el dashboard.
- [ ] El agente comunica la fecha cuando existe y no la inventa cuando no.

---

## 3. Confirmación de pago Yape/depósito (versión básica, sin imágenes)

### Migración

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_note text;
```

### Alcance explícito

- **NO** se descargan, almacenan ni procesan imágenes de comprobantes.
- El cliente puede seguir enviando su pantallazo de Yape por WhatsApp; ese mensaje queda en `messages` como cualquier otro (sin procesamiento especial, sin OCR, sin asociación automática a un pedido).
- La verificación es **manual**: el dueño revisa en su app de Yape / banca que el pago llegó.

### Flujo

```
cliente paga por Yape y (opcional) manda pantallazo → queda en messages
dueño verifica el pago por su cuenta
dueño en /dashboard, detalle del pedido → botón "Confirmar pago"
   └─ UPDATE orders SET payment_status='paid', payment_confirmed_at=now(),
                        payment_note = <texto opcional>
```

- `payment_note` (texto libre, opcional): referencia de trazabilidad que escribe el dueño, ej. *"Yape de Juan, código 4521, S/45.00"*. Da trazabilidad sin procesar imágenes.

### Dashboard

- Botón **"Confirmar pago"** en el detalle del pedido (reemplaza/duplica el "Marcar pagado" de v1, ahora seteando `payment_confirmed_at`).
- Input opcional para `payment_note` al confirmar.
- Mostrar `payment_confirmed_at` y `payment_note` cuando existan.

### Mejora futura (fuera de alcance)

- Descarga del comprobante vía Media API de WhatsApp, OCR del monto, matching automático con el pedido. Documentado como futuro; no se implementa en este MVP.

### Criterios de aceptación

- [ ] El dueño confirma el pago manualmente; se setean `payment_status='paid'` y `payment_confirmed_at`.
- [ ] `payment_note` opcional se guarda y se muestra.
- [ ] No se descargan ni procesan imágenes; el pantallazo solo vive en el historial de mensajes.
