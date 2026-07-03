import { createServiceClient } from '@/lib/supabase'

export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const db = createServiceClient()
    await db.from('admin_audit_logs').insert({
      admin_user_id: adminUserId,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      metadata: metadata ?? {},
    })
  } catch {
    // Audit failure must not block admin actions
  }
}
