import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src =
  process.argv[2] ??
  'C:/Users/alber/.cursor/projects/c-Users-alber-OneDrive-Documents-analu-sales-chatbot-sales-chatbot/assets/c__Users_alber_AppData_Roaming_Cursor_User_workspaceStorage_7d9193c554bb8db04c1cb10af6c06d0f_images_image-64015981-b1d9-497b-91ec-3e4a7fe5ff7a.png'
const out = path.resolve(__dirname, '../public/brand/uru-isotipo.svg')

const { data, info } = await sharp(src).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels } = info
const bg = [91, 175, 130]

const px = (x, y) => {
  const i = (y * W + x) * channels
  return [data[i], data[i + 1], data[i + 2]]
}
const isBg = (c) => Math.hypot(c[0] - bg[0], c[1] - bg[1], c[2] - bg[2]) < 28
const isWhite = (c) => !isBg(c) && c[0] > 200 && c[1] > 228

function traceBoundary(test) {
  let sx = -1
  let sy = -1
  outer: for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!test(x, y)) continue
      for (const [dx, dy] of [
        [0, -1],
        [-1, 0],
        [0, 1],
        [1, 0],
      ]) {
        if (!test(x + dx, y + dy)) {
          sx = x
          sy = y
          break outer
        }
      }
    }
  }
  if (sx < 0) return []

  const dirs = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ]
  let dir = 7
  let x = sx
  let y = sy
  const path = []

  for (let step = 0; step < 8000; step++) {
    path.push([x, y])
    let found = false
    for (let i = 0; i < 8; i++) {
      const nd = (dir + i) % 8
      const nx = x + dirs[nd][0]
      const ny = y + dirs[nd][1]
      if (test(nx, ny)) {
        x = nx
        y = ny
        dir = (nd + 6) % 8
        found = true
        break
      }
    }
    if (!found) break
    if (x === sx && y === sy && path.length > 8) break
  }
  return path
}

function flood(setFn, x, y) {
  const pts = []
  const stack = [[x, y]]
  const seen = new Set()
  while (stack.length) {
    const [cx, cy] = stack.pop()
    const k = `${cx},${cy}`
    if (seen.has(k)) continue
    if (!setFn(cx, cy)) continue
    seen.add(k)
    pts.push([cx, cy])
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
  return pts
}

// Largest white component = logo
const whiteSeen = new Uint8Array(W * H)
const whiteComponents = []
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x
    if (whiteSeen[idx] || !isWhite(px(x, y))) continue
    const pts = flood((cx, cy) => {
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) return false
      const i = cy * W + cx
      if (whiteSeen[i]) return false
      if (!isWhite(px(cx, cy))) return false
      whiteSeen[i] = 1
      return true
    }, x, y)
    whiteComponents.push(pts)
  }
}
whiteComponents.sort((a, b) => b.length - a.length)
const logoWhite = new Set(whiteComponents[0].map(([x, y]) => `${x},${y}`))
const isLogoWhite = (x, y) => logoWhite.has(`${x},${y}`)

// Exterior background (touching image edge)
const exterior = new Set()
const edgeSeeds = []
for (let x = 0; x < W; x++) {
  edgeSeeds.push([x, 0], [x, H - 1])
}
for (let y = 0; y < H; y++) {
  edgeSeeds.push([0, y], [W - 1, y])
}
for (const [x, y] of edgeSeeds) {
  if (!isBg(px(x, y))) continue
  flood((cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= W || cy >= H) return false
    const kk = `${cx},${cy}`
    if (exterior.has(kk)) return false
    if (!isBg(px(cx, cy))) return false
    exterior.add(kk)
    return true
  }, x, y)
}

const isHole = (x, y) => isBg(px(x, y)) && !exterior.has(`${x},${y}`)

const holeSeen = new Set()
const holes = []
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const k = `${x},${y}`
    if (holeSeen.has(k) || !isHole(x, y)) continue
    const pts = flood((cx, cy) => {
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) return false
      const kk = `${cx},${cy}`
      if (holeSeen.has(kk)) return false
      if (!isHole(cx, cy)) return false
      holeSeen.add(kk)
      return true
    }, x, y)
    if (pts.length > 8) holes.push(pts)
  }
}

holes.sort((a, b) => b.length - a.length)
console.log(
  'holes',
  holes.map((h) => h.length)
)

const outer = traceBoundary((x, y) => isLogoWhite(x, y))

const holeSets = holes.map((pts) => {
  const s = new Set(pts.map(([x, y]) => `${x},${y}`))
  return (x, y) => s.has(`${x},${y}`)
})

function toPathD(path, tolerance = 0.35) {
  if (path.length < 3) return ''
  // minimal simplify: remove collinear only
  const out = [path[0]]
  for (let i = 1; i < path.length - 1; i++) {
    const [x0, y0] = out[out.length - 1]
    const [x1, y1] = path[i]
    const [x2, y2] = path[i + 1]
    const cross = (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1)
    if (Math.abs(cross) > tolerance) out.push(path[i])
  }
  out.push(path[path.length - 1])
  let d = `M ${out[0][0]} ${out[0][1]}`
  for (let i = 1; i < out.length; i++) d += ` L ${out[i][0]} ${out[i][1]}`
  return `${d} Z`
}

const holePaths = holeSets
  .map((test) => traceBoundary(test))
  .filter((p) => p.length > 8)
  .map((p) => toPathD(p))

const d = [toPathD(outer), ...holePaths].join(' ')

const scale = 100 / W
const sh = H * scale
const ty = (100 - sh) / 2

const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="uru">
  <rect width="100" height="100" fill="#5BAF82"/>
  <g transform="translate(0 ${ty.toFixed(4)}) scale(${scale.toFixed(6)})">
    <path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="${d}"/>
  </g>
</svg>
`

fs.writeFileSync(out, svg)
console.log('outer pts', outer.length, 'hole paths', holePaths.length, '->', out)
