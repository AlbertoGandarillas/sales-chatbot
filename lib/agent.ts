import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions'
import { createServiceClient } from '@/lib/supabase'
import { notifyOwner, sendWhatsAppMessage } from '@/lib/whatsapp'
import type { Business } from '@/lib/business-resolver'

function waCreds(business: Business) {
  return {
    token: business.whatsapp_token,
    phoneNumberId: business.whatsapp_phone_number_id,
  }
}

const PRIMARY_MODEL = 'gpt-4.1-mini'
const FALLBACK_MODEL = 'gpt-4o-mini'
const HISTORY_LIMIT = 15

const SYSTEM_PROMPT = `Eres el asistente de ventas de Cruje, una panadería y pastelería en Perú. Tu nombre no es importante; preséntate como "el equipo de Cruje" o "Cruje".

PERSONALIDAD:
- Hablas en español peruano, de forma cercana y cálida. Tuteas al cliente.
- Eres paciente, servicial y conoces bien el catálogo.
- Usas "S/" para precios (ejemplo: S/ 12.50).
- Mensajes cortos, ideales para WhatsApp. Sin párrafos largos.

QUÉ PUEDES HACER:
1. Mostrar productos del catálogo (panes, pastelería, bebidas, etc.).
2. Tomar pedidos de productos del catálogo con cantidades.
3. Recibir encargos personalizados (tortas de cumpleaños, bodas, etc.) — para esto necesitas: tipo de torta, tamaño, fecha de entrega, mensaje en la torta (si aplica) y notas especiales.
4. Consultar el estado de pedidos del cliente.

REGLAS IMPORTANTES:
- NUNCA inventes productos ni precios. Usa la herramienta buscar_productos para consultar el catálogo real.
- Antes de confirmar un pedido, resume los ítems, cantidades y el total. Solo crea el pedido cuando el cliente confirme.
- Para tortas personalizadas o encargos especiales, usa iniciar_encargo_personalizado (NO crear_pedido). Recopila todos los datos antes de registrar.
- Si preguntan por el estado de un pedido, usa consultar_estado_pedido.
- Si no tienes información suficiente, pregunta. No asumas.
- Horario de atención: lun–sáb 7:00–20:00, dom 8:00–14:00 (informativo; no rechaces mensajes fuera de horario, solo avisa que confirmarán a la brevedad).
- Formas de pago: efectivo, Yape o Plin al momento de recoger/entregar.

CATÁLOGO:
- Los productos con is_custom_order=true (como "Torta personalizada") no tienen precio fijo; se cotizan caso a caso.
- Los demás productos tienen precio fijo en el catálogo.

Cuando el cliente salude por primera vez, dale la bienvenida a Cruje y pregúntale en qué puedes ayudarle hoy.`

const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'buscar_productos',
      description:
        'Busca productos en el catálogo de Cruje por nombre, categoría o palabra clave. Usar siempre antes de cotizar precios. Si el cliente pide ver el menú completo, usar query vacío.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Texto de búsqueda. Cadena vacía para listar todo el catálogo.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crear_pedido',
      description:
        'Crea un pedido confirmado de productos del catálogo con precio fijo. Solo usar después de que el cliente confirme ítems y cantidades. NO usar para tortas personalizadas.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Lista de productos a pedir',
            items: {
              type: 'object',
              properties: {
                product_id: {
                  type: 'string',
                  description: 'UUID del producto',
                },
                quantity: {
                  type: 'integer',
                  description: 'Cantidad a pedir',
                  minimum: 1,
                },
              },
              required: ['product_id', 'quantity'],
            },
            minItems: 1,
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'iniciar_encargo_personalizado',
      description:
        'Registra un encargo personalizado (tortas, pedidos a medida). SIEMPRE usar para tortas de cumpleaños, bodas u otros encargos especiales. Notifica automáticamente al dueño. Requiere tipo, tamaño y fecha de entrega como mínimo.',
      parameters: {
        type: 'object',
        properties: {
          tipo: {
            type: 'string',
            description: 'Tipo de encargo (cumpleaños, boda, corporativo, etc.)',
          },
          tamaño: {
            type: 'string',
            description: 'Tamaño o número de porciones',
          },
          fecha_entrega: {
            type: 'string',
            description: 'Fecha de entrega deseada en formato YYYY-MM-DD',
          },
          mensaje_en_torta: {
            type: 'string',
            description: 'Texto para escribir en la torta (opcional)',
          },
          notas: {
            type: 'string',
            description:
              'Notas adicionales: sabor, decoración, restricciones alimentarias (opcional)',
          },
        },
        required: ['tipo', 'tamaño', 'fecha_entrega'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_estado_pedido',
      description:
        'Consulta el estado de los pedidos del cliente en esta conversación. Usar cuando pregunte por el estado, si está listo, si ya pagó, etc.',
      parameters: {
        type: 'object',
        properties: {
          conversation_id: {
            type: 'string',
            description: 'ID de la conversación actual',
          },
        },
        required: ['conversation_id'],
      },
    },
  },
]

