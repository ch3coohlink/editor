log = console.log
dlog = console.dir

const loop = t => {
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

let off
log(globalThis)
const init = o => {
  off = o.off
  getContext
}

addEventListener('message', e => {
  const o = e.data
  if (o.type === 'init') {
    init(o)
  } else if (o.type === 'resize') {
    off.width = o.width
    off.height = o.height
    log(off)
  }
})