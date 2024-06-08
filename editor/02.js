// 02.js - basic forced direct graph layout

{
  let hexenc = b => [...b].map(v => v.toString(16).padStart(2, '0')).join("")
  $.uuid = (d = 32) => hexenc(crypto.getRandomValues(new Uint8Array(d)))
  let { imul } = Math, mb32 = a => t =>
    (a = a + 1831565813 | 0,
      t = imul(a ^ a >>> 15, 1 | a),
      t = t + imul(t ^ t >>> 7, 61 | t) ^ t,
      (t ^ t >>> 14) >>> 0) / 4294967296
  $.genrd = (seed, _rd = mb32(seed)) => {
    let { log, cos, sqrt, ceil, PI } = Math
    let rd = (a = 1, b) => (b ? 0 : (b = a, a = 0), _rd() * (b - a) + a)
    let rdi = (a, b) => ceil(rd(a, b))
    let gaussian = (mean = 0, stdev = 1) => {
      let u = 1 - rd(), v = rd()
      let z = sqrt(-2.0 * log(u)) * cos(2.0 * PI * v)
      return z * stdev + mean
    } // Standard Normal variate using Box-Muller transform
    return { rd, rdi, gaussian }
  }
}

const cvs = document.createElement('canvas')
cvs.style.imageRendering = 'pixelated'
document.body.append(cvs)
new ResizeObserver(() => {
  const w = document.body.clientWidth, h = document.body.clientHeight
  let r = window.devicePixelRatio, changed = false
  const wr = Math.floor(w * r), hr = Math.floor(h * r)
  if (cvs.width !== wr) { changed = true, cvs.width = wr }
  if (cvs.height !== hr) { changed = true, cvs.height = hr }
  cvs.style.width = (wr / r) + 'px'
  cvs.style.height = (hr / r) + 'px'
  if ($.createtexture && changed) { createtexture() }
}).observe(document.body)
const ctx = cvs.getContext('2d')

const time = {
  current: 0, delta: 0, maxdelta: 1 / 60,
  now: () => performance.now() / 1000,
}

const frame = t => {
  let pt = time.current, ct = time.current = t / 1000
  time.delta = Math.min(ct - pt, time.maxdelta)
  time.delta = time.maxdelta * 2
  // if (time.current % 1 < time.maxdelta) { console.clear() } else { log(time.current) }
  loop()
  requestAnimationFrame(frame)
}; requestAnimationFrame(frame)

// ----------------------------------------------------------------------------
const graph = ($ = { g: {}, i: 0 }) => {
  with ($) {
    $.addnode = (id = i++) => (g[id] = { id, to: {}, from: {} }, id)
    $.delnode = (id) => { delete g[id] }
    $.addedge = (a, b) => { g[a].to[b] = g[b], g[b].from[a] = g[a] }
    $.deledge = (a, b) => { delete g[a].to[b], delete g[b].from[a] }
  } return $
}

