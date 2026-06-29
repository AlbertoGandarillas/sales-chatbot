import { NextRequest, NextResponse } from 'next/server'
import { processIncomingMessage } from '@/lib/agent'
import { resolveBusinessFromWebhook } from '@/lib/business-resolver'
import { claimWhatsAppMessage } from '@/lib/webhook-dedupe'
import {
  isProductionEnv,
  verifyMetaWebhookSignature,
} from '@/lib/webhook-signature'

export const maxDuration = 60

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
    const body = JSON.parse(rawBody) as {
      entry?: {
        changes?: {
          value?: {
            messages?: {
              id?: string
              type?: string
              from?: string
              text?: { body?: string }
            }[]
          }
        }[]
      }[]
    }

    const business = await resolveBusinessFromWebhook(body)
    if (!business) {
      console.warn('[webhook] phone_number_id sin negocio asociado; se ignora.')
      return NextResponse.json({ status: 'ok' })
    }

    const entries = body.entry ?? []
    for (const entry of entries) {
      const changes = entry.changes ?? []
      for (const change of changes) {
        const messages = change.value?.messages ?? []
        for (const message of messages) {
          if (message.type === 'text' && message.from && message.text?.body) {
            const from = String(message.from)
            const text = String(message.text.body)
            const wamid = message.id ? String(message.id) : null

            if (wamid) {
              const isNew = await claimWhatsAppMessage(business.id, wamid)
              if (!isNew) {
                console.log(`[webhook] Duplicado ignorado (${business.name}):`, wamid)
                continue
              }
            }

            console.log(`[webhook] Mensaje recibido (${business.name}):`, from, text)

            try {
              await processIncomingMessage(business, from, text)
              console.log('[webhook] Respuesta enviada a:', from)
            } catch (err) {
              console.error('[webhook] Error del agente:', err)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[webhook] Error parseando payload:', error)
  }

  return NextResponse.json({ status: 'ok' })
}
