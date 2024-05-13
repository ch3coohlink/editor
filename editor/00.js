// 00.js - load monaco editor

{
  $.monaco_root = 'common/monaco-editor/min/vs'

  const css = document.createElement('style')
  css.innerHTML = /* We must define the font face outside the shadowroot */ `@font-face {
      font-family: 'codicon';
      src: url('${monaco_root}/base/browser/ui/codicons/codicon/codicon.ttf') format('truetype');
    }`
  const js = document.createElement('script')
  js.src = `${monaco_root}/loader.js`
  document.head.append(css, js)

  await new Promise(r => { js.addEventListener('load', r) })
  let r, p = new Promise(a => r = a), rq = window.require
  rq.config({ paths: { vs: monaco_root, "vs/css": { disabled: true } } })
  rq(["vs/editor/editor.main"], r); await p
}

$.eventnode = ($ = {}) => {
  $._handles = {}; with ($) {
    $.emit = (t, ...a) => _handles[t]?.forEach(f => f(...a))
    $.on = (t, f) => (_handles[t] ??= new Set).add(f)
    $.off = (t, f) => (_handles[t]?.delete(f),
      _handles[t].size > 0 ? 0 : delete _handles[t])
  } return $
}

$.create_editor = (parent) => {
  let $ = eventnode({ parent }); with ($) {
    const root = parent.attachShadow({ mode: "open" })
    $.css = document.createElement("style")
    css.innerText = `@import "${monaco_root}/editor/editor.main.css";`
    $.div = document.createElement('div')
    div.className = 'monaco-editor-div'
    div.style.width = div.style.height = '100%'
    root.append(div, css)

    $.wordWrap = "on"
    $.editor = monaco.editor.create(div, {
      value: "",
      language: "plaintext",
      theme: "vs-light",
      renderWhitespace: "all",
      renderControlCharacters: true,
      tabSize: 2,
      // lineNumbers: "off",
      lightbulb: { enabled: false },
      // glyphMargin: false,
      // overviewRulerBorder: false,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      // folding: false,
      // minimap: { enabled: false },
      // wordWrap,
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

const text = `await require('../common/basic.js')

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
          log(h, !r, objarr(c).join('|'))
          if (L % 2 === o && z >= o - h && z <= h - o && c[k % Z] + d[z % Z] >= N) {
            let [D, x, y, u, v] = o === 1 ? [2 * h - 1, s, t, a, b] : [2 * h, N - a, M - b, N - s, M - t], R
            log('jump')
            if (D > 1 || x !== u && y !== v) {
              R = diff(e.slice(0, x), f.slice(0, y), i, j)
                .concat(diff(e.slice(u), f.slice(v), i + u, j + v))
            } else if (M > N) { R = diff([], f.slice(N), i + N, j + N) }
            else if (M < N) { R = diff(e.slice(M), [], i + M, j + M) }
            else { R = [] }
            log('jump back', ...R)
            return R
          }
        }
      }
    }
  } else if (N > 0) { return [{ type: 'delete', old: i, length: N }] }
  else if (M > 0) { return [{ type: 'insert', old: i, new: j, length: M }] }
  else { throw new Error('can\\'t diff') }
}

diff('abc'.split(''), 'bcfffffffffffffffffffffff'.split(''))`

{
  let d = document.createElement('div')
  d.style.height = '50%'
  document.body.append(d)

  let e = create_editor(d)
  e.value = text
  e.change_language('javascript')
// e.change_language('typescript')
}

{
  let d = document.createElement('div')
  d.style.height = '50%'
  document.body.append(d)

  let e = create_editor(d)
  e.value = text
  e.change_language('javascript')
// e.change_language('typescript')
}