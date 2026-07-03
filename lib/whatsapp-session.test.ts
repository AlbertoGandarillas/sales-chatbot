import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isWithinWhatsAppSession,
  WHATSAPP_SESSION_MS,
} from './whatsapp-session-window.ts'

describe('isWithinWhatsAppSession', () => {
  const now = new Date('2026-07-03T12:00:00.000Z')

  it('returns false when there is no prior customer message', () => {
    assert.equal(isWithinWhatsAppSession(null, now), false)
  })

  it('returns true within 24 hours', () => {
    const last = new Date(now.getTime() - WHATSAPP_SESSION_MS + 60_000)
    assert.equal(isWithinWhatsAppSession(last, now), true)
  })

  it('returns false after 24 hours', () => {
    const last = new Date(now.getTime() - WHATSAPP_SESSION_MS - 1)
    assert.equal(isWithinWhatsAppSession(last, now), false)
  })
})
