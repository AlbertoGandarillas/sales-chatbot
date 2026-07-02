import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isValidPeruWhatsAppPhone,
  normalizeWhatsAppPhone,
} from './whatsapp-phone'

describe('normalizeWhatsAppPhone', () => {
  it('agrega 51 a móvil peruano de 9 dígitos', () => {
    assert.equal(normalizeWhatsAppPhone('999342668'), '51999342668')
  })

  it('quita cero inicial', () => {
    assert.equal(normalizeWhatsAppPhone('0999342668'), '51999342668')
  })

  it('conserva número ya internacional', () => {
    assert.equal(normalizeWhatsAppPhone('51999342668'), '51999342668')
  })
})

describe('isValidPeruWhatsAppPhone', () => {
  it('acepta móvil peruano normalizado', () => {
    assert.equal(isValidPeruWhatsAppPhone('999342668'), true)
  })
})
