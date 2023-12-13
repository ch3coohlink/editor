$.wait = t => new Promise(r => setTimeout(r, t))
$.debounce = (f, t = 100, i) => (...a) =>
  (clearTimeout(i), i = setTimeout(() => f(...a), t))
$.throttle = (f, t = 100, i) => (...a) =>
  i ? 0 : (i = 1, f(...a), setTimeout(() => i = 0, t))

$.uuid = (d = 32) => [...crypto.getRandomValues(new Uint8Array(d))]
  .map(v => v.toString(16).padStart(2, '0')).join("")

let { imul } = Math, mb32 = a => t =>
  (a = a + 1831565813 | 0,
    t = imul(a ^ a >>> 15, 1 | a),
    t = t + imul(t ^ t >>> 7, 61 | t) ^ t,
    (t ^ t >>> 14) >>> 0) / 4294967296
$.genrd = seed => {
  let { log, cos, sqrt, ceil, PI } = Math, _rd = mb32(seed)
  let rd = (a = 1, b) => (b ? 0 : (b = a, a = 0), _rd() * (b - a) + a)
  let rdi = (a, b) => ceil(rd(a, b))
  let gaussian = (mean = 0, stdev = 1) => {
    let u = 1 - rd(), v = rd()
    let z = sqrt(-2.0 * log(u)) * cos(2.0 * PI * v)
    return z * stdev + mean
  } // Standard Normal variate using Box-Muller transform
  return [rd, rdi, gaussian]
}