// Dry-run: descarga products.json de una tienda Shopify y muestra cómo
// quedaría el mapeo (sin escribir en la BD).
// Uso: node scripts/test-shopify.mjs [dominio]
const domain = process.argv[2] ?? 'www.betta-footwear.com'

function normalizeHost(d) {
  return d.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase()
}
function htmlToText(html) {
  if (!html) return null
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
  return t ? t.slice(0, 300) : null
}
function parseSize(option1, bodyText) {
  if (option1 && option1.trim() && option1.trim().toLowerCase() !== 'default title') {
    return { tallaRange: option1.trim(), parsedFrom: 'option1' }
  }
  const text = bodyText ?? ''
  const m = text.match(/del\s*(\d{2})\s*al\s*(\d{2})/i) ?? text.match(/(\d{2})\s*al\s*(\d{2})/i)
  if (m) return { tallaRange: `${m[1]} AL ${m[2]}`, parsedFrom: 'body_html' }
  return { tallaRange: null, parsedFrom: 'none' }
}

const host = normalizeHost(domain)
const res = await fetch(`https://${host}/products.json?limit=250&page=1`, {
  headers: { Accept: 'application/json' },
})
console.log('GET', `https://${host}/products.json`, '->', res.status)
if (!res.ok) process.exit(1)

const json = await res.json()
const products = json.products ?? []
console.log(`Productos en página 1: ${products.length}`)

let variants = 0
const parsedFromCount = { option1: 0, body_html: 0, none: 0 }

for (const p of products) {
  const body = htmlToText(p.body_html)
  for (const v of p.variants ?? []) {
    variants++
    const { parsedFrom } = parseSize(v.option1, body)
    parsedFromCount[parsedFrom]++
  }
}

console.log(`Variantes totales (pág 1): ${variants}`)
console.log('Origen del rango de talla:', parsedFromCount)
console.log('\n--- Muestra de los primeros 5 productos ---')
for (const p of products.slice(0, 5)) {
  const body = htmlToText(p.body_html)
  const v = (p.variants ?? [])[0] ?? {}
  const { tallaRange, parsedFrom } = parseSize(v.option1, body)
  console.log(`\n• ${p.title}`)
  console.log(`   precio: ${v.price}  available: ${v.available}`)
  console.log(`   option1: ${JSON.stringify(v.option1)}  option2: ${JSON.stringify(v.option2)}`)
  console.log(`   talla_range -> ${JSON.stringify(tallaRange)} (de ${parsedFrom})`)
  console.log(`   imagen: ${p.images?.[0]?.src ?? '(sin imagen)'}`)
}
