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
    if (Math.random() < 0 && level < 1) {
      gen(node[i], level + 1)
    }
  } return node
}

const ms = 500, msd2 = ms * 0.5
const mapsize = (x, y) => [
  x * (cvs.width - ms), y * (cvs.height - ms)]
const mapcoord = (x, y) => mapsize(x, y).map(v => v + msd2)
const revesemap = (x, y) => [
  (x * devicePixelRatio - msd2) / (cvs.width - ms),
  (y * devicePixelRatio - msd2) / (cvs.height - ms)]

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
let raypos = []
const traversal = (ray, bx, by, bs, node) => {
  let [ox, oy, dx, dy] = ray
  if (bx <= ox && ox <= bx + bs && by <= oy && oy <= by + bs) {
    let x = bx + bs * 0.5 < ox, y = by + bs * 0.5 < oy, hit
    if (x && y && node[3]) { hit = traversal(node[3], ray, bx + sd2, by + sd2, sd2) }
    else if (y && node[2]) { hit = traversal(node[2], ray, bx, by + sd2, sd2) }
    else if (x && node[1]) { hit = traversal(node[1], ray, bx + sd2, by, sd2) }
    else if (node[0]) { hit = traversal(node[0], ray, bx, by, sd2) }
    else { }
    if (hit) { return }
    // caululate delat x y for dda
  } else {
    let hit = raybox(...ray, bx, by, bs)
    if (hit) {
      let i = counter++, [ox, oy, dx, dy] = ray
      rectarray.push([i, bx, by, bs])
      pointarray.push([i, ox + hit * dx, oy + hit * dy])
      if (node.isleaf) {
        return hit
      } else if (node.isempty) {
        // step node size
      } else {
        let minhit = Infinity, sd2 = bs * 0.5
        const _traversal = (n, ...a) => {
          if (!n) { return }
          let hit = traversal(...a, n)
          if (hit && hit < minhit) { minhit = hit }
        }
        _traversal(node[0], ray, bx, by, sd2)
        _traversal(node[1], ray, bx + sd2, by, sd2)
        _traversal(node[2], ray, bx, by + sd2, sd2)
        _traversal(node[3], ray, bx + sd2, by + sd2, sd2)
        // if (minhit < Infinity) { return minhit }
      } return hit
    } // no hit
  }
}

const minindex = (x, y, z) => (y < z && y < x) + (z < y && z < x) * 2;
const maxindex = (x, y, z) => (y > z && y > x) + (z > y && z > x) * 2;
const traversalonetime = () => {
  counter = 0, rectarray = [], pointarray = [], step = 0
  // traversal(ray, 0, 0, 1, root)
  let mirrormask = 0
  let [rox, roy, rdx, rdy] = ray
  if(rdx < 0) {
    rox = 1 - rox;
    rdx = -rdx;
    mirrormask |= 1;
  }
  if(rdy < 0) {
    roy = 1 - roy;
    rdy = -rdy;
    mirrormask |= 2;
  }
  let tx0 = (0 - rox) / rdx;
  let ty0 = (0 - roy) / rdy;
  let tx1 = (1 - rox) / rdx;
  let ty1 = (1 - roy) / rdy;
  let txm = (tx0 + tx1) * 0.5;
  let tym = (ty0 + ty1) * 0.5;
  log('0', tx0, ty0,'m', txm, tym, '1', tx1, ty1);
}
setTimeout(traversalonetime, 100);

let step = 0
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase()
  if (k === '=') { step++ }
  else if (k === '-') { step-- }
})
let change_dir = false
window.addEventListener('pointermove', e => {
  if (change_dir) {
    const [tx, ty] = revesemap(e.pageX, e.pageY);
    [ray[2], ray[3]] = [tx - ray[0], ty - ray[1]];
    traversalonetime()
  }
})
window.addEventListener('pointerup', e => {
  change_dir = false
})
window.addEventListener('pointerdown', e => {
  if (e.button === 0) {
    change_dir = true;
    [ray[0], ray[1]] = revesemap(e.pageX, e.pageY)
    traversalonetime()
  } else if (e.button === 1) {
    root = gen()
    traversalonetime()
  } else if (e.button === 2) {
    ray = [Math.random(), Math.random(),
    Math.random() * 2 - 1, Math.random() * 2 - 1]
    traversalonetime()
  }
})
window.oncontextmenu = e => e.preventDefault()

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
    let [i, bx, by, bs] = rectarray[k]
    ctx.strokeStyle = gradient(i)
    ctx.strokeRect(...mapcoord(bx, by), ...mapsize(bs, bs))
  }
  for (let k = 0; k < l; k++) {
    let [i, ...a] = pointarray[k]
    ctx.fillStyle = gradient(i)
    drawpoint(...a)
    ctx.fillStyle = 'black'
    ctx.fillText(i, ...mapcoord(...a))
  }

}; requestAnimationFrame(loop)