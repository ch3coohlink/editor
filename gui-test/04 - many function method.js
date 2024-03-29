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

const adapter = await navigator.gpu.requestAdapter()
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
  resolution: vec2f, time: f32,
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

let helpfn = /*WGSL*/`
fn raysphere(ro: vec3f, rd: vec3f, o: vec3f, r2: f32) -> bool {
  let l = o - ro; let tca = dot(l, rd);
  if(tca < 0) { return false; }
  let d2 = dot(l, l) - tca * tca;
  if (d2 > r2) { return false; }
  let thc = sqrt(r2 - d2);
  var t0 = tca - thc; var t1 = tca + thc;
  if(t0 > t1) { let tp = t1; t0 = t1; t1 = tp; }
  if(t0 < 0) { t0 = t1; if(t0 < 0) { return false; } }
  return true;
}
fn minindex(v: vec3f) -> i32 {
  return i32(v.y < v.z && v.y < v.x) + i32(v.z < v.y && v.z < v.x) * 2;
}
fn maxindex(v: vec3f) -> i32 {
  return i32(v.y > v.z && v.y > v.x) + i32(v.z > v.y && v.z > v.x) * 2;
}
struct OctreeStack {
  t0: vec3f,
  state: u32,
  t1: vec3f,
  i: u32,
  tm: vec3f,
  mask: vec3<bool>,
  pos: vec3f,
}
fn rnd(ov: vec4f) -> f32 {
  var v = fract(ov  * vec4(.1031, .1030, .0973, .1099));
  v += dot(v, v.wzxy+33.33);
  return fract((v.x + v.y) * (v.z + v.w));
}
fn rnd2(v: vec4f) -> f32 {
  return fract(4e4 * sin(dot(v, vec4(13.46, 41.74, -73.36, 14.24)) + 17.34));
}
const nextnode_lut = array<vec3u, 8>(
  vec3(4, 2, 1), vec3(5, 3, 8), vec3(6, 8, 3), vec3(7, 8, 8),
  vec3(8, 6, 5), vec3(8, 7, 8), vec3(8, 8, 7), vec3(8, 8, 8));
const firstnode_luta = vec3u(1, 0, 0);
const firstnode_lutb = vec3u(2, 2, 1);
fn firstnode(t0: vec3f, tm: vec3f, t1: vec3f) -> u32 {
  if(all(t0 < vec3(0)) && all(t1 > vec3(0))) {
    var ret: u32 = 0;
    if(tm.x < 0) { ret |= 4; }
    if(tm.y < 0) { ret |= 2; }
    if(tm.z < 0) { ret |= 1; }
    return ret;
  } else {
    let mi = maxindex(t0);
    let a = firstnode_luta[mi];
    let b = firstnode_lutb[mi];
    let c = t0[mi];
    var ret: u32 = 0;
    ret |= u32(select(0, 1 << (2 - a), tm[a] < c));
    ret |= u32(select(0, 1 << (2 - b), tm[b] < c));
    return ret;
  }
}
var<private> mirrormask: u32 = 0;
var<private> step: u32 = 0;
fn rayoctree(vro: vec3f, vrd: vec3f, clr: ptr<function, vec3f>) -> f32 {
  var ro = vro; var rd = vrd;
  if(rd.x < 0) { ro.x = 1 - ro.x; rd.x = -rd.x; mirrormask |= 4; }
  if(rd.y < 0) { ro.y = 1 - ro.y; rd.y = -rd.y; mirrormask |= 2; }
  if(rd.z < 0) { ro.z = 1 - ro.z; rd.z = -rd.z; mirrormask |= 1; }
  let t0 = (vec3(0) - ro) / rd; let t1 = (vec3(1) - ro) / rd;
  if(max(max(t0.x, t0.y), t0.z) >= min(min(t1.x, t1.y), t1.z)) { return -1; }
  if(t1.x < 0 || t1.y < 0 || t1.z < 0) { return -1; }
  let r = subtree_0(t0, t1, vec3(0), clr);
  *clr = vec3(f32(step) / 100);
  if(step >= 100) { *clr = vec3(1, 0, 0); }
  return 1;
}\n`

