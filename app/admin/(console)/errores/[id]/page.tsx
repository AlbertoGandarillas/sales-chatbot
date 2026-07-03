import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge, Card, PageHeader } from '@/components/ui'
import { getErrorLog } from '@/lib/admin-data'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

export default async function AdminErrorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const row = await getErrorLog(id)
  if (!row) notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Detalle de error"
        description={formatDate(row.created_at)}
        actions={
          <Link
            href="/admin/errores"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Volver
          </Link>
        }
      />

      <div className="mt-6 space-y-4">
        <Card className="p-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone={row.level === 'error' ? 'danger' : 'warning'}>{row.level}</Badge>
            <Badge tone="neutral">{row.source}</Badge>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">{row.message}</p>
          {row.business_id && (
            <p className="mt-3 text-xs text-muted">
              Negocio:{' '}
              <Link
                href={`/admin/negocios/${row.business_id}`}
                className="font-medium text-primary hover:underline"
              >
                {row.business_id}
              </Link>
            </p>
          )}
        </Card>

        {row.stack && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Stack trace</h2>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs text-muted">
              {row.stack}
            </pre>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-foreground">Contexto</h2>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs text-muted">
            {JSON.stringify(row.context, null, 2)}
          </pre>
        </Card>
      </div>
    </main>
  )
}
