import Link from 'next/link'
import { LEGAL } from '@/lib/legal-config'
import { PageHeader } from '@/components/ui'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-bold tracking-tight text-foreground">
            Aynibot
          </Link>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <PageHeader
          title="Términos de uso"
          description={`Última actualización: ${LEGAL.lastUpdated}`}
        />

        <div className="prose prose-stone mt-8 max-w-none space-y-6 text-muted">
          <p>
            Al usar Aynibot ({LEGAL.companyName}), aceptas estos términos. Si no estás de
            acuerdo, no uses el servicio.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-foreground">El servicio</h2>
            <p>
              Aynibot ofrece un agente de ventas por WhatsApp y un panel para que comercios
              gestionen catálogo, conversaciones y pedidos. <strong>No somos procesador de
              pagos</strong>: los cobros entre comercio y cliente final (Yape, depósito, etc.)
              son responsabilidad del comercio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Responsabilidad del comercio</h2>
            <p>
              El comercio es responsable de la veracidad de su catálogo, precios, stock,
              entregas, atención al cliente y cumplimiento de la normativa aplicable a su
              rubro. El agente automatiza respuestas según la información configurada; las
              decisiones comerciales finales son del comercio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Uso aceptable</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>No usar el servicio para spam, contenido ilegal o engañoso.</li>
              <li>No intentar vulnerar la seguridad del sistema ni el webhook.</li>
              <li>Respetar las políticas de Meta/WhatsApp y OpenAI.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Disponibilidad</h2>
            <p>
              El servicio se presta &quot;tal cual&quot;, con dependencia de terceros (Meta,
              OpenAI, infraestructura cloud). No garantizamos disponibilidad ininterrumpida
              ni resultados comerciales específicos (ventas, conversión, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Limitación de responsabilidad</h2>
            <p>
              En la medida permitida por la ley, {LEGAL.companyName} no será responsable por
              daños indirectos, lucro cesante o pérdidas derivadas del uso del servicio. La
              responsabilidad total se limita al monto pagado por el comercio a Aynibot en
              los últimos doce meses, cuando aplique.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contacto y cambios</h2>
            <p>
              Consultas:{' '}
              <a href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">
                {LEGAL.contactEmail}
              </a>
              . Podemos modificar estos términos; la versión vigente estará en esta página.
            </p>
            <p>Ley aplicable: República del Perú.</p>
          </section>
        </div>
      </main>
    </div>
  )
}
