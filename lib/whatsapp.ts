const GRAPH_API_VERSION = 'v21.0'

import { normalizeWhatsAppPhone } from '@/lib/whatsapp-phone'
import { isConversationSessionOpen } from '@/lib/whatsapp-session'
import { WHATSAPP_SESSION_CLOSED_MESSAGE } from '@/lib/whatsapp-session-window'

export interface WhatsAppCredentials {
  token?: string | null
  phoneNumberId?: string | null
}

export class WhatsAppApiError extends Error {
  readonly status: number
  readonly code?: number

  constructor(message: string, status: number, code?: number) {
    super(message)
    this.name = 'WhatsAppApiError'
    this.status = status
    this.code = code
  }
}

/** Fuera de la ventana de 24 h de mensajería libre (Meta error 131047). */
export class WhatsAppSessionClosedError extends WhatsAppApiError {
  constructor(message: string = WHATSAPP_SESSION_CLOSED_MESSAGE) {
    super(message, 400, 131047)
    this.name = 'WhatsAppSessionClosedError'
  }
}

export function isWhatsAppSessionClosedError(error: unknown): boolean {
  return (
    error instanceof WhatsAppSessionClosedError ||
    (error instanceof WhatsAppApiError && error.code === 131047)
  )
}

function parseWhatsAppError(status: number, errorBody: string): WhatsAppApiError {
  try {
    const parsed = JSON.parse(errorBody) as {
      error?: {
        message?: string
        code?: number
        error_data?: { details?: string }
      }
    }
    const meta = parsed.error
    const code = meta?.code
    const details = meta?.error_data?.details

    if (code === 131030) {
      return new WhatsAppApiError(
        details ??
          'El número del cliente no está en la lista permitida de Meta WhatsApp. ' +
            'En modo desarrollo, agrégalo en Meta for Developers → WhatsApp → API Setup → ' +
            '"To" (números de prueba). Usa formato internacional: 51999342668.',
        status,
        code
      )
    }

    if (code === 131026) {
      return new WhatsAppApiError(
        details ??
          'El número no tiene WhatsApp o el formato es incorrecto. Usa 51 + 9 dígitos (ej. 51999342668).',
        status,
        code
      )
    }

    if (code === 131047) {
      return new WhatsAppSessionClosedError(
        details ??
          'Pasaron más de 24 horas desde el último mensaje del cliente. WhatsApp requiere una plantilla aprobada para reabrir la conversación.'
      )
    }

    if (details) {
      return new WhatsAppApiError(details, status, code)
    }
    if (meta?.message) {
      return new WhatsAppApiError(meta.message, status, code)
    }
  } catch {
    // ignore JSON parse errors
  }

  return new WhatsAppApiError(`WhatsApp API error: ${status}`, status)
}

export async function sendWhatsAppMessage(
  to: string,
  text: string,
  creds: WhatsAppCredentials = {}
): Promise<void> {
  const token = creds.token ?? process.env.WHATSAPP_TOKEN
  const phoneNumberId = creds.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID
  const recipient = normalizeWhatsAppPhone(to)

  if (!recipient) {
    throw new WhatsAppApiError('Número de destinatario vacío o inválido.', 400)
  }

  if (!token || !phoneNumberId) {
    throw new Error(
      'WhatsApp no configurado: falta token o phone_number_id del negocio.'
    )
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: text },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(
      'WhatsApp API error:',
      response.status,
      'to=',
      recipient,
      errorBody
    )
    throw parseWhatsAppError(response.status, errorBody)
  }
}

/** Envía texto solo si la conversación está dentro de la ventana de 24 h del cliente. */
export async function sendWhatsAppSessionMessage(
  conversationId: string,
  to: string,
  text: string,
  creds: WhatsAppCredentials = {}
): Promise<void> {
  const open = await isConversationSessionOpen(conversationId)
  if (!open) {
    throw new WhatsAppSessionClosedError()
  }
  await sendWhatsAppMessage(to, text, creds)
}

export async function notifyOwner(
  message: string,
  opts: WhatsAppCredentials & { ownerNumber?: string | null } = {}
): Promise<void> {
  const ownerNumber = opts.ownerNumber ?? process.env.OWNER_WHATSAPP_NUMBER
  if (!ownerNumber) {
    throw new Error('Missing owner WhatsApp number')
  }
  await sendWhatsAppMessage(ownerNumber, message, {
    token: opts.token,
    phoneNumberId: opts.phoneNumberId,
  })
}
