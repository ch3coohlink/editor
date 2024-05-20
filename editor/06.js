// 06.js - git editor
//# sourceURL=7bF10sAz0.js

{ // basic utility ----------------------------------------------------------
  $._ = undefined
  $.wait = t => new Promise(r => setTimeout(r, t))
  $.debounce = (f, t = 100, i) => (...a) =>
    (clearTimeout(i), i = setTimeout(() => f(...a), t))
  $.throttle = (f, t = 100, i) => (...a) =>
    i ? 0 : (i = 1, f(...a), setTimeout(() => i = 0, t))
  let hexenc = b => [...b].map(v => v.toString(16).padStart(2, '0')).join("")
  $.uuid = (d = 32) => hexenc(crypto.getRandomValues(new Uint8Array(d)))
  $.sha256 = async t => hexenc(new Uint8Array(
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
  let { floor } = Math
  $.bsearch = (a, cmp, l = 0, r = a.length - 1, m, c) => {
    while (l <= r) {
      m = floor((l + r) / 2), c = cmp(a[m])
      if (c > 0) { r = m - 1 } else if (c < 0) { l = m + 1 } else { return m }
    } return -1
  }, $.bsleft = (a, c, l = 0, r = a.length, m) => {
    while (l < r) (m = floor((l + r) / 2), c(a[m]) < 0 ? l = m + 1 : r = m); return l
  }, $.bsright = (a, c, l = 0, r = a.length, m) => {
    while (l < r) (m = floor((l + r) / 2), c(a[m]) > 0 ? r = m : l = m + 1); return r - 1
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
}

$.indexeddb = (name = "default", store = "default") => {
  let $ = { name, store }; with ($) {
    $.dbp = new Promise((r, j, d = indexedDB.open(name)) => (
      d.onsuccess = () => r(d.result),
      d.onerror = () => j(d.error),
      d.onupgradeneeded = () => d.result.createObjectStore(store)))

    $.deletedatabase = () => dbp.then(db => (db.close(),
      new Promise((r, j, d = indexedDB.deleteDatabase(name)) =>
        (d.onerror = j, d.onsuccess = r))))

    $.upgrade = f => dbp.then(db => (db.close(), $.dbp = new Promise(
      (r, j, d = indexedDB.open(name, db.version + 1)) => (
        d.onsuccess = () => r(d.result),
        d.onerror = () => j(d.error),
        d.onupgradeneeded = () => f(d.result)))))

    $.action = (type, cb, s = store) => dbp.then(db => new Promise(
      (r, j, t = db.transaction(s ?? db.objectStoreNames, type)) => (
        t.oncomplete = () => r(),
        t.onabort = t.onerror = () => j(t.error),
        cb(t))))

    $.request = rq => new Promise((r, j) => (
      rq.onsuccess = r(rq.result), rq.onerror = j))

    $.ro = f => action("readonly", t => f(t.objectStore(store)))
    $.rw = f => action("readwrite", t => f(t.objectStore(store)))

    $.get = (k, r) => ro(s => r = s.get(k)).then(() => r.result)
    $.set = (k, v) => rw(s => s.put(v, k))
    $.del = k => rw(s => s.delete(k))
    $.clr = () => rw(s => s.clear())

    $.key = r => ro(s => r = s.getAllKeys()).then(() => r.result)
    $.val = r => ro(s => r = s.getAll()).then(() => r.result)
    $.search = (kr, r = []) => ro(s =>
      s.openCursor(kr).onsuccess = (e, c = e.target.result) =>
        !c ? 0 : (r.push([c.key, c.value]), c.continue())).then(() => r)

    const fcc = String.fromCharCode
    const inc = (s, l = s.length - 1) => s.substring(0, l) + fcc(s.charCodeAt(l) + 1)
    $.path = s => IDBKeyRange.bound(s, inc(s), 0, 1)
    $.getpath = s => search(path(s = s[s.length - 1] === "/" ? s : s + "/"))
      .then(a => (a ?? []).map(v => (v[0] = v[0].slice(s.length), v)))

    const debounce = (f, t = 100, o = {}) => (k, v) => (
      clearTimeout(o[k]), o[k] = setTimeout(() => f(k, v), t))
    const { set: rset, deleteProperty: rdel } = Reflect
    $.saveobj = id => {
      const dset = debounce((k, v) => set(key + k, v))
      const pset = (o, k, v) => (dset(k, v), rset(o, k, v))
      const pdel = (o, k) => (del(key + k), rdel(o, k))
      const remove = () => del(path(key)), key = `/saveobj/${id}/`
      const init = getpath(key).then(a => a.forEach(([k, v]) => o[k] = v))
      const o = eventnode({ init, remove, id })
      return new Proxy(Object.create(o), { set: pset, deleteProperty: pdel })
    }
  } return $
}

$.fakeidb = (name = "default", store = "default") => {
  let $ = { name, store }; with ($) {
    let o = {}, cmp = t => v => v.startsWith(t) ? 0 : v.localeCompare(t)
    $.get = k => o[k], $.set = (k, v) => o[k] = v
    $.del = k => delete o[k], $.clr = () => o = {}
    $.key = () => Object.keys(o), $.val = () => Object.values(o)
    $.getpath = (t, k = key().sort(), f = cmp(t), s = bsearch(k, f), l = t.length) =>
      s < 0 ? [] : k.slice(bsleft(k, f), bsright(k, f) + 1).map(k => [k.slice(l), ko[k]])
  } return $
}

$.git = ($ = {}) => {
  with ($) {
    let fstr = (n, f) => `git/files/${n}/` + (f ?? "")

    $.version_lock = true
    $.read = (...a) => rawread(...a).then(v => v.content)
    $.rawread = async (node, path) => {
      let [a, b] = path.split("/"), f = await db.get(fstr(node, a))
      if (!f) { panic(`path "${node}:${a}" not exist`) }
      if (f.mode === "file") {
        const content = await db.get(`git/hashobj/${f.content}`)
        if (content === undefined) { panic(`hashobj ${f.content} not exist`) }
        return { node, path, content }
      }
      if (f.mode === "ref" && b) { return rawread(f.content, b) }
      else { return { node, path, ...f } }
    }
    $.dir = async (node) => {
      let k = fstr(node), a = await db.getpath(k)
      return a.map(([path, o]) => ({ node, path, ...o }))
    }
    $.versioncheck = async node => {
      if (!await db.get(`git/nodes/${node}`)) { panic(`node:"${node}" not exist`) }
      if (!version_lock) { return }
      const a = await db.getpath(`git/node_to/${node}`)
      if (a.length > 0) { panic(`node:"${node}" is not a leaf node`) }
    }
    $.write = async (node, name, content, mode = "file") => {
      await versioncheck(node); const k = fstr(node, name)
      if (await db.get(k)) { panic(`path "${node}/${name}" has been occupied`) }
      if (mode === 'file') {
        const h = await sha256(content), hk = `git/hashobj/${h}`
        let ho = await db.get(hk), a = []
        if (!ho) { a.push(db.set(hk, content)) }
        a.push(db.set(`git/hashref/${h}/${node}/${name}`, true))
        a.push(db.set(k, { mode, content: h }))
        await Promise.all(a)
      } else { await db.set(k, { mode, content }) }
    }
    $.remove = async (node, name) => {
      await versioncheck(node)
      const k = fstr(node, name), r = await db.get(k)
      if (!r) { panic(`path "${node}/${name}" not exist`) }
      if (r.mode === 'file') {
        await db.del(`git/hashref/${r.content}/${node}/${name}`)
        const a = await db.getpath(`git/hashref/${r.content}`)
        if (a.length <= 0) { await db.del(`git/hashobj/${r.content}`) }
      } await db.del(k)
    }
    $.rename = async (node, oldname, newname) => {
      const { content: v, mode: m } = await rawread(node, oldname)
      await remove(node, oldname); await write(node, newname, v, m)
    }

    $.newgraph = name => (graphs[name] = {}, roots[name] = newnode(name))
    $.newnode = prev => {
      let name, id = uuid(); if (!nodes[prev]) {
        if (graphs[prev]) { name = prev, prev = null }
        else { panic(`previous node: "${prev}" not exist`) }
      } else { name = nodes[prev].graph }
      const n = { to: {}, from: {}, files: {}, graph: name, time: new Date }
      graphs[name][id] = nodes[id] = n; if (prev) {
        n.files = deepcopy(nodes[prev].files)
        n.from[prev] = nodes[prev].to[id] = 1
      } return id
    }
    $.newrepo = async (name) => {
      if (await db.get(`git/name_repo/${name}`)) {
        panic(`repo "${name}" already exists`)
      }
      let id = uuid(), repo = uuid()
      await Promise.all([
        db.set(`git/repo_name/${repo}`, name),
        db.set(`git/name_repo/${name}`, repo),
        db.set(`git/nodes/${id}`, repo),
        db.set(`git/repo_node/${repo}/${id}`, true),
      ])
      return id
    }
    $.newnode = async (prev) => {
      let repo = await db.get(`git/nodes/${prev}`)
      if (!repo) { panic(`previous node "${prev}" not exist`) }
      let id = uuid(), a = await db.getpath(fstr(prev))
      await Promise.all([
        db.set(`git/nodes/${id}`, repo),
        db.set(`git/repo_node/${repo}/${id}`, true),
        db.set(`git/node_to/${prev}/${id}`, true),
        db.set(`git/node_from/${id}/${prev}`, true),
        ...a.map(([p, o]) => db.set(fstr(id, p), o))])
      return id
    }

    // TODO
    $.merge = async (a, b) => {
      // check version existence
      // check version in same repo
      // find most recent common ancestor
      // diff a b with ancester
      // diff the diff result in a and b, find conflict
      // call the conflict solve procedure
      // apply the solve, create a new version
      // merge finish
    }

    $.getnoderepo = async node => {
      const repo = await db.get(`git/nodes/${node}`)
      if (!repo) { panic(`node ${node} is not exist`) }
      const name = await db.get(`git/repo_name/${repo}`)
      if (!name) { panic(`repo ${repo} is not exist`) }
      return name
    }
    $.getrepoid = async name => {
      const id = await db.get(`git/name_repo/${name}`)
      if (!id) { panic(`repo "${name}" not exist`) }
      return id
    }
    $.write_node_description = async node => { }
    $.read_node_description = async node => { }
    $.readrepos = () => db.getpath("git/name_repo/")
    $.readnodes = async repo => {
      const a = await db.getpath(`git/repo_node/${repo}`)
      if (a.length === 0) { panic(`repo: "${name}" has no nodes`) }
      return a.map(([v]) => v)
    }
    $.renamerepo = async (oldn, newn) => { }
  } return $
}

$.texteditor = () => {
  let $ = document.createElement('div')
  $.className = 'texteditor'
  $ = eventnode($); with ($) {
    const root = attachShadow({ mode: "open" })
    const css = document.createElement("style")
    css.innerText = `@import "${monaco_root}/editor/editor.main.css";`
    const div = document.createElement('div')
    div.className = 'monaco-editor-div'
    div.style.height = '100%'
    root.append(div, css)

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
      wordWrap,
    })
    editor.addAction({
      id: "save-text-file", label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => emit("filesave", value),
    })
    editor.addAction({
      id: "toggle-word-warp", label: "Toggle Word Warp",
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
      run: () => ($.wordWrap = wordWrap === "on" ? "off" : "on",
        editor.updateOptions({ wordWrap })),
    })

    $.change_language = l =>
      monaco.editor.setModelLanguage(editor.getModel(), l)
    new ResizeObserver(() => editor.layout()).observe(div)
    editor.onDidChangeModelContent(() => emit("change"))
    Object.defineProperty($, "value",
      { get: () => editor.getValue(), set: v => editor.setValue(v) })
    $.open = () => { parent.style.display = "" }
    $.close = () => { parent.style.display = "none" }
  } return $
}

$.graph = ($ = eventnode({ g: {}, i: 0 })) => {
  with ($) {
    $.addnode = (id = i++) => {
      g[id] = { id, to: {}, from: {}, nto: 0, nfrom: 0 }
      newnodeelm(g[id]); return id
    }
    $.delnode = (id, n = g[id]) => {
      for (const k in n.to) { deledge(id, k) } delete g[id]
      for (const k in n.from) { deledge(k, id) } n.elm.remove()
    }
    $.addedge = (a, b) => {
      g[a].to[b] = { o: g[b] }, g[b].from[a] = g[a]
      g[a].nto++, g[b].nfrom++, newedgeelm(g[a], g[b])
    }
    $.deledge = (a, b) => {
      g[a].to[b].elm.remove(), g[a].nto--, g[b].nfrom--
      delete g[a].to[b], delete g[b].from[a]
    }
    $.clear = () => { g = {}, sep.innerHTML = sen.innerHTML = '' }
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
        e.setAttribute('cx', x), e.setAttribute('cy', y)
        for (const k in n.to) {
          const b = n.to[k], bp = b.o.data.pos, e = b.elm, arws = 2
          if (b.o === n) {
            const c = arws, r = circlesize - linewidth / 2, r2 = r * 2
            e.setAttribute('d', `M ${x + r} ${y} m ${r} 0 ` +
              `a ${r},${r} 0 1,0 ${-r2}, 0 a ${r},${r} 0 1,0 ${r2}, 0 ` +
              `M ${x + r2 + c} ${y + c} L ${x + r2} ${y} L ${x + r2 - c} ${y + c}`)
          } else {
            let dx = bp.x - x, dy = bp.y - y, s = 0.6, c = arws
            let mx = x + dx * s, my = y + dy * s
            let l = 1 / sqrt(dx * dx + dy * dy); dx *= l * c, dy *= l * c
            e.setAttribute('d', `M ${x} ${y} L ${bp.x} ${bp.y} ` +
              `M ${mx + dy} ${my - dx} L ${mx + dx} ${my + dy} L ${mx - dy} ${my + dx}`)
          }
        }
      }
    }
    $.stop = false, $.layouttime = 0, $.multirun = 4
    $.total_speed = 0, $.total_accelaration = 0
    $.frame = () => {
      const ns = [], es = []; for (const k in g) {
        const n = g[k]; if (!n.data) { n.data = {} } const d = n.data
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
    $.se = svg('svg'); se.style.touchAction = 'none'
    se.style.display = 'block', se.style.height = se.style.width = '100%'
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
      const c = svg('circle')
      c.setAttribute('r', circlesize + 'px')
      listenpointerdown(c, e => {
        if (e.target !== c) { return } const m = e => {
          if (e.touches && e.touches.length > 1) { return }
          c.setAttribute('fill', 'red'); reset()
          const { x, y } = screen2svgcoord()(...geteventlocation(e))
          n.data.pos.x = x, n.data.pos.y = y, n.data.lock = true
        }; listenpointermove(m), listenpointerup(() => (
          c.removeAttribute('fill'),
          delete n.data.lock, cancelpointermove(m)))
      })
      n.elm = c, sen.append(c)
    }
    $.newedgeelm = (a, b) => {
      const p = svg('path')
      a.to[b.id].elm = p, sep.append(p)
    }
    $.geteventlocation = (e, ef = e.touches) => {
      const { left: l, top: t } = se.getBoundingClientRect()
      return ef && ef.length == 1 ?
        [ef[0].pageX - l, ef[0].pageY - t] : [e.pageX - l, e.pageY - t]
    }
  } return $
}

$.gengraph = (l = 10, g = graph()) => {
  const { floor, abs } = Math, ids = []
  for (let i = 0; i < l; i++) { ids.push(g.addnode()) }
  for (let i = 0; i < l; i++) {
    let r = floor(abs(gaussian(0, 2)) * 1) + (rd() > 0.5 ? 1 : 0)
    const a = ids[i], s = [...ids]
    for (let j = 0; j < r && s.length > 0; j++)
      g.addedge(a, s.splice(floor(rd(s.length)), 1)[0])
  } g.reset(); return g
}

$.giteditor = ($ = { gt: git(), g: graph() }) => {
  with ($) {
    $.newver = () => { }
    $.frame = () => { g.frame() }
    Object.defineProperty($, 'elm', { get: () => g.se })
  } return $
}
{
  let ge = giteditor()
  gengraph(25, ge.g)
  document.body.append(ge.elm)
  listenframe(() => { ge.frame() })
}