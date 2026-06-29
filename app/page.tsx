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

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#faq', label: 'Preguntas' },
]

const STEPS = [
  {
    title: 'Conecta tu WhatsApp',
    body: 'Usa tu número de WhatsApp Business sobre la API oficial de Meta (Cloud API). Nada de bots no oficiales.',
  },
  {
    title: 'Arma tu catálogo',
    body: 'Carga tus productos a mano, o sincronízalos automáticamente desde Shopify si tienes tienda.',
  },
  {
    title: 'El agente atiende',
    body: 'Responde, cotiza, toma pedidos y registra encargos personalizados 24/7, con la info real de tu catálogo.',
  },
  {
    title: 'Tú supervisas',
    body: 'Sigues todo desde el dashboard y tomas el control de cualquier conversación cuando lo necesites.',
  },
]

const FEATURES: { title: string; body: string; tone: BadgeTone; tag: string }[] = [
  {
    tag: 'IA',
    tone: 'primary',
    title: 'Agente de ventas con IA',
    body: 'Busca productos, cotiza, toma pedidos y consulta el estado con fecha estimada de entrega — sin inventar precios.',
  },
  {
    tag: 'IA',
    tone: 'primary',
    title: 'Encargos y variantes',
    body: 'Gestiona encargos personalizados en panaderías y comunica rangos de talla y color en retail.',
  },
  {
    tag: 'Operación',
    tone: 'info',
    title: 'Control humano cuando hace falta',
    body: 'Pausa el bot y responde tú desde el dashboard; o el agente escala solo cuando algo se sale de su alcance.',
  },
  {
    tag: 'Operación',
    tone: 'info',
    title: 'Dashboard de operación',
    body: 'Resumen de pedidos y costo de IA del mes, conversaciones en vivo estilo chat, catálogo y perfil del negocio.',
  },
  {
    tag: 'Catálogo',
    tone: 'neutral',
    title: 'Catálogo sincronizado con Shopify',
    body: 'Lee tus productos desde Shopify y se actualiza con un botón. Solo para tiendas Shopify.',
  },
  {
    tag: 'Pagos',
    tone: 'success',
    title: 'Confirmación de pagos',
    body: 'Marca pagos de Yape o depósito como confirmados, con una nota de referencia. Verificación manual, sin procesar comprobantes.',
  },
]

const USE_CASES: { badge: string; tone: BadgeTone; name: string; kind: string; body: string }[] = [
  {
    badge: 'Catálogo propio',
    tone: 'primary',
    name: 'Cruje',
    kind: 'Panadería y pastelería',
    body: 'Carga su catálogo a mano, toma pedidos y arma encargos de tortas con fecha de entrega, avisando al dueño cuando entra un pedido especial.',
  },
  {
    badge: 'Tienda Shopify',
    tone: 'info',
    name: 'Betta',
    kind: 'Retail de zapatillas en Shopify',
    body: 'Sincroniza el catálogo desde Shopify y atiende consultas de modelo, talla y color, armando el pedido para que el equipo confirme disponibilidad.',
  },
]

const BUSINESS_TYPES = [
  {
    title: 'Negocios con catálogo propio',
    body: 'Panaderías, bodegas, tiendas y cualquier negocio con inventario sencillo. Cargas tu catálogo a mano y, si quieres, recibes encargos a medida.',
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
    q: '¿Qué pasa si un cliente necesita algo muy particular?',
    a: 'El agente deriva la conversación a una persona, o tú tomas el control desde el dashboard y respondes directamente por WhatsApp.',
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
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
              A
            </span>
            Aynibot
          </span>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <div className="mr-2 hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </div>
            <Link
              href="/login"
              className={buttonVariants({ variant: 'outline' })}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ variant: 'primary' })}
            >
              Crear cuenta gratis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl"
          />
          <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
                Hecho para negocios en Perú
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Tu agente de ventas por WhatsApp, atendiendo 24/7
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
                Aynibot responde a tus clientes, cotiza productos y toma pedidos
                automáticamente desde WhatsApp. Tú te enfocas en tu negocio; el bot
                se encarga de la conversación.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={buttonVariants({ variant: 'primary', size: 'lg' })}
                >
                  Empezar con Aynibot
                </Link>
                <Link
                  href="#como-funciona"
                  className={buttonVariants({ variant: 'outline', size: 'lg' })}
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
          className="scroll-mt-20 border-t border-border bg-surface-muted"
        >
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <Badge tone="primary" dot>
                Cómo funciona
              </Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                De WhatsApp a pedidos, en cuatro pasos
              </h2>
              <p className="mt-3 text-muted">
                Sin instalar nada raro: tu número oficial, tu catálogo y un agente
                que atiende mientras tú supervisas.
              </p>
            </div>
            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-card border border-border bg-surface p-6 shadow-sm"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <Badge tone="primary" dot>
                Funcionalidades
              </Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Lo que Aynibot hace hoy
              </h2>
              <p className="mt-3 text-muted">
                Funciones reales, ya operando. Nada de promesas que todavía no
                existen.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card
                  key={f.title}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent>
                    <Badge tone={f.tone}>{f.tag}</Badge>
                    <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{f.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Casos de uso */}
        <section
          id="casos"
          className="scroll-mt-20 border-t border-border bg-surface-muted"
        >
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <Badge tone="primary" dot>
                Casos de uso
              </Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Dos negocios reales ya operando con Aynibot
              </h2>
              <p className="mt-3 text-muted">
                Cada uno automatiza un flujo distinto de atención y pedidos.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {USE_CASES.map((u) => (
                <article
                  key={u.name}
                  className="rounded-card border border-border bg-surface p-7 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{u.name}</h3>
                    <Badge tone={u.tone} dot>
                      {u.badge}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium text-muted">{u.kind}</p>
                  <p className="mt-3 text-muted">{u.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Para qué negocios es */}
        <section id="para-quien" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <Badge tone="primary" dot>
                Para qué negocios es
              </Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Pensado para dos tipos de negocio
              </h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {BUSINESS_TYPES.map((b) => (
                <Card key={b.title}>
                  <CardContent>
                    <h3 className="text-base font-semibold">{b.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{b.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 rounded-card border border-border bg-surface-muted p-5 text-sm text-muted">
              Puedes empezar con tu catálogo propio y{' '}
              <span className="font-medium text-foreground">conectar Shopify más
              adelante</span>{' '}
              cuando crezcas, sin rehacer tu cuenta ni tu WhatsApp. ¿Tu negocio es
              distinto?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Escríbenos
              </Link>{' '}
              y lo evaluamos.
            </div>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section
          id="faq"
          className="scroll-mt-20 border-t border-border bg-surface-muted"
        >
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <div className="text-center">
              <Badge tone="primary" dot>
                Preguntas frecuentes
              </Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Lo que probablemente te estás preguntando
              </h2>
            </div>
            <Accordion className="mt-10">
              {FAQS.map((f) => (
                <AccordionItem key={f.q} question={f.q}>
                  {f.a}
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Listo para automatizar tu WhatsApp
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Empieza con tu catálogo y tu número de WhatsApp; nosotros te acompañamos
            en la conexión y la puesta en marcha.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              Crear cuenta gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aynibot — Agente de ventas por WhatsApp.</p>
          <div className="flex gap-4">
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
