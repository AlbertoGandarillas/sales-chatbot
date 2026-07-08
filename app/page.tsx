import Link from 'next/link'
import {
  buttonVariants,
  Badge,
  Card,
  CardContent,
  Accordion,
  AccordionItem,
} from '@/components/ui'
import type { BadgeTone } from '@/components/ui'
import { UruLogo } from '@/components/brand/uru-logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { LEGAL } from '@/lib/legal-config'
import { cn } from '@/lib/cn'

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#casos', label: 'Casos' },
  { href: '#para-quien', label: 'Negocios' },
  { href: '#faq', label: 'Preguntas' },
]

const STEPS = [
  {
    title: 'Crea tu cuenta y conectamos tu WhatsApp',
    body: 'Regístrate, arma tu catálogo y nosotros vinculamos tu número con la API oficial de Meta (Cloud API). Nada de bots no oficiales.',
  },
  {
    title: 'Arma tu catálogo',
    body: 'Carga tus productos a mano, o sincronízalos automáticamente desde Shopify si tienes tienda.',
  },
  {
    title: 'El agente atiende',
    body: 'Responde con tus FAQs y políticas del Bot Studio, cotiza, toma pedidos y registra encargos personalizados 24/7.',
  },
  {
    title: 'Tú supervisas',
    body: 'Sigues todo desde el dashboard, confirmas pedidos, pagos y entregas, y tomas el control de cualquier conversación.',
  },
]

const FEATURES: { title: string; body: string; tone: BadgeTone; tag: string }[] = [
  {
    tag: 'IA',
    tone: 'primary',
    title: 'Agente de ventas con IA',
    body: 'Busca productos, aplica promos vigentes, cotiza, toma pedidos y consulta el estado — sin inventar precios.',
  },
  {
    tag: 'IA',
    tone: 'primary',
    title: 'Bot Studio',
    body: 'Personaliza saludo, tono, políticas de envío y pago, FAQs y artículos de conocimiento. Vista previa del prompt incluida.',
  },
  {
    tag: 'Operación',
    tone: 'info',
    title: 'Encargos y variantes',
    body: 'Encargos a medida en panaderías; talla y color en retail Shopify.',
  },
  {
    tag: 'Operación',
    tone: 'info',
    title: 'Pedidos recurrentes',
    body: 'Plantillas para clientes fieles: recordatorios por WhatsApp y confirmación con el bot.',
  },
  {
    tag: 'Operación',
    tone: 'info',
    title: 'Control humano',
    body: 'Pausa el bot y responde tú; o el agente escala solo y te avisa por WhatsApp.',
  },
  {
    tag: 'Operación',
    tone: 'info',
    title: 'Dashboard de operación',
    body: 'Resumen de ventas, conversaciones estilo chat y ciclo completo de pedidos: confirmar, cancelar, entregar y pagos.',
  },
  {
    tag: 'Catálogo',
    tone: 'neutral',
    title: 'Catálogo con imágenes y promos',
    body: 'Carga manual o sync Shopify; edición rápida de precio y stock; ofertas con fecha de vigencia.',
  },
  {
    tag: 'Catálogo',
    tone: 'neutral',
    title: 'Equipo',
    body: 'Invita a alguien solo para catálogo u operación, sin acceso a configuración sensible.',
  },
  {
    tag: 'Pagos',
    tone: 'success',
    title: 'Confirmación de pagos',
    body: 'Marca Yape o depósito como pagado con nota de referencia. Verificación manual.',
  },
]

const USE_CASES: { badge: string; tone: BadgeTone; name: string; kind: string; body: string }[] = [
  {
    badge: 'Catálogo propio',
    tone: 'primary',
    name: 'Panadería La Espiga',
    kind: 'Panadería y pastelería',
    body: 'Catálogo a mano, encargos de tortas con fecha de entrega, promociones de la semana y pedidos recurrentes para clientes fieles. El dueño recibe aviso cuando entra un encargo especial.',
  },
  {
    badge: 'Tienda Shopify',
    tone: 'info',
    name: 'Tienda de zapatillas',
    kind: 'Retail en Shopify',
    body: 'Sincroniza el catálogo desde Shopify y atiende consultas de modelo, talla y color. El bot arma el pedido para que el equipo confirme disponibilidad.',
  },
]

