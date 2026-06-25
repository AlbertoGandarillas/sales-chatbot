import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { getOwnerBusiness } from '@/lib/dashboard'

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
      <h1 className="text-2xl font-bold text-stone-900">Conversaciones</h1>
      <p className="mt-1 text-sm text-stone-600">
        Abre una conversación para ver el chat, tomar el control o gestionar sus
        pedidos.
      </p>

      <div className="mt-6 space-y-2">
        {conversations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
            Aún no hay conversaciones.
          </p>
        ) : (
          conversations.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/conversaciones/${c.id}`}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-300 hover:bg-stone-50"
            >
              <div>
                <p className="font-medium text-stone-900">{c.customer_phone}</p>
                <p className="text-xs text-stone-600">{formatDate(c.updated_at)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.mode === 'human'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {c.mode === 'human' ? 'Humano' : 'Bot'}
              </span>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}
