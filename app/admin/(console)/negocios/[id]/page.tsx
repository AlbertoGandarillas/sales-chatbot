import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { PageHeader } from '@/components/ui'
import { getAdminBusiness } from '@/lib/admin-data'
import { BusinessEditClient } from './business-edit-client'

export default async function AdminNegocioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const business = await getAdminBusiness(id)
  if (!business) notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={business.name}
        description={`ID ${business.id}`}
        actions={
          <Link
            href="/admin/negocios"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Negocios
          </Link>
        }
      />
      <Suspense fallback={null}>
        <BusinessEditClient business={business} />
      </Suspense>
    </main>
  )
}
