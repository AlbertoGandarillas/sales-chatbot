import { createServiceClient } from '@/lib/supabase'

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
}

const FALLBACK_PRICING = PRICING['gpt-4o-mini']

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = PRICING[model] ?? FALLBACK_PRICING
  if (!PRICING[model]) {
    console.warn(`[usage-tracking] Modelo sin precio configurado: ${model}`)
  }
  return (
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output
  )
}

export async function logUsage(params: {
  businessId: string
  conversationId?: string
  model: string
  inputTokens: number
  outputTokens: number
}): Promise<void> {
  if (params.inputTokens === 0 && params.outputTokens === 0) return

  try {
    const db = createServiceClient()
    const estimated_cost_usd = estimateCostUsd(
      params.model,
      params.inputTokens,
      params.outputTokens
    )

    const { error } = await db.from('usage_logs').insert({
      business_id: params.businessId,
      conversation_id: params.conversationId ?? null,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      estimated_cost_usd,
    })

    if (error) {
      console.error('[usage-tracking] Error insertando usage_logs:', error.message)
    }
  } catch (err) {
    console.error('[usage-tracking] Error inesperado:', err)
  }
}
