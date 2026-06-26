'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export type OnboardingState = { error: string | null }

export async function createBusiness(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const name = String(formData.get('name') ?? '').trim()
  const catalogSource = String(formData.get('catalog_source') ?? '')
  const shopifyRaw = String(formData.get('shopify_domain') ?? '').trim()

  if (!name) return { error: 'El nombre del negocio es obligatorio.' }
  if (catalogSource !== 'manual' && catalogSource !== 'shopify') {
    return { error: 'Elige cómo gestionarás tu catálogo.' }
  }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión no válida. Vuelve a iniciar sesión.' }

  const shopify_domain =
    catalogSource === 'shopify' && shopifyRaw ? shopifyRaw : null
  // Catálogo propio acepta encargos a medida por defecto; Shopify no.
  const supports_custom_orders = catalogSource === 'manual'
  const base = slugify(name) || 'negocio'

  // slug global único: reintentar con sufijo ante colisión (RLS no deja leer
  // negocios ajenos, así que confiamos en el unique constraint del slug).
  let lastError: string | null = null
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
    const { error } = await supabase.from('businesses').insert({
      name,
      slug,
      catalog_source: catalogSource,
      supports_custom_orders,
      shopify_domain,
      owner_user_id: user.id,
    })

    if (!error) {
      redirect('/dashboard')
    }

    // 23505 = unique_violation (slug repetido) → reintentar con otro sufijo
    if (error.code === '23505') {
      lastError = 'No se pudo generar un identificador único, reintentando…'
      continue
    }

    lastError = error.message
    break
  }

  return { error: lastError ?? 'No se pudo crear el negocio.' }
}
