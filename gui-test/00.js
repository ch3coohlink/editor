await require('../common/basic.js')

const cvs = document.createElement('canvas')
document.body.append(cvs)
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

