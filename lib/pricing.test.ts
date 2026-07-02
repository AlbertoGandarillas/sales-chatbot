import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { effectivePrice } from './pricing'

const base = {
  price_soles: 10,
  promo_price_soles: 8,
  promo_starts_at: null,
  promo_ends_at: null,
  promo_label: 'Oferta del día',
}

describe('effectivePrice', () => {
  it('sin promo devuelve precio base', () => {
    const r = effectivePrice({ price_soles: 10 })
    assert.equal(r.price, 10)
    assert.equal(r.onPromo, false)
    assert.equal(r.compareAt, null)
  })

  it('promo vigente devuelve precio rebajado', () => {
    const r = effectivePrice(base, new Date('2026-06-26T12:00:00Z'))
    assert.equal(r.price, 8)
    assert.equal(r.compareAt, 10)
    assert.equal(r.onPromo, true)
    assert.equal(r.promoLabel, 'Oferta del día')
  })

  it('promo futura no aplica', () => {
    const r = effectivePrice(
      {
        ...base,
        promo_starts_at: '2026-07-01T00:00:00.000Z',
      },
      new Date('2026-06-26T12:00:00Z')
    )
    assert.equal(r.price, 10)
    assert.equal(r.onPromo, false)
  })

  it('promo expirada no aplica', () => {
    const r = effectivePrice(
      {
        ...base,
        promo_ends_at: '2026-06-25T23:59:59.000Z',
      },
      new Date('2026-06-26T12:00:00Z')
    )
    assert.equal(r.price, 10)
    assert.equal(r.onPromo, false)
  })

  it('encargo a medida ignora promo', () => {
    const r = effectivePrice(
      { ...base, is_custom_order: true },
      new Date('2026-06-26T12:00:00Z')
    )
    assert.equal(r.price, 10)
    assert.equal(r.onPromo, false)
  })
})
