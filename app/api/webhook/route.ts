import { NextRequest, NextResponse } from 'next/server'
import { handleNonTextInbound, processIncomingMessage } from '@/lib/agent'
import { resolveBusinessFromWebhook } from '@/lib/business-resolver'
import { captureError } from '@/lib/observability'
import { claimWhatsAppMessage } from '@/lib/webhook-dedupe'
import {
  isProductionEnv,
  verifyMetaWebhookSignature,
} from '@/lib/webhook-signature'

export const maxDuration = 60

type WebhookMessage = {
  id?: string
  type?: string
  from?: string
  text?: { body?: string }
}

type WebhookBody = {
  entry?: {
    changes?: {
      value?: {
        messages?: WebhookMessage[]
      }
    }[]
  }[]
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')?.trim()
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim()

  if (
    mode === 'subscribe' &&
    token &&
    verifyToken &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

async function handleWebhookMessage(
  business: NonNullable<Awaited<ReturnType<typeof resolveBusinessFromWebhook>>>,
  message: WebhookMessage
) {
  if (!message.from) return

  const from = String(message.from)
  const wamid = message.id ? String(message.id) : null
  const type = message.type ?? 'unknown'

  if (wamid) {
    const isNew = await claimWhatsAppMessage(business.id, wamid)
    if (!isNew) {
      console.log(`[webhook] Duplicado ignorado (${business.name}):`, wamid)
      return
    }
  }

  if (type === 'text' && message.text?.body) {
    const text = String(message.text.body)
    console.log(`[webhook] Mensaje recibido (${business.name}):`, from, text)
    await processIncomingMessage(business, from, text)
    console.log('[webhook] Respuesta enviada a:', from)
    return
  }

  console.log(
    `[webhook] Mensaje no-texto (${business.name}):`,
    from,
    type
  )
  await handleNonTextInbound(business, from, type)
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim()

  if (isProductionEnv()) {
    if (!appSecret) {
      console.error('[webhook] WHATSAPP_APP_SECRET no configurado en production')
      return new NextResponse('Server misconfiguration', { status: 500 })
    }
    const signature = request.headers.get('x-hub-signature-256')
    if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
      console.warn('[webhook] Firma inválida o ausente')
      return new NextResponse('Forbidden', { status: 403 })
    }
  } else if (appSecret) {
    const signature = request.headers.get('x-hub-signature-256')
    if (signature && !verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
      console.warn('[webhook] Firma inválida (dev)')
      return new NextResponse('Forbidden', { status: 403 })
    }
  } else {
    console.warn(
      '[webhook] WHATSAPP_APP_SECRET no definido; verificación de firma omitida (dev)'
    )
  }

  try {
    const body = JSON.parse(rawBody) as WebhookBody

    const business = await resolveBusinessFromWebhook(body)
    if (!business) {
      console.warn('[webhook] phone_number_id sin negocio asociado; se ignora.')
      return NextResponse.json({ status: 'ok' })
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          try {
            await handleWebhookMessage(business, message)
          } catch (err) {
            captureError(err, {
              businessId: business.id,
              messageType: message.type,
              from: message.from,
            })
            console.error('[webhook] Error del agente:', err)
          }
        }
      }
    }
  } catch (error) {
    captureError(error, { scope: 'webhook-parse' })
    console.error('[webhook] Error parseando payload:', error)
  }

  return NextResponse.json({ status: 'ok' })
}
