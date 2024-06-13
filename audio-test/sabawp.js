let STATE, { log } = console
registerProcessor('sbwp', class extends AudioWorkletProcessor {
  constructor() {
    super(); this.init = false
    this.port.onmessage = e => {
      STATE = e.data.STATE; const SB = e.data.SB
      this.state = new Int32Array(SB.states); this.init = true
      this.fstate = new Float32Array(SB.states)
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

    const bf = this.ob[0]
    if (nri < this.rbl) {
      const sa = bf.subarray(oi, nri)
      ocd.set(sa)
      this.state[STATE.OB_READ_INDEX] += ocd.length
    } else {
      const a = bf.subarray(oi)
      const b = bf.subarray(0, nri - this.rbl)
      ocd.set(a), ocd.set(b, a.length)
      this.state[STATE.OB_READ_INDEX] = b.length
    }

    this.fstate[STATE.CURRENT_TIME] = currentTime
    this.state[STATE.SAMPLE_RATE] = sampleRate
    Atomics.notify(this.state, STATE.REQUEST_RENDER, 1)
    return true
  }
})