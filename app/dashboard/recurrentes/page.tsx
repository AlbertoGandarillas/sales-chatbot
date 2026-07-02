import { createServerSupabase } from '@/lib/supabase/server'
import { getOwnerBusiness } from '@/lib/dashboard'
import { RecurrentesClient, type RecurringOrderView } from './recurrentes-client'

export default async function RecurrentesPage() {
  const business = await getOwnerBusiness()
  if (!business) return null

  const supabase = await createServerSupabase()
  const [{ data: recurring }, { data: products }] = await Promise.all([
    supabase
      .from('recurring_orders')
      .select('*')
      .eq('business_id', business.id)
      .order('next_run_on', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, price_soles, available, is_custom_order')
      .eq('business_id', business.id)
      .eq('available', true)
      .eq('is_custom_order', false)
      .order('name', { ascending: true }),
  ])

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <RecurrentesClient
        recurring={(recurring as RecurringOrderView[]) ?? []}
        products={
          (products as {
            id: string
            name: string
            price_soles: number
          }[]) ?? []
        }
      />
    </main>
  )
}
