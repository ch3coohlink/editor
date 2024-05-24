// 09.js - git editor
//# sourceURL=7bF10sAz0.js

{ // basic utility ------------------------------------------------------------
  $._ = undefined
  $.wait = t => new Promise(r => setTimeout(r, t))
  $.debounce = (f, t = 100, i) => (...a) =>
    (clearTimeout(i), i = setTimeout(() => f(...a), t))
  $.throttle = (f, t = 100, i) => (...a) =>
    i ? 0 : (i = 1, f(...a), setTimeout(() => i = 0, t))
  $.hexenc = b => [...b].map(v => v.toString(16).padStart(2, '0')).join("")
  $.uuid_length = 32, $.uuid = (d = uuid_length) =>
    hexenc(crypto.getRandomValues(new Uint8Array(d)))
  $.sha256async = async t => hexenc(new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))))
  let { max, min } = Math; $.clamp = (v, s, l) => max(min(v, l), s)
  $.dom = n => document.createElement(n)
  $.svg = n => document.createElementNS('http://www.w3.org/2000/svg', n)
  $.eventnode = ($ = {}) => {
    $._handles = {}; with ($) {
      $.emit = (t, ...a) => _handles[t]?.forEach(f => f(...a))
      $.on = (t, f) => (_handles[t] ??= new Set).add(f)
      $.off = (t, f) => (_handles[t]?.delete(f),
        _handles[t].size > 0 ? 0 : delete _handles[t])
    } return $
  }
  $.bsearch = (a, cmp, l = 0, r = a.length - 1, m, c) => {
    while (l <= r) {
      m = (l + r) >>> 1, c = cmp(a[m], m); if (c > 0
      ) { r = m - 1 } else if (c < 0) { l = m + 1 } else { return m }
    } return -1
  }, $.bsleft = (a, c, l = 0, r = a.length, m) => {
    while (l < r) (m = (l + r) >>> 1,
      c(a[m], m) < 0 ? l = m + 1 : r = m); return l
  }, $.bsright = (a, c, l = 0, r = a.length, m) => {
    while (l < r) (m = (l + r) >>> 1,
      c(a[m], m) > 0 ? r = m : l = m + 1); return r - 1
  }
} { // diff algorithm ---------------------------------------------------------
  const { min, max, floor } = Math
  const arr = () => new Proxy({}, { get: (t, k) => t[k] ?? 0 })
  $.diff = (A, B, i = 0, j = 0) => {
    const N = A.length, M = B.length, L = N + M, Z = 2 * min(N, M) + 2
    if (N > 0 && M > 0) {
      const delta = N - M, g = arr(), p = arr()
      for (let D = 0; D < floor(L / 2) + (L % 2 != 0) + 1; D++) {
        for (let o = 1; o >= 0; o--) {
          const of = o === 1, [c, d, os] = of ? [g, p, 1] : [p, g, -1]
          const ke = D - 2 * max(0, D - N), o_ = 1 - o
          for (let k = 2 * max(0, D - M) - D; k <= ke; k += 2) {
            const ca = c[(k - 1) % Z], cb = c[(k + 1) % Z]
            let a = k === -D || k !== D && ca < cb ? cb : ca + 1, b = a - k
            const s = a, t = b, lo = D - o, k_ = delta - k
            while (a < N && b < M && A[o_ * N + os * a - o_] === B[o_ * M + os * b - o_]
            ) { a += 1, b += 1 } c[k % Z] = a
            if (L % 2 === o && -lo <= k_ && k_ <= lo && a + d[k_ % Z] >= N) {
              let [D_, x, y, u, v] = of ? [2 * D - 1, s, t, a, b]
                : [2 * D, N - a, M - b, N - s, M - t]
              if (D_ > 1 || x !== u && y !== v) { // maybe do some merge here
                return diff(A.slice(0, x), B.slice(0, y), i, j)
                  .concat(diff(A.slice(u), B.slice(v), i + u, j + v))
              } else if (M > N) { return diff([], B.slice(N), i + N, j + N) }
              else if (M < N) { return diff(A.slice(M), [], i + M, j + M) }
              else { return [] }
            }
          }
        }
      }
    } else if (N > 0) { return [{ type: 'delete', old: i, length: N }] }
    else if (M > 0) { return [{ type: 'insert', old: i, new: j, length: M }] }
    else { throw new Error('can\'t diff') }
  }
} { // load monaco editor -----------------------------------------------------
  $.monaco_root = 'common/monaco-editor/min/vs'
  const css = dom('style'), js = dom('script')
  css.innerHTML = /* We must define the font face outside the shadowroot */ `@font-face {
      font-family: 'codicon';
      src: url('${monaco_root}/base/browser/ui/codicons/codicon/codicon.ttf') format('truetype');
    }`, js.src = `${monaco_root}/loader.js`
  document.head.append(css, js)
  await new Promise(r => { js.addEventListener('load', r) })
  let r, p = new Promise(a => r = a), rq = window.require
  rq.config({ paths: { vs: monaco_root, "vs/css": { disabled: true } } })
  rq(["vs/editor/editor.main"], r); await p
} { // time & frame -----------------------------------------------------------
  $.time = { current: 0, delta: 0, maxdelta: 1 / 60 }
  time.now = () => performance.now() / 1000
  $.listenframe = f => fs.add(f)
  $.cancelframe = f => fs.delete(f)
  let fs = new Set, frame = t => {
    let pt = time.current, ct = time.current = t / 1000
    time.delta = Math.min(ct - pt, time.maxdelta)
    requestAnimationFrame(frame)
    for (const f of fs) { f() }
  }; requestAnimationFrame(frame)
} { // global pointer event ---------------------------------------------------
  let fs = [], mfs = new Set
  let u = e => { for (const f of fs) { f(e) } fs = [] }
  let m = e => { for (const f of mfs) { f(e) } }
  $.listenpointerdown = (e, f) => (
    e.addEventListener('mousedown', f),
    e.addEventListener('touchstart', f))
  $.listenpointerup = f => fs.push(f)
  $.listenpointermove = f => mfs.add(f)
  $.cancelpointermove = f => mfs.delete(f)
  window.addEventListener('mouseup', u)
  window.addEventListener('touchend', u)
  window.addEventListener('mousemove', m)
  window.addEventListener('touchmove', m)
} { // seed random ------------------------------------------------------------
  let { imul, log, cos, sqrt, ceil, PI, floor, random } = Math, mb32 =
    a => t => (a = a + 1831565813 | 0, t = imul(a ^ a >>> 15, 1 | a),
      t = t + imul(t ^ t >>> 7, 61 | t) ^ t, (t ^ t >>> 14) >>> 0) / 4294967296
  $.gseed = $.startseed = floor(4294967296 * random())
  $.nextseed = (s = floor(4294967296 * mb32(gseed)()), o = genrd(gseed = s)) => (
    $.rd = o.rd, $.gaussian = o.gaussian, $.rdi = o.rdi)
  $.genrd = (seed, _rd = mb32(seed)) => {
    let rd = (a = 1, b) => (b ? 0 : (b = a, a = 0), _rd() * (b - a) + a)
    let rdi = (a, b) => ceil(rd(a, b))
    let gaussian = (mean = 0, stdev = 1) => {
      let u = 1 - rd(), v = rd()
      let z = sqrt(-2.0 * log(u)) * cos(2.0 * PI * v)
      return z * stdev + mean
    } // Standard Normal variate using Box-Muller transform
    return { rd, rdi, gaussian }
  }; nextseed(0, genrd(gseed))
} { // sha256 -----------------------------------------------------------------
  $.encodetext = data => typeof TextEncoder === "undefined"
    ? Buffer.from(data) : (new TextEncoder).encode(data)
  $.sha256 = data => {
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19
    let tsz = 0, bp = 0, k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]
    const rrot = (x, n) => (x >>> n) | (x << (32 - n))
    const w = new Uint32Array(64), buf = new Uint8Array(64)
    const process = () => {
      for (let j = 0, r = 0; j < 16; j++, r += 4) {
        w[j] = (buf[r] << 24) | (buf[r + 1] << 16) | (buf[r + 2] << 8) | buf[r + 3]
      }
      for (let j = 16; j < 64; j++) {
        let s0 = rrot(w[j - 15], 7) ^ rrot(w[j - 15], 18) ^ (w[j - 15] >>> 3)
        let s1 = rrot(w[j - 2], 17) ^ rrot(w[j - 2], 19) ^ (w[j - 2] >>> 10)
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7
      for (let j = 0; j < 64; j++) {
        let S1 = rrot(e, 6) ^ rrot(e, 11) ^ rrot(e, 25)
        let ch = (e & f) ^ ((~e) & g), t1 = (h + S1 + ch + k[j] + w[j]) | 0
        let S0 = rrot(a, 2) ^ rrot(a, 13) ^ rrot(a, 22)
        let maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) | 0
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0
      bp = 0;
    }, add = data => {
      if (typeof data === "string") { data = encodetext(data) }
      for (let i = 0; i < data.length; i++) {
        buf[bp++] = data[i]; if (bp === 64) { process() }
      } tsz += data.length
    }, digest = () => {
      buf[bp++] = 0x80; if (bp == 64) process()
      if (bp + 8 > 64) { while (bp < 64) { buf[bp++] = 0x00 } process() }
      while (bp < 58) { buf[bp++] = 0x00 }
      // Max number of bytes is 35,184,372,088,831
      let L = tsz * 8; buf[bp++] = (L / 1099511627776.) & 255
      buf[bp++] = (L / 4294967296.) & 255; buf[bp++] = L >>> 24
      buf[bp++] = (L >>> 16) & 255; buf[bp++] = (L >>> 8) & 255
      buf[bp++] = L & 255; process(); let r = new Uint8Array(32)
      r[0] = h0 >>> 24; r[1] = (h0 >>> 16) & 255; r[2] = (h0 >>> 8) & 255; r[3] = h0 & 255
      r[4] = h1 >>> 24; r[5] = (h1 >>> 16) & 255; r[6] = (h1 >>> 8) & 255; r[7] = h1 & 255
      r[8] = h2 >>> 24; r[9] = (h2 >>> 16) & 255; r[10] = (h2 >>> 8) & 255; r[11] = h2 & 255
      r[12] = h3 >>> 24; r[13] = (h3 >>> 16) & 255; r[14] = (h3 >>> 8) & 255; r[15] = h3 & 255
      r[16] = h4 >>> 24; r[17] = (h4 >>> 16) & 255; r[18] = (h4 >>> 8) & 255; r[19] = h4 & 255
      r[20] = h5 >>> 24; r[21] = (h5 >>> 16) & 255; r[22] = (h5 >>> 8) & 255; r[23] = h5 & 255
      r[24] = h6 >>> 24; r[25] = (h6 >>> 16) & 255; r[26] = (h6 >>> 8) & 255; r[27] = h6 & 255
      r[28] = h7 >>> 24; r[29] = (h7 >>> 16) & 255; r[30] = (h7 >>> 8) & 255; r[31] = h7 & 255
      return r
    }; if (data === undefined) return { add, digest }
    add(data); return digest()
  }
  $.hmac_sha256 = (key, message) => {
    if (typeof key === "string") { key = encodetext(key) }
    if (key.length > 64) { key = sha256(key) }
    let inner = new Uint8Array(64).fill(0x36)
    let outer = new Uint8Array(64).fill(0x5c)
    for (let i = 0; i < key.length; i++)
      (inner[i] ^= key[i], outer[i] ^= key[i])
    let pass1 = sha256(), pass2 = sha256()
    pass1.add(inner), pass1.add(message)
    pass2.add(outer), pass2.add(pass1.digest())
    return pass2.digest()
  }
}

