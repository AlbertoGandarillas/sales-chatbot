import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { processRecurringRemindersForBusiness } from '@/lib/recurring-orders'
import type { Business } from '@/lib/business-resolver'
import { BUSINESS_COLUMNS } from '@/lib/business-resolver'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const { data: businesses, error } = await db
    .from('businesses')
    .select(BUSINESS_COLUMNS)
    .not('whatsapp_phone_number_id', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let totalSent = 0
  let totalExpired = 0
  const details: { business_id: string; sent: number; expired: number }[] = []

  for (const business of (businesses ?? []) as Business[]) {
    try {
      const result = await processRecurringRemindersForBusiness(db, business)
      totalSent += result.sent
      totalExpired += result.expired
      details.push({
        business_id: business.id,
        sent: result.sent,
        expired: result.expired,
      })
    } catch (err) {
      console.error('[cron/recurring-reminders] business failed:', business.id, err)
    }
  }

  return NextResponse.json({
    ok: true,
    sent: totalSent,
    expired: totalExpired,
    businesses: details.length,
    details,
  })
}
