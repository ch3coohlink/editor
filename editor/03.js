// 03.js - graph layout parameter tweaking
//# sourceURL=7bF10sAz0.js

{ // basic
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
} { // canvas
  $.cvs = document.createElement('canvas')
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
  $.ctx = cvs.getContext('2d')
} { // time & frame
  $.time = { current: 0, delta: 0, maxdelta: 1 / 60 }
  time.now = () => performance.now() / 1000
  const frame = t => {
    let pt = time.current, ct = time.current = t / 1000
    time.delta = Math.min(ct - pt, time.maxdelta)
    time.delta = time.maxdelta * 3
    requestAnimationFrame(frame); loop()
  }; requestAnimationFrame(frame)
}

// ----------------------------------------------------------------------------
$.graph = ($ = { g: {}, i: 0 }) => {
  with ($) {
    $.addnode = (id = i++) => (g[id] = { id, to: {}, from: {} }, id)
    $.delnode = (id, n = g[id]) => {
      for (const k in n.to) { delete g[k].from[id] } delete g[id]
      for (const k in n.from) { delete g[k].to[id] }
    }; $.addedge = (a, b) => { g[a].to[b] = g[b], g[b].from[a] = g[a] }
    $.deledge = (a, b) => { delete g[a].to[b], delete g[b].from[a] }
  } return $
}
$.newpos = (n, d = n.data) => {
  d.pos = { x: rd(-1, 1) * 100, y: rd(-1, 1) * 100 }
  d.vec = { x: 0, y: 0 }, d.acc = { x: 0, y: 0 }
  d.mat = 1, d.ecc = 1; return n
}
$.layout = ns => {
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
  const distance = (b, p, ad, ap) => {
    const bd = b.data, bp = bd.pos
    const pdx = bp.x - ap.x, pdy = bp.y - ap.y
    const fx = p * pdx, fy = p * pdy
    ad.acc.x += fx / ad.mat, ad.acc.y += fy / ad.mat
    bd.acc.x -= fx / bd.mat, bd.acc.y -= fy / bd.mat
  }
  const gravity = newpos({ data: {} })
  gravity.data.pos.x = gravity.data.pos.y = 0
  let total_accelaration = 0, lts = total_speed / ns.length; total_speed = 0
  for (let i = 0, l = ns.length; i < l; i++) {
    const a = ns[i], ad = a.data, ap = ad.pos
    const tl = target_length, ts = target_speed
    const ep = -(tl ** 2) * ts, ed = 1 / tl * ts
    for (let j = i + 1; j < l; j++) { electric(ns[j], ep, ad, ap) }
    for (const k in a.to) { distance(a.to[k], ed, ad, ap) }
    distance(gravity, 0.2 * ed, ad, ap)
    total_accelaration += sqrt(ad.acc.x ** 2 + ad.acc.y ** 2)
    let vx = ad.vec.x + ad.acc.x * time.delta
    let vy = ad.vec.y + ad.acc.y * time.delta
    let v = sqrt(vx * vx + vy * vy), vrx = vx / v, vry = vy / v
    total_speed += v = max(min(v, ts) - ts * friction * time.delta, 0)
    ad.vec.x = vx = v * vrx, ad.vec.y = vy = v * vry
    ap.x += vx * time.delta, ap.y += vy * time.delta
  } log('average speed', total_speed / ns.length,
    'average acc', total_accelaration / ns.length, target_speed)
}
// $.target_length = 300, $.target_speed = 10000, $.friction = 2.2 // very fast
$.target_length = 300, $.target_speed = 1000, $.friction = 1.2 // slower, better quality
$.draw = ns => {
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
    } n.data.oldacc = { ...n.data.acc }
    n.data.acc.x = n.data.acc.y = 0
  }
  if (!drawforce) { return }
  ctx.strokeStyle = 'red'
  for (const n of ns) {
    const { x, y } = n.data.pos, r = .1
    n.data.oldacc.x -= Math.sign(n.data.vec.x) * target_speed * friction
    n.data.oldacc.y -= Math.sign(n.data.vec.y) * target_speed * friction
    ctx.beginPath(), ctx.moveTo(x, y)
    ctx.lineTo(x + n.data.oldacc.x * r, y + n.data.oldacc.y * r), ctx.stroke()
  }
  ctx.strokeStyle = 'green'
  for (const n of ns) {
    const { x, y } = n.data.pos, r = 1
    ctx.beginPath(), ctx.moveTo(x, y)
    ctx.lineTo(x + n.data.vec.x * r, y + n.data.vec.y * r), ctx.stroke()
  }
}
$.total_speed = 0, $.stop = false
$.loop = () => {
  const ns = [], _g = g.g; for (const k in _g) {
    const n = _g[k]; if (!n.data) { n.data = {} } const d = n.data
    if (!d.pos) { newpos(n) } ns.push(n)
  } if (!stop) { layout(ns) } draw(ns)
  if (total_speed === 0) { $.stop = true }
}

$.drawforce = false

let seed
seed = Math.floor(4294967296 * Math.random())
// seed = 6976106454
// seed = 19431502183
// seed = 1859179368
// seed = 3287172346
// seed = 1421229328

const a_run = () => {
  console.clear()
  seed = Math.floor(4294967296 * Math.random())
  const { rd, rdi, gaussian } = genrd(seed); log('seed: ' + seed)
  $.rd = rd
  const gengraph = (l = 10) => {
    const g = graph(), { floor, abs } = Math, ids = []
    for (let i = 0; i < l; i++) { ids.push(g.addnode()) }
    for (let i = 0; i < l; i++) {
      let r = floor(abs(gaussian(0, 2)) * 1) + (rd() > 0.5 ? 1 : 0)
      const a = ids[i], s = [...ids]
      for (let j = 0; j < r && s.length > 0; j++)
        g.addedge(a, s.splice(floor(rd(s.length)), 1)[0])
    } return g
  }
  $.g = gengraph(Math.floor(Math.abs(gaussian() * 10) + 10))
  stop = false
  // setTimeout(a_run, 60 / 185 * 1000 * rdi(0, 3))
}; a_run()

window.onkeydown = () => { a_run() }