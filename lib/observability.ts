import { createServiceClient } from '@/lib/supabase'
import { isErrorLoggingEnabled } from '@/lib/error-logging-config'

export { isErrorLoggingEnabled } from '@/lib/error-logging-config'

const SENSITIVE_KEY_PATTERN =
  /token|secret|authorization|password|api[_-]?key|whatsapp_token/i

const MAX_MESSAGE = 2000
const MAX_STACK = 8000
const MAX_CONTEXT_BYTES = 16_384

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function sanitizeContext(
  context: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!context) return {}

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = '[redacted]'
      continue
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = sanitizeContext(value as Record<string, unknown>)
      continue
    }
    out[key] = value
  }

  let serialized = JSON.stringify(out)
  if (serialized.length > MAX_CONTEXT_BYTES) {
    serialized = serialized.slice(0, MAX_CONTEXT_BYTES)
    try {
      return JSON.parse(serialized) as Record<string, unknown>
    } catch {
      return { truncated: true }
    }
  }
  return out
}

function normalizeError(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      message: truncate(error.message || 'Error', MAX_MESSAGE),
      stack: error.stack ? truncate(error.stack, MAX_STACK) : null,
    }
  }
  if (typeof error === 'string') {
    return { message: truncate(error, MAX_MESSAGE), stack: null }
  }
  try {
    return {
      message: truncate(JSON.stringify(error), MAX_MESSAGE),
      stack: null,
    }
  } catch {
    return { message: 'Unknown error', stack: null }
  }
}

function extractBusinessId(context?: Record<string, unknown>): string | null {
  if (!context) return null
  const id = context.businessId ?? context.business_id
  return typeof id === 'string' ? id : null
}

function extractSource(context?: Record<string, unknown>): string {
  const scope = context?.scope
  if (typeof scope === 'string' && scope.trim()) return scope.trim()
  return 'unknown'
}

async function persistLog(row: {
  business_id: string | null
  source: string
  level: 'debug' | 'info' | 'warning' | 'error'
  message: string
  stack: string | null
  context: Record<string, unknown>
}): Promise<void> {
  if (!isErrorLoggingEnabled()) return

  try {
    const db = createServiceClient()
    await db.from('error_logs').insert(row)
  } catch {
    // Fail-safe: never break business flows
  }
}

export function captureError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const { message, stack } = normalizeError(error)
  const safeContext = sanitizeContext(context)
  const source = extractSource(context)
  const level = 'error'

  console.error(`[${source}]`, message, safeContext, error)

  void persistLog({
    business_id: extractBusinessId(context),
    source,
    level,
    message,
    stack,
    context: safeContext,
  })
}

export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  const safeContext = sanitizeContext(context)
  const source = extractSource(context)
  const trimmed = truncate(message, MAX_MESSAGE)

  const logFn =
    level === 'error'
      ? console.error
      : level === 'warning'
        ? console.warn
        : console.log
  logFn(`[${source}]`, trimmed, safeContext)

  void persistLog({
    business_id: extractBusinessId(context),
    source,
    level,
    message: trimmed,
    stack: null,
    context: safeContext,
  })
}
