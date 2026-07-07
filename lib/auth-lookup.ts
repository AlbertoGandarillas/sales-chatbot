import { createServiceClient } from '@/lib/supabase'

export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const db = createServiceClient()
  let page = 1
  const perPage = 200

  while (page <= 10) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) return null

    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )
    if (match?.id) return match.id

    if (data.users.length < perPage) break
    page++
  }

  return null
}
