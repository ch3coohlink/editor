let STATE, { log } = console
registerProcessor('sbwp', class extends AudioWorkletProcessor {
  constructor() {
    super(); this.init = false
    this.port.onmessage = (e) => {
      STATE = e.data.STATE; const SB = e.data.SB
      this.state = new Int32Array(SB.states); this.init = true
      this.ib = [new Float32Array(SB.inputRingBuffer)]
      this.ob = [new Float32Array(SB.outputRingBuffer)]
      this.rbl = this.state[STATE.RING_BUFFER_LENGTH]
      this.port.postMessage({ message: 'ready' })
    }
  }
  process(inputs, outputs) {
    if (!this.init) { return true }

    const ocd = outputs[0][0]
    const oi = this.state[STATE.OB_READ_INDEX]
    const nri = oi + ocd.length

    if (nri < this.rbl) {
      const sa = this.ob[0].subarray(oi, nri)
      ocd.set(sa)
      this.state[STATE.OB_READ_INDEX] += ocd.length
    } else {
      const overflow = nri - this.rbl
      const a = this.ob[0].subarray(oi)
      const b = this.ob[0].subarray(0, overflow)
      ocd.set(a), ocd.set(b, a.length)
      this.state[STATE.OB_READ_INDEX] = b.length
    }

    this.state[STATE.CURRENT_TIME] = currentTime * 1000
    this.state[STATE.SAMPLE_RATE] = sampleRate
    Atomics.notify(this.state, STATE.REQUEST_RENDER, 1)
    return true
  }
})