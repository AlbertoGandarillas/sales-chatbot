const GRAPH_API_VERSION = 'v21.0'

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    throw new Error('Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID')
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

export async function notifyOwner(message: string): Promise<void> {
  const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER
  if (!ownerNumber) {
    throw new Error('Missing OWNER_WHATSAPP_NUMBER')
  }
  await sendWhatsAppMessage(ownerNumber, message)
}
