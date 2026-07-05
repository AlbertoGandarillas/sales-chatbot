import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions'
import { createServiceClient } from '@/lib/supabase'
import { resolveProductImage } from '@/lib/product-image'
import { mapProductForSearch } from '@/lib/pricing'
import { createCatalogOrder, type OrderLineItem } from '@/lib/order-create'
import {
  advanceNextRunOn,
  createOrderFromRecurring,
  formatRecurringSchedule,
  getActiveReminderRun,
  listRecurringForCustomer,
  skipRecurringRun,
  summarizeRecurringItems,
  type RecurringOrderRow,
} from '@/lib/recurring-orders'
import { notifyOwner, sendWhatsAppMessage } from '@/lib/whatsapp'
import type { Business } from '@/lib/business-resolver'
import { buildSystemPrompt } from '@/lib/prompts'
import { searchBusinessKnowledge } from '@/lib/knowledge-search'
import { getToolsFor } from '@/lib/tools'
import { logUsage } from '@/lib/usage-tracking'
import {
  checkAgentRateLimit,
  checkInboundRateLimit,
  RATE_LIMIT_AGENT_MESSAGE,
  RATE_LIMIT_INBOUND_MESSAGE,
} from '@/lib/rate-limit'
import {
  inboundMediaPlaceholder,
  NON_TEXT_REPLY,
} from '@/lib/inbound-media'
import { captureError } from '@/lib/observability'

function waCreds(business: Business) {
  return {
    token: business.whatsapp_token,
    phoneNumberId: business.whatsapp_phone_number_id,
  }
}

const PRIMARY_MODEL = 'gpt-4.1-mini'
const FALLBACK_MODEL = 'gpt-4o-mini'
const HISTORY_LIMIT = 15
const MAX_TOOL_ROUNDS = 8

const MAX_ROUNDS_FALLBACK_REPLY =
  'Disculpa, necesito un momento más para revisar tu consulta. ¿Puedes repetir lo que necesitas?'

interface OrderItem extends OrderLineItem {}

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
  return buildSystemPrompt(ctx.business, {
    conversationId: ctx.conversationId,
    customerPhone: ctx.customerPhone,
  })
}

type ConversationMode = 'bot' | 'human'

async function getOrCreateConversation(
  businessId: string,
  customerPhone: string
): Promise<{ id: string; mode: ConversationMode }> {
  const db = createServiceClient()

  const { data: existing } = await db
    .from('conversations')
    .select('id, mode')
    .eq('business_id', businessId)
    .eq('customer_phone', customerPhone)
    .maybeSingle()

  if (existing) {
    return { id: existing.id, mode: (existing.mode as ConversationMode) ?? 'bot' }
  }

  const { data: created, error } = await db
    .from('conversations')
    .insert({
      business_id: businessId,
      customer_phone: customerPhone,
      status: 'active',
    })
    .select('id, mode')
    .single()

  if (error) throw error
  return { id: created.id, mode: (created.mode as ConversationMode) ?? 'bot' }
}

