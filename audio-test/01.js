// 01 - basic buffer setup

{
  const global = globalThis
  let nextHandle = 1; // Spec says greater than zero
  const tasksByHandle = {};
  let currentlyRunningATask = false;
  const runIfPresent = handle => {
    // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
    // So if we're currently running a task, we'll need to delay this invocation.
    if (currentlyRunningATask) {
      setTimeout(runIfPresent, 0, handle)
    } else {
      let task = tasksByHandle[handle]
      if (task) {
        currentlyRunningATask = true
        try {
          task.callback(...task.args)
        } finally {
          clearImmediate(handle)
          currentlyRunningATask = false
        }
      }
    }
  }

  const messagePrefix = "setImmediate$" + Math.random() + "$"
  // {capture, once, passive, signal}
  addEventListener("message", event => {
    if (event.source === global &&
      typeof event.data === "string" &&
      event.data.indexOf(messagePrefix) === 0) {
      runIfPresent(+event.data.slice(messagePrefix.length));
    }
  }, false)
  const registerImmediate = h =>
    global.postMessage(messagePrefix + h, "*")

  $.setImmediate = (cb, ...a) => {
    // Callback can either be a function or a string
    if (typeof cb !== "function") { cb = new Function("" + cb) }
    const task = { callback: cb, args: a }
    tasksByHandle[nextHandle] = task
    registerImmediate(nextHandle)
    return nextHandle++
  }
  $.clearImmediate = h => delete tasksByHandle[h]
}

const wa = new AudioContext
const ringbuffersize = 512
const timelimit = ringbuffersize / wa.sampleRate * 1000
const bf = wa.createBuffer(1, ringbuffersize * 2, wa.sampleRate)
const sn = wa.createBufferSource()
sn.buffer = bf
sn.loop = true
sn.connect(wa.destination)
sn.start(0)

const now = performance.now.bind(performance)

let t = 0
let i = 0
const upd = () => {
  let b = bf.getChannelData(0)
  let off = i * ringbuffersize
  log('update')
}



let r = false
let pt = now()
// const tm = setImmediate
const tm = setTimeout
const f = () => {
  const ct = now()
  log((ct - pt).toFixed(1))
  pt = ct
  // log(t - ct, t)
  // if (ct > t) {
  //   upd(), t += timelimit
  // }
  // else if (t - ct < 1) { r = false }
  tm(f)
}
tm(f)

addEventListener('pointerdown', () => {
  log('start')
  wa.resume()
})
