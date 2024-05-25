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

$.graph = ($ = eventnode({ g: {}, i: 0 })) => {
  with ($) {
    $.addnode = (id = i++) => {
      const o = { id, to: {}, from: {}, nto: 0, nfrom: 0, children: {} }
      g[id] = o; emit('addnode', { id, o }); return o
    }
    $.delnode = (id, n = g[id]) => {
      for (const k in n.to) { deledge(id, k) } delete g[id]
      for (const k in n.from) { deledge(k, id) } emit('delnode', { id, o })
    }
    $.addedge = (a, b, n) => {
      const o = { o: g[b] }; if (n) { o.name = n, g[a].children[n] = b }
      g[a].to[b] = o, g[b].from[a] = g[a]
      g[a].nto++, g[b].nfrom++, emit('addedge', { a, b, o })
    }
    $.deledge = (a, b) => {
      let ao = g[a]
      let o = g[a].to[b], n = o.name; if (n) { delete g[a].children[n] }
      delete g[a].to[b], delete g[b].from[a]
      g[a].nto--, g[b].nfrom--, emit('deledge', { a, b, o })
    }
    $.nameedge = (a, b, n) => (g[a].children[n] = b,
      g[a].to[b].name = n, emit('nameedge', { o: g[a].to[b] }))
    $.unnameedge = (a, b, n = g[a].to[b].name) => (delete g[a].children[n],
      delete g[a].to[b].name, emit('nameedge', { o: g[a].to[b] }))
    $.unnameedgebyname = (a, n, b = g[a].children[n]) => (delete g[a].children[n],
      delete g[a].to[b].name, emit('nameedge', { o: g[a].to[b] }))
    $.renameedge = (a, n, nn, b = g[a].children[n]) => (delete g[a].children[n],
      g[a].children[nn] = b, g[a].to[b].name = nn, emit('nameedge', { o: g[a].to[b] }))
    $.deltree = n => { for (const k in g[n].to) { deltree(k) } delnode(n) }
    $.addtonode = (a, name, id) => {
      if (!g[a]) { throw `non exist node: ${a}` }
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
          n = g[n].children[name]
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
    $.addhashobj = (h, t) => {
      const o = addnode(h); o.type = 'hashobj', o.value = t
    }
    $.writefile = (loc, name, text) => {
      const b = addtonode(loc, name), h = hexenc(sha256(text))
      if (g[h]) { addhashobj(h, text) } addedge(b, h)
      b.type = 'file', b.value = h; return b
    }
    $.writedir = (loc, name) => {
      const b = addtonode(loc, name)
      b.type = 'dir'; return b
    }
    $.writelink = (loc, name, ref) => {
      const b = addtonode(loc, name)
      b.type = 'link', b.value = ref; return b
    }
    $.newver = prev => {
      if (prev !== undefined) { o = addtonode(prev) }
      else { o = addnode() } o.type = 'version', o.verid = uuid()
      if (prev !== undefined) { copytree(prev, o.id) } return o
    }
    $.copytree = (a, b) => {
      for (const t in g[a].to) if (g[t].type !== 'version') {
        copytree(t, addtonode(b, g[a].to[t].name).id)
        log(t)
        // Object.assign(g[a], g[b])
      }
    }
    $.merge = (a, b) => { }
    $.writedes = (ver, text) => { g[ver].description = text }
    $.readdes = ver => delete g[ver].description
  } return $
}

$.graphlayout = ($ = eventnode({ g: graph() })) => {
  with ($) {
    g.on('addnode', ({ o }) => newnodeelm(o))
    g.on('delnode', ({ o }) => o.elm.remove())
    g.on('addedge', ({ o }) => newedgeelm(o))
    g.on('deledge', ({ o }) => o.elm.remove())
    g.on('nameedge', ({ o }) => nameedgeelm(o))
    $.addnode = id => newnodeelm(g.addnode(id))
    $.delnode = id => (g.delnode(...a), g.g[id].elm.remove())
    $.addedge = (a, b, n) => (g.addedge(a, b, n), newedgeelm(g.g[a], g.g[b]))
    $.deledge = (a, b) => (g.deledge(a, b), g.g[a].to[b].elm.remove())
    $.nameedge = (a, b, n) => (g.nameedge(a, b, n), nameedgeelm(g.g[a].to[b]))
    $.unnameedge = (a, b) => (g.unnameedge(a, b), nameedgeelm(g.g[a].to[b]))
    $.unnameedgebyname = (a, n, b = g.g[a].children[n]) => (
      g.unnameedgebyname(a, n, b), nameedgeelm(g.g[a].to[b]))
    $.renameedge = (a, n, nn, b = g.g[a].children[n]) => (
      g.nameedge(a, n, nn, b), nameedgeelm(g.g[a].to[b]))
    $.deltree = n => { for (const k in g[n].to) { deltree(k) } delnode(n) }
    $.addtonode = (a, n, id) => {
      if (!g.g[a]) { throw `non exist node: ${a}` }
      const b = addnode(id); addedge(a, b.id, name); return b
    }
    $.clear = () => (g.clear(), sep.innerHTML = sen.innerHTML = '')
    $.namenode = (n, name, t = n.elm.text) => (
      t.textContent = name, t.setAttribute('transform',
        `translate(-${t.getBBox().width / 2}, -${circlesize + 1})`))
    $.nameedgeelm = c => c.name ? c.elm.text.textContent = c.name : 0

    $.rd = genrd(795304884).rd
    $.newpos = (n, d = n.data) => {
      d.pos = { x: rd(-1, 1) * target_length, y: rd(-1, 1) * target_length }
      d.vec = { x: 0, y: 0 }, d.acc = { x: 0, y: 0 }
      d.mat = 1, d.ecc = 1; return n
    }
    const { sqrt, max, min, sign, abs } = Math
    $.layout = ns => {
      const electric = (b, p, ad, ap, m = 1) => {
        const bd = b.data, bp = bd.pos
        const pdx = bp.x - ap.x, pdy = bp.y - ap.y
        const lsq = max(pdx * pdx + pdy * pdy, m), l = sqrt(lsq)
        const f = ad.ecc * bd.ecc / lsq * p / l
        const fx = f * pdx, fy = f * pdy
        ad.acc.x += fx / ad.mat, ad.acc.y += fy / ad.mat
        bd.acc.x -= fx / bd.mat, bd.acc.y -= fy / bd.mat
      }
      const distance = (b, p, ad, ap) => {
        const bd = b.data, bp = bd.pos
        const pdx = bp.x - ap.x, pdy = bp.y - ap.y
        const fx = p * pdx, fy = p * pdy
        ad.acc.x += fx / ad.mat, ad.acc.y += fy / ad.mat
        bd.acc.x -= fx / bd.mat, bd.acc.y -= fy / bd.mat
      }
      const gravity = newpos({ data: {} }); total_speed = 0
      gravity.data.pos.x = gravity.data.pos.y = 0
      let tl = target_length, ts = target_speed, dt = 0.05
      let ep = -(tl ** 2) * ts, ed = 1 / tl * ts * 20
      for (let i = 0, l = ns.length; i < l; i++) {
        const a = ns[i], ad = a.data, ap = ad.pos
        for (let j = i + 1; j < l; j++) { electric(ns[j], ep, ad, ap) }
        for (const k in a.to) { distance(a.to[k].o, ed / a.nto, ad, ap) }
        if (ad.hardlock) { ad.vec.x = ad.vec.y = 0; continue }
        distance(gravity, 0.05 * ed, ad, ap)
        let vx = ad.vec.x + ad.acc.x * dt, vy = ad.vec.y + ad.acc.y * dt
        let v = sqrt(vx * vx + vy * vy), vrx = vx / v, vry = vy / v
        total_speed += v = max(min(v, ts) - ts * friction, 0)
        ad.vec.x = vx = v * vrx, ad.vec.y = vy = v * vry
        if (ad.lock) { ad.vec.x = ad.vec.y = 0; continue }
        ap.x += vx * dt, ap.y += vy * dt
        ad.oldacc = { ...ad.acc }, ad.acc.x = ad.acc.y = 0
      } layouttime += time.realdelta
    }
    $.target_length = 125, $.target_speed = 250, $.friction = 0.01
    $.draw = ns => {
      const w = se.clientWidth, h = se.clientHeight
      const x = w / 2 + camera.x, y = h / 2 + camera.y
      const transtr = `translate(${sorigin.x}, ${sorigin.y}) scale(${camera.s}) translate(${x}, ${y})`
      sep.setAttribute('transform', transtr)
      sep.setAttribute('fill', 'none')
      sep.setAttribute('stroke', 'black')
      sep.setAttribute('stroke-width', linewidth + 'px')
      sep.setAttribute('stroke-linecap', 'round')
      sen.setAttribute('transform', transtr)
      if (stop) { return } for (const n of ns) {
        const { x, y } = n.data.pos, e = n.elm
        e.setAttribute('transform', `translate(${x}, ${y})`)
        for (const k in n.to) {
          const b = n.to[k], bp = b.o.data.pos, e = b.elm, arws = 2
          if (b.o === n) {
            const c = arws, r = circlesize - linewidth / 2, r2 = r * 2
            e.path.setAttribute('d', `M ${x + r} ${y} m ${r} 0 ` +
              `a ${r},${r} 0 1,0 ${-r2}, 0 a ${r},${r} 0 1,0 ${r2}, 0 ` +
              `M ${x + r2 + c} ${y + c} L ${x + r2} ${y} L ${x + r2 - c} ${y + c}`)
            e.text.setAttribute('transform', `translate(${x + r2} ${y})`)
          } else {
            let dx = bp.x - x, dy = bp.y - y, s = 0.6, c = arws
            let mx = x + dx * 0.5, my = y + dy * 0.5
            mx = x + dx * s, my = y + dy * s
            e.text.setAttribute('transform', `translate(${mx}, ${my})`)
            let l = 1 / sqrt(dx * dx + dy * dy); dx *= l * c, dy *= l * c
            e.path.setAttribute('d', `M ${x} ${y} L ${bp.x} ${bp.y} ` +
              `M ${mx + dy} ${my - dx} L ${mx + dx} ${my + dy} L ${mx - dy} ${my + dx}`)
          }
        }
      }
    }
    $.stop = false, $.layouttime = 0, $.multirun = 4
    $.total_speed = 0, $.total_accelaration = 0
    $.frame = () => {
      const ns = [], es = [], _g = g.g; for (const k in _g) {
        const n = _g[k]; if (!n.data) { n.data = {} } const d = n.data
        if (!d.pos) { newpos(n) } ns.push(n); const e = []
        for (const id in n.to) { e.push(n, n.to[id].o) } es.push(e)
      } if (!stop) {
        for (let i = 0; i < multirun; i++) { layout(ns) }
        if (total_speed === 0) { emit('layoutend', layouttime), stop = true }
      } draw(ns)
    }
    $.reset = () => { stop = false, layouttime = 0 }
    $.camera = { x: 0, y: 0, s: 1 }
    $.sorigin = { x: 0, y: 0 } // scale origin
    $.screen2svgcoord = (c = camera) => (x, y) => {
      const w = se.clientWidth, h = se.clientHeight
      x = (x - sorigin.x) / camera.s - (c.x + w / 2)
      y = (y - sorigin.y) / camera.s - (c.y + h / 2)
      return { x, y }
    }
    const sty = dom('style'); sty.innerHTML = `svg circle:hover { fill: red; }`
    // + `svg text { fill: white; stoke: black; stroke-width: 0.2px; font-size: 10px; }`
    $.se = svg('svg'); se.style.display = 'block'
    se.style.userSelect = se.style.touchAction = 'none'
    se.style.height = se.style.width = '100%'
    $.sep = svg('g'), $.sen = svg('g'); se.append(sep, sen, sty)
    listenpointerdown(se, e => {
      if (e.target !== se) { return }
      const c = { ...camera }, s = screen2svgcoord(c)
      const o = s(...geteventlocation(e)), m = e => {
        if (e.touches && e.touches.length > 2) { return emit('3finger', e) }
        if (e.touches && e.touches.length === 2) { return pinch(e) }
        const { x, y } = s(...geteventlocation(e))
        camera.x = c.x + x - o.x, camera.y = c.y + y - o.y
      }; listenpointermove(m), listenpointerup(() => (
        lpd = null, cancelpointermove(m)))
    }) // last pinch distance
    $.lpd = null, $.pinch = (e, et = e.touches) => {
      const { left: l, top: t } = se.getBoundingClientRect()
      let a = { x: et[0].pageX - l, y: et[0].pageY - t }
      let b = { x: et[1].pageX - l, y: et[1].pageY - t }
      let d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
      if (d === lpd) { return } if (lpd === null) { lpd = d }
      zoom([(a.x + b.x) / 2, (a.y + b.y) / 2], d / lpd); lpd = d
    }
    se.addEventListener('wheel', (e, r = 1.2) => e.deltaY < 0
      ? zoom(geteventlocation(e), r) : zoom(geteventlocation(e), 1 / r))
    $.zoom = ([x, y], f, s) => (s = camera.s,
      camera.s = s * f, f = camera.s / s,
      sorigin.x = x - (x - sorigin.x) * f,
      sorigin.y = y - (y - sorigin.y) * f)
    $.circlesize = 7, $.linewidth = 1
    $.newnodeelm = n => {
      const g = svg('g'), c = svg('circle'), t = svg('text')
      if (n.name) { t.textContent = n.name } g.text = t
      g.append(c, t), sen.append(g)
      c.setAttribute('r', circlesize + 'px')
      t.setAttribute('fill', 'white')
      t.setAttribute('stroke', 'black')
      t.setAttribute('stroke-width', '0.2px')
      t.setAttribute('font-size', '5px')
      t.setAttribute('transform',
        `translate(-${t.getBBox().width / 2}, -${circlesize + 1})`)
      listenpointerdown(c, e => {
        if (e.target !== c) { return }
        let moveed = false, m = e => {
          if (e.touches && e.touches.length > 1) { return }
          moveed = true; c.setAttribute('fill', 'red'); reset()
          const { x, y } = screen2svgcoord()(...geteventlocation(e))
          n.data.pos.x = x, n.data.pos.y = y, n.data.lock = true
        }; listenpointermove(m), listenpointerup(() => (
          moveed ? 0 : emit('nodeclick', { o: n }),
          c.removeAttribute('fill'),
          delete n.data.lock, cancelpointermove(m)))
      }); n.elm = g; return n
    }
    $.newedgeelm = o => {
      const g = svg('g'), p = svg('path'), t = svg('text')
      const c = o, n = c.name
      t.setAttribute('fill', 'black')
      t.setAttribute('stroke', 'white')
      t.setAttribute('stroke-width', '0.2px')
      t.setAttribute('font-size', '5px')
      if (n) { t.textContent = n }
      c.elm = g, g.path = p; g.text = t
      g.append(p, t), sep.append(g)
    }
    $.geteventlocation = (e, ef = e.touches) => {
      const { left: l, top: t } = se.getBoundingClientRect()
      return ef && ef.length == 1 ?
        [ef[0].pageX - l, ef[0].pageY - t] : [e.pageX - l, e.pageY - t]
    }
  } return $
}

$.giteditor = ($ = {}) => {
  with ($) {
    $.git = git(), $.g = graphlayout()
    $.setprop = (o, k, v) => (o[k] = v, o)
    $.newver = (p, o = git.newver(p)) => {
      const n = p !== undefined ? g.addtonode(p) : g.addnode()
      n.type = 'version'; return n
    }
    $.write = (mode, node, name, extra) => {
      let o; switch (mode) {
        case 'file': o = git.writefile(node, name, extra); break
        case 'dir': o = git.writedir(node, name); break
        case 'link': o = git.writelink(node, name, extra); break
      } return setprop(g.addnode(o.id), 'type', mode)
    }
    Object.defineProperty($, 'elm', { get: () => g.se })
    $.frame = g.frame
    g.on('nodeclick', ({ o }) => {
      log(o)
    })
  } return $
}

$.gengraph = (l = 100, g = giteditor()) => {
  const { floor, abs } = Math, ids = []
  for (let i = 0; i < 5; i++) { ids.push(g.newver().id) }
  for (let i = 0; i < l; i++) {
    let r = floor(abs(gaussian(0, 2)) * 1) + (rd() > 0.5 ? 1 : 0)
    let a = ids[i], s = [...ids]
    for (let j = 0; j < r && s.length > 0; j++) {
      const k = s.splice(floor(rd(s.length)), 1)[0]
      const n = g.newver(k).id
      ids.push(n), s.push(n)
    }
  }
  return g
}

$.ge = gengraph()
document.body.append(ge.elm)
listenframe(() => ge.frame())