import { createServiceClient } from '@/lib/supabase'

const DEFAULT_INBOUND_PER_MINUTE = 12
const DEFAULT_AGENT_REPLIES_PER_HOUR = 40

function inboundLimit(): number {
  const n = Number(process.env.RATE_LIMIT_INBOUND_PER_MINUTE)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INBOUND_PER_MINUTE
}

function agentRepliesLimit(): number {
  const n = Number(process.env.RATE_LIMIT_AGENT_REPLIES_PER_HOUR)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_AGENT_REPLIES_PER_HOUR
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: 'inbound_flood' | 'agent_flood' }

export const RATE_LIMIT_INBOUND_MESSAGE =
  'Estás enviando muchos mensajes seguidos. Espera un momentito y escríbeme de nuevo.'

export const RATE_LIMIT_AGENT_MESSAGE =
  'Recibimos muchas consultas tuyas en poco tiempo. En un ratito te respondemos con calma.'

async function conversationIdsForCustomer(
  businessId: string,
  customerPhone: string
): Promise<string[]> {
  const db = createServiceClient()
  const { data } = await db
    .from('conversations')
    .select('id')
    .eq('business_id', businessId)
    .eq('customer_phone', customerPhone)

  return (data ?? []).map((r) => r.id)
}

/** Limita mensajes entrantes por cliente (anti-spam / anti-abuso de OpenAI). */
export async function checkInboundRateLimit(
  businessId: string,
  customerPhone: string
): Promise<RateLimitResult> {
  const conversationIds = await conversationIdsForCustomer(businessId, customerPhone)
  if (conversationIds.length === 0) return { allowed: true }

  const since = new Date(Date.now() - 60_000).toISOString()
  const db = createServiceClient()
  const { count, error } = await db
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', conversationIds)
    .eq('role', 'user')
    .gte('created_at', since)

  if (error) {
    console.error('[rate-limit] Error contando inbound:', error.message)
    return { allowed: true }
  }

  if ((count ?? 0) >= inboundLimit()) {
    return { allowed: false, reason: 'inbound_flood' }
  }
  return { allowed: true }
}

/** Limita respuestas del bot por conversación (costo OpenAI). */
export async function checkAgentRateLimit(
  conversationId: string
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - 3_600_000).toISOString()
  const db = createServiceClient()
  const { count, error } = await db
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('role', 'assistant')
    .gte('created_at', since)

  if (error) {
    console.error('[rate-limit] Error contando agent replies:', error.message)
    return { allowed: true }
  }

  if ((count ?? 0) >= agentRepliesLimit()) {
    return { allowed: false, reason: 'agent_flood' }
  }
  return { allowed: true }
}
