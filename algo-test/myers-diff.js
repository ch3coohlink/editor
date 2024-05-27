await require('../common/basic.js')

const { min, max, floor } = Math
const objarr = (o, a = []) => {
  for (const k in o) { a.push([k, o[k]]) }
  a.sort(([a], [b]) => a - b); return a.map(v => v.join(" "))
}
const arr = () => new Proxy({}, { get: (t, k) => t[k] ?? 0 })
const diff = (e, f, i = 0, j = 0) => {
  const N = e.length, M = f.length, L = N + M, Z = 2 * min(N, M) + 2
  if (N > 0 && M > 0) {
    let w = N - M, g = arr(), p = arr()
    for (let h = 0; h < floor(L / 2) + (L % 2 != 0) + 1; h++) {
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
            let [D, x, y, u, v] = o === 1 ? [2 * h - 1, s, t, a, b] : [2 * h, N - a, M - b, N - s, M - t], R
            if (D > 1 || x !== u && y !== v) {
              const a = diff(e.slice(0, x), f.slice(0, y), i, j)
              const b = diff(e.slice(u), f.slice(v), i + u, j + v)
              const al = a[a.length - 1], bf = b.shift(), t = al.type
              if (t === bf.type && (
                (t === 'insert' && al.old === bf.old) ||
                // (t === 'insert' && al.old === bf.old && al.new + al.length === bf.new) ||
                (t === 'delete' && al.old + al.length === bf.old))) {
                al.length += bf.length, R = a.concat(b)
              } else { R = a.concat(bf, b) }
            } else if (M > N) { R = diff([], f.slice(N), i + N, j + N) }
            else if (M < N) { R = diff(e.slice(M), [], i + M, j + M) }
            else { R = [] }
            return R
          }
        }
      }
    }
  } else if (N > 0) { return [{ type: 'delete', old: i, length: N }] }
  else if (M > 0) { return [{ type: 'insert', old: i, new: j, length: M }] }
  else { throw new Error('can\'t diff') }
}

log(...diff('abc'.split(''), 'bcfffffffffffffffffffffff'.split('')))
log(...diff('bcfffffffffffffffffffffff'.split(''), 'abc'.split('')))
log(...diff('samepart/abcde'.split(''), 'samepart/adcde'.split('')))