import Link from 'next/link'
import { LEGAL } from '@/lib/legal-config'
import { PageHeader } from '@/components/ui'
import { UruLogo } from '@/components/brand/uru-logo'

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <UruLogo size="sm" />
          <Link href="/login" className="text-sm text-primary hover:underline">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <PageHeader
          title="Política de privacidad"
          description={`Última actualización: ${LEGAL.lastUpdated}`}
        />

        <div className="prose prose-stone mt-8 max-w-none space-y-6 text-muted">
          <p>
            {LEGAL.companyName} opera una plataforma de agente de
            ventas por WhatsApp y panel de control para comercios en Perú. Esta política
            describe cómo tratamos los datos personales en el marco de ese servicio.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Responsable</h2>
            <p>
              Responsable del tratamiento: {LEGAL.companyName}. Contacto:{' '}
              <a href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">
                {LEGAL.contactEmail}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Datos que recogemos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Del comercio (cliente de Uru): correo, datos del negocio, catálogo,
                configuración del agente, credenciales técnicas de WhatsApp almacenadas de
                forma segura.
              </li>
              <li>
                Del cliente final del comercio: número de WhatsApp, contenido de los
                mensajes, pedidos generados en la conversación.
              </li>
              <li>
                Datos técnicos: registros de uso del servicio de IA (tokens estimados),
                logs de operación.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Finalidad</h2>
            <p>
              Operar el agente conversacional, gestionar pedidos, mostrar métricas al
              comercio y mantener la seguridad del servicio. No usamos los datos para
              publicidad ni los vendemos a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Encargados y subprocesadores</h2>
            <p>Compartimos datos solo con proveedores necesarios para prestar el servicio:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Supabase (base de datos y autenticación)</li>
              <li>Vercel (hosting de la aplicación)</li>
              <li>OpenAI (procesamiento de lenguaje del agente)</li>
              <li>Meta / WhatsApp Cloud API (envío y recepción de mensajes)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Conservación</h2>
            <p>
              Conservamos los datos mientras dure la relación con el comercio y el tiempo
              razonable necesario para obligaciones legales o resolución de disputas. El
              comercio puede solicitar eliminación contactando a {LEGAL.contactEmail}.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Derechos (Ley N.° 29733)</h2>
            <p>
              Puedes ejercer acceso, rectificación, cancelación u oposición escribiendo a{' '}
              {LEGAL.contactEmail}. Responderemos en un plazo razonable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Cambios</h2>
            <p>
              Podemos actualizar esta política. Publicaremos la versión vigente en esta
              página con la fecha de actualización.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
