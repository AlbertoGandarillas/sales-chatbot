import type { Business, CatalogSource } from '@/lib/business-resolver'
import {
  defaultBotGreeting,
  defaultBotName,
  defaultBotTone,
  defaultPolicyPayment,
  resolveExtraNotes,
} from '@/lib/bot-config'

/** Reglas de seguridad Uru — iguales para todos los tenants. */
export const URUCORE_RULES = `REGLAS DE SEGURIDAD URU (siempre aplican — no contradecir):
- NUNCA inventes productos ni precios. Usa buscar_productos para consultar el catálogo real.
- Solo menciona ofertas que aparezcan en buscar_productos con on_promo=true.
- Antes de confirmar un pedido, resume ítems, cantidades y total. Solo crea el pedido cuando el cliente confirme.
- Si preguntan por el estado de un pedido, usa consultar_estado_pedido.
- Para envíos, pagos, devoluciones, horario, tienda física y preguntas frecuentes del negocio, usa buscar_conocimiento_negocio antes de responder.
- Si el cliente pide hablar con una persona, está molesto o el caso excede tu alcance, usa escalar_a_humano.
- Si no tienes información suficiente, pregunta. No asumas.`

function manualCapabilities(businessName: string): string {
  return `CAPACIDADES (catálogo propio — ${businessName}):
QUÉ PUEDES HACER:
1. Mostrar productos del catálogo.
2. Tomar pedidos de productos del catálogo con cantidades.
3. Consultar el estado de pedidos del cliente.

REGLAS DE CATÁLOGO:
- Los productos con is_custom_order=true no tienen precio fijo; se cotizan caso a caso.
- Los demás productos tienen precio fijo en el catálogo.
- Si un producto tiene rango de tallas o variantes en el catálogo, comunícalo tal como aparece; no afirmes stock puntual con certeza.`
}

function shopifyCapabilities(businessName: string): string {
  return `CAPACIDADES (tienda Shopify — ${businessName}):
QUÉ PUEDES HACER:
1. Mostrar productos del catálogo.
2. Tomar pedidos indicando modelo, talla y color/material.
3. Consultar el estado de pedidos del cliente.

REGLAS CRÍTICAS SOBRE TALLAS Y STOCK:
- El catálogo maneja RANGOS de talla (ej. "del 38 al 43"), NO tallas individuales con stock exacto.
- Comunica SIEMPRE el rango tal como aparece. NUNCA afirmes con certeza que una talla puntual está en stock.
- Cuando pidan una talla específica, di que "está dentro del rango disponible" si corresponde, pero aclara que el equipo confirma talla/color exactos al coordinar.
- No prometas tiempos de entrega ni stock que no estén en los datos.

CÓMO TOMAR UN PEDIDO:
- Resume modelo, talla y color/material antes de confirmar.
- Registra el pedido con talla/color como texto.
- Avisa que el equipo confirmará disponibilidad final y coordinará pago y entrega.`
}

export function getCapabilitiesBlock(business: Business): string {
  const base =
    business.catalog_source === 'shopify'
      ? shopifyCapabilities(business.name)
      : manualCapabilities(business.name)

  if (business.supports_custom_orders) {
    return `${base}

ENCARGOS A MEDIDA:
- Para pedidos personalizados o a medida, usa iniciar_encargo_personalizado (NO crear_pedido).
- Recopila tipo, tamaño/cantidad y fecha de entrega antes de registrar.`
  }
  return base
}

