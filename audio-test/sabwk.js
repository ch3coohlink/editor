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
let state, fstate, ob

const { log } = console
const processKernel = () => {
  const ct = fstate[STATE.CURRENT_TIME]
  const sr = state[STATE.SAMPLE_RATE]
  const st = 1 / sr
  const b = ob[0]
  let oi = state[STATE.OB_WRITE_INDEX]
  for (let i = 0, t = ct; i < CONFIG.kernelLength; ++i, t += st) {
    const f = 1 / (100 + Math.sin(t * 1000))
    b[oi] = ((t % f > f * 0.5) ? 1 : -1) * 0.1
    if (++oi === CONFIG.ringBufferLength) { oi = 0 }
  }
  state[STATE.OB_WRITE_INDEX] = oi
}

const waitOnRenderRequest = () => {
  while (Atomics.wait(state, STATE.REQUEST_RENDER, 0) === 'ok') {
    postMessage(''), processKernel()
    state[STATE.OB_FRAMES_AVAILABLE] += CONFIG.kernelLength
    Atomics.store(state, STATE.REQUEST_RENDER, 0)
  }
}

if (!globalThis.SharedArrayBuffer) {
  log(`SharedArrayBuffer is not supported in your browser.`)
}

const initialize = () => {
  const SB = {}
  SB.states = new SharedArrayBuffer(CONFIG.stateBufferLength * CONFIG.bytesPerState)
  SB.outputRingBuffer = new SharedArrayBuffer(CONFIG.ringBufferLength *
    CONFIG.channelCount * CONFIG.bytesPerSample)
  state = new Int32Array(SB.states)
  fstate = new Float32Array(SB.states)
  ob = [new Float32Array(SB.outputRingBuffer)]
  state[STATE.RING_BUFFER_LENGTH] = CONFIG.ringBufferLength
  postMessage({ message: 'ready', SB, STATE })
  waitOnRenderRequest()
}

onmessage = e => {
  if (e.data.message === 'init') {
    initialize()
  }
}