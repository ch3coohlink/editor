//# sourceURL=7bF10sAz0.js

await require('../common/basic.js')

const { min, max } = Math
const objarr = (o, a = []) => {
  for (const k in o) { a.push([k, o[k]]) }
  a.sort(([a], [b]) => a - b); return a.map(v => v.join(" "))
}
const arr = () => new Proxy({}, { get: (t, k) => t[k] ?? 0 })
const diff = (e, f, i = 0, j = 0) => {
  // log('enter', e, f)
  const N = e.length, M = f.length; if (N > 0 && M > 0) {
    const L = N + M, Z = 2 * min(N, M) + 2, w = N - M, g = arr(), p = arr()
    for (let h = 0, l = (L >>> 1) + (L % 2 != 0) + 1; h < l; h++) {
      for (let r = 0; r < 2; r++) {
        let [c, d, o, m] = r === 0 ? [g, p, 1, 1] : [p, g, 0, -1], o1 = 1 - o
        const ks = 2 * max(0, h - M) - h, ke = h - 2 * max(0, h - N) + 1
        for (let k = ks; k < ke; k += 2) {
          const ca = c[(k - 1) % Z], cb = c[(k + 1) % Z]
          let a = k === -h || k !== h && ca < cb ? cb : ca + 1
          let b = a - k, s = a, t = b, z = w - k
          while (a < N && b < M && e[o1 * N + m * a - o1] === f[o1 * M + m * b - o1]
          ) { a += 1, b += 1 } c[k % Z] = a
          // log(h, !r, objarr(c).join('|'))
          if (L % 2 === o && z >= o - h && z <= h - o && c[k % Z] + d[z % Z] >= N) {
            let [D, x, y, u, v] = o === 1 ? [2 * h - 1, s, t, a, b]
              : [2 * h, N - a, M - b, N - s, M - t], R
            if (D > 1 || x !== u && y !== v) {
              // log('head')
              const a = diff(e.slice(0, x), f.slice(0, y), i, j)
              // log('tail')
              const b = diff(e.slice(u), f.slice(v), i + u, j + v)
              // log('back', ...a, '|', ...b)
              let al = a[a.length - 1], bf = b[0]
              if (al && bf && (
                (al.n + al.l === bf.n) ||
                (al.o + al.l === bf.o))) {
                al.l += bf.l, R = a.concat(b.slice(1))
              } else { R = a.concat(b) }
            } else if (M > N) {
              // log('m > n')
              R = diff([], f.slice(N), i + N, j + N)
            } else if (M < N) {
              // log('m < n')
              R = diff(e.slice(M), [], i + M, j + M)
            } else { R = [] } return R
          }
        }
      }
    }
  } else if (N > 0) {
    // log('n > 0')
    return [{ as: i, al: N, bs: j, bl: 0 }]
  } else if (M > 0) {
    // log('m > 0')
    return [{ as: i, al: 0, bs: j, bl: M }]
  } else { return [] }
}

log(...diff('abc'.split(''), 'bcfffffffffffffffffffffff'.split('')))
log('-'.repeat(80))
log(...diff('bcfffffffffffffffffffffff'.split(''), 'abc'.split('')))
log('-'.repeat(80))
log(...diff('samepart/abcde'.split(''), 'samepart/adcde'.split('')))
log('-'.repeat(80))

const stb = (buffer, s, l, v) => ({ stable: true, buffer, s, l, v })
const ust = (os, ol, ov, as, al, av, bs, bl, bv) => (
  { stable: false, os, ol, ov, as, al, av, bs, bl, bv })
const diff2hunk = (ab, a, hs) => a.forEach(({ t, o, n, l }) => hs.push(t === 'insert' ?
  // { ab, os: o, ol: 0, abs: n, abl: l } : { ab, os: o, ol: l, abs: o, abl: 0 }))
  { ab, os: o, ol: 0, abs: n, abl: l } : { ab, os: o, ol: l, abs: n, abl: 0 }))
const diff3 = (a, b, o) => {
  let offset = 0, hs = [], r = [], advance = e => e > offset ?
    r.push(stb('o', e, e - offset, o.slice(offset, e))) : 0
  diff2hunk('a', diff(o, a), hs), diff2hunk('b', diff(o, b), hs)
  log('hs', ...hs)
  hs.sort((a, b) => a.os - b.os); while (hs.length > 0) { // hunks
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
        bs[0] = min(h.abs, bs[0]), bs[1] = min(h.abs + h.abl, bs[1])
        bs[2] = min(h.os, bs[2]), bs[3] = min(h.os + h.ol, bs[3])
      } const as = bounds.a[0] + s - bounds.a[2]
      const ae = bounds.a[1] + e - bounds.a[3]
      const bs = bounds.b[0] + s - bounds.b[2]
      const be = bounds.b[1] + e - bounds.b[3]
      r.push(ust(s, e - s, o.slice(s, e), ae, ae - as,
        a.slice(as, ae), be, be - bs, b.slice(bs, be)))
    } else if (h.abl > 0) r.push(stb(h.ab, h.abs, h.abl, (h.ab === 'a'
      ? a : b).slice(h.abs, h.abs + h.abl))); offset = e
  } advance(o.length); return r
}

{
  const o = `samepart/acde`.split('')
  const a = `same/adcde`.split('')
  const b = `samepart/ecge`.split('')
  const r = diff3(a, b, o)
  r.forEach(o => log(...o.v ?? [o.ov, o.av, o.bv]))
  // log(...r)
  // log('-'.repeat(80))
}