// const { rd } = genrd('今日もいい天気')
const { rd, gaussian } = genrd(0, Math.random)
const newpos = (n, d = n.data) => {
  d.pos = { x: rd(-1, 1) * 100, y: rd(-1, 1) * 100 }
  d.vec = { x: 0, y: 0 }, d.acc = { x: 0, y: 0 }
  d.mat = 1, d.ecc = 1; return n
}
const layout = g => {
  const ns = [], es = []; g = g.g; for (const k in g) {
    const n = g[k]; if (!n.data) { n.data = {} } const d = n.data
    if (!d.pos) { newpos(n) }
    ns.push(n), es.push(...Object.keys(n.to).map((k, i) => [n, n.to[k]]))
  }

  const { sqrt, max, min, sign, abs } = Math
  const electric = (b, p, ad, ap, m = 0.01) => {
    const bd = b.data, bp = bd.pos
    const pdx = bp.x - ap.x, pdy = bp.y - ap.y
    const lsq = max(pdx * pdx + pdy * pdy, m), l = sqrt(lsq)
    const f = ad.ecc * bd.ecc / lsq * p / l
    const fx = f * pdx, fy = f * pdy
    ad.acc.x += fx / ad.mat, ad.acc.y += fy / ad.mat
    bd.acc.x -= fx / bd.mat, bd.acc.y -= fy / bd.mat
  }
  const hooke = (b, p, ad, ap) => {
    const bd = b.data, bp = bd.pos
    const pdx = bp.x - ap.x, pdy = bp.y - ap.y
    const fx = p * pdx, fy = p * pdy
    ad.acc.x += fx / ad.mat, ad.acc.y += fy / ad.mat
    bd.acc.x -= fx / bd.mat, bd.acc.y -= fy / bd.mat
  }
  const gravity = newpos({ data: {} })
  gravity.data.pos.x = gravity.data.pos.y = 0
  for (let i = 0, l = ns.length; i < l; i++) {
    const a = ns[i], ad = a.data, ap = ad.pos;
    for (let j = i + 1; j < l; j++) { electric(ns[j], -(10000 ** 2), ad, ap) }
    for (const k in a.to) { hooke(a.to[k], 1, ad, ap) }
    hooke(gravity, 1, ad, ap)
    ad.vec.x += ad.acc.x * time.delta
    ad.vec.y += ad.acc.y * time.delta
    ad.vec.x = sign(ad.vec.x) * max(min(abs(ad.vec.x), 1000) - 200 * time.delta, 0)
    ad.vec.y = sign(ad.vec.y) * max(min(abs(ad.vec.y), 1000) - 200 * time.delta, 0)
    ap.x += ad.vec.x * time.delta
    ap.y += ad.vec.y * time.delta
  }

  ctx.resetTransform()
  const w = cvs.width, h = cvs.height, s = 1 / 4
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, w, h)
  ctx.setTransform(s, 0, 0, -s, w * 0.5, h * 0.5)
  ctx.fillStyle = ctx.strokeStyle = 'black'
  ctx.lineWidth = 1 / s

  for (const n of ns) {
    const { x, y } = n.data.pos
    ctx.beginPath(), ctx.arc(x, y, 5 / s, 0, 2 * Math.PI), ctx.fill()
    for (const k in n.to) {
      const bp = n.to[k].data.pos
      ctx.beginPath(), ctx.moveTo(x, y)
      ctx.lineTo(bp.x, bp.y), ctx.stroke()
    }
  }
  ctx.strokeStyle = 'red'
  for (const n of ns) {
    const { x, y } = n.data.pos, r = 0.1
    ctx.beginPath(), ctx.moveTo(x, y)
    ctx.lineTo(x + n.data.acc.x * r, y + n.data.acc.y * r), ctx.stroke()
    n.data.acc.x = n.data.acc.y = 0
  }
  ctx.strokeStyle = 'green'
  for (const n of ns) {
    const { x, y } = n.data.pos, r = 1
    ctx.beginPath(), ctx.moveTo(x, y)
    ctx.lineTo(x + n.data.vec.x * r, y + n.data.vec.y * r), ctx.stroke()
  }
}

// {
//   const { rd } = genrd('corona extra')
//   const g = graph()
//   const a = g.addnode()
//   const b = g.addnode()
//   const c = g.addnode()
//   const d = g.addnode()
//   const e = g.addnode()
//   g.addedge(a, b)
//   g.addedge(a, d)
//   g.addedge(b, c)
//   g.addedge(c, a)
//   g.addedge(e, c)
//   $.loop = () => { layout(g) }
// }

{
  const { floor, abs } = Math
  const g = graph(), ids = [], l = 100
  for (let i = 0; i < l; i++) { ids.push(g.addnode()) }
  for (let i = 0; i < l; i++) {
    let r = floor(abs(gaussian(0, 2))) + rd() > 0.5 ? 1 : 0
    const a = ids[i], s = [...ids]
    for (let j = 0; j < r && s.length > 0; j++)
      g.addedge(a, s.splice(floor(rd(s.length)), 1)[0])
  } $.loop = () => { layout(g) }
}