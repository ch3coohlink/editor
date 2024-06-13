// 03 - shared array buffer workerlet

const script = document.createElement('script')
script.src = 'coi.js'
document.head.append(script)

const wa = new AudioContext()
const jsmime = 'application/javascript'
const loadsrc = async (path, type = jsmime) => {
  let src = await readfile(path)
  if (type === jsmime) { src = `//# sourceURL=${path}\n` + src }
  const blob = new Blob([src], { type })
  return URL.createObjectURL(blob)
}
wa.addEventListener('statechange', () => setTimeout(
  () => log('wa latency', wa.baseLatency + wa.outputLatency), 100))

const sabwkurl = await loadsrc('sabwk.js')
class SharedBufferWorkletNode extends AudioWorkletNode {
  constructor(ctx, opt) {
    super(ctx, 'sbwp', opt)
    this.worker = new Worker(sabwkurl)
    this.worker.onmessage = (e, d = e.data) =>
      d.message === 'ready' ? this.port.postMessage(d) : 0
    this.port.onmessage = (e, d = e.data) =>
      d.message === 'ready' ? this.onInitialized?.() : 0
    this.worker.postMessage({ message: 'init' })
  }
}

await wa.audioWorklet.addModule(await loadsrc('sabawp.js'))
const osc = new OscillatorNode(wa)
const sbwn = new SharedBufferWorkletNode(wa)
sbwn.onInitialized = () => (
  osc.connect(sbwn).connect(wa.destination), osc.start())

{
  const b = document.createElement('button')
  b.textContent = 'play'
  b.onclick = () => wa.resume()
  document.body.append(b)
} {
  const b = document.createElement('button')
  b.textContent = 'stop'
  b.onclick = () => wa.suspend()
  document.body.append(b)
}