import sharp from 'sharp'
import fs from 'fs'

const whiteRef =
  'C:/Users/alber/.cursor/projects/c-Users-alber-OneDrive-Documents-analu-sales-chatbot-sales-chatbot/assets/c__Users_alber_AppData_Roaming_Cursor_User_workspaceStorage_7d9193c554bb8db04c1cb10af6c06d0f_images_image-7d3304ed-f96f-41ab-b19f-07c9dda5a750.png'

function flood(setFn, x, y, seen) {
  const pts = []
  const stack = [[x, y]]
  while (stack.length) {
    const [cx, cy] = stack.pop()
    const k = `${cx},${cy}`
    if (seen.has(k)) continue
    if (!setFn(cx, cy, k)) continue
    seen.add(k)
    pts.push([cx, cy])
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
  return pts
}

function traceBoundary(test, W, H) {
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
  for (let step = 0; step < 10000; step++) {
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

function simplify(path, tolerance = 0.8) {
  if (path.length < 3) return path
  function perpDist(p, a, b) {
    const [x, y] = p
    const [x1, y1] = a
    const [x2, y2] = b
    const dx = x2 - x1
    const dy = y2 - y1
    if (!dx && !dy) return Math.hypot(x - x1, y - y1)
    return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / Math.hypot(dx, dy)
  }
  function rdp(pts) {
    if (pts.length < 3) return pts
    let maxD = 0
    let idx = 0
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpDist(pts[i], pts[0], pts[pts.length - 1])
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (maxD > tolerance) {
      const a = rdp(pts.slice(0, idx + 1))
      const b = rdp(pts.slice(idx))
      return a.slice(0, -1).concat(b)
    }
    return [pts[0], pts[pts.length - 1]]
  }
  const chunk = Math.max(20, Math.floor(path.length / 8))
  let result = path
  for (let iter = 0; iter < 2; iter++) {
    const next = []
    for (let i = 0; i < result.length; i += chunk) {
      const seg = result.slice(i, i + chunk + 1)
      if (seg.length < 2) continue
      const simp = rdp(seg)
      next.push(...(next.length ? simp.slice(1) : simp))
    }
    if (next.length > 12) result = next
  }
  return result
}

function toPathD(path) {
  const s = simplify(path, 0.6)
  let d = `M ${s[0][0]} ${s[0][1]}`
  for (let i = 1; i < s.length; i++) d += ` L ${s[i][0]} ${s[i][1]}`
  return `${d} Z`
}

function normalize(paths, padding = 2) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const path of paths) {
    for (const [x, y] of path) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding
  const w = maxX - minX
  const h = maxY - minY
  const scale = 100 / Math.max(w, h)
  const nx = (100 - w * scale) / 2
  const ny = (100 - h * scale) / 2
  const map = ([x, y]) => [
    +((x - minX) * scale + nx).toFixed(2),
    +((y - minY) * scale + ny).toFixed(2),
  ]
  return {
    scale,
    map,
    bubble: paths[0].map(map),
    u: paths[1].map(map),
    sparkCenter: paths[2],
  }
}

const { data, info } = await sharp(whiteRef).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels } = info
const px = (x, y) => {
  const i = (y * W + x) * channels
  return [data[i], data[i + 1], data[i + 2]]
}
const bg = px(10, 10)
const isBg = (c) => Math.hypot(c[0] - bg[0], c[1] - bg[1], c[2] - bg[2]) < 28
const isWhite = (c) => !isBg(c) && c[0] > 200 && c[1] > 220

const whiteSeen = new Uint8Array(W * H)
const components = []
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x
    if (whiteSeen[idx] || !isWhite(px(x, y))) continue
    const seen = new Set()
    const pts = flood(
      (cx, cy, k) => {
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) return false
        const i = cy * W + cx
        if (whiteSeen[i]) return false
        if (!isWhite(px(cx, cy))) return false
        whiteSeen[i] = 1
        return true
      },
      x,
      y,
      seen
    )
    components.push(pts)
  }
}
components.sort((a, b) => b.length - a.length)
const logoWhite = new Set(components[0].map(([x, y]) => `${x},${y}`))
const isLogoWhite = (x, y) => logoWhite.has(`${x},${y}`)

const exterior = new Set()
for (let x = 0; x < W; x++) {
  for (const y of [0, H - 1]) {
    if (!isBg(px(x, y))) continue
    flood(
      (cx, cy, k) => {
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) return false
        if (exterior.has(k)) return false
        if (!isBg(px(cx, cy))) return false
        exterior.add(k)
        return true
      },
      x,
      y,
      new Set()
    )
  }
}
for (let y = 0; y < H; y++) {
  for (const x of [0, W - 1]) {
    if (!isBg(px(x, y))) continue
    flood(
      (cx, cy, k) => {
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) return false
        if (exterior.has(k)) return false
        if (!isBg(px(cx, cy))) return false
        exterior.add(k)
        return true
      },
      x,
      y,
      new Set()
    )
  }
}

const isHole = (x, y) => isBg(px(x, y)) && !exterior.has(`${x},${y}`)

const holeSeen = new Set()
const holes = []
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const k = `${x},${y}`
    if (holeSeen.has(k) || !isHole(x, y)) continue
    const seen = new Set()
    const pts = flood(
      (cx, cy, kk) => {
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) return false
        if (holeSeen.has(kk)) return false
        if (!isHole(cx, cy)) return false
        holeSeen.add(kk)
        return true
      },
      x,
      y,
      seen
    )
    if (pts.length > 8) holes.push(pts)
  }
}
holes.sort((a, b) => b.length - a.length)

const outer = traceBoundary((x, y) => isLogoWhite(x, y), W, H)
const uHole = holes[0] // largest hole = u
const ringHole = holes.find((h) => h.length < 400 && h.length > 20) ?? holes[1]

const uSet = new Set(uHole.map(([x, y]) => `${x},${y}`))
const uBoundary = traceBoundary((x, y) => uSet.has(`${x},${y}`), W, H)

// spark center from ring hole centroid
const ringPts = ringHole ?? []
let rcx = 0
let rcy = 0
for (const [x, y] of ringPts) {
  rcx += x
  rcy += y
}
rcx /= ringPts.length || 1
rcy /= ringPts.length || 1

// spark outer radius from white ring around hole
let sparkR = 0
for (const [x, y] of ringPts) {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    if (isLogoWhite(x + dx, y + dy)) {
      sparkR = Math.max(sparkR, Math.hypot(x + dx - rcx, y + dy - rcy))
    }
  }
}
if (!sparkR) sparkR = 14

const norm = normalize([outer, uBoundary], 3)
const [scx, scy] = norm.map([rcx, rcy])
const sparkOuter = +(sparkR * norm.scale).toFixed(2)
const sparkInner = +(sparkOuter * 0.58).toFixed(2)

const out = {
  bubble: toPathD(norm.bubble),
  u: toPathD(norm.u),
  spark: { cx: scx, cy: scy, outer: sparkOuter, inner: sparkInner },
}

fs.writeFileSync('scripts/logo-paths.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
