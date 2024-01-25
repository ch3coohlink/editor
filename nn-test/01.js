await require('../common/basic.js')

const cvs = document.createElement('canvas')
cvs.style.imageRendering = 'pixelated'
document.body.append(cvs)
new ResizeObserver(() => {
  const w = document.body.clientWidth, h = document.body.clientHeight
  const r = window.devicePixelRatio
  const wr = Math.floor(w * r), hr = Math.floor(h * r)
  let changed = false
  if (cvs.width !== wr) { changed = true, cvs.width = wr }
  if (cvs.height !== hr) { changed = true, cvs.height = hr }
  cvs.style.width = (wr / r) + 'px'
  cvs.style.height = (hr / r) + 'px'
  if ($.createtexture && changed) { createtexture() }
}).observe(document.body)

const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
const device = await adapter.requestDevice()
const cvsctx = cvs.getContext("webgpu")
const format = navigator.gpu.getPreferredCanvasFormat()
cvsctx.configure({ device, format })

const normalize = ([x, y, z], s = 1 / Math.sqrt(x * x + y * y + z * z)) => [x * s, y * s, z * s]
const cross = (a, b, r = Array(3)) => {
  const t1 = a[2] * b[0] - a[0] * b[2];
  const t2 = a[0] * b[1] - a[1] * b[0];
  r[0] = a[1] * b[2] - a[2] * b[1];
  r[1] = t1; r[2] = t2; return r
}

const ubdef = `struct Uniforms {
  time: f32,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;`
const ubsize = 48, ubarr = new ArrayBuffer(ubsize)
const uniforms = {
  time: new Float32Array(ubarr, 0, 1),
}, ub = device.createBuffer({
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  size: ubsize,
})

let helpfn = ``

const ds = device.createShaderModule({
  code: `const pos = array<vec2f, 6>(
vec2(-1, 1), vec2(1, 1), vec2(-1, -1), vec2(-1, -1), vec2(1, 1), vec2(1, -1));
@vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  return vec4(pos[i], 0, 1);
} @group(0) @binding(0) var screen: texture_2d<f32>;
@fragment fn fragment(@builtin(position) fragcoord: vec4f
) -> @location(0) vec4<f32> {
  return textureLoad(screen, vec2i(fragcoord.xy), 0);
}`})

const cs = device.createShaderModule({
  code: `${ubdef}\n${helpfn}
@group(0) @binding(1) var screen: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var input_texture: texture_2d<f32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) uid: vec3u) {
  let id = vec3f(uid); let t = uniforms.time;
  for(var i = 0u; i < 512; i++) {
    let c = textureLoad(input_texture, vec2(uid.x, i), 0);
    textureStore(screen, vec2(uid.x, i), c);
  }
  for(var i = 0u; i < 512; i++) {
    textureStore(screen, vec2(uid.x + 512, i), vec4(sin(t), cos(t), 1, 1));
  }
}`})

const cpipe = await device.createComputePipelineAsync({
  layout: 'auto', compute: { module: cs, entryPoint: 'main' }
})
const rpipe = await device.createRenderPipelineAsync({
  layout: 'auto', vertex: { module: ds, entryPoint: 'vertex' },
  fragment: { module: ds, entryPoint: 'fragment', targets: [{ format }] },
})

let screenbuffer, bsbind, csbind

let input_texture;
{
  const response = await fetch('../assets/01.png');
  const imageBitmap = await createImageBitmap(await response.blob());

  input_texture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: input_texture },
    [imageBitmap.width, imageBitmap.height]
  );
}

$.createtexture = () => {
  screenbuffer = device.createTexture({
    format: 'rgba16float', size: [cvs.width, cvs.height],
    // format: 'rgba16float', size: [960, 540],
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  })
  bsbind = device.createBindGroup({
    layout: rpipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: screenbuffer.createView() },
    ]
  })
  csbind = device.createBindGroup({
    layout: cpipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: ub } },
      { binding: 1, resource: screenbuffer.createView() },
      { binding: 2, resource: input_texture.createView() },
    ]
  })
}
createtexture()

let ro = [0, 0, 0], polar = [0, 0], rd = [0, 0, 0], down = false
const updateraydir = () => {
  rd[0] = Math.cos(polar[0]) * Math.cos(polar[1])
  rd[1] = -Math.sin(polar[1])
  rd[2] = Math.sin(polar[0]) * Math.cos(polar[1])
  rd = normalize(rd)
}; updateraydir()

