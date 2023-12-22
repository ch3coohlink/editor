await require('../common/basic.js')

const cvs = document.createElement('canvas')
document.body.append(cvs)
const fitcvs = (c = cvs, r = window.devicePixelRatio) => (
  c.width = c.clientWidth * r, c.height = c.clientHeight * r)
new ResizeObserver(() => fitcvs()).observe(cvs)
cvs.style.width = cvs.style.height = "100%"

const adapter = await navigator.gpu.requestAdapter()
const device = await adapter.requestDevice()
const cvsctx = cvs.getContext("webgpu")
const format = navigator.gpu.getPreferredCanvasFormat()
cvsctx.configure({ device, format })

const ubdef = `struct Uniforms {
  resolution: vec2f,
  time: f32,
  campos: vec3f,
  camdir: vec3f,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;`
const ubsize = 48, ubarr = new ArrayBuffer(ubsize)
const uniforms = {
  resolution: new Float32Array(ubarr, 0, 2),
  time: new Float32Array(ubarr, 8, 1),
  campos: new Float32Array(ubarr, 4 * 4, 3),
  camdir: new Float32Array(ubarr, 8 * 4, 3),
}, ub = device.createBuffer({
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  size: ubsize,
})

const helpfn = `
fn raysphere(ro: vec3f, rd: vec3f, o: vec3f, r2: f32) -> bool {
  let l = o - ro; let tca = dot(l, rd);
  if(tca < 0) { return false; }
  let d2 = dot(l, l) - tca * tca;
  if (d2 > r2) { return false; }
  let thc = sqrt(r2 - d2);
  var t0 = tca - thc;
  var t1 = tca + thc;
  if(t0 > t1) { let tp = t1; t0 = t1; t1 = t0; }
  if(t0 < 0) { t0 = t1; if(t0 < 0) { return false; } }
  return true;
}
`

const module = device.createShaderModule({
  code: `const pos = array<vec2f, 6>(
vec2(-1, 1), vec2(1, 1), vec2(-1, -1), vec2(-1, -1), vec2(1, 1), vec2(1, -1));
@vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  return vec4(pos[i], 0.0, 1.0);
}\n${ubdef}\n${helpfn}
@fragment fn fragment(@builtin(position) fragpos: vec4f
) -> @location(0) vec4<f32> {
  let uv = vec2f(fragpos.x / uniforms.resolution.x,
    (1 - fragpos.y / uniforms.resolution.y));
  let ro = uniforms.campos;
  let cw = normalize(uniforms.camdir);
  let cu = normalize(cross(cw, vec3f(0, 1, 0)));
  let cv = cross(cu, cw);
  let cam = mat3x3f(cu, cv, cw);
  let rd = cam * normalize(vec3f(uv, 1));

  if(raysphere(ro, rd, vec3(10, 0, 0), 0.1)) { return vec4(1, 0, 0, 1); }
  if(raysphere(ro, rd, vec3(0, 10, 0), 0.1)) { return vec4(0, 1, 0, 1); }
  if(raysphere(ro, rd, vec3(0, 0, 10), 0.1)) { return vec4(0, 0, 1, 1); }

  let skyclr = vec3f(.11, .33, .99) + 0.8 * pow(clamp(1 - rd.y, 0, 1), 4.);
  return vec4(skyclr, 1);
}`})

const rpipe = device.createRenderPipeline({
  layout: 'auto', vertex: { module, entryPoint: 'vertex' },
  fragment: { module, entryPoint: 'fragment', targets: [{ format }] },
})

const bind = device.createBindGroup({
  layout: rpipe.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: ub } }]
})

let ro = [0, 0, 0], polar = [0, 0], rd = [0, 0, 1], down = false
window.addEventListener('pointerdown', e => {
  if (e.button === 0) { down = true }
})
window.addEventListener('pointerup', e => {
  if (e.button === 0) { down = false }
})
window.addEventListener('pointermove', e => {
  if (down) {
    polar[0] += Math.PI * 2 * 0.001 * e.movementX
    polar[1] = Math.max(Math.min(polar[1] + Math.PI * 2 * 0.001 * e.movementY, Math.PI / 2), -Math.PI / 2)
    rd[0] = Math.cos(polar[0]) * Math.sin(polar[1])//Math.sin(polar[1]) * Math.cos(polar[0])
    rd[1] = Math.cos(polar[1])//Math.sin(polar[1]) * Math.sin(polar[0])
    rd[2] = Math.sin(polar[0]) * Math.sin(polar[1])//Math.cos(polar[1])
    // log(...polar.map(v => v / Math.PI / 2))
    log(rd)
  }
})

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase()
  if (k === ' ') { }
  else if (k === 'e') {
    ro[0] += rd[0]
    ro[1] += rd[1]
    ro[2] += rd[2]
  }
  else if (k === 'd') {
    ro[0] += -rd[0]
    ro[1] += -rd[1]
    ro[2] += -rd[2]
  }
  else if (k === 's') { }
  else if (k === 'f') { }
  else if (k === 'w') { }
  else if (k === 'r') { }
})

const loop = t => {
  t /= 1000

  // rd = [Math.sin(t), -0.5, Math.cos(t)]

  uniforms.resolution[0] = cvs.width
  uniforms.resolution[1] = cvs.height
  uniforms.time[0] = t
  uniforms.campos[0] = ro[0]
  uniforms.campos[1] = ro[1]
  uniforms.campos[2] = ro[2]
  uniforms.camdir[0] = rd[0]
  uniforms.camdir[1] = rd[1]
  uniforms.camdir[2] = rd[2]
  device.queue.writeBuffer(ub, 0, ubarr)
  const enc = device.createCommandEncoder()

  // log(...ro, ...rd)

  const rp = enc.beginRenderPass({
    colorAttachments: [{
      view: cvsctx.getCurrentTexture().createView(),
      loadOp: 'load', storeOp: 'store'
    }]
  })
  rp.setPipeline(rpipe)
  rp.setBindGroup(0, bind)
  rp.draw(6), rp.end()

  device.queue.submit([enc.finish()])
  requestAnimationFrame(loop)
}; requestAnimationFrame(loop)