interface OrderItem {
  product_id: string
  name: string
  quantity: number
  unit_price: number
}

interface CustomOrderDetails {
  tipo: string
  tamaño: string
  fecha_entrega: string
  mensaje_en_torta?: string
  notas?: string
}

interface AgentContext {
  conversationId: string
  customerPhone: string
  business: Business
}

function buildContextPrompt(ctx: AgentContext): string {
  return `${SYSTEM_PROMPT}

CONVERSACIÓN ACTUAL:
- conversation_id: ${ctx.conversationId}
- customer_phone: ${ctx.customerPhone}
- business_id: ${ctx.business.id}
- negocio: ${ctx.business.name}`
}

async function getOrCreateConversation(businessId: string, customerPhone: string) {
  const db = createServiceClient()

  const { data: existing } = await db
    .from('conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_phone', customerPhone)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await db
    .from('conversations')
    .insert({
      business_id: businessId,
      customer_phone: customerPhone,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) throw error
  return created.id
}

async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const db = createServiceClient()
  const { error } = await db.from('messages').insert({
    conversation_id: conversationId,
    role,
    content,
  })
  if (error) throw error
}

async function loadHistory(
  conversationId: string
): Promise<ChatCompletionMessageParam[]> {
  const db = createServiceClient()

  const { data, error } = await db
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  if (error) throw error

  return (data ?? [])
    .reverse()
    .map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))
}

async function buscarProductos(businessId: string, query: string) {
  const db = createServiceClient()
  const trimmed = query.trim()

  let request = db
    .from('products')
    .select('id, name, description, category, price_soles, is_custom_order')
    .eq('business_id', businessId)
    .eq('available', true)

  if (trimmed && trimmed !== '*') {
    const pattern = `%${trimmed}%`
    request = request.or(
      `name.ilike.${pattern},category.ilike.${pattern},description.ilike.${pattern}`
    )
  }

  const { data, error } = await request.limit(20)
  if (error) throw error

  return { products: data ?? [] }
}

async function crearPedido(
  ctx: AgentContext,
  items: { product_id: string; quantity: number }[]
) {
  const db = createServiceClient()
  const orderItems: OrderItem[] = []
  let totalSoles = 0

  for (const item of items) {
    const { data: product, error } = await db
      .from('products')
      .select('id, name, price_soles, is_custom_order, available')
      .eq('id', item.product_id)
      .eq('business_id', ctx.business.id)
      .single()

    if (error || !product) {
      throw new Error(`Producto no encontrado: ${item.product_id}`)
    }
    if (!product.available) {
      throw new Error(`Producto no disponible: ${product.name}`)
    }
    if (product.is_custom_order) {
      throw new Error(
        `${product.name} requiere encargo personalizado, no pedido directo`
      )
    }

    const unitPrice = Number(product.price_soles)
    orderItems.push({
      product_id: product.id,
      name: product.name,
      quantity: item.quantity,
      unit_price: unitPrice,
    })
    totalSoles += unitPrice * item.quantity
  }

  const { data: order, error: orderError } = await db
    .from('orders')
    .insert({
      business_id: ctx.business.id,
      conversation_id: ctx.conversationId,
      status: 'pending',
      items: orderItems,
      total_soles: totalSoles,
      is_custom_order: false,
    })
    .select('id')
    .single()

  if (orderError) throw orderError

  return {
    order_id: order.id,
    total_soles: totalSoles,
    items: orderItems,
    status: 'pending',
  }
}

async function iniciarEncargoPersonalizado(
  ctx: AgentContext,
  details: CustomOrderDetails
) {
  const db = createServiceClient()

  const { data: order, error } = await db
    .from('orders')
    .insert({
      business_id: ctx.business.id,
      conversation_id: ctx.conversationId,
      status: 'pending',
      items: [],
      total_soles: 0,
      is_custom_order: true,
      custom_order_details: details,
    })
    .select('id')
    .single()

  if (error) throw error

  const ownerMessage = `🎂 Nuevo encargo personalizado — ${ctx.business.name}

Tipo: ${details.tipo}
Tamaño: ${details.tamaño}
Fecha de entrega: ${details.fecha_entrega}
Mensaje en torta: ${details.mensaje_en_torta || '—'}
Notas: ${details.notas || '—'}
Cliente: ${ctx.customerPhone}
Pedido ID: ${order.id}`

  await notifyOwner(ownerMessage, {
    ownerNumber: ctx.business.owner_whatsapp_number,
    ...waCreds(ctx.business),
  })

  return {
    order_id: order.id,
    status: 'pending',
    message: `Encargo registrado. El equipo de ${ctx.business.name} te contactará para confirmar precio y detalles.`,
  }
}

