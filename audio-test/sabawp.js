
const STATE = {
  'REQUEST_RENDER': 0,
  'IB_FRAMES_AVAILABLE': 1,
  'IB_READ_INDEX': 2,
  'IB_WRITE_INDEX': 3,
  'OB_FRAMES_AVAILABLE': 4,
  'OB_READ_INDEX': 5,
  'OB_WRITE_INDEX': 6,
  'RING_BUFFER_LENGTH': 7,
  'KERNEL_LENGTH': 8,
}

registerProcessor('shared-buffer-worklet-processor', class extends AudioWorkletProcessor {
  constructor(opt) {
    super()
    this._initialized = false
    this.port.onmessage = (e) => {
      const sharedBuffers = e.data

      // Get the states buffer.
      this._states = new Int32Array(sharedBuffers.states)

      // Worker's input/output buffers. This example only handles mono channel for both.
      this._inputRingBuffer = [new Float32Array(sharedBuffers.inputRingBuffer)]
      this._outputRingBuffer = [new Float32Array(sharedBuffers.outputRingBuffer)]

      this._ringBufferLength = this._states[STATE.RING_BUFFER_LENGTH]
      this._kernelLength = this._states[STATE.KERNEL_LENGTH]

      this._initialized = true
      this.port.postMessage({ message: 'PROCESSOR_READY' })
    }
  }
  _pushInputChannelData(inputChannelData) {
    const inputWriteIndex = this._states[STATE.IB_WRITE_INDEX]

    if (inputWriteIndex + inputChannelData.length < this._ringBufferLength) {
      this._inputRingBuffer[0].set(inputChannelData, inputWriteIndex)
      this._states[STATE.IB_WRITE_INDEX] += inputChannelData.length
    } else { // wrap ring buffer when not having enough space
      const splitIndex = this._ringBufferLength - inputWriteIndex
      const firstHalf = inputChannelData.subarray(0, splitIndex)
      const secondHalf = inputChannelData.subarray(splitIndex)
      this._inputRingBuffer[0].set(firstHalf, inputWriteIndex)
      this._inputRingBuffer[0].set(secondHalf)
      this._states[STATE.IB_WRITE_INDEX] = secondHalf.length
    } // Update the number of available frames in the input ring buffer.
    this._states[STATE.IB_FRAMES_AVAILABLE] += inputChannelData.length
  }
  _pullOutputChannelData(outputChannelData) {
    const outputReadIndex = this._states[STATE.OB_READ_INDEX]
    const nextReadIndex = outputReadIndex + outputChannelData.length

    if (nextReadIndex < this._ringBufferLength) {
      outputChannelData.set(this._outputRingBuffer[0].subarray(outputReadIndex, nextReadIndex))
      this._states[STATE.OB_READ_INDEX] += outputChannelData.length
    } else {
      const overflow = nextReadIndex - this._ringBufferLength
      const firstHalf = this._outputRingBuffer[0].subarray(outputReadIndex)
      const secondHalf = this._outputRingBuffer[0].subarray(0, overflow)
      outputChannelData.set(firstHalf)
      outputChannelData.set(secondHalf, firstHalf.length)
      this._states[STATE.OB_READ_INDEX] = secondHalf.length
    }
  }

  process(inputs, outputs) {
    if (!this._initialized) { return true }

    // This example only handles mono channel.
    const inputChannelData = inputs[0][0]
    const outputChannelData = outputs[0][0]

    this._pushInputChannelData(inputChannelData)
    this._pullOutputChannelData(outputChannelData)

    if (this._states[STATE.IB_FRAMES_AVAILABLE] >= this._kernelLength) {
      // Now we have enough frames to process. Wake up the worker.
      Atomics.notify(this._states, STATE.REQUEST_RENDER, 1)
    } return true
  }
})
