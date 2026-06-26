# Runbook — Cómo dar de alta a un nuevo cliente en Aynibot

> Guía operativa paso a paso. Pensada para que **tú** (operador) registres un negocio
> nuevo, y para saber **qué te tiene que dar el cliente** antes de empezar.
>
> Estado actual del producto: la conexión de WhatsApp **todavía no es self-serve**.
> El cliente crea su cuenta y su negocio, pero **tú** cargas las credenciales de
> WhatsApp y configuras Meta. Esta guía refleja eso tal cual está hoy en el código.

---

## 0. Cómo funciona el alta (resumen en 1 minuto)

Para que un negocio empiece a operar tienen que estar listas **4 piezas**:

1. **Una cuenta de acceso** (email + contraseña) para que el cliente entre al dashboard.
2. **Una fila del negocio** en la base de datos (nombre, tipo, dueño).
3. **WhatsApp conectado**: el número del cliente, sobre la API oficial de Meta, con sus
   credenciales cargadas en la fila del negocio.
4. **Un catálogo** cargado (a mano para panaderías, o sincronizado desde Shopify).

El sistema enruta cada mensaje al negocio correcto usando el **`phone_number_id`** de
WhatsApp (es el identificador único de cada número en Meta). Por eso ese dato es
**obligatorio y único** por cliente.

---

## 1. Qué te tiene que dar el cliente (checklist de intake)

Pásale esta lista al cliente. Es lo único que necesitas para empezar.

### 1.1 Datos básicos del negocio (todos los clientes)
- [ ] **Nombre del negocio** (ej.: "Pastelería Dulce Hogar").
- [ ] **Cómo gestionará su catálogo**: **catálogo propio** (inventario sencillo
      cargado a mano: panadería, bodega, tienda…) **o** **tienda Shopify**
      (sincronizado). Puede empezar con catálogo propio y conectar Shopify después.
- [ ] **Email** con el que va a iniciar sesión en el dashboard.
- [ ] **Número de WhatsApp del dueño** para recibir avisos (encargos especiales,
      escalamientos). Formato internacional sin "+", ej.: `51999888777`.
- [ ] **Tono e info del negocio** (texto libre): cómo quiere que hable el bot, horario
      de atención, zonas/tiempos de entrega, métodos de pago, políticas. Esto alimenta
      las "instrucciones personalizadas" del agente.

### 1.2 WhatsApp (el paso más importante)
El número debe estar dado de alta en **WhatsApp Business Platform (Meta Cloud API)**.
Hay dos caminos según quién administra Meta:

- **Camino A — Tú administras el Meta del cliente (recomendado para no técnicos):**
  El cliente te da acceso de administrador a su **Meta Business** (o crea uno y te
  invita) y te confirma el **número de WhatsApp** que usará para vender. Tú generas
  todas las credenciales.
- **Camino B — El cliente ya tiene todo configurado:** entonces te entrega:
  - [ ] **Phone Number ID** (`phone_number_id`)
  - [ ] **WhatsApp Business Account ID** (WABA ID)
  - [ ] **Token de acceso permanente** (System User token)

> ⚠️ El número de WhatsApp que conecten a la API **deja de funcionar en la app normal
> de WhatsApp** en el teléfono. Avísale al cliente: ideal usar un número **nuevo o
> dedicado** al negocio, no su WhatsApp personal.

### 1.3 Solo si es retail (Shopify)
- [ ] **Dominio de su tienda Shopify** (ej.: `www.mitienda.com` o `mitienda.myshopify.com`).
- [ ] Confirmar que el catálogo público responde en `https://<dominio>/products.json`
      (pégale ese link en el navegador; debe mostrar JSON con productos). Si no carga,
      el catálogo es privado y la sincronización no funcionará.

---

## 2. Paso a paso para registrar al cliente (lo haces tú)

### Paso 1 — Crear la cuenta de acceso
Dos opciones:

