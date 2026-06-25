const GRAPH_API_VERSION = 'v21.0'

export interface WhatsAppCredentials {
  token?: string | null
  phoneNumberId?: string | null
}

export async function sendWhatsAppMessage(
  to: string,
  text: string,
  creds: WhatsAppCredentials = {}
): Promise<void> {
  const token = creds.token ?? process.env.WHATSAPP_TOKEN
  const phoneNumberId = creds.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    throw new Error('Missing WhatsApp token or phone number id')
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
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('WhatsApp API error:', response.status, errorBody)
    throw new Error(`WhatsApp API error: ${response.status}`)
  }
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
