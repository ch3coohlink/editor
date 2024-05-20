// 04.js - moving to svg
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
  let { max, min } = Math; $.clamp = (v, s, l) => max(min(v, l), s)
  $.dom = n => document.createElement(n)
  $.svg = n => document.createElementNS('http://www.w3.org/2000/svg', n)
} { // time & frame
  $.time = { current: 0, delta: 0, maxdelta: 1 / 60 }
  time.now = () => performance.now() / 1000
  const frame = t => {
    let pt = time.current, ct = time.current = t / 1000
    time.realdelta = Math.min(ct - pt, time.maxdelta)
    time.delta = time.maxdelta * 3
    requestAnimationFrame(frame); loop()
  }; requestAnimationFrame(frame)
} { // global pointer event
  let fs = [], mfs = new Set
  let u = e => { for (const f of fs) { f(e) } fs = [] }
  let m = e => { for (const f of mfs) { f(e) } }
  $.listenpointerdown = (e, f) => (
    e.addEventListener('mousedown', f),
    e.addEventListener('touchstart', f))
  $.listenpointerup = f => fs.push(f)
  $.listenpointermove = f => mfs.add(f)
  $.stoplistenmove = f => mfs.delete(f)
  window.addEventListener('mouseup', u)
  window.addEventListener('touchend', u)
  window.addEventListener('mousemove', m)
  window.addEventListener('touchmove', m)
}

