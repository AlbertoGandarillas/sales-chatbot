import Link from 'next/link'
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui'
import { listAdminBusinesses, maskSecret } from '@/lib/admin-data'

export default async function AdminNegociosPage() {
  const businesses = await listAdminBusinesses()

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="Negocios"
        description="Tenants de la plataforma. Edita credenciales WhatsApp y configuración."
      />

      <div className="mt-6 space-y-2">
        {businesses.length === 0 ? (
          <EmptyState title="Sin negocios" description="Aún no hay filas en businesses." />
        ) : (
          businesses.map((b) => (
            <Link key={b.id} href={`/admin/negocios/${b.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-border-strong hover:bg-surface-muted">
                <div>
                  <p className="font-medium text-foreground">{b.name}</p>
                  <p className="text-xs text-muted">
                    {b.slug} · {b.catalog_source}
                    {b.whatsapp_phone_number_id
                      ? ` · WA ${maskSecret(b.whatsapp_phone_number_id, 6)}`
                      : ' · sin WhatsApp'}
                  </p>
                </div>
                <Badge tone={b.owner_user_id ? (b.whatsapp_token ? 'primary' : 'warning') : 'danger'}>
                  {!b.owner_user_id
                    ? 'Sin dueño'
                    : b.whatsapp_token
                      ? 'WA conectado'
                      : 'WA pendiente'}
                </Badge>
              </Card>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}
