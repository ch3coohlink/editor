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

setTimeout(() => log('wa latency', wa.baseLatency + wa.outputLatency), 100)

const STATE = {
  REQUEST_RENDER: 0,
  IB_FRAMES_AVAILABLE: 1,
  IB_READ_INDEX: 2,
  IB_WRITE_INDEX: 3,
  OB_FRAMES_AVAILABLE: 4,
  OB_READ_INDEX: 5,
  OB_WRITE_INDEX: 6,
  RING_BUFFER_LENGTH: 7,
  KERNEL_LENGTH: 8,
  CURRENT_TIME: 9,
  SAMPLE_RATE: 10,
}, CONFIG = {
  bytesPerState: Int32Array.BYTES_PER_ELEMENT,
  bytesPerSample: Float32Array.BYTES_PER_ELEMENT,
  stateBufferLength: 16,
  ringBufferLength: 512,
  kernelLength: 512,
  channelCount: 1,
}

const sabwkurl = await loadsrc('sabwk.js')
class SharedBufferWorkletNode extends AudioWorkletNode {
  constructor(ctx, opt) {
    super(ctx, 'sbwp', opt)
    this.worker = new Worker(sabwkurl)
    this.worker.onmessage = (e, d = e.data) => {
      if (d.message === 'ready') {
        this.port.postMessage({ SB: d.SB, STATE })
      } else if (d.message === 'error') { this.onError?.(d) }
    }
    this.port.onmessage = (e, d = e.data) => {
      if (d.message === 'ready') { this.onInitialized?.() }
    }
    this.worker.postMessage({ message: 'init', STATE, CONFIG })
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