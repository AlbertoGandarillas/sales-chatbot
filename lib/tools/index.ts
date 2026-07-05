import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import type { CatalogSource } from '@/lib/business-resolver'

const buscarProductosStandard: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'buscar_productos',
    description:
      'Busca productos en el catálogo por nombre, categoría o palabra clave. Usar siempre antes de cotizar precios. Devuelve effective_price_soles y on_promo cuando hay promoción vigente. Si el cliente pide ver el catálogo completo, usar query vacío. Si pregunta por ofertas, usar solo_ofertas=true.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda. Cadena vacía para listar todo el catálogo.',
        },
        solo_ofertas: {
          type: 'boolean',
          description:
            'Si true, solo productos con promoción vigente (on_promo). Usar cuando pregunten por ofertas o promos.',
        },
      },
      required: ['query'],
    },
  },
}

const buscarProductosShopify: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'buscar_productos',
    description:
      'Busca productos (zapatillas y similares) por nombre, modelo, talla o color/material. Devuelve el RANGO de tallas disponible tal como está en el catálogo. Usar siempre antes de cotizar. Cadena vacía para listar todo el catálogo.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda (modelo, talla, color). Vacío para todo el catálogo.',
        },
        solo_ofertas: {
          type: 'boolean',
          description:
            'Si true, solo productos con promoción vigente (on_promo). Usar cuando pregunten por ofertas o promos.',
        },
      },
      required: ['query'],
    },
  },
}

const crearPedidoStandard: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'crear_pedido',
    description:
      'Crea un pedido confirmado de productos del catálogo con precio fijo. Solo usar después de que el cliente confirme ítems y cantidades. NO usar para encargos a medida. Si el producto maneja talla o color/material, incluirlos.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Lista de productos a pedir',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string', description: 'UUID del producto' },
              quantity: { type: 'integer', description: 'Cantidad a pedir', minimum: 1 },
              talla_solicitada: {
                type: 'string',
                description: 'Talla pedida (texto, opcional, solo si aplica)',
              },
              color_solicitado: {
                type: 'string',
                description: 'Color o material pedido (texto, opcional)',
              },
            },
            required: ['product_id', 'quantity'],
          },
          minItems: 1,
        },
      },
      required: ['items'],
    },
  },
}

const crearPedidoShopify: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'crear_pedido',
    description:
      'Crea un pedido confirmado. Registra la talla y color/material que pide el cliente como texto (no se valida contra stock unitario). Solo usar tras la confirmación del cliente. Avisar que el equipo confirma disponibilidad final.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Lista de productos a pedir',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string', description: 'UUID del producto' },
              quantity: { type: 'integer', description: 'Cantidad a pedir', minimum: 1 },
              talla_solicitada: {
                type: 'string',
                description: 'Talla que pide el cliente (texto, ej. "41")',
              },
              color_solicitado: {
                type: 'string',
                description: 'Color o material pedido (texto, opcional)',
              },
            },
            required: ['product_id', 'quantity', 'talla_solicitada'],
          },
          minItems: 1,
        },
      },
      required: ['items'],
    },
  },
}

const iniciarEncargoPersonalizado: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'iniciar_encargo_personalizado',
    description:
      'Registra un encargo o pedido a medida (productos personalizados, tortas, arreglos especiales, etc.). SIEMPRE usar para pedidos que no tienen precio fijo en el catálogo. Notifica automáticamente al dueño. Requiere tipo, tamaño/cantidad y fecha de entrega como mínimo.',
    parameters: {
      type: 'object',
      properties: {
        tipo: { type: 'string', description: 'Tipo de encargo (cumpleaños, boda, corporativo, a medida, etc.)' },
        tamaño: { type: 'string', description: 'Tamaño, cantidad o número de porciones' },
        fecha_entrega: { type: 'string', description: 'Fecha de entrega deseada en formato YYYY-MM-DD' },
        mensaje_en_torta: { type: 'string', description: 'Texto para escribir en la torta (opcional)' },
        notas: {
          type: 'string',
          description: 'Notas adicionales: sabor, decoración, restricciones alimentarias (opcional)',
        },
      },
      required: ['tipo', 'tamaño', 'fecha_entrega'],
    },
  },
}

const escalarAHumano: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'escalar_a_humano',
    description:
      'Deriva la conversación a una persona del equipo cuando el cliente lo pide explícitamente, está molesto, o el caso excede lo que puedes resolver (reclamos, casos especiales, negociación). Tras llamarla, avisa al cliente que alguien lo atenderá.',
    parameters: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          description: 'Motivo breve de la derivación (para el dueño)',
        },
      },
      required: ['motivo'],
    },
  },
}

const consultarEstadoPedido: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'consultar_estado_pedido',
    description:
      'Consulta el estado de los pedidos del cliente en esta conversación. Usar cuando pregunte por el estado, si está listo, si ya pagó, etc.',
    parameters: {
      type: 'object',
      properties: {
        conversation_id: { type: 'string', description: 'ID de la conversación actual' },
      },
      required: ['conversation_id'],
    },
  },
}

const consultarPedidoRecurrente: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'consultar_pedido_recurrente',
    description:
      'Consulta si este cliente tiene pedidos recurrentes (plantilla semanal, quincenal o mensual). Usar cuando pregunte por su pedido fijo, lo de siempre, o cuándo es su próximo pedido.',
    parameters: { type: 'object', properties: {} },
  },
}

const confirmarPedidoRecurrente: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'confirmar_pedido_recurrente',
    description:
      'Confirma u omite el pedido recurrente del día tras un recordatorio enviado al cliente. Usar cuando responda sí/dale/confirmo o no esta semana.',
    parameters: {
      type: 'object',
      properties: {
        confirmado: {
          type: 'boolean',
          description: 'true si confirma el pedido; false si lo omite esta semana',
        },
        notas_cliente: {
          type: 'string',
          description: 'Notas opcionales del cliente para este pedido',
        },
      },
      required: ['confirmado'],
    },
  },
}

const buscarConocimientoNegocio: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'buscar_conocimiento_negocio',
    description:
      'Busca en las preguntas frecuentes, políticas y artículos configurados por el negocio. Usar cuando el cliente pregunte por envíos, pagos, devoluciones, horario, tienda física, ofertas generales u otras políticas del negocio.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Pregunta o tema en lenguaje natural del cliente',
        },
        categoria: {
          type: 'string',
          enum: [
            'general',
            'producto',
            'envios',
            'pagos',
            'devoluciones',
            'horario',
            'tienda',
            'ofertas',
            'otros',
          ],
          description: 'Opcional. Filtrar por categoría si el tema es obvio.',
        },
      },
      required: ['query'],
    },
  },
}

export interface ToolsContext {
  catalog_source: CatalogSource
  supports_custom_orders: boolean
}

export function getToolsFor(business: ToolsContext): ChatCompletionTool[] {
  const tools: ChatCompletionTool[] =
    business.catalog_source === 'shopify'
      ? [buscarProductosShopify, crearPedidoShopify]
      : [buscarProductosStandard, crearPedidoStandard]

  if (business.supports_custom_orders) {
    tools.push(iniciarEncargoPersonalizado)
  }

  tools.push(
    buscarConocimientoNegocio,
    consultarEstadoPedido,
    escalarAHumano,
    consultarPedidoRecurrente,
    confirmarPedidoRecurrente
  )
  return tools
}
