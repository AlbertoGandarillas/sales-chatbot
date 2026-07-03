import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isErrorLoggingEnabled } from './error-logging-config'

describe('isErrorLoggingEnabled', () => {
  it('returns true by default', () => {
    const prev = process.env.ERROR_LOGGING_ENABLED
    delete process.env.ERROR_LOGGING_ENABLED
    assert.equal(isErrorLoggingEnabled(), true)
    process.env.ERROR_LOGGING_ENABLED = prev
  })

  it('returns false when disabled', () => {
    const prev = process.env.ERROR_LOGGING_ENABLED
    process.env.ERROR_LOGGING_ENABLED = 'false'
    assert.equal(isErrorLoggingEnabled(), false)
    process.env.ERROR_LOGGING_ENABLED = prev
  })
})
