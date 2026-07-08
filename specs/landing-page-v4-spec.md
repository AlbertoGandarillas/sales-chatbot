# Landing Page v4 — Spec (alineación con producto real)

> **ESTADO: IMPLEMENTADO** (2026-07-08)
>
> **Checkpoints aprobados:** CP-L4-1 genérico · CP-L4-2 nueve tarjetas · CP-L4-3 WA asistido (paso 1 + FAQ + hero) · CP-L4-4 anclas Casos/Negocios
>
> **Metodología spec-driven.** Este documento se aprueba ANTES de tocar código.
> Es una **actualización de contenido y estructura** del landing existente
> (`app/page.tsx`), no un rediseño visual completo.
>
> **Objetivo:** reflejar el inventario real de funcionalidades implementadas (jul 2026)
> sin prometer features inexistentes.

---

## 1. Diagnóstico — Landing v3 vs código actual

### 1.1 Lo que ya está bien alineado ✅

| Sección landing | Verificación en código |
|---|---|
| Hero: agente WA 24/7, cotiza y toma pedidos | `lib/agent.ts`, tools `buscar_productos`, `crear_pedido` |
| Paso 2: catálogo manual o Shopify | `onboarding`, `shopify-ingestion.ts`, `catalogo` |
| Paso 3: encargos personalizados | `iniciar_encargo_personalizado`, `supports_custom_orders` |
| Paso 4: supervisión y control humano | `conversations.mode`, `escalar_a_humano`, chat dashboard |
| Tarjeta IA: no inventa precios | `lib/prompts`, `lib/pricing` |
| Tarjeta encargos y variantes | custom orders + talla/color en Shopify |
| Tarjeta control humano | pause bot + escalation |
| Tarjeta pagos Yape/depósito manual | `confirmPayment` en conversaciones |
| Tarjeta Shopify sync | `resyncCatalog` |
| FAQ Shopify opcional / migración posterior | `perfil` shopify_domain, `catalog_source` |
| FAQ pagos manuales | implementado |
| FAQ API oficial Meta | Cloud API vía `lib/whatsapp.ts` |
| Casos Cruje / Betta | flujos reales piloto |
| Tipos de negocio (propio vs Shopify) | `catalog_source` manual/shopify |
| CTA "nosotros te acompañamos en la conexión" | coherente: WA lo conecta admin, no self-serve |

### 1.2 Funcionalidades implementadas NO mencionadas en landing ⚠️ (agregar)

Prioridad **alta** — diferenciadores reales ya en producción:

| Feature en código | Por qué importa en landing |
|---|---|
| **Bot Studio** (`/dashboard/bot`) | Identidad, saludo, políticas, FAQs, artículos, vista previa del prompt |
| **Pedidos recurrentes** (`/dashboard/recurrentes`) | Panaderías/negocios con clientes fieles; recordatorios WA + confirmación por bot |
| **Promociones** (`promo_price_soles`, `on_promo`) | Ofertas del día/semana; el bot cotiza precio promo real |
| **Notificaciones al dueño por WhatsApp** | Aviso de pedido nuevo, encargo, escalación (`notifyOwner`) |
| **Equipo con roles** (`business_members`) | Invitar operador o persona de catálogo sin dar acceso total |
| **Gestión completa del ciclo de pedido** | Confirmar, cancelar (con motivo), fecha entrega, marcar entregado |
| **Catálogo avanzado** | Edición inline precio/stock, acciones por lote, "por revisar", imágenes |

Prioridad **media** — honestidad / expectativas:

| Feature / límite | Por qué mencionar |
|---|---|
| Solo mensajes de **texto** (no imágenes/audio del cliente) | Evita frustración; `handleNonTextInbound` |
| Conexión WhatsApp **asistida** (no self-serve en dashboard) | Ajustar paso 1 "Cómo funciona" y FAQ nueva |
| Auth solo **email + contraseña** | Ya no hay magic link en UI; no promocionar enlace mágico |

### 1.3 Contenido landing con matices o desactualizado ⚠️ (ajustar)

| Item actual | Problema | Acción propuesta |
|---|---|---|
| Paso 1 "Conecta tu WhatsApp" | Implica self-serve; hoy admin pega credenciales | Reformular: "Registras tu cuenta; Uru conecta tu número oficial" |
| Tarjeta "Dashboard de operación" | No menciona Bot Studio, recurrentes, equipo | Ampliar copy o dividir en 2 tarjetas |
| Link "Escríbenos" → `/signup` | Engañoso | Cambiar a `mailto:contacto@uru.pe` |
| Nav sin ancla a Casos / Para quién | Secciones existen pero no en header | Opcional: añadir o mantener solo 3 anclas |
| Hero/FAQ "24/7" sin matiz | Fuera de ventana 24h WA el bot no puede escribir libremente | FAQ nueva sobre ventana de conversación |
| 6 tarjetas de funcionalidades | Dejan fuera 4+ features importantes | Pasar a 8–9 tarjetas o reagrupar por categoría |

