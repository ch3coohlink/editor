const { min, max } = Math
const arr = () => new Proxy({}, { get: (t, k) => t[k] ?? 0 })
$.diff = (A, B, i = 0, j = 0) => {
  const N = A.length, M = B.length; if (!(N > 0 && M > 0))
    return N > 0 ? [{ as: i, al: N, bs: j, bl: 0 }]
      : M > 0 ? [{ as: i, al: 0, bs: j, bl: M }] : []
  const L = N + M, Z = 2 * min(N, M) + 2, delta = N - M, g = arr(), p = arr()
  for (let D = 0; D < (L >>> 1) + (L % 2 != 0) + 1; D++) {
    for (let o = 1; o >= 0; o--) {
      const of = o === 1, [c, d, os] = of ? [g, p, 1] : [p, g, -1]
      const ke = D - 2 * max(0, D - N), o_ = 1 - o
      for (let k = 2 * max(0, D - M) - D; k <= ke; k += 2) {
        const ca = c[(k - 1) % Z], cb = c[(k + 1) % Z]
        let a = k === -D || k !== D && ca < cb ? cb : ca + 1, b = a - k
        const s = a, t = b, lo = D - o, k_ = delta - k
        while (a < N && b < M && A[o_ * N + os * a - o_] === B[o_ * M + os * b - o_]
        ) { a += 1, b += 1 } c[k % Z] = a; if (!(L % 2 === o &&
          -lo <= k_ && k_ <= lo && a + d[k_ % Z] >= N)) { continue }
        let [D_, x, y, u, v] = of ? [2 * D - 1, s, t, a, b]
          : [2 * D, N - a, M - b, N - s, M - t]
        if (D_ > 1 || x !== u && y !== v) {
          const ar = diff(A.slice(0, x), B.slice(0, y), i, j)
          const br = diff(A.slice(u), B.slice(v), i + u, j + v)
          const a = ar[ar.length - 1], b = br[0]
          if (a && b && (a.as + a.al === b.as || a.bs + a.bl === b.bs)) {
            a.al += b.al, a.bl += b.bl; return ar.concat(br.slice(1))
          } else { return ar.concat(br) }
        } else if (M > N) { return diff([], B.slice(N), i + N, j + N) }
        else if (M < N) { return diff(A.slice(M), [], i + M, j + M) }
        else { return [] }
      }
    }
  }
}
const stb = (b, s, l, v) => ({ stable: true, buffer: b, s, l, v })
const ust = (os, ol, ov, as, al, av, bs, bl, bv) =>
  ({ stable: false, os, ol, ov, as, al, av, bs, bl, bv })
const d2h = ab => ({ as, al, bs, bl }) =>
  ({ ab, os: as, ol: al, abs: bs, abl: bl })
$.diff3 = (a, b, o) => {
  let offset = 0, hs = [], r = [], advance = e => e > offset ?
    r.push(stb('o', e, e - offset, o.slice(offset, e))) : 0
  hs = hs.concat(diff(o, a).map(d2h('a')))
  hs = hs.concat(diff(o, b).map(d2h('b')))
  hs.sort((a, b) => a.os - b.os); while (hs.length > 0) {
    let h = hs.shift(), rhs = [h] // region hunks
    let s = h.os, e = h.os + h.ol; advance(s)
    while (hs.length > 0) {
      const h = hs[0], s = h.os; if (s > e) { break }
      e = max(e, s + h.ol); rhs.push(hs.shift())
    } if (rhs.length > 1) {
      let bounds = { a: [a.length, -1, o.length, -1] }
      bounds.b = [b.length, -1, o.length, -1]
      while (rhs.length > 0) {
        h = rhs.shift(); const bs = bounds[h.ab]
        bs[0] = min(h.abs, bs[0]), bs[1] = max(h.abs + h.abl, bs[1])
        bs[2] = min(h.os, bs[2]), bs[3] = max(h.os + h.ol, bs[3])
      } const as = bounds.a[0] + s - bounds.a[2]
      const ae = bounds.a[1] + e - bounds.a[3]
      const bs = bounds.b[0] + s - bounds.b[2]
      const be = bounds.b[1] + e - bounds.b[3]
      r.push(ust(s, e - s, o.slice(s, e), as, ae - as,
        a.slice(as, ae), bs, be - bs, b.slice(bs, be)))
    } else if (h.abl > 0) r.push(stb(h.ab, h.abs, h.abl, (h.ab === 'a'
      ? a : b).slice(h.abs, h.abs + h.abl))); offset = e
  } advance(o.length); return r
}

{
  const o = `samepart/acde`.split('')
  const a = `same/adcde`.split('')
  const b = `samediskecge`.split('')
  const r = diff3(a, b, o)
  r.forEach(o => log(...o.v ?? [o.ov, o.av, o.bv]))
  log(...r)
  // log('-'.repeat(80))
}