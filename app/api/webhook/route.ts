import { NextRequest, NextResponse } from 'next/server'
import { processIncomingMessage } from '@/lib/agent'

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
  try {
    const body = await request.json()
    const entries = body.entry ?? []

    for (const entry of entries) {
      const changes = entry.changes ?? []
      for (const change of changes) {
        const messages = change.value?.messages ?? []
        for (const message of messages) {
          if (message.type === 'text' && message.from && message.text?.body) {
            const from = String(message.from)
            const text = String(message.text.body)
            console.log('[webhook] Mensaje recibido:', from, text)

            // Meta tolera hasta ~20s antes de reintentar; await es más fiable
            // que after() en el plan Hobby de Vercel (límite ~10s).
            try {
              await processIncomingMessage(from, text)
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
