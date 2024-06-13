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
    const ct = state[STATE.CURRENT_TIME]
    const sr = state[STATE.SAMPLE_RATE]
    const b = ob[0]
    let oi = state[STATE.OB_WRITE_INDEX]
    for (let i = 0; i < CONFIG.kernelLength; ++i) {
      b[oi] = (i % 2 ? 1 : -1) * 0.1
      if (++oi === CONFIG.ringBufferLength) { oi = 0 }
    }
    state[STATE.OB_WRITE_INDEX] = oi
  }
}


/**
 * Waits for the signal delivered via |States| SAB. When signaled, process
 * the audio data to fill up |outputRingBuffer|.
 */
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

  // Initialize |States| buffer.
  Atomics.store(state, STATE.RING_BUFFER_LENGTH, CONFIG.ringBufferLength)
  Atomics.store(state, STATE.KERNEL_LENGTH, CONFIG.kernelLength)

  postMessage({ message: 'ready', SharedBuffers: SB })
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