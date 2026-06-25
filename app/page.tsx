import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-stone-900">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold tracking-tight">Aynibot</span>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/signup"
            className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-100"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-800"
          >
            Crear cuenta gratis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
              Hecho para negocios en Perú
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Tu agente de ventas por WhatsApp, atendiendo 24/7
            </h1>
            <p className="mt-5 text-lg leading-8 text-stone-600">
              Aynibot responde a tus clientes, cotiza productos y toma pedidos
              automáticamente desde WhatsApp. Tú te enfocas en tu negocio; el bot
              se encarga de la conversación.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="flex h-12 items-center justify-center rounded-lg bg-stone-900 px-6 font-medium text-white hover:bg-stone-800"
              >
                Empezar con Aynibot
              </Link>
              <Link
                href="/signup"
                className="flex h-12 items-center justify-center rounded-lg border border-stone-300 px-6 font-medium text-stone-700 hover:bg-stone-100"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>

        {/* Casos de uso */}
        <section className="border-t border-stone-200 bg-stone-50">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-2">
            <article className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
              <h3 className="text-lg font-semibold">Panaderías y pastelerías</h3>
              <p className="mt-2 text-stone-600">
                Toma pedidos del catálogo y gestiona encargos personalizados
                (tortas de cumpleaños, bodas) con fecha de entrega. Notifica al
                dueño cuando llega un encargo especial.
              </p>
            </article>
            <article className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
              <h3 className="text-lg font-semibold">Retail / tiendas Shopify</h3>
              <p className="mt-2 text-stone-600">
                Responde por catálogo, modelos, tallas y colores. Sincroniza tus
                productos desde Shopify y deja que el bot atienda consultas de
                disponibilidad y arme pedidos.
              </p>
            </article>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Listo para automatizar tu WhatsApp
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-stone-600">
            Crea tu cuenta en minutos. Sin contraseñas: entras con un enlace
            mágico a tu correo.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-stone-900 px-8 font-medium text-white hover:bg-stone-800"
            >
              Crear cuenta gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-stone-500">
          © {new Date().getFullYear()} Aynibot — Agente de ventas por WhatsApp.
        </div>
      </footer>
    </div>
  )
}
