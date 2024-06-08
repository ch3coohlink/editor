// 03 - basic worker dispatch & monitoring
const debounce = (f, t = 100, i) => (...a) =>
  (clearTimeout(i), i = setTimeout(() => f(...a), t))
const watches = new Map
// TODO: watch file change
const readfile = log

const startfile = 'index.js'
const content = `
const f = ()=>{for(let i=0;i<10000000000;i++){}}
const n = ()=>performance.now()/1000
setInterval(() => {
  log('start work')
  let s = n()
  f()
  log('finish work', n() - s)
}, 2000)
f()
`

let alive = performance.now()
const light = document.createElement('div')
light.textContent = '🟢'
document.body.append(light)

const w = new Worker('editor/sandbox/worker.js')
const send = w.postMessage.bind(w)
let watch = new Set([startfile])
const reload = debounce(() => {
  watch = new Set([startfile])
  send({ command: 'reload' })
})
watches.set(w, { watch, reload })
w.addEventListener('message', e => {
  const o = e.data
  if (o.command === 'init' || o.command === 'load') {
    try {
      const p = path.resolve(__dirname, o.path)
      const f = readfile(p); watch.add(o.path)
      send({ command: o.command, path: o.path, content: f })
    } catch (e) {
      send({ command: o.command + 'fail', error: e.message, path: o.path })
    }
  } else if (o.command === 'heartbeat') {
    alive = performance.now()
    light.textContent = '🟢'
  }
})
setInterval(() => alive + 1100 < performance.now() ? light.textContent = '🔴' : 0, 1000)
send({ command: 'init', path: startfile, content })