const recursive_function = (d = 12) => {
  let t = l => /*WGSL*/`fn subtree_${l}(t0: vec3f, t1: vec3f, pos: vec3f, clr: ptr<function, vec3f>) -> f32 {
  let tm = 0.5 * (t0 + t1); var i = firstnode(t0, tm, t1);
  loop {
    let mask = vec3<bool>(bool((i >> 2) & 1), bool((i >> 1) & 1), bool(i & 1));
    step++; if(step > 100) { return -1; }
    let realindex = i ^ mirrormask;
    let realmask = vec3<bool>(bool((realindex >> 2) & 1),
      bool((realindex >> 1) & 1), bool(realindex & 1));
    let npos = pos + select(vec3f(0), vec3f(0.5), realmask);
    let r = rnd(vec4f(npos, 0.5));
    // if(r < 0.1) { *clr = vec3f(realmask); return 1; }
    if(r < 0.6) {
      ${et(l)}
    }
    let v = select(tm, t1, mask); let mi = minindex(v);
    i = nextnode_lut[i][mi]; if(!(i < 8)){ break; }
  } return -1;
}`, et = l => l === d - 1 ? `if(r < 0.6) { return 1; }` :
  /*WGSL*/`if(r < 0.6) { var t = subtree_${l + 1}(select(t0, tm, mask), select(tm, t1, mask), npos, clr);
    if(t > 0) { return t; } }`, et2 = l => l === d - 1 ? `return 1;` :''
  return [...Array(d)].map((_, i) => t(i)).join('\n')
}
helpfn += recursive_function()

const ds = device.createShaderModule({
  code: `const pos = array<vec2f, 6>(
vec2(-1, 1), vec2(1, 1), vec2(-1, -1), vec2(-1, -1), vec2(1, 1), vec2(1, -1));
@vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  return vec4(pos[i], 0.0, 1.0);
} @group(0) @binding(0) var screen: texture_2d<f32>;
@fragment fn fragment(@builtin(position) fragcoord: vec4f
) -> @location(0) vec4<f32> {
  return textureLoad(screen, vec2i(fragcoord.xy), 0);
}`})

const cs = device.createShaderModule({
  code: /*WGSL*/`${ubdef}\n${helpfn}
@group(0) @binding(1) var screen: texture_storage_2d<rgba16float, write>;

fn rendering(id: vec2f, resolution: vec2f) -> vec3f {
  var uv = (id.xy + 0.5
     - resolution.xy * 0.5) / resolution.y; uv.y = -uv.y;
  let ro = uniforms.campos;
  let cw = normalize(uniforms.camdir);
  let cu = normalize(cross(cw, vec3f(0, 1, 0)));
  let cv = cross(cu, cw);
  let cam = mat3x3f(cu, cv, cw);
  let rd = cam * normalize(vec3f(uv, 1));

  // if(raysphere(ro, rd, vec3(10, 0, 0), 0.1)) { return vec3(1, 0, 0); }
  // if(raysphere(ro, rd, vec3(-10, 0, 0), 0.1)) { return vec3(1, 1, 0); }
  // if(raysphere(ro, rd, vec3(0, 10, 0), 0.1)) { return vec3(0, 1, 0); }
  // if(raysphere(ro, rd, vec3(0, -10, 0), 0.1)) { return vec3(0, 1, 1); }
  // if(raysphere(ro, rd, vec3(0, 0, 10), 0.1)) { return vec3(0, 0, 1); }
  // if(raysphere(ro, rd, vec3(0, 0, -10), 0.1)) { return vec3(1, 0, 1); }

  var clr: vec3f;
  if(rayoctree(ro, rd, &clr) > 0) { return clr; }
  
  return vec3(0);
  // return vec3f(.11, .33, .99) + 0.8 * pow(clamp(1 - rd.y, 0, 1), 4.);
}
@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) uid: vec3u) {
  let id = vec3f(uid); let resolution = vec2f(textureDimensions(screen));
  if (id.x >= resolution.x || id.y >= resolution.y) { return; }
  textureStore(screen, uid.xy, vec4f(rendering(id.xy, resolution), 1));
}`})

const cpipe = await device.createComputePipelineAsync({
  layout: 'auto', compute: { module: cs, entryPoint: 'main' }
})
const rpipe = await device.createRenderPipelineAsync({
  layout: 'auto', vertex: { module: ds, entryPoint: 'vertex' },
  fragment: { module: ds, entryPoint: 'fragment', targets: [{ format }] },
})

let screenbuffer, bsbind, csbind

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
})
window.addEventListener('keyup', e => {
  pressed.delete(e.key.toLowerCase())
})


let st = performance.now() / 1000, pt = st
const loop = t => {
  t /= 1000; let dt = t - pt; pt = t
  dt = Math.min(dt, 1 / 60)

  let spd = 1, movero = (rd, s = 1) => {
    ro[0] += rd[0] * spd * dt * s
    ro[1] += rd[1] * spd * dt * s
    ro[2] += rd[2] * spd * dt * s
  }
  if (pressed.has('shift')) { spd *= 5 }
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

  const cp = enc.beginComputePass({})
  cp.setPipeline(cpipe)
  cp.setBindGroup(0, csbind)
  cp.dispatchWorkgroups(Math.ceil(cvs.width / 8), Math.ceil(cvs.height / 8))
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