async function touchConversation(conversationId: string) {
  const db = createServiceClient()
  await db
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
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
  await touchConversation(conversationId)
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

async function buscarProductos(
  business: Business,
  query: string,
  soloOfertas = false
) {
  const db = createServiceClient()
  const trimmed = query.trim()
  const now = new Date()

  const columns =
    'id, name, description, category, price_soles, is_custom_order, talla_range, color_o_material, image_url, image_storage_path, promo_price_soles, promo_starts_at, promo_ends_at, promo_label'

  let request = db
    .from('products')
    .select(columns)
    .eq('business_id', business.id)
    .eq('available', true)

  if (trimmed && trimmed !== '*') {
    const pattern = `%${trimmed}%`
    const filters = [
      `name.ilike.${pattern}`,
      `category.ilike.${pattern}`,
      `description.ilike.${pattern}`,
      `color_o_material.ilike.${pattern}`,
      `promo_label.ilike.${pattern}`,
    ]
    request = request.or(filters.join(','))
  }

  const { data, error } = await request.limit(soloOfertas ? 50 : 20)
  if (error) throw error

  let products = (data ?? []).map((row) => {
    const mapped = mapProductForSearch(row, now)
    const { url: image_public_url } = resolveProductImage({
      image_url: row.image_url,
      image_storage_path: row.image_storage_path,
    })
    return { ...mapped, image_public_url }
  })

  if (soloOfertas) {
    products = products.filter((p) => p.on_promo)
  }

  return { products: products.slice(0, 20) }
}

interface CrearPedidoItem {
  product_id: string
  quantity: number
  talla_solicitada?: string
  color_solicitado?: string
}

async function crearPedido(ctx: AgentContext, items: CrearPedidoItem[]) {
  const db = createServiceClient()
  const result = await createCatalogOrder({
    db,
    businessId: ctx.business.id,
    conversationId: ctx.conversationId,
    items,
    source: 'chat',
  })

  return {
    order_id: result.order_id,
    total_soles: result.total_soles,
    items: result.items,
    status: result.status,
  }
}

async function consultarPedidoRecurrente(ctx: AgentContext) {
  const db = createServiceClient()
  const rows = await listRecurringForCustomer(
    db,
    ctx.business.id,
    ctx.customerPhone
  )

  if (rows.length === 0) {
    return { recurrentes: [], message: 'Este cliente no tiene pedidos recurrentes activos.' }
  }

  return {
    recurrentes: rows.map((row) => ({
      id: row.id,
      status: row.status,
      frequency: row.frequency,
      schedule: formatRecurringSchedule(row),
      next_run_on: row.next_run_on,
      items_summary: summarizeRecurringItems(row.items),
      notes: row.notes,
    })),
  }
}

async function confirmarPedidoRecurrente(
  ctx: AgentContext,
  confirmado: boolean,
  notasCliente?: string
) {
  const db = createServiceClient()
  const pending = await getActiveReminderRun(
    db,
    ctx.business.id,
    ctx.customerPhone
  )

  if (!pending) {
    throw new Error(
      'No hay un recordatorio de pedido recurrente pendiente de confirmación para hoy.'
    )
  }

  const recurring = pending.recurring as RecurringOrderRow

  if (!confirmado) {
    const nextRun = advanceNextRunOn(recurring)
    await skipRecurringRun(db, recurring, pending.run.id)
    return {
      confirmado: false,
      message: 'Pedido de esta semana omitido. Próxima fecha actualizada.',
      next_run_on: nextRun,
    }
  }

  const order = await createOrderFromRecurring(db, ctx.business, recurring, {
    conversationId: ctx.conversationId,
    runId: pending.run.id,
    customerNotes: notasCliente,
  })

  return {
    confirmado: true,
    order_id: order.order_id,
    total_soles: order.total_soles,
    message: 'Pedido recurrente confirmado y registrado.',
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

async function escalarAHumano(ctx: AgentContext, motivo: string) {
  const db = createServiceClient()

  await db
    .from('conversations')
    .update({ mode: 'human' })
    .eq('id', ctx.conversationId)

  const ownerMessage = `🙋 Derivación a humano — ${ctx.business.name}

Motivo: ${motivo}
Cliente: ${ctx.customerPhone}
Conversación: ${ctx.conversationId}

Entra al dashboard para tomar el control y responder.`

  try {
    await notifyOwner(ownerMessage, {
      ownerNumber: ctx.business.owner_whatsapp_number,
      ...waCreds(ctx.business),
    })
  } catch (err) {
    console.error('[agent] No se pudo notificar la derivación al dueño:', err)
  }

  return {
    escalated: true,
    message: `Avísale al cliente, con tus palabras, que en un momento lo atiende alguien del equipo de ${ctx.business.name}.`,
  }
}

async function consultarEstadoPedido(conversationId: string) {
  const db = createServiceClient()

  const { data, error } = await db
    .from('orders')
    .select(
      'id, status, payment_status, delivery_status, total_soles, is_custom_order, items, custom_order_details, estimated_delivery_date, created_at'
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
      estimated_delivery_date: order.estimated_delivery_date ?? null,
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
      return buscarProductos(
        ctx.business,
        String(args.query ?? ''),
        args.solo_ofertas === true
      )
    case 'crear_pedido':
      return crearPedido(ctx, args.items as CrearPedidoItem[])
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
    case 'escalar_a_humano':
      return escalarAHumano(ctx, String(args.motivo ?? 'Sin motivo'))
    case 'consultar_pedido_recurrente':
      return consultarPedidoRecurrente(ctx)
    case 'confirmar_pedido_recurrente':
      return confirmarPedidoRecurrente(
        ctx,
        args.confirmado === true,
        args.notas_cliente ? String(args.notas_cliente) : undefined
      )
    case 'buscar_conocimiento_negocio':
      return searchBusinessKnowledge(
        ctx.business,
        String(args.query ?? ''),
        args.categoria ? String(args.categoria) : null
      )
    default:
      throw new Error(`Tool desconocida: ${name}`)
  }
}

let openaiClient: OpenAI | null = null

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
  model: string,
  tools: ChatCompletionTool[]
) {
  const client = getOpenAI()
  return client.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: 'auto',
  })
}