async function consultarEstadoPedido(conversationId: string) {
  const db = createServiceClient()

  const { data, error } = await db
    .from('orders')
    .select(
      'id, status, payment_status, delivery_status, total_soles, is_custom_order, items, custom_order_details, created_at'
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw error

  const orders = (data ?? []).map((order) => {
    let itemsSummary = ''

    if (order.is_custom_order && order.custom_order_details) {
      const details = order.custom_order_details as CustomOrderDetails
      itemsSummary = `Encargo: ${details.tipo} (${details.tamaño})`
    } else {
      const items = (order.items ?? []) as OrderItem[]
      itemsSummary = items
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(', ')
    }

    return {
      order_id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      delivery_status: order.delivery_status,
      total_soles: Number(order.total_soles),
      is_custom_order: order.is_custom_order,
      items_summary: itemsSummary,
      created_at: order.created_at,
    }
  })

  return { orders }
}

async function executeTool(
  ctx: AgentContext,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'buscar_productos':
      return buscarProductos(ctx.business.id, String(args.query ?? ''))
    case 'crear_pedido':
      return crearPedido(
        ctx,
        args.items as { product_id: string; quantity: number }[]
      )
    case 'iniciar_encargo_personalizado':
      return iniciarEncargoPersonalizado(ctx, {
        tipo: String(args.tipo),
        tamaño: String(args.tamaño),
        fecha_entrega: String(args.fecha_entrega),
        mensaje_en_torta: args.mensaje_en_torta
          ? String(args.mensaje_en_torta)
          : undefined,
        notas: args.notas ? String(args.notas) : undefined,
      })
    case 'consultar_estado_pedido':
      return consultarEstadoPedido(ctx.conversationId)
    default:
      throw new Error(`Tool desconocida: ${name}`)
  }
}

let openaiClient: OpenAI | null = null
let modelFallbackUsed = false

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY')
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

function shouldFallbackModel(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const status = (error as { status?: number }).status
  const message = String((error as { message?: string }).message ?? '').toLowerCase()
  return (
    status === 404 ||
    status === 400 ||
    message.includes('model') ||
    message.includes('does not exist')
  )
}

async function createChatCompletion(
  messages: ChatCompletionMessageParam[],
  model: string
) {
  const client = getOpenAI()
  return client.chat.completions.create({
    model,
    messages,
    tools: TOOLS,
    tool_choice: 'auto',
  })
}

export async function processIncomingMessage(
  business: Business,
  customerPhone: string,
  text: string
): Promise<void> {
  const conversationId = await getOrCreateConversation(business.id, customerPhone)
  const ctx: AgentContext = {
    conversationId,
    customerPhone,
    business,
  }

  await saveMessage(conversationId, 'user', text)

  try {
    const reply = await generateReply(ctx)
    await saveMessage(conversationId, 'assistant', reply)
    await sendWhatsAppMessage(customerPhone, reply, waCreds(business))
  } catch (error) {
    console.error('[agent] Error procesando mensaje:', error)
    const fallback = `¡Hola! Gracias por escribir a ${business.name}. Hubo un problemita técnico, pero ya estamos revisando. ¿Puedes intentar de nuevo en un momento?`
    try {
      await saveMessage(conversationId, 'assistant', fallback)
      await sendWhatsAppMessage(customerPhone, fallback, waCreds(business))
    } catch (sendError) {
      console.error('[agent] Error enviando fallback:', sendError)
      throw sendError
    }
  }
}

async function generateReply(ctx: AgentContext): Promise<string> {
  const history = await loadHistory(ctx.conversationId)
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildContextPrompt(ctx) },
    ...history,
  ]

  let model = PRIMARY_MODEL
  let response

  try {
    response = await createChatCompletion(messages, model)
  } catch (error) {
    if (shouldFallbackModel(error)) {
      model = FALLBACK_MODEL
      modelFallbackUsed = true
      console.warn(
        `Modelo ${PRIMARY_MODEL} no disponible, usando ${FALLBACK_MODEL}`
      )
      response = await createChatCompletion(messages, model)
    } else {
      throw error
    }
  }

  while (response.choices[0]?.message?.tool_calls?.length) {
    const assistantMessage = response.choices[0].message
    messages.push(assistantMessage)

    for (const toolCall of assistantMessage.tool_calls ?? []) {
      if (toolCall.type !== 'function') continue

      const args = JSON.parse(toolCall.function.arguments) as Record<
        string,
        unknown
      >
      let result: unknown

      try {
        result = await executeTool(ctx, toolCall.function.name, args)
      } catch (err) {
        result = {
          error: err instanceof Error ? err.message : 'Error ejecutando tool',
        }
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }

    try {
      response = await createChatCompletion(messages, model)
    } catch (error) {
      if (!modelFallbackUsed && shouldFallbackModel(error)) {
        model = FALLBACK_MODEL
        modelFallbackUsed = true
        response = await createChatCompletion(messages, model)
      } else {
        throw error
      }
    }
  }

  return (
    response.choices[0]?.message?.content?.trim() ||
    'Disculpa, no pude procesar tu mensaje. ¿Puedes intentar de nuevo?'
  )
}

export function wasModelFallbackUsed(): boolean {
  return modelFallbackUsed
}