$.graph = ($ = { g: {}, i: 0 }) => {
  with ($) {
    $.addnode = (id = i++) => g[id] =
      { id, to: {}, from: {}, nto: 0, nfrom: 0, children: {} }
    $.delnode = (id, n = g[id]) => {
      for (const k in n.to) { deledge(id, k) } delete g[id]
      for (const k in n.from) { deledge(k, id) }
    }
    $.addedge = (a, b, n) => {
      const o = { o: g[b] }; if (n) { o.name = n, g[a].children[n] = b }
      g[a].to[b] = o, g[b].from[a] = g[a]
      g[a].nto++, g[b].nfrom++
    }
    $.deledge = (a, b) => {
      let n = g[a].to[b].name; if (n) { delete g[a].children[n] }
      g[a].nto--, g[b].nfrom--
      delete g[a].to[b], delete g[b].from[a]
    }
    $.nameedge = (a, b, n) => (
      g[a].children[n] = b, g[a].to[b].name = n)
    $.unnameedge = (a, b, n = g[a].to[b].name) => (
      delete g[a].children[n], delete g[a].to[b].name)
    $.unnameedgebyname = (a, n, b = g[a].children[n]) => (
      delete g[a].children[n], delete g[a].to[b].name)
    $.renameedge = (a, n, nn, b = g[a].children[n]) => (
      delete g[a].children[n], g[a].children[nn] = b, g[a].to[b].name = nn)
    $.deltree = n => { for (const k in g[n].to) { deltree(k) } delnode(n) }
    $.addtonode = (a, name, id) => {
      const b = addnode(id); addedge(a, b.id, name); return b
    }

    $.clear = () => g = {}
  } return $
}

