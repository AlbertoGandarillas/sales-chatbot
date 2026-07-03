import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { maskSecret } from './mask-secret'

describe('maskSecret', () => {
  it('masks middle of long values', () => {
    assert.equal(maskSecret('1234567890123456', 4), '1234••••3456')
  })

  it('returns dash for empty', () => {
    assert.equal(maskSecret(null), '—')
  })
})
