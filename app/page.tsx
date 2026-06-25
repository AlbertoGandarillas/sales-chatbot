import Link from 'next/link'
import { buttonVariants } from '@/components/ui'

const USE_CASES = [
  {
    title: 'Panaderías y pastelerías',
    body: 'Toma pedidos del catálogo y gestiona encargos personalizados (tortas de cumpleaños, bodas) con fecha de entrega. Notifica al dueño cuando llega un encargo especial.',
  },
  {
    title: 'Retail / tiendas Shopify',
    body: 'Responde por catálogo, modelos, tallas y colores. Sincroniza tus productos desde Shopify y deja que el bot atienda consultas de disponibilidad y arme pedidos.',
  },
]

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            A
          </span>
          Aynibot
        </span>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
            Iniciar sesión
          </Link>
          <Link href="/signup" className={buttonVariants({ variant: 'primary' })}>
            Crear cuenta gratis
          </Link>
        </nav>
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
                  href="/login"
                  className={buttonVariants({ variant: 'outline', size: 'lg' })}
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Casos de uso */}
        <section className="border-t border-border bg-surface-muted">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <article
                key={u.title}
                className="rounded-card border border-border bg-surface p-7 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="text-lg font-semibold">{u.title}</h3>
                <p className="mt-2 text-muted">{u.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Listo para automatizar tu WhatsApp
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Crea tu cuenta en minutos con tu correo y empieza a atender clientes
            automáticamente.
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
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted">
          © {new Date().getFullYear()} Aynibot — Agente de ventas por WhatsApp.
        </div>
      </footer>
    </div>
  )
}