### 1.4 Lo que NO agregar (sigue sin existir) ❌

- Instagram, Messenger, Mercado Pago, pasarelas automáticas
- Procesamiento OCR de comprobantes
- Envío de imágenes de producto por WhatsApp
- Plantillas WA para reabrir chats cerrados
- Precios/planes self-serve
- Testimonios o métricas inventadas
- "El cliente conecta WhatsApp solo desde el dashboard"

---

## 2. Objetivo de v4

1. **Completar** el grid de funcionalidades con Bot Studio, recurrentes, promos, equipo y notificaciones.
2. **Honestidad** sobre onboarding (cuenta self-serve + conexión WA asistida) y límites (solo texto, pagos manuales).
3. **Mantener** estructura visual v3 (premium, gradientes, `components/ui/`) — cambio de **copy y cantidad de tarjetas**, no rediseño.
4. **Opcional (CHECKPOINT):** generalizar casos Cruje/Betta a ejemplos anónimos si la marca quiere menos dependencia de pilotos.

---

## 3. Orden de secciones (sin cambio estructural mayor)

1. Header (+ nav; opcional más anclas)
2. Hero (copy menor: mencionar personalización del bot)
3. Cómo funciona (4 pasos — **reescritura paso 1**)
4. Funcionalidades (**8–9 tarjetas**, ver §4.2)
5. Casos de uso (Cruje/Betta o genéricos — CHECKPOINT 2)
6. Para qué negocios es (+ mención recurrentes en panadería)
7. FAQ (**8–9 preguntas**, ver §4.5)
8. CTA final (reforzar acompañamiento en conexión WA)
9. Footer (sin cambio)

---

## 4. Copy propuesto por sección

### 4.0 Header

Sin cambio de layout. Opcional añadir en `sm+`:
- `#casos` → Casos
- `#para-quien` → Negocios

Mantener: Cómo funciona, Funcionalidades, Preguntas.

### 4.1 Hero — ajustes menores

**H1** (mantener o variante):
> Tu agente de ventas por WhatsApp, atendiendo 24/7

**Subtítulo** (propuesto):
> Uru responde con la info real de tu catálogo, toma pedidos y te avisa cuando
> necesitas intervenir. Personaliza el bot sin tocar código.

CTAs: sin cambio (`/signup`, `#como-funciona`).

### 4.2 Cómo funciona — reescritura paso 1

| # | Título | Cuerpo propuesto |
|---|---|---|
| 1 | **Crea tu cuenta y conectamos tu WhatsApp** | Regístrate, arma tu catálogo y nosotros vinculamos tu número con la API oficial de Meta (Cloud API). Nada de bots no oficiales. |
| 2 | Arma tu catálogo | *(sin cambio)* |
| 3 | El agente atiende | Añadir: "Responde con tus FAQs y políticas configuradas en el Bot Studio." |
| 4 | Tú supervisas | Añadir: "Confirma pedidos, pagos y entregas desde el mismo panel." |

### 4.3 Funcionalidades — grid ampliado (9 tarjetas)

Reemplazar array `FEATURES` en `app/page.tsx` por:

| # | Tag | Título | Cuerpo |
|---|---|---|---|
| 1 | IA | Agente de ventas con IA | Busca productos, aplica promos vigentes, cotiza, toma pedidos y consulta el estado — sin inventar precios. |
| 2 | IA | Bot Studio | Personaliza saludo, tono, políticas de envío y pago, FAQs y artículos de conocimiento. Vista previa del prompt incluida. |
| 3 | Operación | Encargos y variantes | Encargos a medida en panaderías; talla y color en retail Shopify. |
| 4 | Operación | Pedidos recurrentes | Plantillas para clientes fieles: recordatorios por WhatsApp y confirmación con el bot. |
| 5 | Operación | Control humano | Pausa el bot y responde tú; o el agente escala solo y te avisa por WhatsApp. |
| 6 | Operación | Dashboard de operación | Resumen de ventas, conversaciones estilo chat, ciclo completo de pedidos (confirmar, cancelar, entregar, pagos). |
| 7 | Catálogo | Catálogo con imágenes y promos | Carga manual o sync Shopify; edición rápida de precio y stock; ofertas con fecha de vigencia. |
| 8 | Catálogo | Equipo | Invita a alguien solo para catálogo u operación, sin acceso a configuración sensible. |
| 9 | Pagos | Confirmación de pagos | Marca Yape o depósito como pagado con nota de referencia. Verificación manual. |