- **Opción simple (que lo haga el cliente):** dile que entre a `https://<tu-dominio>/signup`,
  cree su cuenta con su email y contraseña, y en `/onboarding` registre el negocio
  (nombre + tipo + dominio Shopify si aplica). Eso crea la fila del negocio ya
  vinculada a su usuario.
- **Opción manual (lo creas tú):** crea el usuario en Supabase → Authentication → Add
  user (con su email), y luego crea la fila del negocio (Paso 2).

> Nota: el formulario de onboarding **no** pide credenciales de WhatsApp. Eso siempre
> lo cargas tú en el Paso 4.

### Paso 2 — Confirmar/crear la fila del negocio
En **Supabase → Table editor → `businesses`**, localiza (o crea) la fila del negocio.
Campos clave:

| Columna | Qué poner |
|---|---|
| `name` | Nombre del negocio |
| `catalog_source` | `manual` (catálogo propio) o `shopify` (sincronizado) |
| `supports_custom_orders` | `true` si acepta encargos a medida (default en manual) |
| `owner_user_id` | El `id` del usuario de Supabase (de Authentication) |
| `shopify_domain` | Solo Shopify: el dominio (sin `https://`) |
| `slug` | Identificador corto único (si lo creas a mano, ej.: `dulce-hogar`) |

Si el cliente usó el onboarding, esta fila ya existe y solo falta el Paso 4.

### Paso 3 — Configurar WhatsApp en Meta
En el **Meta App Dashboard** del producto WhatsApp:
1. Identifica el **número** del cliente y copia su **Phone Number ID**.
2. Copia el **WhatsApp Business Account ID (WABA ID)**.
3. Genera un **token permanente** (System User en Meta Business Settings, con permisos
   `whatsapp_business_messaging` y `whatsapp_business_management`). **No uses** el token
   temporal de 24h: se vence y el bot deja de responder con error 401.

### Paso 4 — Cargar las credenciales de WhatsApp en la fila del negocio
En **Supabase → `businesses`**, en la fila del cliente, completa:

| Columna | Valor |
|---|---|
| `whatsapp_phone_number_id` | El Phone Number ID del Paso 3 (**único** por negocio) |
| `whatsapp_token` | El token permanente del Paso 3 |
| `owner_whatsapp_number` | El WhatsApp del dueño para avisos (ej.: `51999888777`) |

> Este es el dato que hace que el enrutamiento funcione: cuando llega un mensaje, el
> sistema busca el negocio cuyo `whatsapp_phone_number_id` coincide.

### Paso 5 — Configurar el webhook en Meta
En el producto **WhatsApp → Configuration → Webhook**:
- **Callback URL:** `https://<tu-dominio>/api/webhook`
- **Verify token:** exactamente el valor de la variable de entorno
  `WHATSAPP_VERIFY_TOKEN` (es **global**, el mismo para todos tus clientes en esa app de Meta).
- **Suscríbete al campo `messages`** (sin esto, Meta verifica pero no te envía los
  mensajes entrantes).

> Si el número del cliente está en **otra app de Meta** distinta a la tuya, esa app
> necesita su propio webhook apuntando a la **misma URL** y usando el **mismo** valor
> de `WHATSAPP_VERIFY_TOKEN`.

### Paso 6 — Suscribir tu app a la WABA del cliente (gotcha clásico)
Aunque el webhook esté bien, si tu app no está **suscrita a la WABA** del número, el
bot no recibe nada. Verifícalo/actívalo con el script:

```bash
# 1) Agrega el WABA ID del cliente en scripts/waba-subscription.mjs (WABA_BY_SLUG)
# 2) Verifica el estado:
node scripts/waba-subscription.mjs check <slug>
# 3) Si no aparece tu app, suscríbela:
node scripts/waba-subscription.mjs subscribe <slug>
```

