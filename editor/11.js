// 11.js - docking system
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
} { // global css rule --------------------------------------------------------
  const s = dom('style')
  s.innerHTML = `.no-scroll-bar {
  -ms-overflow-style: none;  /* Internet Explorer 10+ */
  scrollbar-width: none;  /* Firefox */
}
.no-scroll-bar::-webkit-scrollbar { 
  display: none;  /* Safari and Chrome */
}`; document.head.append(s)
}

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
        d.style.cursor = dcstr()
      } return d
    }, del = () => splitctn.is(parentNode) ?
      parentNode.delitem($) : $.remove()
    dragbar.is = n => n.classList.contains('dragbar')
    $.update = () => {
      $.innerHTML = ''; let a = [], l = arr.length - 1
      if (l < 0) { return } for (let i = 0; i < l; i++) {
        a.push(arr[i], dragbar())
      } a.push(arr[l]); $.append(...a)
    }
    $.getindex = e => arr.indexOf(e)
    $.additem = (e, i = 0) => {
      log('additem', arr, i)
      arr.splice(i, 0, e), update()
    }
    $.rplitem = (a, b, i = arr.indexOf(a)) => i >= 0
      ? (delitem(a), additem(b, i)) : 0
    $.delitem = (e, i = getindex(e)) => {
      log('delitem', arr)
      if (i >= 0) { arr.splice(i, 1), update() }
      else return; if (size === 0) { del() }
      else if (size === 1) {
        return
        log('size===1, resizing', arr, $)
        const c = arr[0]; if (splitctn.is(parentNode)) {
          if (parentNode.direction === direction) {
            log('same direction, replace self')
            parentNode.rplitem($, c)
          } else if (splitctn.is(c)) {
            log('the only child is container, replace with it')
            parentNode.rplitem($, c)
          }
        } else if ((splitctn.is(c))) {
          log('we are root just do the replace')
          log(arr, c.arr)
          $.replaceWith(c)
          logdk('after replace')
        }
      }
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
      tabs.style.borderBottom = '1px solid #00000040'
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
        if (!isdgo(e)) { return }
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
      idfonte(e, tabs.children[l - 1]) : hideidf(), e.preventDefault())
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
      e.preventDefault(); if (!isdgo(e)) { return }
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
    }
    $.dropontab = (e, te) => {
      hideidf(); let rte = getdgo(e); if (!rte) { return }
      const tabs = te.parentNode; rte.undock()
      let a = [...tabs.children], i = a.indexOf(te)
      const b = te.getBoundingClientRect()
      const p = geteventlocation(e)
      i += p.x < b.left + b.width / 2 ? 0 : 1
      rte.parentNode === tabs && i > a.indexOf(rte) ? i -= 1 : 0
      dsplice(tabs, i, 0, rte), focustab(rte)
    }
    $.split = (te, d) => {
      let s = (o, d = 'horizontal') => {
        let pt = parentNode; dk = docking()
        if (pt.size > 1 && pt.direction !== d) {
          log('replace pt')
          pt = makecontain()
        }
        pt.additem(dk, pt.getindex($) + o), pt.direction = d
      }, dk = $; te.undock();
      logdk('after undocking')
      switch (d) {
        case 'top': s(0, 'vertical'); break;
        case 'left': s(0); break;
        case 'right': s(1); break;
        case 'bottom': s(1, 'vertical'); break;
      } dk.move(te); logdk('after split'); return dk
    }
    $.adddock = (e, t) => {
      let te = dom(); if (typeof t === 'string') {
        te.innerText = t
      } else { te.append(t) } {
        te.classList = 'single-tab'
        te.style.width = '100px'
        te.style.boxSizing = 'border-box'
        te.style.height = '100%'
        te.style.padding = '5px'
        te.style.background = '#00000010'
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
        e.preventDefault(), e.stopImmediatePropagation())
      te.addEventListener('dragenter', dg)
      te.addEventListener('dragover', dg)
      te.draggable = true; cp().focustab(te)
      listenpointerdown(te, e => { cp().focustab(te) })
      te.undock = () => cp().deldock(te); return te
    }
    $.deldock = (te, e = (te.remove(), tabs.children[tabs.children
      .length - 1])) => e ? focustab(e) : parentNode.delitem($)
    $.makecontain = (p = splitctn()) => (
      parentNode.rplitem($, p), p.additem($), p)
  } return $
}

$.logdk = m => {
  const a = m ? [m] : [], f = (cs, i = 0) => {
    for (const c of cs) {
      if (c.classList.contains('dragbar')) { continue }
      let n = ' '.repeat(i * 2)
      if (splitctn.is(c)) { n += c.className + ' ' + c.direction }
      else if (c.classList.contains('single-tab')) { n += ' ' + c.innerText }
      else { n += c.className } a.push(n)
      if (splitctn.is(c)) { f(c.children, i + 1) }
      if (c.classList.contains('docking')) { f(c.tabs.children, i + 1) }
    }
  }; f(document.body.children)
  log(a.join('\n'))
}

$.sc = splitctn()
$.dk = docking()
sc.additem(dk)
document.body.append(sc)
document.body.style.padding = '10px'

const t1 = dk.adddock('1', 'test1')
const t2 = dk.adddock('2', 'test2')
const t3 = dk.adddock('3', 'test3')
const t4 = dk.adddock('4', 'test4')
logdk()

const dk2 = dk.split(t4, 'bottom')
const dk3 = dk2.split(t3, 'right')
console.clear()
logdk()

dk.split(t2, 'right')