window.addEventListener('pointerdown', e => {
  if (e.button === 0) { down = true }
})
window.addEventListener('pointerup', e => {
  if (e.button === 0) { down = false }
})
window.addEventListener('pointermove', e => {
  if (down) {
    const eff = Math.PI * 2 * 0.0005
    polar[0] += eff * e.movementX
    polar[1] = Math.max(Math.min(polar[1] + eff * e.movementY, Math.PI / 2), -Math.PI / 2)
    updateraydir()
  }
})
const pressed = new Set
window.addEventListener('keydown', e => {
  pressed.add(e.key.toLowerCase())
  if (e.shiftKey || e.ctrlKey || e.altKey) {
    e.preventDefault()
  }
})
window.addEventListener('keyup', e => {
  pressed.delete(e.key.toLowerCase())
})

const plotter = () => {
  const div = document.createElement("div")
  div.style.position = "fixed"
  div.style.top = "0"
  div.style.right = "0"
  div.style.background = "#ffffff33"
  div.style.width = "70px"
  const text = document.createElement("span")
  text.style.color = "white"
  const cvs = document.createElement("canvas")
  cvs.style.width = "100%"
  cvs.style.height = "50px"
  cvs.style.display = "block"
  const ctx = cvs.getContext("2d")
  div.append(text, cvs)
  div.addfpsdata = fps => {
    text.innerText = `${fps.toFixed(1)}`
    data.push(fps), data.shift()
  }
  const data = [...new Array(70)].map(() => 0)
  cvs.width = 70, cvs.height = 50
  div.drawgraph = () => {
    ctx.clearRect(0, 0, 200, 200)
    ctx.strokeStyle = "white"
    ctx.beginPath(), ctx.moveTo(-100, 0)
    for (let i = 0, s = data.length; i < s; i++) {
      ctx.lineTo(i, 50 - data[i] / 60 * 50)
    } ctx.stroke()
  }
  return div
}

const fpscounter = plotter()
document.body.append(fpscounter)
let st = performance.now() / 1000, pt = st
const loop = t => {
  t /= 1000; let dt = t - pt; pt = t
  fpscounter.addfpsdata(1 / dt)
  fpscounter.drawgraph()
  dt = Math.min(dt, 1 / 60)

  let spd = 0.1, movero = (rd, s = 1) => {
    // let spd = 0.001, movero = (rd, s = 1) => {
    ro[0] += rd[0] * spd * dt * s
    ro[1] += rd[1] * spd * dt * s
    ro[2] += rd[2] * spd * dt * s
  }
  if (pressed.has('shift')) { spd *= 1000 }
  if (pressed.has('alt')) { spd *= 100 }
  if (pressed.has('h')) { ro = [0, 0, 0] }
  if (pressed.has('e')) { movero(rd) }
  if (pressed.has('d')) { movero(rd, -1) }
  if (pressed.has('s')) {
    movero(normalize(cross(rd, [0, 1, 0])), -1)
  }
  if (pressed.has('f')) {
    movero(normalize(cross(rd, [0, 1, 0])))
  }
  if (pressed.has('r')) {
    const cu = normalize(cross(rd, [0, 1, 0]))
    const cv = normalize(cross(cu, rd))
    movero(cv)
  }
  if (pressed.has('w')) {
    const cu = normalize(cross(rd, [0, 1, 0]))
    const cv = normalize(cross(cu, rd))
    movero(cv, -1)
  }

  // uniforms.resolution[0] = cvs.width
  // uniforms.resolution[1] = cvs.height
  uniforms.time[0] = t
  device.queue.writeBuffer(ub, 0, ubarr)
  const enc = device.createCommandEncoder()

  const cp = enc.beginComputePass({})
  cp.setPipeline(cpipe)
  cp.setBindGroup(0, csbind)
  cp.dispatchWorkgroups(8)
  cp.end()

  const rp = enc.beginRenderPass({
    colorAttachments: [{
      view: cvsctx.getCurrentTexture().createView(),
      loadOp: 'load', storeOp: 'store'
    }]
  })
  rp.setPipeline(rpipe)
  rp.setBindGroup(0, bsbind)
  rp.draw(6), rp.end()

  device.queue.submit([enc.finish()])
  requestAnimationFrame(loop)
}; requestAnimationFrame(loop)