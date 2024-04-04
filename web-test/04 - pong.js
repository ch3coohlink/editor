//# sourceURL=7bF10sAz0.js
await require("../common/basic.js")
const _now = performance.now.bind(performance)
const now = () => _now() * 0.001

const cvs = document.createElement('canvas')
document.body.append(cvs)
new ResizeObserver(() => {
  const w = document.body.clientWidth, h = document.body.clientHeight
  const r = window.devicePixelRatio
  const wr = Math.floor(w * r), hr = Math.floor(h * r)
  let changed = false
  if (cvs.width !== wr) { changed = true, cvs.width = wr }
  if (cvs.height !== hr) { changed = true, cvs.height = hr }
  cvs.style.width = (wr / r) + 'px'
  cvs.style.height = (hr / r) + 'px'
  if ($.createtexture && changed) { createtexture(), clear = 1 }
}).observe(document.body)
const ctx = cvs.getContext('2d')

// ============================================================================
const sign = n => n < 0 ? -1 : 1

function collides(obj1, obj2) {
  return obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y;
}

const collsion_circle_aabb = (a, b) => {
  // const ba = [a.p[0] - b.p[0], a.p[1] - b.p[1]]
  // const ca = [sign(ba[0]) * b.s[0] - ba[0], sign(ba[1]) * b.s[1] - ba[1]]
  // const mina
  const minb = [b.p[0] - b.s[0], b.p[1] - b.s[1]]
  const maxb = [b.p[0] + b.s[0], b.p[1] + b.s[1]]
  let d = 0, e
  for (let i = 0; i < 2; i++) {
    if (a.p[i] < min[i]) {
      e = a.p[i] - min[i]
    } else if (a.p[i] > max[i]) {
      e = a.p[i] - max[i]
    } d += e * e
  } return d <= a.r
}
const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
const hypot2 = (a, b) => dot(sub(a, b), sub(a, b))
const proj = (a, b, k = dot(a, b) / dot(b, b)) => [k * b[0], k * b[1]]

const dist = a => Math.sqrt(a[0] * a[0] + a[1] * a[1])
const collsion_circle_line = (a, b) => {
  const d = [
    dist([a.p[0] - b[0][0], a.p[1] - b[0][1]]),
    dist([a.p[0] - b[1][0], a.p[1] - b[1][1]]),
  ], l = dist([b[0][0] - b[1][0], b[0][1] - b[1][1]])
  return Math.abs(d[0] + d[1] - l) < 0.1
}
const collsion_circle_border_aabb = (a, b) => {
  let c = b.c === 'inside', d = c ? a.r : -a.r
  const lf = b.p[0] - b.s[0] + d, rt = b.p[0] + b.s[0] - d
  const bt = b.p[1] - b.s[1] + d, tp = b.p[1] + b.s[1] - d
  if (c) {
    if (a.p[0] < lf) { a.p[0] = lf; a.v[0] *= -1 }
    if (a.p[0] > rt) { a.p[0] = rt; a.v[0] *= -1 }
    if (a.p[1] < bt) { a.p[1] = bt; a.v[1] *= -1 }
    if (a.p[1] > tp) { a.p[1] = tp; a.v[1] *= -1 }
  } else {
    if (lf < a.p[0] && a.p[0] < rt && bt < a.p[1] && a.p[1] < tp) {
      const s = Math.abs(a.p[0] - b.p[0]) / b.s[0] * b.s[1] > Math.abs(a.p[1] - b.p[1])
      if (s) { a.p[0] = a.p[0] < b.p[0] ? lf : rt; a.v[0] *= -1 }
      else { a.p[1] = a.p[1] < b.p[1] ? bt : tp; a.v[1] *= -1 }
    }
  }
}
const physics = () => {
  ball.p[0] += ball.v[0] * time.dt
  ball.p[1] += ball.v[1] * time.dt
  collsion_circle_border_aabb(ball, padleft)
  collsion_circle_border_aabb(ball, padright)
  collsion_circle_border_aabb(ball, world)
}
const drawcircle = circle => {
  ctx.beginPath()
  ctx.moveTo(circle.p[0], circle.p[1])
  ctx.arc(...circle.p, circle.r, 0, Math.PI * 2)
  ctx.closePath
  ctx.fill()
}
const drawbox = box => {
  const min = [box.p[0] - box.s[0], box.p[1] - box.s[1]]
  ctx.fillRect(...min, box.s[0] * 2, box.s[1] * 2)
}
const drawborder = box => {
  const min = [box.p[0] - box.s[0], box.p[1] - box.s[1]]
  ctx.strokeRect(...min, box.s[0] * 2, box.s[1] * 2)
}
const draw = () => {
  ctx.resetTransform()
  const w = cvs.width, h = cvs.height
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, w, h)
  ctx.setTransform(1, 0, 0, -1, w * 0.5, h * 0.5)
  ctx.fillStyle = ctx.strokeStyle = 'white'
  drawbox(padleft)
  drawbox(padright)
  drawborder(world)
  ctx.fillStyle = 'red'
  drawcircle(ball)
}

// ============================================================================
const ball = { p: [0, 0], v: [1000, 1000], m: 1, r: 10 }
const padsize = [10, 100]
const padleft = { p: [-500, 0], s: [...padsize] }
const padright = { p: [500, 0], s: [...padsize] }
const world = { p: [0, 0], s: [600, 400], c: 'inside' }

const mft = 1 / 60, time = { pt: now() }
const loop = t => {
  time.nt = t * 0.001
  time.dt = Math.min(time.pt - time.nt, mft)
  time.pt = time.nt
  physics()
  draw()
  requestAnimationFrame(loop)
}; requestAnimationFrame(loop)