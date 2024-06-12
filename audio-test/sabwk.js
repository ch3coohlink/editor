// The synchronization mechanism between two object is done by wake/wait
// function in Atomics API. When the ring buffer runs out of the data to
// consume, the AWP will flip |REQUEST_RENDER| state to signal the worker. The
// work wakes on the signal and renders the audio data requested.

// Indices for the State SAB.
const STATE = {
  // Flag for Atomics.wait() and notify().
  'REQUEST_RENDER': 0,
  // Available frames in Input SAB.
  'IB_FRAMES_AVAILABLE': 1,
  // Read index of Input SAB.
  'IB_READ_INDEX': 2,
  // Write index of Input SAB.
  'IB_WRITE_INDEX': 3,
  // Available frames in Output SAB.
  'OB_FRAMES_AVAILABLE': 4,
  // Read index of Output SAB.
  'OB_READ_INDEX': 5,
  // Write index of Output SAB.
  'OB_WRITE_INDEX': 6,
  // Size of Input and Output SAB.
  'RING_BUFFER_LENGTH': 7,
  // Size of user-supplied processing callback.
  'KERNEL_LENGTH': 8,
}

// Worker processor config.
const CONFIG = {
  bytesPerState: Int32Array.BYTES_PER_ELEMENT,
  bytesPerSample: Float32Array.BYTES_PER_ELEMENT,
  stateBufferLength: 16,
  ringBufferLength: 4096,
  kernelLength: 1024,
  channelCount: 1,
  waitTimeOut: 25000,
}

// Shared states between this worker and AWP.
let States, InputRingBuffer, OutputRingBuffer

const processKernel = () => {
  let inputReadIndex = States[STATE.IB_READ_INDEX]
  let outputWriteIndex = States[STATE.OB_WRITE_INDEX]

  if (isNaN(InputRingBuffer[0][inputReadIndex])) {
    console.error('Found NaN at buffer index: %d', inputReadIndex)
  }

  // A stupid processing kernel that clones audio data sample-by-sample. Also
  // note here we are handling only the first channel.
  for (let i = 0; i < CONFIG.kernelLength; ++i) {
    OutputRingBuffer[0][outputWriteIndex] = InputRingBuffer[0][inputReadIndex]
    if (++outputWriteIndex === CONFIG.ringBufferLength) {
      outputWriteIndex = 0
    }
    if (++inputReadIndex === CONFIG.ringBufferLength) {
      inputReadIndex = 0
    }
  }

  States[STATE.IB_READ_INDEX] = inputReadIndex
  States[STATE.OB_WRITE_INDEX] = outputWriteIndex
}


/**
 * Waits for the signal delivered via |States| SAB. When signaled, process
 * the audio data to fill up |outputRingBuffer|.
 */
const waitOnRenderRequest = () => {
  while (Atomics.wait(States, STATE.REQUEST_RENDER, 0) === 'ok') {
    processKernel()
    // Update the number of available frames in the buffer.
    States[STATE.IB_FRAMES_AVAILABLE] -= CONFIG.kernelLength
    States[STATE.OB_FRAMES_AVAILABLE] += CONFIG.kernelLength
    // Reset the request render bit, and wait again.
    Atomics.store(States, STATE.REQUEST_RENDER, 0)
  }
}

const initialize = (opt) => {
  Object.assign(CONFIG, opt)

  if (!self.SharedArrayBuffer) {
    postMessage({
      message: 'WORKER_ERROR',
      detail: `SharedArrayBuffer is not supported in your browser. See
          https://developers.google.com/web/updates/2018/06/audio-worklet-design-pattern
          for more info.`,
    }); return
  }
  const SB = {}
  SB.states = new SharedArrayBuffer(CONFIG.stateBufferLength * CONFIG.bytesPerState)
  SB.inputRingBuffer = new SharedArrayBuffer(CONFIG.ringBufferLength *
    CONFIG.channelCount * CONFIG.bytesPerSample)
  SB.outputRingBuffer = new SharedArrayBuffer(CONFIG.ringBufferLength *
    CONFIG.channelCount * CONFIG.bytesPerSample)
  States = new Int32Array(SB.states)
  InputRingBuffer = [new Float32Array(SB.inputRingBuffer)]
  OutputRingBuffer = [new Float32Array(SB.outputRingBuffer)]

  // Initialize |States| buffer.
  Atomics.store(States, STATE.RING_BUFFER_LENGTH, CONFIG.ringBufferLength)
  Atomics.store(States, STATE.KERNEL_LENGTH, CONFIG.kernelLength)

  // Notify AWN in the main scope that the worker is ready.
  postMessage({
    message: 'WORKER_READY',
    SharedBuffers: SB,
  })

  // Start waiting.
  waitOnRenderRequest()
}

onmessage = e => {
  if (e.data.message === 'INITIALIZE_WORKER') {
    initialize(e.data.options)
  } else {
    console.log('[SharedBufferWorker] Unknown message: ', e)
  }
}