const BUSINESS_TYPES = [
  {
    title: 'Negocios con catálogo propio',
    body: 'Panaderías, bodegas, tiendas y cualquier negocio con inventario sencillo. Cargas tu catálogo a mano, recibes encargos a medida y pedidos recurrentes para clientes que compran cada semana.',
  },
  {
    title: 'Tiendas Shopify',
    body: 'Catálogo sincronizado automáticamente desde Shopify, con variantes de talla y color.',
  },
]

const FAQS = [
  {
    q: '¿Necesito tener mi tienda en Shopify?',
    a: 'No. Si tienes un inventario sencillo (panadería, bodega, tienda) cargas tu catálogo a mano. Shopify solo se necesita si quieres sincronizar tu catálogo automáticamente.',
  },
  {
    q: '¿Puedo empezar sin Shopify y conectarlo después?',
    a: 'Sí. Puedes arrancar con tu catálogo propio y, cuando migres a Shopify, conectarlo desde tu perfil y sincronizar. Tus productos cargados a mano se conservan y no se reconfigura tu WhatsApp.',
  },
  {
    q: '¿Cómo conecto mi número de WhatsApp?',
    a: 'Creas tu cuenta y catálogo en Uru; nuestro equipo vincula tu número con la API oficial de Meta. No necesitas tocar configuración técnica.',
  },
  {
    q: '¿Puedo personalizar cómo habla el bot?',
    a: 'Sí. En Bot Studio configuras saludo, tono, políticas, preguntas frecuentes y artículos. El agente busca esa información antes de inventar respuestas.',
  },
  {
    q: '¿Me avisan cuando entra un pedido?',
    a: 'Sí. Puedes recibir un WhatsApp al número del dueño cuando entra un pedido nuevo o un encargo especial.',
  },
  {
    q: '¿Qué pasa si un cliente necesita algo muy particular?',
    a: 'El agente deriva la conversación a una persona, o tú tomas el control desde el dashboard y respondes directamente por WhatsApp.',
  },
  {
    q: '¿Mis clientes pueden enviar fotos o audios?',
    a: 'Por ahora el bot atiende mensajes de texto. Si envían imagen o audio, les pedimos que escriban su consulta.',
  },
  {
    q: '¿Es un WhatsApp oficial o hay riesgo de bloqueo?',
    a: 'Es oficial: funciona sobre la API de WhatsApp de Meta (Cloud API), no es un bot no oficial.',
  },
  {
    q: '¿Cómo se confirman los pagos?',
    a: 'Por ahora con Yape o depósito: tu cliente paga y tú confirmas el pago manualmente desde el dashboard, con una nota de referencia. No procesamos comprobantes automáticamente.',
  },
  {
    q: '¿Cómo se cobra el servicio?',
    a: 'Conversemos sobre tu negocio y armamos un plan a tu medida.',
  },
]

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header flotante glass */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <div className="glass-panel mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-full px-3 py-2 sm:gap-3 sm:px-6 sm:py-2.5">
          <div className="min-w-0 shrink">
            <div className="sm:hidden">
              <UruLogo size="md" />
            </div>
            <div className="hidden sm:block">
              <UruLogo size="lg" />
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-1 text-sm sm:gap-2">
            <div className="mr-1 hidden items-center gap-0.5 md:flex">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="pill px-3 py-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </div>
            <ThemeToggle />
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: 'primary', size: 'sm' }),
                'pill shrink-0 whitespace-nowrap px-2.5 text-xs shadow-md sm:px-3 sm:text-sm'
              )}
            >
              <span className="sm:hidden">Registrarse</span>
              <span className="hidden sm:inline">Crear cuenta gratis</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* Hero premium */}
        <section className="relative overflow-hidden bg-gradient-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full glow-rose opacity-60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full glow-blue opacity-50 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full glow-teal opacity-40 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
            <div className="max-w-3xl">
              <span className="pill inline-flex items-center gap-2 border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent shadow-sm" />
                Hecho para negocios en Perú
              </span>
              <p className="font-brand mt-8 text-xl font-bold tracking-wide text-white/95 sm:text-2xl">
                Vende sin parar
              </p>
              <h1 className="font-brand mt-4 text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl">
                Tu agente de ventas por WhatsApp, atendiendo 24/7
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl">
                Uru responde con la info real de tu catálogo, toma pedidos y te avisa
                cuando necesitas intervenir. Personaliza el bot sin tocar código; nosotros
                te acompañamos para conectar tu WhatsApp oficial.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'lg' }),
                    'btn-on-gradient pill px-8 shadow-lg hover:shadow-xl'
                  )}
                >
                  Empezar con Uru
                </Link>
                <Link
                  href="#como-funciona"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'pill border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white'
                  )}
                >
                  Ver cómo funciona
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section
          id="como-funciona"
          className="scroll-mt-28 border-t border-border/60 bg-surface-muted/80"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="max-w-2xl">
              <Badge tone="primary" dot>
                Cómo funciona
              </Badge>
              <h2 className="font-brand mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                De WhatsApp a pedidos, en cuatro pasos
              </h2>
              <p className="mt-3 text-lg text-muted">
                Sin instalar nada raro: tu número oficial, tu catálogo y un agente
                que atiende mientras tú supervisas.
              </p>
            </div>
            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="premium-card p-7">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-2 text-sm font-bold text-white shadow-sm"
                  >
                    {i + 1}
                  </span>
                  <h3 className="font-brand mt-5 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="scroll-mt-28">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="max-w-2xl">
              <Badge tone="primary" dot>
                Funcionalidades
              </Badge>
              <h2 className="font-brand mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Lo que Uru hace hoy
              </h2>
              <p className="mt-3 text-lg text-muted">
                Funciones reales, ya operando. Nada de promesas que todavía no existen.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="premium-card p-6">
                  <Badge tone={f.tone}>{f.tag}</Badge>
                  <h3 className="font-brand mt-4 text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Casos de uso */}
        <section
          id="casos"
          className="scroll-mt-28 border-t border-border/60 bg-surface-muted/80"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="max-w-2xl">
              <Badge tone="primary" dot>
                Casos de uso
              </Badge>
              <h2 className="font-brand mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Dos ejemplos de negocios con Uru
              </h2>
              <p className="mt-3 text-lg text-muted">
                Cada uno automatiza un flujo distinto de atención y pedidos.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {USE_CASES.map((u) => (
                <article key={u.name} className="premium-card p-8">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-brand text-2xl font-bold">{u.name}</h3>
                      <p className="mt-1 text-sm font-medium text-muted">{u.kind}</p>
                    </div>
                    <Badge tone={u.tone} dot>
                      {u.badge}
                    </Badge>
                  </div>
                  <p className="mt-4 leading-7 text-muted">{u.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Para qué negocios es */}
        <section id="para-quien" className="scroll-mt-28">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="max-w-2xl">
              <Badge tone="primary" dot>
                Para qué negocios es
              </Badge>
              <h2 className="font-brand mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Pensado para dos tipos de negocio
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {BUSINESS_TYPES.map((b) => (
                <Card key={b.title} className="premium-card border-0 shadow-none">
                  <CardContent className="p-7">
                    <h3 className="font-brand text-lg font-bold">{b.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{b.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="premium-card mt-8 p-6 text-sm text-muted">
              Puedes empezar con tu catálogo propio y{' '}
              <span className="font-medium text-foreground">
                conectar Shopify más adelante
              </span>{' '}
              cuando crezcas, sin rehacer tu cuenta ni tu WhatsApp. ¿Tu negocio es
              distinto?{' '}
              <a
                href={`mailto:${LEGAL.contactEmail}`}
                className="font-semibold text-primary hover:underline"
              >
                Escríbenos
              </a>{' '}
              y lo evaluamos.
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="scroll-mt-28 border-t border-border/60 bg-surface-muted/80"
        >
          <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
            <div className="text-center">
              <Badge tone="primary" dot>
                Preguntas frecuentes
              </Badge>
              <h2 className="font-brand mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Lo que probablemente te estás preguntando
              </h2>
            </div>
            <Accordion className="premium-card mt-12 overflow-hidden p-2">
              {FAQS.map((f) => (
                <AccordionItem key={f.q} question={f.q}>
                  {f.a}
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden bg-gradient-1">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.12),transparent_55%)]"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
            <h2 className="font-brand text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Listo para automatizar tu WhatsApp
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
              Empieza gratis con tu catálogo; te acompañamos para conectar tu WhatsApp
              oficial y poner el bot en marcha.
            </p>
            <div className="mt-10">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'lg' }),
                  'btn-on-gradient pill px-10 shadow-lg'
                )}
              >
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <UruLogo variant="isotipo" size="md" href={false} />
            <p>© {new Date().getFullYear()} Uru — Vende sin parar.</p>
          </div>
          <div className="flex gap-6">
            <Link href="/privacidad" className="hover:text-foreground hover:underline">
              Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-foreground hover:underline">
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
