import { createServiceClient } from '@/lib/supabase'
import { maskSecret } from '@/lib/mask-secret'
import { requirePlatformAdminWithClient } from '@/lib/admin-auth'

export { maskSecret }

import type { BotStudioFields } from '@/lib/bot-config'

export interface AdminBusinessRow extends BotStudioFields {
  id: string
  name: string
  slug: string
  catalog_source: string
  supports_custom_orders: boolean
  owner_whatsapp_number: string | null
  shopify_domain: string | null
  whatsapp_phone_number_id: string | null
  whatsapp_token: string | null
  owner_user_id: string | null
  created_at: string
}

const ADMIN_BUSINESS_COLUMNS =
  'id, name, slug, catalog_source, supports_custom_orders, owner_whatsapp_number, shopify_domain, system_prompt_custom, whatsapp_phone_number_id, whatsapp_token, owner_user_id, created_at, bot_name, bot_greeting, bot_tone, policy_shipping, policy_payment, policy_returns, bot_extra_notes, bot_use_legacy_prompt'

export interface ErrorLogRow {
  id: string
  business_id: string | null
  source: string
  level: string
  message: string
  stack: string | null
  context: Record<string, unknown>
  created_at: string
}

export async function getAdminOverviewStats() {
  await requirePlatformAdminWithClient()
  const db = createServiceClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString()

  const [
    businesses,
    errors24h,
    messages24h,
    usageMonth,
  ] = await Promise.all([
    db.from('businesses').select('id', { count: 'exact', head: true }),
    db
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h)
      .in('level', ['error', 'warning']),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h),
    db
      .from('usage_logs')
      .select('estimated_cost_usd')
      .gte('created_at', monthStart),
  ])

  const monthCost = (usageMonth.data ?? []).reduce(
    (sum, row) => sum + Number(row.estimated_cost_usd ?? 0),
    0
  )

  return {
    businessCount: businesses.count ?? 0,
    errors24h: errors24h.count ?? 0,
    messages24h: messages24h.count ?? 0,
    monthCostUsd: monthCost,
  }
}

export async function listAdminBusinesses(): Promise<AdminBusinessRow[]> {
  const { supabase } = await requirePlatformAdminWithClient()
  const { data } = await supabase
    .from('businesses')
    .select(ADMIN_BUSINESS_COLUMNS)
    .order('name')

  return (data as AdminBusinessRow[] | null) ?? []
}

export async function getAdminBusiness(id: string): Promise<AdminBusinessRow | null> {
  const { supabase } = await requirePlatformAdminWithClient()
  const { data } = await supabase
    .from('businesses')
    .select(ADMIN_BUSINESS_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  return (data as AdminBusinessRow | null) ?? null
}

export async function listErrorLogs(options?: {
  source?: string
  level?: string
  limit?: number
}): Promise<ErrorLogRow[]> {
  const { supabase } = await requirePlatformAdminWithClient()
  let query = supabase
    .from('error_logs')
    .select('id, business_id, source, level, message, stack, context, created_at')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.source) query = query.eq('source', options.source)
  if (options?.level) query = query.eq('level', options.level)

  const { data } = await query
  return (data as ErrorLogRow[] | null) ?? []
}

export async function getErrorLog(id: string): Promise<ErrorLogRow | null> {
  const { supabase } = await requirePlatformAdminWithClient()
  const { data } = await supabase
    .from('error_logs')
    .select('id, business_id, source, level, message, stack, context, created_at')
    .eq('id', id)
    .maybeSingle()

  return (data as ErrorLogRow | null) ?? null
}
