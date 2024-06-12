const { log } = console
log(globalThis)

registerProcessor('worklet01', class extends AudioWorkletProcessor {
  process(ipts, outs) {
    const oc = outs[0]
    for (let c = 0; c < oc.length; ++c) {
      const o = oc[c], ct = currentTime, l = 0.1
      for (let i = 0, e = o.length, t = ct; i < e; ++i, t += 1 / sampleRate) {
        // o[i] = 0.2 * (Math.random() - 0.5)
        // const f = 1 / (100 + 10 * Math.sin(t))
        const f = 1 / (100 + Math.sin(t * 1000))
        o[i] = (t % f > f * 0.5) ? l : -l
      }
    } return true
  }
})