import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import type { Vertical } from '@/lib/business-resolver'

const buscarProductosBakery: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'buscar_productos',
    description:
      'Busca productos en el catálogo por nombre, categoría o palabra clave. Usar siempre antes de cotizar precios. Si el cliente pide ver el menú completo, usar query vacío.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda. Cadena vacía para listar todo el catálogo.',
        },
      },
      required: ['query'],
    },
  },
}

const buscarProductosRetail: ChatCompletionTool = {
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
      },
      required: ['query'],
    },
  },
}

const crearPedidoBakery: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'crear_pedido',
    description:
      'Crea un pedido confirmado de productos del catálogo con precio fijo. Solo usar después de que el cliente confirme ítems y cantidades. NO usar para tortas personalizadas.',
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

const crearPedidoRetail: ChatCompletionTool = {
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
      'Registra un encargo personalizado (tortas, pedidos a medida). SIEMPRE usar para tortas de cumpleaños, bodas u otros encargos especiales. Notifica automáticamente al dueño. Requiere tipo, tamaño y fecha de entrega como mínimo.',
    parameters: {
      type: 'object',
      properties: {
        tipo: { type: 'string', description: 'Tipo de encargo (cumpleaños, boda, corporativo, etc.)' },
        tamaño: { type: 'string', description: 'Tamaño o número de porciones' },
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

export function getToolsForVertical(vertical: Vertical): ChatCompletionTool[] {
  if (vertical === 'retail') {
    return [buscarProductosRetail, crearPedidoRetail, consultarEstadoPedido]
  }
  // bakery (default)
  return [
    buscarProductosBakery,
    crearPedidoBakery,
    iniciarEncargoPersonalizado,
    consultarEstadoPedido,
  ]
}
