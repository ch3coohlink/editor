await require('../common/basic.js')

const cvs = document.createElement('canvas')
document.body.append(cvs)
const fitcvs = (c = cvs, r = window.devicePixelRatio) => (
  c.width = c.clientWidth * r, c.height = c.clientHeight * r)
new ResizeObserver(() => fitcvs()).observe(cvs)
cvs.style.width = cvs.style.height = "100%"

// const adapter = await navigator.gpu.requestAdapter()
// const device = await adapter.requestDevice()
// const ctx = cvs.getContext("webgpu")
// const format = navigator.gpu.getPreferredCanvasFormat()
// ctx.configure({ device, format })

const ctx = cvs.getContext('2d')

// create octree data structure
// 01234567
// each node has seven child
const exampleformat = `
OctreeNode {
  uint childdata
}
ChildNode {
  OctreeNode[8] child
}
LeafNode {
  // anything
}
EmptyNode {
  // anything
}
`
const structure = des => { }

const a = new Uint32Array

const gen = (node = [], level = 0) => {
  for (let i = 0; i < 4; i++) {
    node[i] = []
    if (Math.random() < 0.7 && level < 5) {
      gen(node[i], level + 1)
    }
  } return node
}

const ms = 500, msd2 = ms * 0.5
const mapsize = (x, y) => [
  x * (cvs.width - ms), y * (cvs.height - ms)]
const mapcoord = (x, y) => mapsize(x, y).map(v => v + msd2)

const drawquadtree = (node, x = 0, y = 0, s = 1) => {
  if (!node) { return } const sd2 = s * 0.5
  ctx.strokeRect(...mapcoord(x, y), ...mapsize(s, s))
  drawquadtree(node[0], x, y, sd2)
  drawquadtree(node[1], x + sd2, y, sd2)
  drawquadtree(node[2], x, y + sd2, sd2)
  drawquadtree(node[3], x + sd2, y + sd2, sd2)
}
const drawpoint = (x, y) => {
  ctx.beginPath()
  ctx.arc(...mapcoord(x, y), 4, 0, Math.PI * 2)
  ctx.fill()
}
const drawray = (ox, oy, dx, dy) => {
  const ex = ox + dx * 100
  const ey = oy + dy * 100

  drawpoint(ox, oy)

  ctx.beginPath()
  ctx.moveTo(...mapcoord(ox, oy))
  ctx.lineTo(...mapcoord(ex, ey))
  ctx.stroke()
}

let ray = [Math.random(), Math.random(),
Math.random() * 2 - 1, Math.random() * 2 - 1]
let root = gen()
const testhit = (ray, root) => {
  const [ox, oy, dx, dy] = ray
  if (ox < 0 || ox > 1 || oy < 0 || oy > 1) { }
  else { }
}
const raybox = (ox, oy, dx, dy, bx, by, bs) => {
  const bmx = bx + bs, bmy = by + bs
  const tminx = (bx - ox) / dx, tminy = (by - oy) / dy
  const tmaxx = (bmx - ox) / dx, tmaxy = (bmy - oy) / dy
  const t1x = Math.min(tminx, tmaxx), t1y = Math.min(tminy, tmaxy)
  const t2x = Math.max(tminx, tmaxx), t2y = Math.max(tminy, tmaxy)
  const tnear = Math.max(t1x, t1y), trear = Math.min(t2x, t2y)
  if (tnear < trear) {
    if (0 < tnear) { return tnear }
    else if (0 < trear) { return trear }
  }
}

const gradient = i =>
  `hsl(${Math.floor(i / counter * 360)}deg 100% 50%)`
let counter = 0, rectarray = [], pointarray = []
const traversal = (ray, bx, by, bs, node) => {
  let hit = raybox(...ray, bx, by, bs)

  if (hit) {
    let i = counter++, [ox, oy, dx, dy] = ray
    rectarray.push([i, ...mapcoord(bx, by), ...mapsize(bs, bs)])
    pointarray.push([i, ox + hit * dx, oy + hit * dy])
    if (node.isleaf) {
      return hit
    } else if (node.isempty) {
      // step node size
    } else {
      let minhit = Infinity, sd2 = bs * 0.5
      const _travelsal = (n, ...a) => {
        if (!n) { return }
        let hit = traversal(...a, n)
        if (hit && hit < minhit) { minhit = hit }
      }
      _travelsal(node[0], ray, bx, by, sd2)
      _travelsal(node[1], ray, bx + sd2, by, sd2)
      _travelsal(node[2], ray, bx, by + sd2, sd2)
      _travelsal(node[3], ray, bx + sd2, by + sd2, sd2)
      // if (minhit < Infinity) { return minhit }
    } return hit
  } // no hit
}

const traversalonetime = () => {
  counter = 0, rectarray = [], pointarray = [], step = 0
  traversal(ray, 0, 0, 1, root)
}
setTimeout(traversalonetime, 100);

let step = 0
cvs.onpointerdown = e => {
  if (e.button === 0) {
    if (e.shiftKey) { step-- }
    else { step++ }
  } else if (e.button === 1) {
    root = gen()
    traversalonetime()
  } else if (e.button === 2) {
    ray = [Math.random(), Math.random(),
    Math.random() * 2 - 1, Math.random() * 2 - 1]
    traversalonetime()
  }
}
cvs.oncontextmenu = e => e.preventDefault()

const loop = t => {
  requestAnimationFrame(loop)
  t /= 1000

  ctx.fillStyle = 'red'
  ctx.strokeStyle = 'black'
  ctx.clearRect(0, 0, cvs.width, cvs.height)
  drawquadtree(root)
  drawray(...ray)

  let l = step % pointarray.length
  if (step < 0) { l = pointarray.length + l }
  for (let k = 0; k < l; k++) {
    let [i, ...a] = rectarray[k]
    ctx.strokeStyle = gradient(i)
    ctx.strokeRect(...a)
  }
  for (let k = 0; k < l; k++) {
    let [i, ...a] = pointarray[k]
    // ctx.fillStyle = gradient(i)
    drawpoint(...a)
  }

}; requestAnimationFrame(loop)