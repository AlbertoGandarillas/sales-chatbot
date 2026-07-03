const MEDIA_LABELS: Record<string, string> = {
  audio: 'un audio',
  image: 'una imagen',
  video: 'un video',
  document: 'un documento',
  sticker: 'un sticker',
  location: 'una ubicación',
  contacts: 'un contacto',
  interactive: 'una respuesta interactiva',
  button: 'un botón',
  reaction: 'una reacción',
  unsupported: 'un tipo de mensaje no soportado',
}

export function describeInboundMediaType(type: string): string {
  return MEDIA_LABELS[type] ?? `un mensaje (${type})`
}

export function inboundMediaPlaceholder(type: string): string {
  return `[Cliente envió ${describeInboundMediaType(type)}]`
}

export const NON_TEXT_REPLY =
  'Por ahora solo entiendo mensajes de texto. Escríbeme qué necesitas y te ayudo con gusto.'
