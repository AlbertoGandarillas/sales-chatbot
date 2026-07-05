'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type {
  BusinessFaqRow,
  KnowledgeArticleRow,
  OwnerBusiness,
} from '@/lib/dashboard'
import { ownerBusinessAsPromptBusiness } from '@/lib/bot-config'
import {
  buildSystemPromptPreview,
  estimatePromptTokens,
  getCapabilitiesBlock,
  getCatalogSourceLabel,
  URUCORE_RULES,
} from '@/lib/prompts'
import { FAQ_CATEGORIES } from '@/lib/bot-config'
import { BotIdentityForm } from './bot-identity-form'
import { FaqsPanel } from './faqs-panel'
import { ArticlesPanel } from './articles-panel'
import { cn } from '@/lib/cn'

const TABS = [
  { id: 'identity', label: 'Identidad y políticas' },
  { id: 'faqs', label: 'Preguntas frecuentes' },
  { id: 'articles', label: 'Artículos' },
  { id: 'rules', label: 'Reglas del sistema' },
  { id: 'preview', label: 'Vista previa' },
] as const

type TabId = (typeof TABS)[number]['id']

export function BotStudioClient({
  business,
  faqs,
  articles,
}: {
  business: OwnerBusiness
  faqs: BusinessFaqRow[]
  articles: KnowledgeArticleRow[]
}) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: TabId = TABS.some((t) => t.id === tabParam)
    ? (tabParam as TabId)
    : 'identity'

  const promptBusiness = ownerBusinessAsPromptBusiness(business)
  const promptPreview = buildSystemPromptPreview(promptBusiness)
  const tokens = estimatePromptTokens(promptPreview)
  const capabilities = getCapabilitiesBlock(promptBusiness)

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        <strong className="font-medium text-foreground">Tu bot, tu voz.</strong>{' '}
        Configura cómo se presenta y qué políticas comunica. Las reglas de Uru
        (catálogo real, pedidos, escalamiento) aplican a todos por seguridad.{' '}
        <strong className="font-medium text-foreground">
          Tu configuración reemplaza los textos genéricos
        </strong>{' '}
        en saludo, tono, envíos, pagos y FAQs.
      </p>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/bot?tab=${item.id}`}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === item.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === 'identity' && <BotIdentityForm business={business} />}

      {tab === 'faqs' && <FaqsPanel faqs={faqs} />}

      {tab === 'articles' && <ArticlesPanel articles={articles} />}

      {tab === 'rules' && (
        <div className="space-y-4">
          <section className="rounded-card border border-border bg-surface-muted p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Núcleo Uru (no editable)
            </h2>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted">
              {URUCORE_RULES}
            </pre>
          </section>
          <section className="rounded-card border border-border bg-surface-muted p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Capacidades — {getCatalogSourceLabel(business.catalog_source)}
            </h2>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-muted">
              {capabilities}
            </pre>
          </section>
        </div>
      )}

      {tab === 'preview' && (
        <section className="rounded-card border border-border bg-surface-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Prompt ensamblado
            </h2>
            <span className="text-xs text-muted">~{tokens} tokens</span>
          </div>
          <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap text-xs text-muted">
            {promptPreview}
          </pre>
        </section>
      )}
    </div>
  )
}