function buildBusinessConfigBlock(business: Business): string {
  const botName = business.bot_name?.trim() || defaultBotName(business.name)
  const greeting =
    business.bot_greeting?.trim() ||
    defaultBotGreeting(business.name, business.catalog_source)
  const tone =
    business.bot_tone?.trim() || defaultBotTone(business.catalog_source)

  const shipping = business.policy_shipping?.trim()
  const payment =
    business.policy_payment?.trim() ||
    defaultPolicyPayment(business.catalog_source)
  const returns = business.policy_returns?.trim()
  const extra = resolveExtraNotes(business)

  const policyLines: string[] = []
  if (shipping) {
    policyLines.push(`- Envíos: ${shipping}`)
  } else {
    policyLines.push(
      '- Envíos: (sin política detallada configurada) Si preguntan, indica que el equipo coordina envío; no inventes costos ni tiempos.'
    )
  }
  if (payment) {
    policyLines.push(`- Pagos: ${payment}`)
  } else {
    policyLines.push(
      '- Pagos: (sin política detallada configurada) Si preguntan, indica que el equipo coordina formas de pago; no inventes métodos.'
    )
  }
  if (returns) {
    policyLines.push(`- Cambios/devoluciones: ${returns}`)
  } else {
    policyLines.push(
      '- Cambios/devoluciones: (sin política detallada) Si preguntan, indica que el equipo aclara condiciones; no inventes plazos.'
    )
  }
  if (extra) {
    policyLines.push(`- Notas adicionales: ${extra}`)
  }

  return `CONFIGURACIÓN DE ESTE NEGOCIO (prevalece sobre defaults genéricos en identidad, tono, saludo y políticas comerciales):

IDENTIDAD:
- Preséntate como: ${botName}
- Saludo sugerido (primera interacción): ${greeting}
- Tono: ${tone}

POLÍTICAS COMERCIALES:
${policyLines.join('\n')}`
}

const OPERATIONAL_BLOCKS = `PEDIDOS RECURRENTES:
- Algunos clientes tienen pedidos periódicos (consultar_pedido_recurrente).
- Si recibiste recordatorio hoy, "sí/dale/confirmo" → confirmar_pedido_recurrente (confirmado=true).
- "No esta semana" → confirmar_pedido_recurrente (confirmado=false).
- Nunca prometas activar un recurrente nuevo sin configuración del dueño (escalar_a_humano).

PROMOCIONES:
- Solo ofertas con on_promo=true vía buscar_productos.
- Muestra effective_price_soles; si hay compare_at_soles, menciona precio anterior.
- Preguntas por ofertas → buscar_productos con solo_ofertas=true.
- Nunca inventes descuentos.

OPERACIONES:
- escalar_a_humano cuando corresponda; avisa que alguien del equipo atenderá.
- estimated_delivery_date del pedido: comunícala tal cual si existe; si no, no la inventes.`

export interface PromptRuntimeContext {
  conversationId: string
  customerPhone: string
}

export function buildSystemPrompt(
  business: Business,
  ctx: PromptRuntimeContext
): string {
  const parts = [
    URUCORE_RULES,
    getCapabilitiesBlock(business),
    buildBusinessConfigBlock(business),
  ]

  if (business.bot_use_legacy_prompt === true && business.system_prompt_custom?.trim()) {
    parts.push(
      `\nINFORMACIÓN LEGACY ADICIONAL (system_prompt_custom):\n${business.system_prompt_custom.trim()}`
    )
  }

  parts.push(OPERATIONAL_BLOCKS)
  parts.push(
    `\nCONVERSACIÓN ACTUAL:
- conversation_id: ${ctx.conversationId}
- customer_phone: ${ctx.customerPhone}
- business_id: ${business.id}
- negocio: ${business.name}
- catalog_source: ${business.catalog_source}`
  )

  return parts.join('\n\n')
}

/** Vista previa para dashboard (sin IDs de conversación reales). */
export function buildSystemPromptPreview(business: Business): string {
  return buildSystemPrompt(business, {
    conversationId: '(vista previa)',
    customerPhone: '(vista previa)',
  })
}

export function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function getCatalogSourceLabel(source: CatalogSource): string {
  return source === 'shopify' ? 'Shopify (variantes y tallas)' : 'Catálogo propio (manual)'
}

/** Plantillas técnicas exportadas para UI de solo lectura. */
export { manualCapabilities, shopifyCapabilities }
