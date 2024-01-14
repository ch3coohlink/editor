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

const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" })
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
fn rnd(v: vec4f) -> f32 {
  return fract(4e4 * sin(dot(v, vec4(13.46, 41.74, -73.36, 14.24)) + 17.34));
}
// const HASHSCALE3 = vec3(.1031, .1030, .0973);
// fn hash33(vec3f p3) -> vec3f {
//   p3 = fract(p3 * HASHSCALE3);
//   p3 += dot(p3, p3.yxz + 19.19);
//   return fract((p3.xxy + p3.yxx) * p3.zyx);
// }
fn rnd2(ov: vec4f) -> f32 {
  var v = fract(ov  * vec4(.1031, .1030, .0973, .1099));
  v += dot(v, v.wzxy+33.33);
  return fract((v.x + v.y) * (v.z + v.w));
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
    var c2 = max(t0.x, max(t0.y, t0.z));
    var ret: u32 = select(4u, 0u, c2 < tm.x);
    ret = select(ret | 2, ret, c2 < tm.y);
    ret = select(ret | 1, ret, c2 < tm.z);
    return ret;
    // let mi = maxindex(t0);
    // let a = firstnode_luta[mi];
    // let b = firstnode_lutb[mi];
    // let c = t0[mi];
    // var ret: u32 = 0;
    // ret |= u32(select(0, 1 << (2 - a), tm[a] < c));
    // ret |= u32(select(0, 1 << (2 - b), tm[b] < c));
    // return ret;
  }
}
var<private> mirrormask: u32 = 0;
var<private> step: u32 = 0;
// const recursion_level = 4;
const recursion_level = 21;
const step_limit = 100;
fn rayoctree(vro: vec3f, vrd: vec3f, clr: ptr<function, vec3f>) -> f32 {
  var ro = vro; var rd = vrd;
  if(rd.x < 0) { ro.x = -ro.x; rd.x = -rd.x; mirrormask |= 4; }
  if(rd.y < 0) { ro.y = -ro.y; rd.y = -rd.y; mirrormask |= 2; }
  if(rd.z < 0) { ro.z = -ro.z; rd.z = -rd.z; mirrormask |= 1; }
  var t0 = (vec3(-1) - ro) / rd; var t1 = (vec3(1) - ro) / rd;
  if(max(max(t0.x, t0.y), t0.z) >= min(min(t1.x, t1.y), t1.z)) { return -1; }
  if(t1.x < 0 || t1.y < 0 || t1.z < 0) { return -1; }
  
  var step: u32 = 0; var level: i32 = 0;
  var stack: array<u32, recursion_level>;
  var pos = vec3f(-1); var tm = 0.5 * (t0 + t1);
  stack[level] = firstnode(t0, tm, t1);
  var exit = false;
  loop {
    let ci = stack[level];
    let ri = ci ^ mirrormask; // real index
    let rm = vec3(bool((ri >> 2) & 1), bool((ri >> 1) & 1), bool(ri & 1));
    let mask = vec3(bool((ci >> 2) & 1), bool((ci >> 1) & 1), bool(ci & 1));
    let size = 2 / f32(1 << u32(level + 1));
    let npos = pos + select(vec3(0), vec3(size), rm);
    let v = rnd(vec4f(npos, size));
    // if (exit || v < (uniforms.time * 0.1) % 1) { // pop and move to next
    if (exit || v < 0.3) { // pop and move to next
      if(level < 0) { break; } exit = false; step++;
      stack[level] = nextnode_lut[ci][minindex(select(tm, t1, mask))];
      if(stack[level] > 7) {
        if(level < 0) { break; } level--;
        let pi = stack[level]; let ri = pi ^ mirrormask;
        let rm = vec3(bool((ri >> 2) & 1), bool((ri >> 1) & 1), bool(ri & 1));
        let mask = vec3(bool((pi >> 2) & 1), bool((pi >> 1) & 1), bool(pi & 1));
        if(mask.x) { t0.x = t0.x * 2 - t1.x; } else { t1.x = t1.x * 2 - t0.x; }
        if(mask.y) { t0.y = t0.y * 2 - t1.y; } else { t1.y = t1.y * 2 - t0.y; }
        if(mask.z) { t0.z = t0.z * 2 - t1.z; } else { t1.z = t1.z * 2 - t0.z; }
        pos -= select(vec3(0), vec3(size * 2), rm); tm = 0.5 * (t0 + t1); exit = true;
      }
    } else if(level >= recursion_level - 1) {
      let val = fract(dot(pos, vec3(15.23, 754.345, 3.454)));
      var normal = vec3f(0);
      normal[maxindex(select(t0, tm, mask))] = 1;
      normal *= -sign(vrd);
      let color = sin(val * vec3(39.896, 57.3225, 48.25)) * 0.5 + 0.5;
      // *clr = color * (normal * 0.25 + 0.75);
      *clr = vec3(1) * (normal * 0.25 + 0.75);
      // *clr = normal;
      *clr = *clr * vec3(f32(step) / step_limit);
      return 1;
    } else { // push
      t0 = select(t0, tm, mask); t1 = select(tm, t1, mask);
      tm = 0.5 * (t0 + t1); pos = npos;
      level++; stack[level] = firstnode(t0, tm, t1);
    }
    if(step > step_limit) {
      return -1;
      // *clr = vec3(1,0,0); return 1;
    }
  }
  return -1;
}`

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
  var clr: vec3f;
  if(rayoctree(ro, rd, &clr) > 0) { return clr; }
  // return vec3(0);
  return vec3f(.11, .33, .99) + 0.8 * pow(clamp(1 - rd.y, 0, 1), 4.);
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
  if (e.shiftKey || e.ctrlKey || e.altKey) {
    e.preventDefault()
  }
})
window.addEventListener('keyup', e => {
  pressed.delete(e.key.toLowerCase())
})


let st = performance.now() / 1000, pt = st
const loop = t => {
  t /= 1000; let dt = t - pt; pt = t
  log(1 / dt)
  dt = Math.min(dt, 1 / 60)

  // let spd = 1, movero = (rd, s = 1) => {
  let spd = 0.001, movero = (rd, s = 1) => {
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

  uniforms.resolution[0] = cvs.width, uniforms.resolution[1] = cvs.height, uniforms.time[0] = t
  uniforms.campos[0] = ro[0], uniforms.campos[1] = ro[1], uniforms.campos[2] = ro[2]
  uniforms.camdir[0] = rd[0], uniforms.camdir[1] = rd[1], uniforms.camdir[2] = rd[2]
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