### Paso 7 — Cargar el catálogo
- **Catálogo propio (`manual`):** el cliente entra al dashboard → **Catálogo** y agrega
  sus productos a mano (nombre, precio, categoría libre, talla/color opcional,
  disponibilidad). CRUD completo.
- **Tienda Shopify (`shopify`):** con `shopify_domain` ya seteado, en el dashboard → **Catálogo**
  pulsa **"Resincronizar catálogo"**. Esto descarga los productos desde
  `/products.json` y los carga. Los productos quedan marcados como **"por revisar"**
  (`needs_review`) para que el cliente confirme tallas/colores/precios antes de venderlos.

### Paso 8 — Probar de punta a punta
1. Desde otro teléfono, envía **"hola"** al número del cliente.
2. Debe responder el agente en segundos.
3. En el dashboard → **Conversaciones** debe aparecer el chat en vivo.
4. Prueba un flujo real (consultar un producto, pedir algo) y confirma que cotiza y
   toma el pedido.
5. Si es panadería, prueba un **encargo especial** y verifica que le llegue el aviso
   al WhatsApp del dueño.

✅ Si todo esto funciona, el cliente está **operativo**.

---

## 3. Qué puede manejar el cliente solo (después del alta)

Desde su dashboard, sin depender de ti:
- **Perfil del negocio:** nombre, **instrucciones personalizadas** del bot (tono,
  horario, políticas), WhatsApp del dueño, y dominio Shopify (si es retail).
- **Catálogo:** agregar/editar/eliminar productos; resincronizar Shopify con un botón.
- **Conversaciones:** ver chats en vivo, **pausar el bot y responder él mismo**
  (handoff), y retomar el bot cuando quiera.
- **Pagos:** marcar un pago (Yape/depósito) como confirmado con una nota de referencia.
- **Resumen:** pedidos pendientes, pedidos del mes y costo de IA del mes.

---

## 4. Solución de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El bot no responde y no hay logs | Tu app no está suscrita a la WABA | Paso 6 (`subscribe`) |
| Webhook da "Forbidden" al verificar | Verify token no coincide | Usa el valor exacto de `WHATSAPP_VERIFY_TOKEN` |
| Verifica pero no llegan mensajes | Falta suscribir el campo `messages` | Paso 5 |
| Error 401 al enviar | Token vencido/incorrecto | Regenera token permanente y actualiza `whatsapp_token` |
| Mensaje "phone_number_id sin negocio" | `whatsapp_phone_number_id` mal cargado o ausente | Revisa Paso 4 (debe coincidir exacto) |
| Sincronización Shopify vacía/falla | `/products.json` no es público | Verifica el dominio y que el JSON cargue |
| El dueño no recibe avisos | `owner_whatsapp_number` vacío o mal formato | Carga el número en formato `51999888777` |

---

## 5. Plantilla de intake (cópiala y mándasela al cliente)

```
Datos para activar tu Aynibot:

1. Nombre del negocio:
2. Catálogo: ( ) Propio (lo cargo a mano)   ( ) Sincronizado desde Shopify
3. Email para iniciar sesión:
4. WhatsApp del dueño para avisos (ej. 51999888777):
5. ¿Cómo quieres que atienda el bot? (tono, horario, entregas, pagos, políticas):
6. Número de WhatsApp que usarás para vender:
   (ojo: ese número dejará de funcionar en la app normal de WhatsApp)
7. Solo si es retail — dominio de tu tienda Shopify:
   (verifica que abra: https://TUDOMINIO/products.json)
```

---

### Resumen de quién hace qué

- **El cliente entrega:** datos del negocio, email, WhatsApp del dueño, tono/políticas,
  el número a usar y (si es retail) su dominio Shopify.
- **Tú haces:** cuenta/fila del negocio → credenciales de WhatsApp en Meta → cargarlas
  en `businesses` → webhook → suscribir app a la WABA → cargar/sincronizar catálogo →
  probar.
- **El cliente luego gestiona solo:** perfil, catálogo, conversaciones, handoff y pagos.