// ----------------------------------------------------------------------------
$.graph = ($ = { g: {}, i: 0 }) => {
  with ($) {
    $.addnode = (id = i++) => {
      g[id] = { id, to: {}, from: {}, nto: 0, nfrom: 0 }
      newnodeelm(g[id]); return id
    }; $.delnode = (id, n = g[id]) => {
      for (const k in n.to) { deledge(id, k) } delete g[id]
      for (const k in n.from) { deledge(k, id) } n.elm.remove()
    }; $.addedge = (a, b) => {
      g[a].to[b] = { o: g[b] }, g[b].from[a] = g[a]
      g[a].nto++, g[b].nfrom++, newedgeelm(g[a], g[b])
    }; $.deledge = (a, b) => {
      g[a].to[b].elm.remove(), g[a].nto--, g[b].nfrom--
      delete g[a].to[b], delete g[b].from[a]
    }
  } return $
}
$.spawnrange = 200
$.newpos = (n, d = n.data) => {
  d.pos = { x: rd(-1, 1) * spawnrange, y: rd(-1, 1) * spawnrange }
  d.vec = { x: 0, y: 0 }, d.acc = { x: 0, y: 0 }
  d.mat = 1, d.ecc = 1; return n
}
$.layout = ns => {
  const { sqrt, max, min, sign, abs } = Math
  const electric = (b, p, ad, ap, m = 1) => {
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
  const gravity = newpos({ data: {} }); total_speed = 0
  gravity.data.pos.x = gravity.data.pos.y = 0
  let tl = target_length, ts = target_speed
  let ep = -(tl ** 2) * ts, ed = 1 / tl * ts * 20
  for (let i = 0, l = ns.length; i < l; i++) {
    const a = ns[i], ad = a.data, ap = ad.pos
    for (let j = i + 1; j < l; j++) { electric(ns[j], ep, ad, ap) }
    for (const k in a.to) { distance(a.to[k].o, ed / a.nto, ad, ap) }
    if (ad.hardlock) { ad.vec.x = ad.vec.y = 0; continue }
    distance(gravity, 0.05 * ed, ad, ap)
    let vx = ad.vec.x + ad.acc.x * time.delta
    let vy = ad.vec.y + ad.acc.y * time.delta
    let v = sqrt(vx * vx + vy * vy), vrx = vx / v, vry = vy / v
    total_speed += v = max(min(v, ts) - ts * friction, 0)
    ad.vec.x = vx = v * vrx, ad.vec.y = vy = v * vry
    if (ad.lock) { ad.vec.x = ad.vec.y = 0; continue }
    ap.x += vx * time.delta, ap.y += vy * time.delta
    ad.oldacc = { ...ad.acc }, ad.acc.x = ad.acc.y = 0
  }
}
$.target_length = 125, $.target_speed = 250, $.friction = 0.01
$.draw = ns => {
  const w = se.clientWidth, h = se.clientHeight
  const x = w / 2 + camera.x, y = h / 2 + camera.y
  const transtr = `translate(${sorigin.x}, ${sorigin.y}) scale(${camera.s}) translate(${x}, ${y})`
  sep.setAttribute('transform', transtr)
  sen.setAttribute('transform', transtr)
  for (const n of ns) {
    const { x, y } = n.data.pos, e = n.elm
    e.setAttribute('cx', x), e.setAttribute('cy', y)
    // e.setAttribute('r', (circlesize / camera.s) + 'px')
    for (const k in n.to) {
      const b = n.to[k], bp = b.o.data.pos, e = b.elm
      e.setAttribute('d', `M ${x} ${y} L ${bp.x} ${bp.y}`)
      // e.setAttribute('stroke-width', linewidth / camera.s + 'px')
    }
  }
}
$.total_speed = 0, $.total_accelaration = 0, $.stop = false
$.loop = () => {
  const ns = [], _g = g.g; for (const k in _g) {
    const n = _g[k]; if (!n.data) { n.data = {} } const d = n.data
    if (!d.pos) { newpos(n) } ns.push(n)
  } if (!stop) { layout(ns); layouttime += time.realdelta } draw(ns)
  if (total_speed === 0) { if (!stop) { log('end in: ' + layouttime.toFixed(3) + 's') } stop = true }
}
$.camera = { x: 0, y: 0, s: 1 }
$.sorigin = { x: 0, y: 0 } // scale origin
$.screen2svgcoord = (c = camera) => (x, y) => {
  const { left, top } = se.getBoundingClientRect()
  const w = se.clientWidth, h = se.clientHeight
  x = (x - left - sorigin.x) / camera.s - (c.x + w / 2)
  y = (y - top - sorigin.y) / camera.s - (c.y + h / 2)
  return { x, y }
}

const sty = dom('style'); sty.innerHTML =
  `svg circle:hover { fill: red; }` +
  `svg { touch-action: none; }`
$.se = svg('svg'); document.body.append(se)
se.style.display = 'block', se.style.height = se.style.width = '100%'
$.sep = svg('g'), $.sen = svg('g'); se.append(sep, sen, sty)
listenpointerdown(se, e => {
  if (e.target !== se) { return }
  const c = { ...camera }, s = screen2svgcoord(c)
  const o = s(...geteventlocation(e)), m = e => {
    if (e.touches && e.touches.length > 2) { return a_run() }
    if (e.touches && e.touches.length === 2) { return pinch(e) }
    const { x, y } = s(...geteventlocation(e))
    camera.x = c.x + x - o.x, camera.y = c.y + y - o.y
  }; listenpointermove(m), listenpointerup(() => (
    ipd = false, stoplistenmove(m)))
})
$.ipd = false // inital pinch distance
$.pinch = e => {
  let a = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  let b = { x: e.touches[1].clientX, y: e.touches[1].clientY }
  let d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
  if (ipd === false) { ipd = d }
  if (d === ipd) { return } const r = d / ipd; ipd = d
  zoom([(a.x + b.x) / 2, (a.y + b.y) / 2], r)
}
se.addEventListener('wheel', (e, r = 1.2) => e.deltaY < 0
  ? zoom(geteventlocation(e), r) : zoom(geteventlocation(e), 1 / r))
$.zoom = ([x, y], f, s) => (s = camera.s,
  camera.s = s * f, f = camera.s / s,
  sorigin.x = x - (x - sorigin.x) * f,
  sorigin.y = y - (y - sorigin.y) * f)
$.circlesize = 7, $.linewidth = 1
$.newnodeelm = n => {
  const c = svg('circle')
  c.setAttribute('fill', 'black')
  c.setAttribute('r', circlesize + 'px')
  listenpointerdown(c, e => {
    if (e.target !== c) { return } const m = e => {
      if (e.touches && e.touches.length > 1) { return }
      c.setAttribute('fill', 'red')
      const { x, y } = screen2svgcoord()(...geteventlocation(e))
      n.data.pos.x = x, n.data.pos.y = y, n.data.lock = true
      stop = false, layouttime = 0
    }; listenpointermove(m), listenpointerup(() => (
      c.setAttribute('fill', 'black'),
      delete n.data.lock, stoplistenmove(m)))
  })
  n.elm = c, sen.append(c)
}
$.newedgeelm = (a, b) => {
  const p = svg('path')
  p.setAttribute('stroke', 'black')
  p.setAttribute('stroke-width', linewidth + 'px')
  a.to[b.id].elm = p, sep.append(p)
}
$.geteventlocation = e => e.touches && e.touches.length == 1 ?
  [e.touches[0].pageX, e.touches[0].pageY] : [e.pageX, e.pageY]

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

let seed = Math.floor(4294967296 * Math.random())
$.drawforce = false, $.startseed = seed
const a_run = () => {
  console.clear(); log('startseed: ' + startseed, 'seed: ' + seed)
  const grd = genrd(seed), base = 25
  sep.innerHTML = sen.innerHTML = ''
  $.rd = grd.rd, $.gaussian = grd.gaussian, $.rdi = grd.rdi
  $.g = gengraph(Math.floor(Math.abs(gaussian() * base) + rdi(base) + 5))
  stop = false, $.layouttime = 0
  seed = Math.floor(4294967296 * rd())
  // setTimeout(a_run, 60 / 185 * 1000 * rdi(0, 3))
}; a_run()

window.onkeydown = () => { a_run() }