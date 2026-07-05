import { Suspense } from 'react'
import {
  getOwnerArticles,
  getOwnerBusiness,
  getOwnerFaqs,
} from '@/lib/dashboard'
import { Card, CardContent, PageHeader } from '@/components/ui'
import { BotStudioClient } from './bot-studio-client'

export default async function BotStudioPage() {
  const business = await getOwnerBusiness()
  if (!business) return null

  const [faqs, articles] = await Promise.all([
    getOwnerFaqs(business.id),
    getOwnerArticles(business.id),
  ])

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageHeader
        title="Bot Studio"
        description="Personaliza la voz, políticas y conocimiento de tu agente de WhatsApp."
      />

      <Card>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
            <BotStudioClient business={business} faqs={faqs} articles={articles} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