interface GenerateReplyResult {
  reply: string
  model: string
  inputTokens: number
  outputTokens: number
}

export async function handleNonTextInbound(
  business: Business,
  customerPhone: string,
  mediaType: string
): Promise<void> {
  const { id: conversationId, mode } = await getOrCreateConversation(
    business.id,
    customerPhone
  )

  await saveMessage(
    conversationId,
    'user',
    inboundMediaPlaceholder(mediaType)
  )

  if (mode === 'human') return

  const inboundLimit = await checkInboundRateLimit(business.id, customerPhone)
  const reply = inboundLimit.allowed
    ? NON_TEXT_REPLY
    : RATE_LIMIT_INBOUND_MESSAGE

  await saveMessage(conversationId, 'assistant', reply)
  await sendWhatsAppMessage(customerPhone, reply, waCreds(business))
}

export async function processIncomingMessage(
  business: Business,
  customerPhone: string,
  text: string
): Promise<void> {
  const { id: conversationId, mode } = await getOrCreateConversation(
    business.id,
    customerPhone
  )

  await saveMessage(conversationId, 'user', text)

  if (mode === 'human') {
    console.log(
      `[agent] Conversación ${conversationId} en modo humano; el bot no responde.`
    )
    return
  }

  const inboundLimit = await checkInboundRateLimit(business.id, customerPhone)
  if (!inboundLimit.allowed) {
    await saveMessage(conversationId, 'assistant', RATE_LIMIT_INBOUND_MESSAGE)
    await sendWhatsAppMessage(
      customerPhone,
      RATE_LIMIT_INBOUND_MESSAGE,
      waCreds(business)
    )
    return
  }

  const agentLimit = await checkAgentRateLimit(conversationId)
  if (!agentLimit.allowed) {
    await saveMessage(conversationId, 'assistant', RATE_LIMIT_AGENT_MESSAGE)
    await sendWhatsAppMessage(
      customerPhone,
      RATE_LIMIT_AGENT_MESSAGE,
      waCreds(business)
    )
    return
  }

  const ctx: AgentContext = {
    conversationId,
    customerPhone,
    business,
  }

  try {
    const result = await generateReply(ctx)
    await saveMessage(conversationId, 'assistant', result.reply)
    await sendWhatsAppMessage(customerPhone, result.reply, waCreds(business))
    await logUsage({
      businessId: business.id,
      conversationId,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    })
  } catch (error) {
    captureError(error, {
      conversationId,
      businessId: business.id,
      customerPhone,
    })
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

async function generateReply(ctx: AgentContext): Promise<GenerateReplyResult> {
  const history = await loadHistory(ctx.conversationId)
  const tools = getToolsFor(ctx.business)
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildContextPrompt(ctx) },
    ...history,
  ]

  let model = PRIMARY_MODEL
  let inputTokens = 0
  let outputTokens = 0
  let response

  function accumulateUsage(usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }) {
    if (!usage) return
    inputTokens += usage.prompt_tokens ?? 0
    outputTokens += usage.completion_tokens ?? 0
  }

  try {
    response = await createChatCompletion(messages, model, tools)
    accumulateUsage(response.usage)
  } catch (error) {
    if (shouldFallbackModel(error)) {
      model = FALLBACK_MODEL
      console.warn(
        `Modelo ${PRIMARY_MODEL} no disponible, usando ${FALLBACK_MODEL}`
      )
      response = await createChatCompletion(messages, model, tools)
      accumulateUsage(response.usage)
    } else {
      throw error
    }
  }

  let toolRound = 0
  let usedFallbackModel = model === FALLBACK_MODEL

  while (response.choices[0]?.message?.tool_calls?.length) {
    if (++toolRound > MAX_TOOL_ROUNDS) {
      console.warn('[agent] maxToolRounds alcanzado', {
        conversationId: ctx.conversationId,
        toolRound,
      })
      return {
        reply: MAX_ROUNDS_FALLBACK_REPLY,
        model,
        inputTokens,
        outputTokens,
      }
    }

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
      response = await createChatCompletion(messages, model, tools)
      accumulateUsage(response.usage)
    } catch (error) {
      if (!usedFallbackModel && shouldFallbackModel(error)) {
        model = FALLBACK_MODEL
        usedFallbackModel = true
        response = await createChatCompletion(messages, model, tools)
        accumulateUsage(response.usage)
      } else {
        throw error
      }
    }
  }

  const reply =
    response.choices[0]?.message?.content?.trim() ||
    'Disculpa, no pude procesar tu mensaje. ¿Puedes intentar de nuevo?'

  return { reply, model, inputTokens, outputTokens }
}
