// 03 - shared array buffer workerlet

const script = document.createElement('script')
script.src = 'coi-serviceworker.js'
document.head.append(script)

const wa = new AudioContext()
const jsmime = 'application/javascript'
const loadsrc = async (path, type = jsmime) => {
  let src = await readfile(path)
  if (type === jsmime) { src = `//# sourceURL=${path}\n` + src }
  const blob = new Blob([src], { type })
  return URL.createObjectURL(blob)
}

log(wa)

const sabwkurl = await loadsrc('sabwk.js')
class SharedBufferWorkletNode extends AudioWorkletNode {
  constructor(ctx, opt = { ringBufferLength: 1024 * 8, channelCount: 1 }) {
    super(ctx, 'shared-buffer-worklet-processor', opt)
    this.option = opt
    this.worker = new Worker(sabwkurl)
    this.worker.onmessage = (e, d = e.data) => {
      if (d.message === 'WORKER_READY') { this.port.postMessage(d.SharedBuffers) }
      else if (d.message === 'WORKER_ERROR') {
        console.log(`[SharedBufferWorklet] Worker Error: ${d.detail}`)
        if (typeof this.onError === 'function') { this.onError(d) }
      } else { console.log(`[SharedBufferWorklet] Unknown message: ${e}`) }
    }
    this.port.onmessage = (e, d = e.data) => {
      if (d.message === 'PROCESSOR_READY' &&
        typeof this.onInitialized === 'function') { this.onInitialized() }
      else { console.log(`[SharedBufferWorklet] Unknown message: ${e}`) }
    }
    this.worker.postMessage({
      message: 'INITIALIZE_WORKER', options: this.option,
    })
  }
}

await wa.audioWorklet.addModule(await loadsrc('sabawp.js'))
const osc = new OscillatorNode(wa)
const sbwn = new SharedBufferWorkletNode(wa)
sbwn.onInitialized = () => (
  osc.connect(sbwn).connect(wa.destination), osc.start())
sbwn.onError = e => { console.log('[ERROR] ' + e.detail) }

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