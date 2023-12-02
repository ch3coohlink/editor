const elm = document.createElement.bind(document)
const dom = (o = {}, p, n = o.tag ?? "div") => {
  let e; if (o instanceof HTMLElement) { e = o, o = p, p = undefined }
  else { e = elm(n) } for (const k in o) {
    const v = o[k]; switch (k) {
      case "class": e.className = v; break;
      case "child": e.append(...asarr(v)); break;
      case "style": style(e, ...asarr(v)); break;
      default: e[k] !== v ? e[k] = v : 0; break;
    }
  } if (p) { p.append(e) } return e
}, root = document.body

const cvs = dom({ tag: "canvas" }, root)
const fitcvs = (c = cvs, r = window.devicePixelRatio) => (
  c.width = c.clientWidth * r, c.height = c.clientHeight * r)
new ResizeObserver(() => fitcvs()).observe(cvs)
cvs.style.width = cvs.style.height = "100%"

const adapter = await navigator.gpu.requestAdapter()
const device = await adapter.requestDevice()
const ctx = cvs.getContext("webgpu")
$.onclose = async () => { device.destroy() }

const format = navigator.gpu.getPreferredCanvasFormat()
ctx.configure({ device, format })