$.git = ($ = graph()) => {
  with ($) {
    $.locatebypath = (node, path = '') => {
      if (!Array.isarr(path)) { path = path.split('/') }
      let n = node, name; while (path.length > 0) {
        let t = g[n].type
        if (t === 'link') { n = g[n].value }
        name = path.shift(); if (name === '.') { continue }
        else if (name === '..') {
          if (n.nfrom !== 1) { throw `invalid path: ${path}` }
          n = n.from[Object.keys(n.from)[0]]
        } else {
          n = g[n].child[name]
          if (!n) { throw `invalid path: ${path}` }
        }
      } return n
    }
    $.read = (ver, path) => {
      const n = locatebypath(ver, path)
      const value = g[n].value, type = g[n].type
      if (type === 'file') { return g[value].value }
      else if (type === 'link') { return { type, value } }
      else if (type === 'dir') { return { type } }
    }
    $.dir = ver => Object.keys(g[ver].to).map(k => g[ver].to[k].o)
    $.addhashobj = (h, t) => {
      const o = addnode(h); o.type = 'hashobj', o.value = t
    }
    $.write = (ver, path, text) => {
      path = path.split('/'); const name = path.splice(-1)
      const loc = locatebypath(ver, path), b = addtonode(loc, name)
      const h = hexenc(sha256(text))
      if (g[h]) { addhashobj(h, text) } addedge(b, h)
      b.type = 'file', b.value = h
    }
    $.writedir = (ver, path) => {
      path = path.split('/'); const name = path.splice(-1)
      const loc = locatebypath(ver, path), b = addtonode(loc, name)
      b.type = 'dir'
    }
    $.link = (ver, path, ref) => {
      path = path.split('/'); const name = path.splice(-1)
      const loc = locatebypath(ver, path), b = addtonode(loc, name)
      b.type = 'link', b.value = ref
    }

    $.remove = (ver, path) => deltree(locatebypath(ver, path))
    $.rename = (ver, path, nn) => {
      path = path.split('/'); const name = path.splice(-1)
      const loc = locatebypath(ver, path), b = addtonode(loc, name)
    }

    $.newver = prev => { }
    $.merge = (a, b) => { }
    $.writedes = ver => { }
    $.readdes = ver => { }
  } return $
}

log(hexenc(sha256('3453h2fdfw42f2eg3rg')))
log(await sha256async('3453h2fdfw42f2eg3rg'))