let STATE, CONFIG
let state, ib, ob

const { log } = console
const now = () => performance.now() // 1000
let pt = now()
const processKernel = () => {
  const ct = now()
  const dt = (ct - pt).toFixed(0)
  postMessage(dt)
  log(dt)
  pt = ct
  {
    const ct = state[STATE.CURRENT_TIME] / 1000
    const sr = state[STATE.SAMPLE_RATE]
    const st = 1 / sr
    const b = ob[0], bi = ib[0]
    let ii = state[STATE.IB_READ_INDEX]
    let oi = state[STATE.OB_WRITE_INDEX]
    for (let i = 0; i < CONFIG.kernelLength; ++i) {
      // b[oi] = bi[ii] * 0.05
      b[oi] = (i % 100 > 50 ? 1 : -1) * 0.1
      if (++oi === CONFIG.ringBufferLength) { oi = 0 }
      if (++ii === CONFIG.ringBufferLength) { ii = 0 }
    }
    state[STATE.OB_WRITE_INDEX] = oi
    state[STATE.IB_READ_INDEX] = ii
  }
}

const waitOnRenderRequest = () => {
  while (Atomics.wait(state, STATE.REQUEST_RENDER, 0) === 'ok') {
    processKernel()
    state[STATE.OB_FRAMES_AVAILABLE] += CONFIG.kernelLength
    // Reset the request render bit, and wait again.
    Atomics.store(state, STATE.REQUEST_RENDER, 0)
  }
}

if (!globalThis.SharedArrayBuffer) {
  postMessage({
    message: 'error',
    detail: `SharedArrayBuffer is not supported in your browser.`,
  })
}

const initialize = () => {
  const SB = {}
  SB.states = new SharedArrayBuffer(CONFIG.stateBufferLength * CONFIG.bytesPerState)
  SB.inputRingBuffer = new SharedArrayBuffer(CONFIG.ringBufferLength *
    CONFIG.channelCount * CONFIG.bytesPerSample)
  SB.outputRingBuffer = new SharedArrayBuffer(CONFIG.ringBufferLength *
    CONFIG.channelCount * CONFIG.bytesPerSample)
  state = new Int32Array(SB.states)
  ib = [new Float32Array(SB.inputRingBuffer)]
  ob = [new Float32Array(SB.outputRingBuffer)]

  Atomics.store(state, STATE.RING_BUFFER_LENGTH, CONFIG.ringBufferLength)

  postMessage({ message: 'ready', SB })
  waitOnRenderRequest()
}

onmessage = e => {
  if (e.data.message === 'init') {
    STATE = e.data.STATE
    CONFIG = e.data.CONFIG
    initialize()
  } else {
    console.log('[SharedBufferWorker] Unknown message: ', e)
  }
}