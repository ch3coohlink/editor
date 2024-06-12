class worklet01 extends AudioWorkletProcessor {
  process(ipts, outs) {
    const oc = outs[0]
    for (let c = 0; c < oc.length; ++c) {
      const o = oc[c]
      for (let i = 0, l = o.length; i < l; ++i) {
        o[i] = 0.2 * (Math.random() - 0.5)
      }
    } return true
  }
}
registerProcessor('worklet01', worklet01)