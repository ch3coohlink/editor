// 21 - save/load from local repo

{ // basic utility ------------------------------------------------------------
  $._ = undefined
  $.wait = t => new Promise(r => setTimeout(r, t))
  $.debounce = (f, t = 100, i) => (...a) =>
    (clearTimeout(i), i = setTimeout(() => f(...a), t))
  $.debounceasync = (f, t = 100, i) => (...a) =>
    new Promise((r, j) => (clearTimeout(i), i = setTimeout(
      async () => { try { r(await f(...a)) } catch (e) { j(e) } }, t)))
  $.throttle = (f, t = 100, i) => (...a) =>
    i ? 0 : (i = 1, f(...a), setTimeout(() => i = 0, t))
  $.hexenc = b => [...b].map(v => v.toString(16).padStart(2, '0')).join("")
  $.uuid_length = 32, $.uuid = (d = uuid_length) =>
    hexenc(crypto.getRandomValues(new Uint8Array(d)))
  $.sha256async = async t => hexenc(new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))))
  let { max, min } = Math; $.clamp = (v, s, l) => max(min(v, l), s)
  $.dom = (n = 'div') => document.createElement(n)
  $.svg = n => document.createElementNS('http://www.w3.org/2000/svg', n)
  const dfrag = document.createDocumentFragment.bind(document)
  $.dsplice = (p, i, c, ...n) => {
    const d = p.childNodes, rm = [], l = d.length
    const f = dfrag(), s = i < 0 ? l + i : i
    const e = typeof c === 'number' ? s + c : l
    for (let i = e; i < s; i++) if (d[s]) rm.push(p.removeChild(d[s]))
    for (const e of n) { f.appendChild(e) }
    p.insertBefore(f, d[s]); return rm
  }
  const es = Symbol('eventid'); $.eventnode = ($ = {}) => {
    $._handles = {}; with ($) {
      let i = 0, giveid = (f, id = i++) => typeof f[es] === 'number' ? f[es] : f[es] = id
      $.emit = (t, ...arg) => {
        const ht = _handles[t]
        if (lock > 0) { da.push((arg.unshift(t), arg)) } else if (ht) {
          const a = [], b = []; for (let [id, f] of ht) {
            f = f.deref ? f.deref() : f; f ? a.push(f) : b.push(id)
          } for (const i of b) { ht.delete(i) }
          for (const f of a) { f(...arg) }
        }
      }; $.on = (t, f) => (_handles[t] ??= new Map).set(giveid(f), f)
      $.onweak = (t, f) => (_handles[t] ??= new Map).set(giveid(f), new WeakRef(f))
      let da = [], lock = 0
      $.setdelay = (locklevel = 1) => { lock = Math.max(locklevel, lock) }
      $.enddelay = (unlocklevel = 1) => {
        if (unlocklevel < lock) { return }
        lock = 0; for (const a of da) { emit(...a) } da = []
      }
      $.off = (t, f) => (_handles[t]?.delete(f[es]),
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
  $.bimap = ($ = { am: new Map, bm: new Map }) => {
    with ($) {
      $.set = (a, b) => (am.set(a, b), bm.set(b, a))
      $.get = a => am.get(a), $.getr = b => bm.get(b)
      $.del = a => am.delete(a), $.delr = b => bm.delete(b)
    } return $
  }
} { // diff algorithm ---------------------------------------------------------
  const { min, max } = Math
  const arr = () => new Proxy({}, { get: (t, k) => t[k] ?? 0 })
  $.diff = (A, B, i = 0, j = 0) => {
    const N = A.length, M = B.length; if (!(N > 0 && M > 0))
      return N > 0 ? [{ as: i, al: N, bs: j, bl: 0 }]
        : M > 0 ? [{ as: i, al: 0, bs: j, bl: M }] : []
    const L = N + M, Z = 2 * min(N, M) + 2, delta = N - M, g = arr(), p = arr()
    for (let D = 0, l = (L >>> 1) + (L % 2 !== 0) + 1; D < l; D++) {
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
  $.diff3 = (o, a, b) => {
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
          h = rhs.shift(); const b = bounds[h.ab]
          b[0] = min(h.abs, b[0]), b[1] = max(h.abs + h.abl, b[1])
          b[2] = min(h.os, b[2]), b[3] = max(h.os + h.ol, b[3])
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
  $.listenpreframe = f => pfs.add(f)
  $.cancelpreframe = f => pfs.delete(f)
  $.listenframe = f => fs.add(f)
  $.cancelframe = f => fs.delete(f)
  let fs = new Set, pfs = new Set, frame = t => {
    let pt = time.current, ct = time.current = t / 1000
    time.delta = ct - pt; requestAnimationFrame(frame)
    for (const f of pfs) { f() } for (const f of fs) { f() }
  }; requestAnimationFrame(frame)
  $.setvaluebytime = (f, e, l = 0.5) => {
    let t = 0, s = () => {
      if (t > l) { f(1); if (e) { e() } cancelpreframe(s) }
      else { f(t / l); t += time.delta }
    }; listenpreframe(s)
  }
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
  $.geteventlocation = (e, ef = e.touches) => ef && ef.length == 1
    ? { x: ef[0].pageX, y: ef[0].pageY } : { x: e.pageX, y: e.pageY }
} { // seed random ------------------------------------------------------------
  let { imul, log, cos, sqrt, ceil, PI, floor, random } = Math, mb32 =
    a => t => (a = a + 1831565813 | 0, t = imul(a ^ a >>> 15, 1 | a),
      t = t + imul(t ^ t >>> 7, 61 | t) ^ t, (t ^ t >>> 14) >>> 0) / 4294967296
  $.gseed = $.startseed = floor(4294967296 * random())
  $.nextseed = (s = floor(4294967296 * mb32(gseed)()), o = genrd(gseed = s)) => (
    $.rd = o.rd, $.gaussian = o.gaussian, $.rdi = o.rdi)
  $.genrd = (seed, _rd = mb32(seed)) => {
    let rd = (a = 1, b) => (b ? 0 : (b = a, a = 0), _rd() * (b - a) + a)
    let rdi = (a, b) => floor(rd(a, b))
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
} { // global css rule --------------------------------------------------------
  const s = dom('style')
  s.innerHTML = `.no-scroll-bar {
  -ms-overflow-style: none;  /* Internet Explorer 10+ */
  scrollbar-width: none;  /* Firefox */
}
.no-scroll-bar::-webkit-scrollbar { 
  display: none;  /* Safari and Chrome */
}`; document.head.append(s)
} { // docker system ----------------------------------------------------------
  $.splitctn = ($ = dom()) => {
    with ($) {
      $.arr = []; let df; {
        className = 'split-container'
        style.width = style.height = '100%'
        style.flexBasis = '100%'
        style.display = 'flex'
        Object.defineProperty($, 'direction', {
          set: v => {
            df = v === 'vertical'
            style.flexDirection = df ? 'column' : 'row'
            let c = dcstr(); for (const e of children)
              if (dragbar.is(e)) { e.style.cursor = c }
          }, get: () => df ? 'vertical' : 'horizontal',
        })
      } Object.defineProperty($, 'size', { get: () => arr.length })
      const dcstr = () => (df ? 'ns' : 'ew') + '-resize'
      const dragbar = () => {
        const d = dom(); {
          d.className = 'dragbar'
          d.style.flexBasis = '2px'
          d.style.flexShrink = '0'
          d.style.background = '#c9c9c9'
          d.style.userSelect = 'none'
          d.style.cursor = dcstr()
        }
        listenpointerdown(d, e => {
          const c = [...children]
          const i = c.indexOf(d)
          const a = c[i - 1], b = c[i + 1]
          const ab = a.getBoundingClientRect()
          const bb = b.getBoundingClientRect()
          const cb = d.getBoundingClientRect()
          const m = e => {
            const p = geteventlocation(e)
            let r; if (df) {
              r = (p.y - ab.top) / (ab.height + bb.height + cb.height)
            } else {
              r = (p.x - ab.left) / (ab.width + bb.width + cb.width)
            }
            a.style.flexBasis = (clamp(r, 0, 1) * 100).toFixed(0) + '%'
            b.style.flexBasis = ((1 - clamp(r, 0, 1)) * 100).toFixed(0) + '%'
          }
          listenpointermove(m); listenpointerup(() => cancelpointermove(m))
        })
        return d
      }, del = () => splitctn.is(parentNode) ?
        parentNode.delitem($) : $.remove()
      dragbar.is = n => n.classList.contains('dragbar')
      $.update = () => {
        $.innerHTML = ''; let a = [], l = arr.length - 1
        if (l < 0) { return } for (let i = 0; i < l; i++) {
          a.push(arr[i], dragbar())
        } a.push(arr[l]); $.append(...a)
        arr.forEach(e => e.style.flexBasis = '100%')
      }
      $.getindex = e => arr.indexOf(e)
      $.additem = (e, i = 0) => { arr.splice(i, 0, e), update() }
      $.rplitem = (a, b, i = arr.indexOf(a)) => i >= 0
        ? (delitem(a), additem(b, i)) : 0
      $.delitem = (e, i = getindex(e)) => {
        if (i >= 0) { arr.splice(i, 1), update() }
        else return; if (size === 0) { del() }
      }
      direction = 'vertical'
    } return $
  }; splitctn.is = n => n.classList.contains('split-container')
  $.docking = ($ = dom()) => {
    with ($) {
      { // style ----------------------------------------------------------------
        className = 'docking'
        style.display = 'flex'
        style.flexBasis = '100%'
        style.flexDirection = 'column'
        style.overflow = 'hidden'
        style.position = 'relative'
      } $.tabs = dom(); {
        tabs.className = 'tab-list'
        tabs.style.height = '30px'
        tabs.style.background = '#00000010'
        tabs.style.borderBottom = '1px solid #c9c9c9'
        tabs.style.display = 'flex'
        tabs.style.flexShrink = '0'
        tabs.style.alignItems = 'center'
        tabs.style.overflow = 'hidden'
        tabs.style.overflowX = 'auto'
        tabs.style.userSelect = 'none'
        tabs.classList.add('no-scroll-bar')
      } $.ctn = dom(); {
        ctn.className = 'tab-content'
        ctn.style.overflow = 'hidden'
        ctn.style.height = '100%'
      } $.idf = dom(); { // identifier ------------------------------------------
        idf.className = 'position-identifier'
        idf.style.position = 'absolute'
        idf.style.zIndex = '100'
        idf.style.transition = 'all 0.1s'
        idf.style.pointerEvents = 'none'
        $.setidf = (x, y, w, h, c = '#006eff75') => {
          idf.style.background = c
          idf.style.left = x + 'px'
          idf.style.top = y + 'px'
          idf.style.width = w + 'px'
          idf.style.height = h + 'px'
        }, $.hideidf = () => {
          idf.style.background = 'transparent'
        }, hideidf(), $.idfonte = (e, te) => {
          if (!isdgo(e)) { return } e.preventDefault()
          const pb = $.getBoundingClientRect()
          const b = te.getBoundingClientRect()
          const p = geteventlocation(e), w = 2, w2 = w * 2
          let x = p.x < b.left + b.width / 2 ? b.left : b.right
          x = x - pb.left - w; if (x < 0) { x = 0 }
          else if (x > pb.width - w2) { x = pb.width - w2 }
          setidf(x, 0, w2, tabs.clientHeight, '#0047ffd1')
        }
      } $.append(tabs, ctn, idf)
      Object.defineProperty($, 'size', { get: () => tabs.childNodes.length })
      $.addEventListener('dragleave', e => hideidf())
      const tabsdrag = (e, l = tabs.children.length) => (l > 0 ?
        idfonte(e, tabs.children[l - 1]) : hideidf())
      tabs.addEventListener('dragenter', tabsdrag)
      tabs.addEventListener('dragover', tabsdrag)
      tabs.addEventListener('drop', (e, l = tabs.children.length) =>
        (hideidf(), l > 0 ? dropontab(e, tabs.children[l - 1]) : 0))
      const dataslot = 'd9si2kdcf1/docking-tabs-id'
      const { abs, min } = Math, calsplit = e => {
        const b = $.getBoundingClientRect()
        const p = geteventlocation(e)
        const w = b.width, h = b.height
        const x = p.x - b.left, y = p.y - b.top
        const dx = min(x, w - x), dy = min(y, h - y)
        if (dx > w / 4 && dy > h / 4) { return 'mid' }
        const r = h / w, fa = y > x * r, fb = y > (w - x) * r
        if (!fa && !fb) { return 'top' }
        else if (fa && !fb) { return 'left' }
        else if (!fa && fb) { return 'right' }
        else if (fa && fb) { return 'bottom' }
      }, ctndg = e => {
        if (!isdgo(e)) { return } e.preventDefault()
        const b = $.getBoundingClientRect()
        const w = b.width, h = b.height
        switch (calsplit(e)) {
          case 'mid': setidf(0, 0, w, h); break;
          case 'top': setidf(0, 0, w, h / 2); break;
          case 'left': setidf(0, 0, w / 2, h); break;
          case 'right': setidf(w / 2, 0, w / 2, h); break;
          case 'bottom': setidf(0, h / 2, w, h / 2); break;
        }
      }, isdgo = e => e.dataTransfer.types.includes(dataslot)
      const getdgo = (e, r = e.dataTransfer.getData(dataslot)) =>
        r ? r = document.getElementById(r) : undefined
      ctn.addEventListener('dragenter', ctndg)
      ctn.addEventListener('dragover', ctndg)
      ctn.addEventListener('drop', e => {
        hideidf(); let r = getdgo(e); if (!r) { return }
        if (r.cp() === $ && size === 1) { return }
        split(r, calsplit(e))
      })
      $.move = e => { tabs.append(e), focustab(e) }
      $.focuson = e => (ctn.innerHTML = '', ctn.append(e))
      $.focustab = te => {
        [...tabs.children].forEach(e => {
          e.style.zIndex = 0, e.style.boxShadow = 'black 0 0 10px'
        }); focuson(te.elm); te.style.zIndex = 1
        te.style.boxShadow = '#009eff 0px 0px 10px 1px'
        te.emit('focus')
      }
      $.dropontab = (e, te) => {
        hideidf(); let rte = getdgo(e); if (!rte) { return }
        const tabs = te.parentNode, sp = rte.parentNode === tabs
        if (!sp) { rte.undock() }
        let a = [...tabs.children], i = a.indexOf(te)
        const b = te.getBoundingClientRect()
        const p = geteventlocation(e)
        i += p.x < b.left + b.width / 2 ? 0 : 1
        sp && i > a.indexOf(rte) ? i -= 1 : 0
        dsplice(tabs, i, 0, rte), focustab(rte)
        docksys.emit('layout change')
      }
      $.split = (te, d) => {
        let s = (o, d = 'horizontal') => {
          let pt = parentNode; dk = docking()
          if (pt.size > 1 && pt.direction !== d) { pt = makecontain() }
          pt.additem(dk, pt.getindex($) + o), pt.direction = d
        }, dk = $; te.undock(); switch (d) {
          case 'top': s(0, 'vertical'); break;
          case 'left': s(0); break;
          case 'right': s(1); break;
          case 'bottom': s(1, 'vertical'); break;
        } dk.move(te); docksys.emit('layout change'); return dk
      }
      $.adddock = (e, t, opt = {}) => {
        let te = eventnode(dom()); if (typeof t === 'string') {
          te.innerText = t
        } else { te.append(t) } {
          te.classList = 'single-tab'
          te.style.flexShrink = '0'
          te.style.minWidth = '100px'
          te.style.boxSizing = 'border-box'
          te.style.height = '100%'
          te.style.padding = '5px'
          te.style.background = '#e0e0e0'
          te.style.boxShadow = 'black 0 0 10px'
          te.style.userSelect = 'none'
          te.style.cursor = 'move'
        } tabs.append(te), te.elm = e, te.id = uuid()
        let cp = () => te.parentNode.parentNode; te.cp = cp
        te.addEventListener('drop', e => (
          e.stopImmediatePropagation(), cp().dropontab(e, te)))
        te.addEventListener('dragstart', e =>
        (e.dataTransfer.setData(dataslot, te.id),
          e.dataTransfer.setDragImage(te, 0, 0)))
        let dg = e => (cp().idfonte(e, te),
          isdgo(e) ? e.stopImmediatePropagation() : 0)
        te.addEventListener('dragenter', dg)
        te.addEventListener('dragover', dg)
        te.undock = () => cp().deldock(te)
        te.draggable = true; cp().focustab(te)
        te.setclosable = f => (te.closable = true, te.onclosetab = f)
        Object.assign(te, opt); listenpointerdown(te, e => {
          if (e.button === 1 && te.closable) {
            te.onclosetab() ? te.undock() : 0
            e.preventDefault()
          } else { cp().focustab(te) }
        }); return te
      }
      $.deldock = (te, e = (te.remove(), tabs.children[tabs.children
        .length - 1])) => e ? focustab(e) : parentNode.delitem($)
      $.makecontain = (p = splitctn()) => (
        parentNode.rplitem($, p), p.additem($), p)
    } return $
  }
  $.docksys = eventnode()
  docksys.on('layout change', () => {
    let tree = (c, a = []) => {
      if (!a.direction) { a.direction = c.direction }
      for (const e of c.arr) {
        if (splitctn.is(e)) {
          if (e.size === 1) { tree(e, a) }
          else if (e.direction === c.direction) { tree(e, a) }
          else { let t = []; a.push(t); tree(e, t) }
        } else { a.push(e) }
      } return a
    }
    let build = (a, c = splitctn()) => {
      c.arr = [], c.direction = a.direction; for (const e of a) {
        c.arr.push(Array.isArray(e) ? build(e) : e)
      } c.update(); return c
    }
    build(tree(sc), sc)
  })
} { // vcs --------------------------------------------------------------------
  $.graph = ($ = eventnode({ g: {} })) => {
    with ($) {
      const nsym = Symbol('name')
      $.visualonly = false; let i = 0
      $.addnode = (id = visualonly ? i++ : uuid()) => {
        const o = { id, to: {}, from: {}, nto: 0, nfrom: 0, children: {} }
        Reflect.defineProperty(o, 'name', {
          get: () => o[nsym], set: v => (o[nsym] = v, emit('namenode', { o }))
        }); g[id] = o; emit('addnode', { id, o }); return o
      }
      $.delnode = (id, n = g[id]) => {
        for (const k in n.to) { deledge(id, k) }
        for (const k in n.from) { deledge(k, id) }
        delete g[id], emit('delnode', { id, o: n })
      }
      $.addedge = (a, b, n) => {
        const o = { o: g[b] }; if (n) { o.name = n, g[a].children[n] = b }
        g[a].to[b] = o, g[b].from[a] = g[a], g[a].nto++, g[b].nfrom++
        emit('addedge', { a, b, o }); return o
      }
      $.deledge = (a, b) => {
        let o = g[a].to[b], n = o.name; if (n) { delete g[a].children[n] }
        delete g[a].to[b], delete g[b].from[a]
        g[a].nto--, g[b].nfrom--, emit('deledge', { a, b, o })
      }
      $.nameedge = (a, b, n) => (g[a].children[n] = b,
        g[a].to[b].name = n, emit('nameedge', { a, b, o: g[a].to[b] }))
      $.unnameedge = (a, b, n = g[a].to[b].name) => (delete g[a].children[n],
        delete g[a].to[b].name, emit('nameedge', { a, b, o: g[a].to[b] }))
      $.unnameedgebyname = (a, n) => unnameedge(a, g[a].children[n], n)
      $.renameedge = (a, b, nn, n = g[a].to[b].name) => (delete g[a].children[n],
        g[a].children[nn] = b, g[a].to[b].name = nn, emit('nameedge', { a, b, o: g[a].to[b] }))
      $.renameedgebyname = (a, n, nn) => renameedge(a, g[a].children[n], nn, n)
      $.deltree = (n, l = 0, c = g[n].children) => {
        for (const k in c) { deltree(c[k], l - 1) }
        if (l <= 0) { delnode(n) }
      }
      $.addtonode = (a, name, id, force = false) => {
        if (!g[a]) { throw new Error(`Non exist node: ${a}`) }
        const pb = g[a].children[name]; if (pb) {
          if (force) { delnode(pb) }
          else { throw new Error(`Edge existed: ${a}:${name}.`) }
        } const b = addnode(id); addedge(a, b.id, name)
        emit('addtonode', { p: g[a], o: b }); return b
      }
      $.getto = (n, i = 0) => n.to[Object.keys(n.to)[i]]?.o
      $.getfrom = (n, i = 0) => n.from[Object.keys(n.from)[i]]
      $.clear = () => (g = {}, emit('clear'))
    } return $
  }
  $.vcs = ($ = graph()) => {
    with ($) {
      $.locatebypath = (id, path = '', forcecreate = false) => {
        let opath = Array.isArray(path) ? path.join('/') : path
        if (typeof path === 'string') { path = path.split('/').filter(v => v) }
        const links = [], used = new Set
        let o = g[id], name, p; while (path.length > 0) {
          const t = o.type; if (t === 'link') {
            used.add(o); p ? links.push(p) : 0; p = o; o = g[o.value]
          } name = path.shift(); if (name === '.') { continue }
          else if (name === '..') {
            if (t !== 'version') { used.add(o); p = o; o = getfrom(o) }
            else if (links.length > 1) { p = o; o = links.pop() }
            else { throw Error(`Invalid path: "${opath}"`) }
          } else {
            used.add(o); p = o; o = g[o.children[name]]
            if (!o) {
              if (forcecreate) { o = writedir(p, name) }
              else { throw Error(`Invalid path: "${opath}"`) }
            }
          }
        } return { o, used }
      }; $.read = locatebypath
      $.addhashobj = (h, t) => {
        const o = addnode(h); o.type = 'hashobj', o.value = t
      }
      $.checkname = n => {
        if (n !== '' && n.indexOf('/') < 0) { }
        else { throw `Invalid file name: ${n}` }
      }
      $.write = (ver, path, file, opt = { create: true }) => {
        let a; if (Array.isArray(path)) { a = path }
        else { a = path.split('/').filter(v => v) } const n = a.pop()
        setdelay(2); const l = locatebypath(ver, a, opt.create)
        let f, t = file.shift(); switch (t) {
          case 'file': f = writefile(l.o.id, n, ...file); break
          case 'dir': f = writedir(l.o.id, n, ...file); break
          case 'link': f = writelink(l.o.id, n, ...file); break
          default: throw Error(`Unknown file type: ${t}`)
        } enddelay(2); return f
      }
      $.writefile = (loc, name, text, force, h = hexenc(sha256(text))) => {
        checkname(name); setdelay(); const b = addtonode(loc, name, _, force)
        if (!g[h]) { addhashobj(h, text) }
        addedge(b.id, h); b.type = 'file', b.value = h;
        emit('file change', { o: b }); enddelay(); return b
      }
      $.writedir = (loc, name, force) => {
        checkname(name); setdelay(); const b = addtonode(loc, name, _, force)
        b.type = 'dir'; emit('file change', { o: b }); enddelay(); return b
      }
      $.writelink = (loc, name, ref, force) => {
        checkname(name); setdelay(); const b = addtonode(loc, name, _, force)
        b.type = 'link', b.value = ref
        emit('file change', { o: b }); enddelay(); return b
      }
      const copytree = (a, b) => {
        const c = g[a].children
        for (const t in c) {
          const edge = g[a].to[c[t]], o = edge.o
          const target = addtonode(b, edge.name)
          target.type = o.type
          if (o.open) { target.open = o.open }
          if (o.type === 'file') {
            addedge(target.id, target.value = o.value)
          } else if (o.type === 'link') {
            target.value = o.value
          } else if (o.type === 'dir') {
            copytree(c[t], target.id)
          }
        }
      }
      $.newver = (p, b = p !== undefined) => {
        if (b && g[p] && g[p].type !== 'version') {
          throw `privous node is not a vcs version: ${p}`
        } setdelay(); const id = uuid()
        o = b ? addtonode(p, _, id) : addnode(id); o.type = 'version'
        if (b) { copytree(p, o.id), setlock(g[p]) } else { o.isroot = 1 }
        emit('newver', { p, pb: b, o }); enddelay(); return o
      }
      $.nodeancester = n => {
        let a = new Set, q = [], c = g[n]; while (c.nfrom > 0) {
          for (const k in c.from) if (!a.has(k))
            (a.add(k), q.push(g[k])); c = q.shift()
        } return a
      }
      $.lcas = (a, b) => { // least common ancestors
        const aa = nodeancester(a), ba = nodeancester(b)
        const ca = aa.intersection(ba), da = new Set(ca)
        for (const a of ca) for (const k in g[a].from)
          da.delete(k); return da
      }
      const dfobj = (a, b, r, t = 2) => ({ type: t, a: a.id, b: b.id, r })
      $.diffver = (a, b, o, path, r) => {
        r = r ?? { add: new Set, del: new Set, mod: new Map }
        const ac = new Set(Object.keys(a.children))
        const bc = new Set(Object.keys(b.children))
        const ps = !path ? '' : path + '/'
        const ff = a => n => pf(ps + n, g[a.children[n]])
        const pf = (p, f) => p + (f.type === 'dir' ? '/' : '')
        r.del = r.del.union(new Set([...ac.difference(bc)].map(ff(a))))
        r.add = r.add.union(new Set([...bc.difference(ac)].map(ff(b))))
        const cc = ac.intersection(bc), { del, add, mod } = r
        for (let name of cc) {
          const fa = g[a.children[name]], fb = g[b.children[name]]
          const fo = o ? g[o.children[name]] : undefined
          let p = ps + name; if (fa.type === fb.type) {
            if (fa.type === 'file' && fa.value !== fb.value) {
              const at = g[fa.value].value.split('\n')
              const bt = g[fb.value].value.split('\n')
              if (fo && fo.type === 'file') {
                const ot = g[fo.value].value.split('\n')
                mod.set(p, dfobj(a, b, diff3(at, ot, bt), 3))
              } else { mod.set(p, dfobj(a, b, diff(at, bt))) }
            } if (fa.type === 'link' && fa.value !== fb.value) (del.add(p), add.add(p))
            if (fa.type === 'dir') { diffver(fa, fb, fo, p, r) }
          } else (del.add(pf(p, fa)), add.add(pf(p, fa)))
        } return r
      }
      $.merge = (a, b) => {
        setdelay(); const m = addtonode(a, _, uuid())
        addedge(b, m.id); setlock(g[a]), setlock(g[b])
        m.type = 'mergever'; emit('merge', { a, b, o: m }); enddelay()
      }
      $.leafversion = v => v.nto - Object.keys(v.children).length <= 0
      $.checkversion = (o, v = getversion(o)) => {
        if (v.lock) { throw new Error('Invalid operation on a non-leaf version.') }
      }
      $.setlock = (o, f = true) => {
        if (f) { o.lock = 1 } else { delete o.lock }
        emit('version lock change', { o })
      }
      $.getversion = n => {
        while (n.type !== 'version' && n.type !== 'mergever') { n = getfrom(n) } return n
      }
      $.getpath = n => {
        const p = []; while (n.type !== 'version') {
          const on = n; n = getfrom(n)
          p.unshift(n.to[on.id].name)
        } p.version = n; return p
      }
    } return $
  }
  const itp = (a, b, t) => (t = clamp(t, 0, 1), a + t * (b - a))
  const itp3 = (a, b, t) => (t = clamp(t, 0, 1),
    [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])])
  $.graphlayout = ($ = graph()) => {
    with ($) {
      on('addnode', ({ o }) => newpos(newnodeelm(o)))
      on('delnode', ({ o }) => delnodeelm(o))
      on('addedge', ({ o }) => newedgeelm(o))
      on('deledge', ({ o }) => deledgeelm(o))
      on('namenode', ({ o }) => namenodeelm(o))
      on('nameedge', ({ o }) => nameedgeelm(o))
      on('clear', () => sep.innerHTML = sen.innerHTML = seex.innerHTML = '')
      on('addtonode', ({ p, o }) => {
        o.data.pos.x = p.data.pos.y + rd(-1, 1) * target_length * 0.1
        o.data.pos.y = p.data.pos.y + rd(-1, 1) * target_length * 0.1
      })

      $.pending = []; $.makepending = f => (...a) => pending.push([f, a])
      $.namenodeelm = makepending((n, t = n.elm.text, b = t.getBBox()) => (
        t.textContent = n.name, t.setAttribute('transform',
          `translate(-${b.width / 2}, -${b.height})`)))
      $.nameedgeelm = c => c.elm.text.textContent = c.name
      $.newnodeelm = n => {
        setvaluebytime(v => (n.elm.style.opacity = v,
          n.data.ecc = v === 0 ? 0.0001 : v, stop = false))
        const g = svg('g'), c = svg('circle'), t = svg('text')
        namenodeelm(n)
        g.text = t, g.path = c
        g.append(c, t), sen.append(g)
        c.setAttribute('r', circlesize + 'px')
        t.setAttribute('fill', 'white')
        t.setAttribute('stroke', forecolor)
        t.setAttribute('stroke-width', circlesize * 0.03 + 'px')
        t.setAttribute('font-size', circlesize + 'px')
        t.style.pointerEvents = 'none'
        t.style.filter = 'drop-shadow(#00000033 0px 2px 2px)'
        c.style.filter = 'drop-shadow(#00000077 0px 2px 4px)'
        c.addEventListener('contextmenu', e => (
          e.preventDefault(), e.stopImmediatePropagation(),
          emit('nodectxmenu', { o: n, e })))
        listenpointerdown(c, e => {
          if (e.target !== c || e.button !== 0) { return }
          if (insd) { return r(n) } closectxmenu()
          let sp = geteventlocation(e) // start position
          let moveed = false; m = e => {
            if (e.touches && e.touches.length > 1) { return } reset()
            const cp = geteventlocation(e)
            const { x, y } = screen2svgcoord()(...cp)
            n.data.pos.x = x, n.data.pos.y = y, n.data.lock = true
            if (moveed) { return }
            moveed = (cp[0] - sp[0]) ** 2 + (cp[1] - sp[1]) ** 2 > 100
          }; listenpointermove(m), listenpointerup(e => (
            moveed ? 0 : emit('nodeclick', { o: n, e }),
            delete n.data.lock, cancelpointermove(m)))
        }); n.elm = g; return n
      }
      $.newedgeelm = o => {
        setvaluebytime(v => (o.elm.style.opacity = v, stop = false))
        const g = svg('g'), p = svg('path'), t = svg('text')
        const c = o, n = c.name
        t.setAttribute('fill', forecolor)
        t.setAttribute('stroke', 'white')
        t.setAttribute('stroke-width', circlesize * 0.03 + 'px')
        t.setAttribute('font-size', circlesize + 'px')
        t.style.filter = 'drop-shadow(#00000033 0px 2px 2px)'
        p.style.filter = 'drop-shadow(#00000077 0px 2px 4px)'
        if (n) { t.textContent = n }
        c.elm = g, g.path = p; g.text = t
        g.append(p), sep.append(g)
      }
      $.delnodeelm = n => setvaluebytime(v => (
        v = 1 - v, n.elm.style.opacity = v, stop = false,
        n.data.ecc = v), () => n.elm.remove())
      $.deledgeelm = n => setvaluebytime(v => (v = 1 - v,
        n.elm.style.opacity = v, stop = false), () => n.elm.remove())

      $.rd = genrd(795304884).rd
      $.newpos = (n, x = rd(-1, 1) * target_length,
        y = rd(-1, 1) * target_length) => {
        if (!n.data) { n.data = {} } const d = n.data
        d.pos = { x, y }, d.vec = { x: 0, y: 0 }, d.acc = { x: 0, y: 0 }
        d.mat = 1, d.ecc = 1; return n
      }
      const { sqrt, max, min, sign, abs } = Math
      const gravity = newpos({ data: {} }, 0, 0)
      $.layout = ns => {
        const electric = (b, p, ad, ap, m = 1) => {
          const bd = b.data, bp = bd.pos
          const pdx = bp.x - ap.x, pdy = bp.y - ap.y
          const lsq = max(pdx * pdx + pdy * pdy, m), l = sqrt(lsq)
          const f = ad.ecc * bd.ecc / lsq * p / l
          const fx = f * pdx, fy = f * pdy
          ad.acc.x += fx / ad.mat, ad.acc.y += fy / ad.mat
          bd.acc.x -= fx / bd.mat, bd.acc.y -= fy / bd.mat
        }, distance = (b, p, ad, ap) => {
          const bd = b.data, bp = bd.pos
          const pdx = bp.x - ap.x, pdy = bp.y - ap.y
          p *= ad.ecc * bd.ecc
          const fx = p * pdx, fy = p * pdy
          ad.acc.x += fx / ad.mat, ad.acc.y += fy / ad.mat
          bd.acc.x -= fx / bd.mat, bd.acc.y -= fy / bd.mat
        }; total_speed = 0
        let tl = target_length, ts = target_length * 2, dt = 0.05
        let ep = -(tl ** 2) * ts, ed = 1 / tl * ts * 20
        for (let i = 0, l = ns.length; i < l; i++) {
          const a = ns[i], ad = a.data, ap = ad.pos
          for (let j = i + 1; j < l; j++) { electric(ns[j], ep, ad, ap) }
          for (const k in a.to) { distance(a.to[k].o, ed / a.nto, ad, ap) }
          if ('hierarchy' in ad) {
            ad.acc.y += ad.hierarchy * tl * 20
          } distance(gravity, 0.05 * ed, ad, ap)
          if (ad.hardlock) { ad.vec.x = ad.vec.y = 0; continue }
          let vx = ad.vec.x + ad.acc.x * dt, vy = ad.vec.y + ad.acc.y * dt
          let v = sqrt(vx * vx + vy * vy), vrx = vx / v, vry = vy / v
          total_speed += v = max(min(v, ts) - ts * friction, 0)
          ad.vec.x = vx = v * vrx, ad.vec.y = vy = v * vry
          if (ad.lock) { ad.vec.x = ad.vec.y = 0; continue }
          ap.x += vx * dt, ap.y += vy * dt
          ad.oldacc = { ...ad.acc }, ad.acc.x = ad.acc.y = 0
        } layouttime += time.delta
      }
      $.circlesize = 15, $.linewidth = circlesize / 7
      $.target_length = circlesize * 10, $.friction = 0.01
      $.arws = circlesize / 7 * 2
      $.forecolor = '#444'
      $.draw = ns => {
        const w = elm.clientWidth, h = elm.clientHeight
        const x = w / 2 + camera.x, y = h / 2 + camera.y
        const transtr = `translate(${sorigin.x}, ${sorigin.y}) ` +
          `scale(${camera.s}) translate(${x}, ${y})`
        se.setAttribute('transform', transtr)
        se.setAttribute('transform', transtr)
        se.setAttribute('transform', transtr)
        sep.setAttribute('fill', 'none')
        sep.setAttribute('stroke', forecolor)
        sep.setAttribute('stroke-width', linewidth + 'px')
        sep.setAttribute('stroke-linecap', 'round')
        if (stop) { return } for (const n of ns) {
          const { x, y } = n.data.pos, e = n.elm
          e.setAttribute('transform', `translate(${x}, ${y})`)
          for (const k in n.to) {
            const b = n.to[k], bp = b.o.data.pos, e = b.elm
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
              let l = 1 / sqrt(dx * dx + dy * dy)
              dx *= l, dy *= l; if (hierarchical) {
                const cl = itp3([68, 68, 68], [256, 68, 68], -dy + 0.5)
                e.path.setAttribute('stroke', `rgb(${cl.join(', ')})`)
              } dx *= c, dy *= c
              e.path.setAttribute('d', `M ${x} ${y} L ${bp.x} ${bp.y} ` +
                `M ${mx + dy} ${my - dx} L ${mx + dx} ${my + dy} L ${mx - dy} ${my + dx}`)
            }
          } n.customdraw?.()
        }
      }
      $.hierarchical = false
      $.stop = false, $.layouttime = 0, $.multirun = 4
      $.total_speed = 0, $.total_accelaration = 0
      $.frame = () => {
        const ns = []; for (const k in g) {
          const n = g[k]; ns.push(n); const e = []
          for (const id in n.to) { e.push(n, n.to[id].o) }
        } if (!stop) {
          for (let i = 0; i < multirun; i++) { layout(ns) }
          if (total_speed === 0) { emit('layoutend', layouttime), stop = true }
        } draw(ns); for (const [f, a] of pending) { f(...a) } pending = []
      }
      $.currenthignlight = _
      $.highlightcolor = '#0088ff'
      $.highlight = n => {
        if (!n) { return } if (currenthignlight) {
          currenthignlight.elm.hlelm.remove()
          delete currenthignlight.elm.hlelm
        } const c = svg('circle')
        c.setAttribute('r', circlesize * 1.2 + 'px')
        c.setAttribute('fill', 'none')
        c.setAttribute('stroke', highlightcolor)
        c.setAttribute('stroke-width', linewidth + 'px')
        n.elm.append(n.elm.hlelm = c)
        currenthignlight = n
      }
      $.reset = () => { stop = false, layouttime = 0 }
      $.camera = { x: 0, y: 0, s: 1 }
      $.sorigin = { x: 0, y: 0 } // scale origin
      $.resetcamera = () => (sorigin = { x: 0, y: 0 },
        camera = { x: 0, y: 0, s: 1 })
      $.screen2svgcoord = (c = camera) => (x, y) => {
        const w = elm.clientWidth, h = elm.clientHeight
        x = (x - sorigin.x) / camera.s - (c.x + w / 2)
        y = (y - sorigin.y) / camera.s - (c.y + h / 2)
        return { x, y }
      }
      $.elm = svg('svg'); elm.style.display = 'block'
      elm.style.fontFamily = 'helvetica-bold'
      elm.style.fontWeight = 'bolder'
      elm.style.userSelect = elm.style.touchAction = 'none'
      elm.style.height = elm.style.width = '100%'
      $.sep = svg('g'), $.sen = svg('g'), $.seex = svg('g')
      elm.append($.se = svg('g')); se.append(sep, sen, seex)
      listenpointerdown(elm, e => {
        if (e.target !== elm || e.button !== 0) { return } closectxmenu()
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
      elm.addEventListener('contextmenu', e =>
        (e.preventDefault(), emit('panelctxmenu', e)))
      elm.addEventListener('wheel', (e, r = 1.2) => e.deltaY < 0
        ? zoom(geteventlocation(e), r) : zoom(geteventlocation(e), 1 / r))
      $.zoom = ([x, y], f, s) => (s = camera.s,
        camera.s = s * f, f = camera.s / s,
        sorigin.x = x - (x - sorigin.x) * f,
        sorigin.y = y - (y - sorigin.y) * f)
      $.geteventlocation = (e, ef = e.touches) => {
        const { left: l, top: t } = elm.getBoundingClientRect()
        return ef && ef.length == 1 ?
          [ef[0].pageX - l, ef[0].pageY - t] : [e.pageX - l, e.pageY - t]
      }; { // context menu thing
        const ctxmenu = dom()
        ctxmenu.style.position = 'absolute'
        ctxmenu.style.background = 'white'
        ctxmenu.style.borderRadius = '10px'
        ctxmenu.style.boxShadow = '#0000001c 0 6px 10px'
        ctxmenu.style.minWidth = '100px'
        ctxmenu.style.overflow = 'hidden'
        $.openctxmenu = (e, a = []) => {
          if (a.length < 1) { return }
          const [x, y] = geteventlocation(e)
          ctxmenu.style.opacity = '1'
          ctxmenu.style.left = x + 'px'
          ctxmenu.style.top = y + 'px'
          ctxmenu.style.pointerEvents = 'initial'
          ctxmenu.innerHTML = ''
          const [h, ...t] = a.map(([n, f]) => {
            const b = dom('button')
            b.addEventListener('pointerenter',
              () => b.style.filter = 'drop-shadow(0px 4px 6px black)')
            b.addEventListener('pointerleave',
              () => b.style.filter = 'none')
            b.style.display = 'block'
            b.style.background = 'none'
            b.style.width = '100%'
            b.style.height = '30px'
            b.style.textAlign = 'left'
            b.style.padding = '0 10px 0 10px'
            b.style.border = '0'
            b.textContent = n
            b.onclick = e => (closectxmenu(), f(e))
            return b
          })
          const sp = (e = dom()) => {
            e.style.width = '100%'
            e.style.height = '1px'
            e.style.background = '#000000a8'
            return e
          }
          ctxmenu.append(h, ...t.map(e => [sp(), e]).flat(1))
        }
        $.closectxmenu = () => {
          ctxmenu.style.opacity = '0'
          ctxmenu.style.pointerEvents = 'none'
        }
        closectxmenu()
        const dvctn = svg('foreignObject')
        dvctn.setAttribute('x', 0)
        dvctn.setAttribute('y', 0)
        dvctn.setAttribute('width', '100%')
        dvctn.setAttribute('height', '100%')
        dvctn.style.pointerEvents = 'none'
        dvctn.append(ctxmenu)
        elm.append(dvctn)
        elm.style.position = 'relative'
      } let insd = false, r, j; { // selection dialog
        $.selectdialog = (p, ...a) => (insd = true,
          [r, j] = a, p.finally(() => insd = false))
      }
    } return $
  }
} { // various tab ------------------------------------------------------------
  const btn = (t, bbk = '#00000044', b = dom('button')) => (
    b.style.background = bbk,
    b.textContent = t, b.style.width = b.style.height = '30px',
    b.style.borderRadius = '10px', b.style.border = '0',
    b.addEventListener('pointerdown', () => b.style.background = '#00000088'),
    b.addEventListener('pointerdup', () => b.style.background = bbk),
    b.addEventListener('pointerenter', () => b.style.background = '#00000066'),
    b.addEventListener('pointerleave', () => b.style.background = bbk), b)
  $.vcseditor = ($ = vcs()) => {
    with ($) {
      $.vg = graphlayout(), $.nodemap = bimap()
      vg.visualonly = true
      on('addnode', ({ o }) => {
        if (o.type === 'version' || o.type === 'mergever') {
          let vo = vg.addnode(); vo.name = o.id.slice(0, 8)
          vo.type = o.isroot ? 'rootver' : o.type
          postaddnode(vo, o)
        } else if (o.type !== 'hashobj') {
          const p = getfrom(o), vp = tovnode(p)
          if (vp && p.open) { createfilenode(vp, p.to[o.id], o, vg.addnode()) }
        }
      })
      on('delnode', ({ o }, vo = tovnode(o)) => {
        if (vo) { vg.delnode(vo.id); nodemap.del(o.id) }
        if (o.type === 'file') { emit('file change', { o }) }
      })
      on('addedge', ({ a, b, o }) => (a = tovnode(a), b = tovnode(b),
        a && b ? vg.addedge(a.id, b.id, o.name) : 0))
      on('deledge', ({ a, b, o }) => (a = tovnode(a), b = tovnode(b),
        a && b ? vg.deledge(a.id, b.id) : 0))
      on('nameedge', ({ a, b, o }, va = tovnode(a), vb = tovnode(b)) => {
        if (!(va && vb)) { return } updatename(g[b], vb, o)
        vg.renameedge(va.id, vb.id, o.name)
      }), on('clear', () => vg.clear())
      on('addtonode', ({ p, o }) => (p = tovnode(p), o = tovnode(o),
        p && o ? vg.emit('addtonode', { p, o }) : 0))
      $.tovnode = n => vg.g[nodemap.get(typeof n === 'object' ? n.id : n)]
      $.tornode = n => g[nodemap.getr(typeof n === 'object' ? n.id : n)]
      const postaddnode = (vo, o) =>
        vo ? (nodemap.set(o.id, vo.id), setnodecolor(vo)) : 0
      const createfilenode = (p, edge, o, vo) => {
        vo.type = o.type; o.type === 'link' ? vo.customdraw = () => {
          const b = tovnode(o.value)
          let sl = vo.elm.softlink; if (!sl) {
            vg.seex.append(sl = vo.elm.softlink = svg('path'))
            sl.setAttribute('fill', 'none')
            sl.setAttribute('stroke-width', vg.linewidth + 'px')
            sl.setAttribute('stroke-dasharray', '1, 3.2')
            sl.setAttribute('stroke-linecap', 'round')
            sl.setAttribute('opacity', '0.8')
            sl.style.pointerEvents = 'none'
          } if (b) {
            sl.setAttribute('stroke', vg.highlightcolor)
            let { x, y } = vo.data.pos, bp = b.data.pos
            let dx = bp.x - x, dy = bp.y - y, c = vg.circlesize / 7 * 5
            let mx = x + dx * 0.5, my = y + dy * 0.5
            let l = 1 / Math.sqrt(dx * dx + dy * dy) * c; dx *= l, dy *= l
            sl.setAttribute('d', `M ${x} ${y} L ${bp.x} ${bp.y} ` +
              `M ${mx + dy} ${my - dx} L ${mx + dx} ${my + dy} L ${mx - dy} ${my + dx}`)
          } else {
            sl.setAttribute('stroke', 'red')
            let { x, y } = vo.data.pos, c = vg.circlesize / 7 * 5
            sl.setAttribute('d', `M ${x - c} ${y - c} L ${x + c} ${y + c} ` +
              `M ${x - c} ${y + c} L ${x + c} ${y - c}`)
          }
        } : 0; updatename(o, vo, edge); postaddnode(vo, o)
      }, updatename = (o, vo, edge) => {
        if (o.type === 'link') {
          vo.name = edge.name + '|' + o.value.slice(0, 8)
        } else { vo.name = edge.name }
      }, packnotify = a => a.map(([n, f]) => [n, async (...a) => {
        try { await f(...a) } catch (e) { if (e !== userend) { makeerrornotify(e) } }
      }])
      $.openfile = (o, vo = tovnode(o)) =>
        emit('boot text editor', { o })
      $.saverepo = () => emit('save whole repo')
      $.savefile = (o, t, h = hexenc(sha256(t))) => {
        checkversion(o); setdelay(); deledge(o.id, o.value)
        if (!g[h]) { addhashobj(h, t) } addedge(o.id, h)
        o.value = h; emit('file change', { o }); enddelay(); return o
      }
      $.execfile = o => emit('boot sandbox', { o })
      $.solveconflict = o => {
        // TODO: conflict solving
        // let os = [...lcas(a, b)], o = os[0] // TODO: multi ancester merge
        // const r = diffver(g[a], g[b], g[o])
        emit('boot conflict editor', { o })
      }
      $.setnodepos = (e, n) => setTimeout(() => tovnode(n).data.pos =
        vg.screen2svgcoord()(...vg.geteventlocation(e)))
      $.checkisversion = (o, b = o?.type !== 'version') => {
        if (b) { throw new Error('Invalid node: not a version.') }
      }
      vg.on('delnode', ({ o }) =>
        (o.elm.softlink?.remove(), nodemap.delr(o.id)))
      vg.on('nodeclick', ({ o: vo, e }) => {
        if (e.button !== 0) { return } const o = tornode(vo)
        if (o.type === 'file') { openfile(o, vo) }
        else if (o.type === 'mergever') { solveconflict(o) }
        else if (o.type !== 'link') { togglenode(vo) }
      })
      vg.on('nodectxmenu', ({ o: vo, e }) => {
        let a, o = tornode(vo); const toggle = () => togglenode(vo)
        const open = () => { if (!o.open) { toggle() } }
        const newfile = async () => {
          checkversion(o); writefile(o.id, await namingdialog(), '')
          open(); emit('file change', { o })
        }, newdir = async () => {
          checkversion(o); writedir(o.id, await namingdialog())
          open(); emit('file change', { o })
        }, newlink = async () => {
          checkversion(o); const n = await namingdialog(); checkname(n)
          const t = tornode(await pickonedialog()); checkisversion(t)
          writelink(o.id, n, t.id); open(); emit('file change', { o })
        }, relink = async () => {
          checkversion(o); const t = tornode(await pickonedialog()); checkisversion(t)
          o.value = t.id; vo.customdraw(); emit('file change', { o })
        }, mergever = async () => {
          const t = tornode(await pickonedialog()); checkisversion(t)
          merge(o.id, t.id)
        }, renamenode = async () => {
          checkversion(o); const on = getfrom(o).to[o.id].name
          const n = await namingdialog(on); checkname(n)
          renameedge(getfrom(o).id, o.id, n)
          emit('file change', { o })
        }, deletever = async () => {
          checkversion(o); await deleteversiondialog()
          for (const k in o.from) {
            const p = o.from[k]; if (!leafversion(p)) { setlock(p, false) }
          } deltree(o.id)
        }, deletenode = async () => {
          if (o.type === 'dir') { deltree(o.id) } else { delnode(o.id) }
        }; switch (o.type) {
          case 'version': a = [
            ['📂 toggle', toggle], ['🗒️ new file', newfile], ['📁 new foler', newdir],
            ['📍 new link', newlink], ['⤵️ new version', () => newver(o.id)],
            ['🔀 merge', mergever], ['❌ delete', deletever],
          ]; break; case 'file': a = [
            ['💻 exec', () => execfile(o)], ['📝 open', () => openfile(o, vo)],
            ['✏️ rename', renamenode], ['❌ delete', deletenode],
          ]; break; case 'dir': a = [
            ['📂 toggle', toggle], ['🗒️ new file', newfile], ['📁 new foler', newdir],
            ['📍 new link', newlink], ['✏️ rename', renamenode], ['❌ delete', deletenode],
          ]; break; case 'link': a = [
            ['📍 relink', relink], ['✏️ rename', renamenode], ['❌ delete', deletenode],
          ]; break; case 'mergever': a = [
            ['📝 solve', () => solveconflict(o)], ['❌ delete', deletever]]; break
        } vg.openctxmenu(e, packnotify(a))
      })
      vg.on('panelctxmenu', e => vg.openctxmenu(e, packnotify([
        ['✨ new version', e => setnodepos(e, newver())],
        ['🔄️ reset camera', () => vg.resetcamera()],
        ['💾 save', saverepo],
      ])))
      $.togglernode = n => togglenode(tovnode(n))
      $.togglenode = vo => {
        const o = tornode(vo); o.open = !o.open
        if (!o.open) {
          vo.elm.foldidentifer?.remove()
          delete vo.elm.foldidentifer
          vg.deltree(vo.id, 1)
        } else {
          const recursive = vo => {
            const o = tornode(vo); c = o.children
            const i = vo.elm.foldidentifer = svg('path')
            i.style.pointerEvents = 'none'
            const w = vg.circlesize / 7 * 3
            i.setAttribute('stroke', vg.forecolor)
            i.setAttribute('stroke-width', vg.linewidth + 'px')
            i.setAttribute('stroke-linecap', 'round')
            i.setAttribute('d', `M ${0} ${-w} L ${0} ${w} M ${-w} ${0} L ${w} ${0} `)
            vo.elm.append(i)
            for (const t in c) {
              const e = o.to[c[t]], cvo = vg.addtonode(vo.id, e.name)
              createfilenode(vo, e, e.o, cvo)
              if (e.o.type === 'dir' && e.o.open) { recursive(cvo) }
            }
          }; recursive(vo)
        }
      }
      $.setnodecolor = n => n.elm.path.setAttribute('fill', {
        rootver: '#f47771', version: '#83c1bc', mergever: '#de57dc',
        dir: '#fbc85f', link: '#6ab525', file: '#2b5968',
      }[n.type])
      $.frame = vg.frame
      $.elm = dom(); elm.append(vg.elm)
      elm.style.position = 'relative'
      elm.style.height = '100%'
      elm.tabIndex = 1
      elm.addEventListener('keydown', e => {
        if (e.key === 's' && e.ctrlKey && !e.altKey && !e.shiftKey) {
          e.preventDefault()
          emit('save whole repo')
        }
      })
      const userend = new Error('User ended input.')
      { // dialog thing
        const dialogdv = dom()
        dialogdv.style.position = 'absolute'
        dialogdv.style.background = '#0000003c'
        dialogdv.style.width = dialogdv.style.height = '100%'
        dialogdv.style.top = dialogdv.style.left = '0'
        dialogdv.style.opacity = '0'
        dialogdv.style.pointerEvents = 'none'
        dialogdv.style.display = 'flex'
        dialogdv.style.alignItems = 'center'
        dialogdv.style.justifyContent = 'center'
        let insidedv = false
        dialogdv.addEventListener('pointerdown',
          e => insidedv = e.target === dialogdv)
        dialogdv.addEventListener('pointerup', e =>
          e.target === dialogdv && insidedv ? emit('leave dialog') : 0)
        const dialogprocess = f => async (...a) => {
          dialogdv.style.opacity = '1'
          dialogdv.style.pointerEvents = 'initial'
          dialogdv.innerHTML = ''
          try { return await f(...a) } finally {
            dialogdv.style.opacity = '0'
            dialogdv.style.pointerEvents = 'none'
            dialogdv.innerHTML = ''
          }
        }
        $.namingdialog = dialogprocess(async pv => {
          let r, j, acc = () => r(i.value)
          const p = new Promise((...a) => [r, j] = a)
            .finally(() => off('leave dialog', f))
          const f = () => j(userend); on('leave dialog', f)
          const d = dom()
          d.style.background = 'white'
          d.style.borderRadius = '10px'
          d.style.padding = '10px'
          d.style.display = 'flex'
          d.style.alignItems = 'center'
          d.style.justifyContent = 'center'
          const i = dom('input')
          i.placeholder = `enter name here`
          if (typeof pv === 'string') { i.value = pv }
          i.addEventListener('keyup', e => e.key === 'Enter' ? acc() : 0)
          const b = dom('button'); b.textContent = 'ok'; b.onclick = acc
          d.append(i, b); dialogdv.append(d); i.focus()
          return p
        })
        $.pickonedialog = dialogprocess(async (tp = 'version') => {
          elm.style.background = '#00000022'
          const bk = dialogdv.style.background
          dialogdv.style.background = ''
          dialogdv.style.pointerEvents = 'none'
          let r, j, p = new Promise((...a) => [r, j] = a)
            .finally(() => (elm.style.background = '',
              dialogdv.style.background = bk))
          vg.selectdialog(p, r, j)
          const d = dom(), t = dom('span'), b = btn('✕')
          d.style.pointerEvents = 'initial'
          d.style.background = '#00000044'
          d.style.borderRadius = '10px'
          d.style.borderTopLeftRadius = ''
          d.style.borderTopRightRadius = ''
          d.style.placeSelf = 'flex-start'
          d.style.padding = '10px 20px'
          t.textContent = `pick a ${tp} node`
          t.style.paddingRight = '10px'
          b.onclick = () => j(userend)
          d.append(t, b); dialogdv.append(d); return p
        })
        $.deleteversiondialog = dialogprocess(async () => {
          elm.style.background = '#00000022'
          const bk = dialogdv.style.background
          dialogdv.style.background = ''
          let r, j, p = new Promise((...a) => [r, j] = a)
            .finally(() => (elm.style.background = '',
              dialogdv.style.background = bk,
              off('leave dialog', f)))
          const f = () => j(userend); on('leave dialog', f)
          const d = dom(), t = dom('span')
          const yb = btn('Yes'), nb = btn('No')
          d.style.pointerEvents = 'initial'
          d.style.background = '#00000044'
          d.style.borderRadius = '10px'
          d.style.borderTopLeftRadius = ''
          d.style.borderTopRightRadius = ''
          d.style.placeSelf = 'flex-start'
          d.style.padding = '10px 20px'
          t.innerHTML = `You can delete a version with no child version,` +
            ` but you will lost all data inside it.<br>Proceed?<br>`
          yb.style.color = 'red'; t.style.color = '#8c0000'
          yb.onclick = r; nb.onclick = f
          yb.style.padding = nb.style.padding = '5px'
          yb.style.margin = nb.style.margin = '5px'
          yb.style.width = nb.style.width = '40px'
          d.append(t, yb, nb); dialogdv.append(d); return p
        })
        $.chooserepodialog = dialogprocess(async () => {
          let r, j, p = new Promise((...a) => [r, j] = a)
          const d = dom(), t = dom('span'), b = btn('✕')
          d.style.pointerEvents = 'initial'
          d.style.background = '#00000044'
          d.style.borderRadius = '10px'
          d.style.borderTopLeftRadius = ''
          d.style.borderTopRightRadius = ''
          d.style.placeSelf = 'flex-start'
          d.style.padding = '10px 20px'
          t.textContent = 'pick a node'
          t.style.paddingRight = '10px'
          b.onclick = () => j(userend)
          d.append(t, b); dialogdv.append(d); return p
          // TODO
        })
        $.savetolocaldialog = dialogprocess(async () => {
          let r, j, p = new Promise((...a) => [r, j] = a)
          const d = dom(), t = dom('span'), b = btn('✕')
          d.style.pointerEvents = 'initial'
          d.style.background = '#00000044'
          d.style.borderRadius = '10px'
          d.style.borderTopLeftRadius = ''
          d.style.borderTopRightRadius = ''
          d.style.placeSelf = 'flex-start'
          d.style.padding = '10px 20px'
          t.textContent = 'pick a node'
          t.style.paddingRight = '10px'
          b.onclick = () => j(userend)
          d.append(t, b); dialogdv.append(d); return p
          // TODO
        })
        elm.append(dialogdv)
      } {// TODO: notication
        $.makenotify = m => { }
        $.makeerrornotify = m => {
          console.error(m)
        }
      } { // serialization
        $.serialization = (data = {}) => {
          data.version = [], data.mergever = [], data.file = [], data.dir = []
          data.link = [], data.hashobj = []; for (const k in g) {
            const oo = g[k], o = { ...oo }, to = [], oto = oo.to
            for (const id in oto) {
              const oe = oto[id], e = { ...oe }
              e.o = oe.o.id; to.push(e)
            } o.to = to, delete o.from, delete o.children
            delete o.nto, delete o.type, delete o.nfrom
            if (oo.type !== 'hashobj' || oo.nfrom > 0) { data[oo.type].push(o) }
          } return data
        }
        $.deserialization = d => {
          if (typeof d === 'string') { d = JSON.parse(d) } setdelay(); const es = []
          for (const type in d) for (let o of d[type]) {
            o = { ...o }; const no = addnode(o.id), to = o.to
            delete o.id, delete o.to
            Object.assign(no, o); no.type = type
            for (const e of to) { es.push([no.id, e]) }
          } for (let [id, e] of es) {
            e = { ...e }; const ne = addedge(id, e.o, e.name)
            delete e.o, delete e.name
            Object.assign(ne, e)
          } enddelay(); for (const id in g) {
            const o = g[id]; if (o.type === 'version' && o.open) {
              togglernode(o); togglernode(o)
            } // is this too dumb? Didn't find better way
          }
        }
      }
    } return $
  }
  $.texteditor = ($ = eventnode(dom())) => {
    with ($) {
      const root = attachShadow({ mode: "open" })
      const css = dom("style")
      css.innerText = `@import "${monaco_root}/editor/editor.main.css";`
      const div = dom()
      div.className = 'monaco-editor-div'
      style.height = div.style.height = '100%'
      root.append(div, css)
      className = 'texteditor'

      $.wordWrap = "on"
      $.editor = monaco.editor.create(div, {
        value: "",
        language: "plaintext",
        theme: "vs-light",
        renderWhitespace: "all",
        renderControlCharacters: true,
        lightbulb: { enabled: false },
        tabSize: 2,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        wordBasedSuggestions: 'off',
        wordWrap,
      })
      editor.addAction({
        id: "save-text-file", label: "Save File",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => emit("save", value),
      })
      editor.addAction({
        id: "toggle-word-warp", label: "Toggle Word Warp",
        keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
        run: () => ($.wordWrap = wordWrap === "on" ? "off" : "on",
          editor.updateOptions({ wordWrap })),
      })
      editor.addAction({
        id: "format-code", label: "Format code",
        keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.CtrlCmd | monaco.KeyCode.KeyF],
        run: () => editor.getAction('editor.action.formatDocument').run(),
      })
      $.setreadonly = (readOnly = true) => editor.updateOptions({ readOnly })

      $.change_language = l =>
        monaco.editor.setModelLanguage(editor.getModel(), l)
      new ResizeObserver(() => editor.layout()).observe(div)
      editor.onDidChangeModelContent(e => emit("change", e))
      editor.trigger('editor', 'hideSuggestWidget', [])
      Object.defineProperty($, "value",
        { get: () => editor.getValue(), set: v => editor.setValue(v) })
      $.open = () => { parent.style.display = "" }
      $.close = () => { parent.style.display = "none" }
    } return $
  }
  $.sandboxtab = (vcs, target, $ = eventnode(dom())) => {
    $.vcs = vcs; $.target = target; with ($) {
      { // tab bar and basic stylegt
        $.configtab = eventnode(dom())
        configtab.style.margin = '0px 5px'
        configtab.style.display = 'flex'
        configtab.style.cursor = 'initial'
        const bs = '▶️ ⏹️ 🧾'.split(' ').map(b => {
          b = btn(b, 'none'), b.style.padding = '0'
          b.style.height = b.style.width = '20px'
          b.style.fontSize = '10px'; return b
        }); configtab.append(...bs)
        bs[0].onclick = () => exec()
        bs[1].onclick = () => clear()
        bs[2].onclick = () => togglecli()
        configtab.addEventListener('pointerdown', e => e.preventDefault())
        $.style.height = '100%'
        $.style.position = 'relative'
      }

      const domdiv = dom(), clidiv = dom(), clictn = dom(); { // cli style
        clidiv.classList.add('no-scroll-bar')
        clidiv.append(clictn)
        let cliopen = true; $.togglecli = () => {
          cliopen = !cliopen; if (cliopen) {
            clidiv.style.opacity = '1'
            clidiv.style.pointerEvents = 'initial'
            clidiv.style.top = '0'
            domdiv.style.filter = 'blur(1.5px)'
          } else {
            clidiv.style.opacity = '0'
            clidiv.style.pointerEvents = 'none'
            clidiv.style.top = '100%'
            domdiv.style.filter = ''
          }
        }, transtime = '0.1s'
        clidiv.style.transition = 'all ' + transtime
        domdiv.style.transition = 'filter ' + transtime
        clidiv.style.height = clidiv.style.width = '100%'
        clidiv.style.position = 'absolute'
        clidiv.style.overflowX = 'hidden'
        clidiv.style.overflowY = 'auto'
        clidiv.style.color = '#f0f0f0'
        clidiv.style.padding = '20px'
        clidiv.style.boxSizing = 'border-box'
        clidiv.style.background = '#00000088'
        clidiv.style.textShadow = '0px 0px 4px #000000a1'
        clidiv.style.fontFamily = 'consolas'
        clidiv.style.whiteSpace = 'pre-wrap'
        clidiv.style.wordWrap = 'break-word'
        clictn.style.maxWidth = '1000px'
        domdiv.style.height = '100%'
        togglecli()
      } $.append(domdiv, clidiv)

      let vcsenventregisted = false, filechange
      const _fchd = ({ o }) => filechange?.(o)
      $.registerVCSevent = () => vcs.onweak('file change', _fchd)
      const configdescription = {
        environment: { value: ['dom', 'worker'], des: { dom: '', worker: '' } },
        module: { value: ['nodejs', 'dynamic'], des: { nodejs: '', dynamic: '' } },
        watchfile: { type: 'boolean', des: { true: '', false: '' } }
      }
      // TODO: config panel

      const timeout_functions = `requestIdleCallback cancelIdleCallback,
        requestAnimationFrame cancelAnimationFrame,
        setTimeout clearTimeout, setInterval clearInterval`.split(",")
        .map(s => s.split(/\s+/).filter(v => v))
      const deconstructors = {
        AudioContext: v => v.close(),
        Worker: v => v.terminate(),
      }, callbacks = {}, packedinstances = {}
      const gen_timeout = (o = {}) => {
        for (const [s, c] of timeout_functions) {
          const sf = window[s], cf = window[c]
          let cbs = new Set; callbacks[c] = cbs; cbs.cf = cf
          o[s] = s !== "setInterval" ? (f, t) => {
            const i = sf(() => (cbs.delete(i), f()), t); cbs.add(i); return i
          } : (f, t) => { const i = sf(f, t); cbs.add(i); return i }
          o[c] = i => (cbs.delete(i), cf(i))
        } return o
      }, timeoutfunctions = gen_timeout()
      gen_timeout.clear = () => {
        for (const k in callbacks) {
          const cbs = callbacks[k], cf = callbacks[k].cf
          for (const v of cbs) { cf(v) } cbs.clear()
        }
      }
      const pack_constructor = (o = {}) => {
        for (const k in deconstructors) {
          const f = window[k], a = packedinstances[k] = []; o[k] = function (...v
          ) { const r = new WeakRef(new f(...v)); a.push(r); return r }
        } return o
      }, constructorpacker = pack_constructor()
      pack_constructor.clear = () => {
        for (const k in packedinstances) {
          const f = deconstructors[k], a = packedinstances[k]
          a.forEach(r => (r = r.deref(), r ? f(r) : 0)); a.splice(0, a.length)
        }
      }

      $.clear = () => {
        domdiv.innerHTML = ''
        clictn.innerHTML = ''
        gen_timeout.clear()
        pack_constructor.clear()
      }

      $.exec = async () => {
        // TODO: read a config file

        clear()

        const domctn = dom(); domdiv.append(domctn)
        const shadowroot = domctn.attachShadow({ mode: 'open' })
        const root = dom(); shadowroot.append(root)
        domctn.style.height = root.style.height = '100%'
        root.style.overflow = 'auto'
        const env = { root, ...timeoutfunctions, ...constructorpacker }
        env.$$ = window.$

        let logd, nolog = false, _error = (nodup, ...a) => (
          nodup ? nolog = true : 0, _log(...a), nolog = false,
          logd.style.textShadow = 'red 0px 0px 4px')
        const format = (v, d = 1) => {
          switch (typeof v) {
            case 'string': v = `"${v}"`; break
            case 'function': v = '⨍ ' + v; break
            case 'symbol': v = `Symbol("${v.description}")`; break
            case 'bigint': v = v + 'n'; break; case 'object':
              if (v instanceof Error) { v = v.stack } else if (v instanceof Array) {
                const l = v.length; v = `(${l}) [${d > 0 ? v.map(
                  v => format(v, d - 1)).join(', ') : l > 0 ? '...' : ' '}]`
              } else if (v && !(v instanceof Date)) {
                if (d <= 0) { v = '' + v; break }
                const a = [v.toString().slice(8, -1) + ' {']; for (const k in v) {
                  let vv = v[k]; a.push('  ' + k + ': ' + format(vv, d - 1))
                } a.push('}'); v = a.join(a.length > 2 ? '\n' : ' ')
              } else { v = '' + v } break; default: v = '' + v; break
          } return v
        }, _log = (...a) => {
          nolog ? 0 : console.log(...a); try {
            let d = dom(), s, l = a.length - 1; d.textContent = '> '
            if (l < 0) { return }; for (let i = 0; i < l; i++) {
              d.append(s = dom('span'), ' '), s.textContent = format(a[i])
            } d.append(s = dom('span')), s.textContent = format(a[l])
            clictn.append(d); logd = d
          } catch (e) { _error(false, 'console.log failed to print log'); console.error(e) }
        }, _clear = () => { clictn.innerHTML = ''; console.clear() }
        env.originconsole = console, env.console = {
          log: _log, clear: _clear,
          error: (...a) => _error(false, ...a)
        }

        const watch = new Set()
        if (!vcsenventregisted) { registerVCSevent() }
        const reload = debounce(() => $.exec(), 0)
        filechange = o => watch.has(o.id) ? reload() : 0

        const load = (p, opt = {}) => {
          const WRONGPATH = Error(`Invalid path: ${p}`)
          const a = p.split('/').filter(v => v)
          let readver = rootver; if (isv) {
            const n = parseFloat(a[0])
            if (!Number.isNaN(n) && n >= 0) { readver = links[n], a.shift() }
          } let file; try { file = vcs.read(readver, a) } catch (e) { throw WRONGPATH }
          const { o, used } = file, id = o.id
          if (o.type !== 'file') { throw WRONGPATH } let text = vcs.g[o.value].value
          if (isv && replaces.has(id)) { text = replaces.get(id) }
          else if (opt.watch) { watch.add(id) }
          if (opt.watch) { [...used].forEach(v => watch.add(v.id)) }
          return [p, text, readver, id]
        }, loadtext = (...a) => load(...a)[1]
        env.__readfile = b => (p, opt) => loadtext(solvepath(b, p), opt)
        env.__writefile = b => (p, t, force = false) => {
          p = solvepath(b, p)
          const a = p.split('/').filter(v => v)
          let readver = rootver; if (isv) {
            const n = parseFloat(a[0])
            if (!Number.isNaN(n) && n >= 0) { readver = links[n], a.shift() }
          } vcs.write(readver, a, ['file', t, force])
        }
        env.__require = b => async (ph, p = solvepath(b, ph)) => {
          const data = await load(p, { watch: true }), file = data.pop()
          if (loaded.has(file)) { return loaded.get(file) }
          const ex = await exec(...data); loaded.set(file, ex); return ex
        }; const loaded = new Map, AF = (async () => { }).constructor
        const solvepath = (b, p) => b + (p.startsWith('/') || b === '' ? '' : '/') + p
        const exec = (path, src, ver) => new AF('$',
          `//# sourceURL=${ver.slice(0, 16) + '/' + path}\n` +
          `const __dirname = '${path.split('/').slice(0, -1).join('/')}'\n` +
          `const readfile = $.__readfile(__dirname)\n` +
          `const writefile = $.__writefile(__dirname)\n` +
          `const require = $.__require(__dirname)\n` + `with($) {\n${src}\n}` +
          `\n return $`)(Object.create(env))

        const isv = target.type === 'virtual'
        let path; if (!isv) { path = vcs.getpath(target); watch.add(target.id) }
        let [filepath, content, rootver, links, replaces] = isv ? target.getfile()
          : [path.join('/'), vcs.g[target.value].value, path.version.id]
        if (links) { env.__links = links } // log(filepath, content, rootver, links)
        if (!replaces) { replaces = new Map }

        try { await exec(filepath, content, rootver) }
        catch (e) { _error(true, e); console.error(e) }
      }
    } return $
  }
  $.cfeditor = ($ = eventnode(dom())) => {
    with ($) {

    } return $
  }
} { // read write disk
  $.opfs = ($ = eventnode()) => {
    with ($) {
      $.root = false
      $.read = async (file, dir) => {
        if (!root) { root = await navigator.storage.getDirectory() }
        if (!dir) { dir = root } file = await dir.getFileHandle(file)
        return (await file.getFile()).text()
      }
      $.readdir = async (file, dir) => {
        if (!root) { root = await navigator.storage.getDirectory() }
        if (!dir) { dir = root } return await dir.getDirectoryHandle(file)
      }
      $.write = async (name, data, dir) => {
        if (!root) { root = await navigator.storage.getDirectory() }
        if (!dir) { dir = root }
        if (typeof data !== 'string') { data = JSON.stringify(data) }
        const draftHandle = await dir.getFileHandle(name, { create: true })
        const writableStream = await draftHandle.createWritable()
        await writableStream.write(data)
        await writableStream.close()
      }
      $.writedir = async (name, dir) => {
        if (!root) { root = await navigator.storage.getDirectory() }
        if (!dir) { dir = root }
        return root.getDirectoryHandle(name, { create: true })
      }
      const rmopt = { recursive: true }
      $.delete = async (name, dir) => {
        if (!root) { root = await navigator.storage.getDirectory() }
        if (!dir) { dir = root } await dir.removeEntry(name, rmopt)
      }
      $.list = async (dir, a = []) => {
        if (!root) { root = await navigator.storage.getDirectory() }
        if (!dir) { dir = root }
        for await (const k of dir.keys()) { a.push(k) } return a
      }
      $.clear = async dir => (Promise.all((
        await list(dir)).map(n => dir.removeEntry(n, rmopt))), _)
    } return $
  }; $.opfs = opfs()
}

$.opente = ({ o }) => {
  const te = texteditor(), v = vcs.getversion(o)
  te.value = vcs.g[o.value].value
  if (v.lock) { te.setreadonly() }
  const sro = ({ o }) => (te.setreadonly(o.lock), tb.textContent = caln())
  vcs.on('version lock change', sro)
  te.on('change', () => { cgd = true, tb.textContent = caln() })
  te.on('save', () => (vcs.savefile(o, te.value),
    save(), cgd = false, tb.textContent = caln()))
  let cgd = false, askclose = () => {
    const w = dom('span'); tb.append(w)
    w.innerText = 'file not saved, really close?'
    w.style.color = '#f00'; cgd = false
  }, caln = () => (v.lock ? '🚫' : '') + v.id.slice(0, 8) + '/' +
    o.from[Object.keys(o.from)[0]].to[o.id].name + (cgd ? ' *' : '')
  const n = caln(), ext = n.split('.').pop()
  te.change_language({ js: 'javascript' }[ext] ?? 'plain text')
  if (!dk2.parentNode) { createdk(_, v => dk2 = v) }
  const tb = dk2.adddock(te, n)
  tb.setclosable((b = cgd) => (
    b ? askclose() : vcs.off('version lock change', sro), !b))
  const f = () => vcs.vg.highlight(vcs.tovnode(o))
  tb.on('focus', f); f()
  return te
}
$.opence = ({ o }) => {
  log(o)
}
$.opensb = ({ o }) => {
  const sb = sandboxtab(vcs, o), v = vcs.getversion(o)
  const n = v.id.slice(0, 8) + '/' +
    o.from[Object.keys(o.from)[0]].to[o.id].name
  if (!dk3.parentNode) { createdk('bottom', v => dk3 = v) }
  const tab = dom(), tbt = dom('span')
  tbt.textContent = n
  tbt.style.fontSize = '10px'
  tab.style.display = 'flex'
  tab.style.alignItems = 'center'
  tab.style.height = '100%'
  tab.append(tbt, sb.configtab)
  const tb = dk3.adddock(sb, tab)
  tb.setclosable(() => true)
  const f = () => vcs.vg.highlight(vcs.tovnode(o))
  tb.on('focus', f); f(); sb.exec()
  return sb
}

const localsave = async dir => {
  const data = vcs.serialization()
  const ho = new Set(await opfs.list(dir))
  const hs = data.hashobj; delete data.hashobj
  await Promise.all(hs.map(h => ho.has(h.id) ? 0 : opfs.write(h.id, h, dir)))
  await opfs.write('graph.json', data, dir)
}, localload = async dir => {
  const a = await opfs.list(dir)
  const data = JSON.parse(await opfs.read('graph.json', dir))
  data.hashobj = []; await Promise.all(a.map(async n => {
    if (n === 'graph.json') { return }
    data.hashobj.push(JSON.parse(await opfs.read(n, dir)))
  })); vcs.clear(); vcs.deserialization(data)
}, devsave = async r => {
  const d = vcs.serialization(), ws = await connectdevserver()
  const a = await ws.loadlist(r), ho = new Set(a), ha = []
  const hs = d.hashobj; delete d.hashobj; await Promise.all(hs
    .map(h => (ha.push(h.id), ho.has(h.id) ? 0 : ws.write(h.id, h, r)))
    .concat(ws.write('graph.json', d, r), ws.write('hashlist.json', ha, r)))
}, httpload = async repo => {
  const rs = `repo/${repo}/`, fs = 'graph.json hashlist.json'.split(' ')
  const read = async p => (await fetch(rs + p)).text()
  let [data, list] = await Promise.all(fs.map(read))
  data = JSON.parse(data); list = list ? JSON.parse(list) : []
  list = await Promise.all(list.map(read))
  const a = data.hashobj = []; list.forEach(h => a.push(JSON.parse(h)))
  vcs.clear(); vcs.deserialization(data)
}, save = debounceasync(async () => {
  if (typeof repo !== 'string') { throw Error(`Can't save due to internal error.`) }
  if (userland) {
    const topdir = await opfs.writedir('__REPOS_33f39fa383894937__')
    await localsave(await opfs.readdir(repo, topdir))
  } else {
    if (await canconnectdevserver) { await devsave(repo) } else {
      // boot save to local dialog
      $.repo = await vcs.savetolocaldialog()
      // const topdir = await opfs.writedir('__REPOS_33f39fa383894937__')
      // await localsave(await opfs.readdir(repo, topdir))
    }
  }
}), load = async () => {
  const sp = new URLSearchParams(location.search)
  userland = sp.get('user') ?? sp.get('userland')
  $.repo = sp.get('repo'); if (userland) {
    const topdir = await opfs.writedir('__REPOS_33f39fa383894937__')
    if (typeof repo !== 'string') {
      const repos = await opfs.list(topdir)
      if (repos.length > 1) { await vcs.chooserepodialog(repos) }
      else if (repos.length === 1) { repo = repo[0] } else { repo = uuid() }
    } await localload(await opfs.writedir(repo, topdir))
  } else {
    if (typeof repo !== 'string') { repo = 'b88b5d2ba107fa4f' }
    await httpload(repo)
  }
}; let userland
const canconnectdevserver = ((ws =
  new WebSocket((window.location.protocol === 'https:'
    ? 'wss:' : 'ws:') + '//' + window.location.host)) =>
  new Promise(r => (setTimeout(() => r(false), 1000),
    ws.onopen = () => r(true))).finally(() => ws.close()))()
const connectdevserver = () => {
  const ws = new WebSocket((window.location.protocol === 'https:'
    ? 'wss:' : 'ws:') + '//' + window.location.host)
  let i = 0, response = new Map, send = (c, o, j = i++) => (
    o.command = c, o.id = j, ws.send(JSON.stringify(o)),
    new Promise((...a) => (setTimeout(() => a[1](Error('time out')), 5000),
      response.set(j, a))).finally(() => response.delete(j)))
  let r; ws.onopen = () => r(ws); ws.onmessage = e => {
    const o = JSON.parse(e.data)
    if (!o || typeof o !== 'object') { return }
    const id = o.id, [r, j] = response.get(id); delete o.id
    o.error ? j(Error(o.error)) : r(o)
  }
  ws.loadlist = async repo => {
    try { return JSON.parse((await send('listrepo', { repo })).list) }
    catch (e) { return [] }
  }
  ws.write = (name, text, repo) =>
    send('writerepo', { repo, name, text: JSON.stringify(text) })
  return new Promise(a => r = a)
}
$.globalsave = save

{ // main
  window.$ = $
  $.vcs = vcseditor()
  listenframe(() => vcs.frame())
  $.sc = splitctn()
  $.dk = docking()
  sc.additem(dk)
  document.body.append(sc)
  dk.adddock(vcs.elm, 'vcs')
  $.dk2 = false, $.dk3 = false
  vcs.on('boot text editor', opente)
  vcs.on('boot conflict editor', opence)
  vcs.on('boot sandbox', opensb)
  vcs.on('save whole repo', save)
  $.createdk = (d = 'left', wt) => {
    const t = dk.adddock('', 'temp')
    t.setclosable(() => true)
    const dk2 = dk.split(t, d)
    setTimeout(() => dk2.deldock(t))
    wt(dk2)
  }
  await load()
  log(vcs.g)
}