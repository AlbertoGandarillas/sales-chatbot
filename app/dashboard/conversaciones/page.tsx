import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOwnerBusiness } from '@/lib/dashboard'
import { Badge, EmptyState, PageHeader } from '@/components/ui'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default async function ConversacionesList() {
  const business = await getOwnerBusiness()
  if (!business) return null
  const supabase = await createServerSupabase()

  const { data } = await supabase
    .from('conversations')
    .select('id, customer_phone, mode, status, updated_at')
    .eq('business_id', business.id)
    .order('updated_at', { ascending: false })
    .limit(100)

  const conversations = data ?? []

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Conversaciones"
        description="Abre una conversación para ver el chat, tomar el control o gestionar sus pedidos."
      />

      <div className="mt-6 space-y-2">
        {conversations.length === 0 ? (
          <EmptyState
            title="Aún no hay conversaciones"
            description="Cuando un cliente escriba a tu WhatsApp, la conversación aparecerá aquí."
          />
        ) : (
          conversations.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/conversaciones/${c.id}`}
              className="flex items-center justify-between rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-muted"
            >
              <div>
                <p className="font-medium text-foreground">{c.customer_phone}</p>
                <p className="text-xs text-muted">{formatDate(c.updated_at)}</p>
              </div>
              <Badge tone={c.mode === 'human' ? 'warning' : 'neutral'} dot>
                {c.mode === 'human' ? 'Humano' : 'Bot'}
              </Badge>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}
