// 01 - basic buffer setup

{
  let i = 1, crt = false // currently running a task
  const tasks = {}, run = h => {
    if (crt) { return setTimeout(run, 0, h) }
    let t = tasks[h]; if (!t) { return }
    crt = true; try { t.f(...t.a) }
    finally { delete tasks[h], crt = false }
  }, p = "setImmediate$" + Math.random() + "$"
  addEventListener("message", e => {
    if (e.source === globalThis && typeof e.data === "string"
      && e.data.indexOf(p) === 0) { run(+e.data.slice(p.length)) }
  }); const rg = h => postMessage(p + h, "*")
  $.setImmediate = (f, ...a) => (tasks[i] = { f, a }, rg(i), i++)
  $.clearImmediate = h => delete tasks[h]
}

const wa = new AudioContext
const ringbuffersize = 1024 * 2
const timelimit = ringbuffersize / wa.sampleRate
log('buffer time', timelimit)
const bf = wa.createBuffer(1, ringbuffersize * 2, wa.sampleRate)
const sn = wa.createBufferSource()
sn.buffer = bf
sn.loop = true
sn.connect(wa.destination)
sn.start(0)

const now = () => performance.now() / 1000

let t = now(), i = false
const upd = () => {
  let b = bf.getChannelData(0)
  let off = (i ? 1 : 0) * ringbuffersize; i = !i
  const l = 0.1, ct = t, dt = 1 / wa.sampleRate
  for (let i = 0, t = ct; i < ringbuffersize; i++, t += dt) {
    const f = 1 / (100 + Math.sin(t * 1000))
    b[off + i] = (t % f > f * 0.5) ? l : -l
  }
}

// const scb = setImmediate
const scb = setTimeout
const f = () => {
  if (t - now() < timelimit * .5) {
    upd(), t += timelimit
  }
  scb(f)
}
scb(f)

addEventListener('pointerdown', () => {
  log('start')
  wa.resume()
  t = now() % timelimit * timelimit
})