**Layout:** `sm:grid-cols-2 lg:grid-cols-3` (3×3). Sin nuevos componentes.

**Eliminar** tarjeta separada solo "Shopify" — absorbida en tarjeta 7.

### 4.4 Casos de uso

**Opción A (default):** mantener Cruje y Betta con copy enriquecido:

- **Cruje:** añadir "pedidos recurrentes y promociones de la semana"
- **Betta:** sin cambio sustancial

**Opción B (CHECKPOINT 2):** nombres genéricos:
- "Panadería La Espiga" / "Tienda de zapatillas (Shopify)"

Encuadre: "Negocios reales ya operando con Uru" (sin cifras).

### 4.5 Para qué negocios es

Tarjeta 1 — añadir al cuerpo:
> …y pedidos recurrentes para clientes que compran cada semana.

Tarjeta 2 — sin cambio.

Nota inferior — corregir link:
> …si el tuyo es distino, [escríbenos](mailto:contacto@uru.pe) y lo evaluamos.

### 4.6 FAQ — ampliar

Mantener las 6 actuales + agregar:

| # | Pregunta | Respuesta (borrador) |
|---|---|---|
| 7 | ¿Puedo personalizar cómo habla el bot? | Sí. En Bot Studio configuras saludo, tono, políticas, preguntas frecuentes y artículos. El agente busca esa información antes de inventar respuestas. |
| 8 | ¿Me avisan cuando entra un pedido? | Sí. Puedes recibir un WhatsApp al número del dueño cuando entra un pedido nuevo o un encargo especial. |
| 9 | ¿Mis clientes pueden enviar fotos o audios? | Por ahora el bot atiende mensajes de texto. Si envían imagen o audio, les pedimos que escriban su consulta. |
| 10 | ¿Cómo conecto mi número de WhatsApp? | Creas tu cuenta y catálogo en Uru; nuestro equipo vincula tu número con la API oficial de Meta. No necesitas tocar configuración técnica. |

**Eliminar / no agregar:** FAQ sobre magic link.

### 4.7 CTA final

Copy propuesto:
> Empieza gratis con tu catálogo; te acompañamos para conectar tu WhatsApp oficial y poner el bot en marcha.

Botón: sin cambio (`/signup`).

---

## 5. Checkpoints (aprobar antes de implementar)

| ID | Pregunta | Default |
|---|---|---|
| **CP-L4-1** | ¿Mantener nombres Cruje/Betta en casos de uso? | **Sí** (social proof piloto) |
| **CP-L4-2** | ¿9 tarjetas de funcionalidades o agrupar en 6 más densas? | **9 tarjetas** (más completo) |
| **CP-L4-3** | ¿Mencionar explícitamente "conexión WA asistida" en hero o solo en FAQ/paso 1? | **Paso 1 + FAQ** (no alarmar en hero) |
| **CP-L4-4** | ¿Añadir anclas Casos / Negocios al header? | **Sí** en `md+` |

---

## 6. Alcance técnico de implementación

### Archivos a tocar
- `app/page.tsx` — arrays `STEPS`, `FEATURES`, `USE_CASES`, `BUSINESS_TYPES`, `FAQS`; copy hero/CTA; nav links; mailto

### Archivos que NO se tocan
- `components/ui/*` (salvo copy)
- Auth, dashboard, agente, webhook
- Specs históricos (`landing-page-v3-spec.md` queda como referencia; marcar superseded en CHANGELOG)

### Criterios de aceptación
- [ ] Cada tarjeta y FAQ es verificable contra código (sin features inventadas)
- [ ] No se promete magic link, pagos automáticos, ni imágenes WA
- [ ] Link "escríbenos" usa `contacto@uru.pe`
- [ ] Paso 1 no implica self-serve de credenciales Meta
- [ ] Build y lint sin regresiones
- [ ] Responsive sin cambios (misma grid)

---

## 7. Fuera de alcance v4

- Rediseño visual premium adicional (`redesign-premium-uru-spec.md`)
- Sección de precios
- Testimonios con foto
- Video demo
- Formulario de contacto embebido (solo mailto)
- Landing en inglés

---

## 8. Referencias

- Inventario funcional: conversación jul 2026 + `app/`, `lib/`
- Landing actual: `app/page.tsx` (v3 implementada)
- Spec anterior: `landing-page-v3-spec.md`
- Features nuevas desde v3: `bot-knowledge-spec.md`, `recurring-orders-spec.md`, `promotions-offers-spec.md`, `team-notifications-catalog-spec.md`, `catalog-batch-actions-spec.md`
