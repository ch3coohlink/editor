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
const recursion_level = 20;
const step_limit = 100;
fn rayoctree(vro: vec3f, vrd: vec3f, clr: ptr<function, vec3f>) -> f32 {
  var ro = vro; var rd = vrd;
  if(rd.x < 0) { ro.x = 1 - ro.x; rd.x = -rd.x; mirrormask |= 4; }
  if(rd.y < 0) { ro.y = 1 - ro.y; rd.y = -rd.y; mirrormask |= 2; }
  if(rd.z < 0) { ro.z = 1 - ro.z; rd.z = -rd.z; mirrormask |= 1; }
  var t0 = (vec3(0) - ro) / rd; var t1 = (vec3(1) - ro) / rd;
  if(max(max(t0.x, t0.y), t0.z) >= min(min(t1.x, t1.y), t1.z)) { return -1; }
  if(t1.x < 0 || t1.y < 0 || t1.z < 0) { return -1; }
  
  var step: u32 = 0; var level: i32 = 0;
  var stack: array<u32, recursion_level>;
  var pos = vec3f(0); var tm = 0.5 * (t0 + t1);
  stack[level] = firstnode(t0, tm, t1);
  var exit = false;
  loop {
    let ci = stack[level];
    let ri = ci ^ mirrormask; // real index
    let rm = vec3(bool((ri >> 2) & 1), bool((ri >> 1) & 1), bool(ri & 1));
    let mask = vec3(bool((ci >> 2) & 1), bool((ci >> 1) & 1), bool(ci & 1));
    let size = 1 / f32(1 << u32(level + 1));
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
    } else if(level >= recursion_level - 1) { break; } else { // push
      t0 = select(t0, tm, mask); t1 = select(tm, t1, mask);
      tm = 0.5 * (t0 + t1); pos = npos;
      level++; stack[level] = firstnode(t0, tm, t1);
    }
    if(step > step_limit) {
      *clr = vec3(1,0,0); return 1;
    }
  }
  *clr = vec3(f32(step) / step_limit);
  return 1;
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
fn hash(id: vec2f) -> vec2f {
  let g = vec2(dot(id, vec2(123.4, 234.5)), dot(id, vec2(234.5, 345.6)));
  // return cos(fract(sin(g + 12945.)) * 143758.);
  return cos(fract(sin(g + 12945.)) * 143758. + uniforms.time);
  // return vec2(noise(id), noise(id + vec2(123.456, 789.012)));
}
fn FKU(k: f32) -> u32 {
  // return bitcast<u32>(k * k / 7.) ^ bitcast<u32>(k)
  return bitcast<u32>(cos(k)) ^ bitcast<u32>(k);
}
fn blackle_noise(p: vec2f) -> f32 {
    let x = FKU(p.x); let y = FKU(p.y);
    return f32((x - y * y) * (x * x + y) - x) / 4.28e9;
}
fn cubic(p: vec2f) -> vec2f {
  return p * p * (3.0 - p * 2.0);
}
fn quintic(p: vec2f) -> vec2f {
  return p * p * p * (10.0 + p * (-15.0 + p * 6.0));
}
fn perlin(ouv: vec2f) -> f32 {
  let iuv = floor(ouv); var uv = ouv - iuv;
  let bl = hash(iuv + vec2(0)); let br = hash(iuv + vec2(1, 0));
  let tl = hash(iuv + vec2(0, 1)); let tr = hash(iuv + vec2(1));
  let dbl = dot(bl, uv - vec2(0)); let dbr = dot(br, uv - vec2(1, 0));
  let dtl = dot(tl, uv - vec2(0, 1)); let dtr = dot(tr, uv - vec2(1));
  // uv = smoothstep(vec2(0), vec2(1), uv);
  // uv = cubic(uv);
  uv = quintic(uv);
  return mix(mix(dbl, dbr, uv.x), mix(dtl, dtr, uv.x), uv.y);
}
fn fbmperlin(ouv: vec2f, ofreq: f32, oamp: f32) -> f32 {
  var v: f32; var freq = ofreq; var amp = oamp;
  var uv = ouv;
  for(var i = 0.0; i < 10; i += 1) {
    v += perlin(uv * freq) * amp;
    freq *= 2; amp *= 0.5; uv = (uv + 2 + sin(uniforms.time * 0.0001));
  } return v;
}
fn dis2col(d: f32) -> vec3f {
  var col = select(vec3(0.9, 0.6, 0.3), vec3(0.6, 0.8, 1.0), d < 0);
  col *= 1.0 - exp(-9.0 * abs(d));
  col *= 1.0 + 0.2 * cos(128.0 * abs(d));
  col = mix(col, vec3(1), 1.0 - smoothstep(0.0, 0.015, abs(d)));
  return col;
}
fn dis2terraincol(d: f32) -> vec3f {
  let c0 = vec3(0.38, 0.65, 0.66);
  let c1 = vec3(0.84, 0.71, 0.62);
  let c2 = vec3(0.6, 0.68, 0.35);
  let c3 = vec3(0.4, 0.52, 0.25);
  let c4 = vec3(0.28, 0.46, 0.27);
  let c5 = vec3(0.43, 0.46, 0.53);
  let c6 = vec3(0.52, 0.55, 0.6);
  let c7 = vec3(0.82, 0.88, 0.87);
  if(d < 0.0) { return c0; }
  else if(d < 0.1) { return c1; }
  else if(d < 0.2) { return c2; }
  else if(d < 0.3) { return c3; }
  else if(d < 0.4) { return c4; }
  else if(d < 0.5) { return c5; }
  else if(d < 0.6) { return c6; }
  else { return c7; }
}
fn lerp(a: f32, b: f32, ot: f32) -> f32 {
  let t = (ot + 1) * 0.5;
  return a * (1 - t) + b * t;
}
fn sdfcircle(p: vec2f) -> f32 {
  return length(p) - abs(5.0 * sin(uniforms.time * 0.3));
}
fn sdfbox2d(p: vec2f, b: vec2f) -> f32 {
    let d = abs(p) - b;
    return length(max(d, vec2(0))) + min(max(d.x, d.y), 0.0);
}
fn sdfboxorit(p: vec2f, a: vec2f, b: vec2f, th: f32) -> f32 {
    let l = length(b-a);
    let d = (b-a)/l;
    var q = (p-(a+b)*0.5);
        q = mat2x2f(d.x,-d.y,d.y,d.x)*q;
        q = abs(q)-vec2(l,th)*0.5;
    return length(max(q, vec2(0))) + min(max(q.x,q.y),0.0);
}
const pi = 3.14159268979323;
fn bilinearsdf(ouv: vec2f) -> f32 {
  let iuv = floor(ouv); var uv = ouv - iuv;
  let tl = SAM(iuv + vec2(0, 1)); let tr = SAM(iuv + vec2(1));
  let bl = SAM(iuv); let br = SAM(iuv + vec2(1, 0));
  // let tl = sin(uniforms.time); let tr = sin(uniforms.time + pi * 0.5);
  // let bl = sin(uniforms.time + pi); let br = cos(uniforms.time + pi * 1.5);
  // uv = cubic(uv);
  return mix(mix(bl, br, uv.x), mix(tl, tr, uv.x), uv.y);
  return mix(mix(bl, br, ouv.x), mix(tl, tr, ouv.x), ouv.y);
}
// cubic b-spline, recommended, Catmull-Rom spline
const BS_A = vec4(   3.0,  -6.0,   0.0,  4.0 ) /  6.0;
const BS_B = vec4(  -1.0,   6.0, -12.0,  8.0 ) /  6.0;
const RE_A = vec4(  21.0, -36.0,   0.0, 16.0 ) / 18.0;
const RE_B = vec4(  -7.0,  36.0, -60.0, 32.0 ) / 18.0;
const CR_A = vec4(   3.0,  -5.0,   0.0,  2.0 ) /  2.0;
const CR_B = vec4(  -1.0,   5.0,  -8.0,  4.0 ) /  2.0;
// const ca = BS_A; const cb = BS_B;
const ca = RE_A; const cb = RE_B;
// const ca = CR_A; const cb = CR_B;
fn powers(x: f32) -> vec4f { return vec4(x * x * x, x * x, x, 1.0); }
fn spline(x: f32, c0: f32, c1: f32, c2: f32, c3: f32) -> f32 {
    // We could expand the powers and build a matrix instead (twice as many coefficients
    // would need to be stored, but it could be faster.
    return c0 * dot(cb, powers(x + 1.0)) + c1 * dot(ca, powers(x)) + c2 * dot(ca, powers(1.0 - x)) + c3 * dot(cb, powers(2.0 - x));
}
fn bicubicsdf(ouv: vec2f) -> f32 {
  let iuv = floor(ouv); var uv = ouv - iuv;
  let v00 = SAM(iuv + vec2(-1)); let v01 = SAM(iuv + vec2(0, -1)); let v02 = SAM(iuv + vec2(1, -1)); let v03 = SAM(iuv + vec2(2, -1));
  let v10 = SAM(iuv + vec2(-1, 0)); let v11 = SAM(iuv + vec2(0, 0)); let v12 = SAM(iuv + vec2(1, 0)); let v13 = SAM(iuv + vec2(2, 0));
  let v20 = SAM(iuv + vec2(-1, 1)); let v21 = SAM(iuv + vec2(0, 1)); let v22 = SAM(iuv + vec2(1, 1)); let v23 = SAM(iuv + vec2(2, 1));
  let v30 = SAM(iuv + vec2(-1, 2)); let v31 = SAM(iuv + vec2(0, 2)); let v32 = SAM(iuv + vec2(1, 2)); let v33 = SAM(iuv + vec2(2, 2));
  return spline(uv.y, spline(uv.x, v00, v01, v02, v03), spline(uv.x, v10, v11, v12, v13), spline(uv.x, v20, v21, v22, v23), spline(uv.x, v30, v31, v32, v33));
}
fn SAM(p: vec2f) -> f32 {
  // return sdfcircle(p);
  // return sdfbox2d(p, vec2(4.3, 1));
  let v1 = 2.0 * cos(uniforms.time * 0.5 + vec2f(0, 1) + 0.0);
  let v2 = 2.0 * cos(uniforms.time * 0.5 + vec2f(0, 3) + 1.5);
  let th = 17. * (0.5 + 0.5 * cos(uniforms.time * 1.1 + 1.0)) + 3.0;
  return sdfboxorit(p, v1, v2, th);
}
fn sdfcylinder (p: vec3f, h: f32, r: f32) -> f32 {
  let inOutRadius = length(p.xy) - r;
  let inOutHeight = abs(p.z) - h / 2.0;
  let insideDistance = min(max(inOutRadius, inOutHeight), 0.0);
  let outsideDistance = length(max(vec2(inOutRadius, inOutHeight), vec2(0)));
  return insideDistance + outsideDistance;
}
fn sdfbox (p: vec3f, s: vec3f) -> f32 {
  let d = abs(p) - s;
  let mc = max(d.x, max(d.y, d.z));
  return min(mc, length(max(d, vec3(0))));
}
fn sdfsphere (p: vec3f, r: f32) -> f32 {
  return length(p) - r;
}
fn rotatex(theta: f32) -> mat3x3f {
  let c = cos(theta); let s = sin(theta);
  return mat3x3f(vec3(1, 0, 0), vec3(0, c, -s), vec3(0, s, c));
}
fn rotatey(theta: f32) -> mat3x3f {
  let c = cos(theta); let s = sin(theta);
  return mat3x3f(vec3(c, 0, s), vec3(0, 1, 0), vec3(-s, 0, c));
}
fn rotatez(theta: f32) -> mat3x3f {
  let c = cos(theta); let s = sin(theta);
  return mat3x3f(vec3(c, -s, 0), vec3(s, c, 0), vec3(0, 0, 1));
}
fn map(p: vec3f) -> f32 {
  let cylinderRadius = 0.4 + (1.0 - 0.4) * (1.0 + sin(1.7 * uniforms.time)) / 2.0;
  let cylinder1 = sdfcylinder(p, 2.0, cylinderRadius);
  let cylinder2 = sdfcylinder(rotatex(radians(90.0)) * p, 2.0, cylinderRadius);
  let cylinder3 = sdfcylinder(rotatey(radians(90.0)) * p, 2.0, cylinderRadius);
  
  let cube = sdfbox(p, vec3(1.8, 1.8, 1.8));
  let sphere = sdfsphere(p, 1.2);
  
  let ballOffset = 0.4 + 1.0 + sin(1.7 * uniforms.time);
  let ballRadius = 0.3;
  var balls = sdfsphere(p - vec3(ballOffset, 0.0, 0.0), ballRadius);
  balls = min(balls, sdfsphere(p + vec3(ballOffset, 0.0, 0.0), ballRadius));
  balls = min(balls, sdfsphere(p - vec3(0.0, ballOffset, 0.0), ballRadius));
  balls = min(balls, sdfsphere(p + vec3(0.0, ballOffset, 0.0), ballRadius));
  balls = min(balls, sdfsphere(p - vec3(0.0, 0.0, ballOffset), ballRadius));
  balls = min(balls, sdfsphere(p + vec3(0.0, 0.0, ballOffset), ballRadius));

  let csgNut = max(max(cube, sphere), -min(cylinder1, min(cylinder2, cylinder3)));
  return min(balls, csgNut);
}
fn clrgradient(v: f32, a: vec3f, b: vec3f, c: vec3f, d: vec3f) -> vec3f {
  return a + b * cos( 6.28318*(c * v + d) );
}
const ma = mat3x3f(0.60, 0.00, 0.80, 0.00, 1.00, 0.00, -0.80, 0.00, 0.60 );
fn modulo(x: vec3f, y: f32) -> vec3f { return x - y * floor(x / y); }
fn mengersponge(p: vec3f) -> f32 {
  var d = sdfbox(p, vec3(1));
  var s = 1.0;
  for(var m = 0; m < 5; m++) {
    let a = modulo(p * s, 2.0) - 1.0; s *= 3.0;
    let r = abs(1.0 - 3.0 * abs(a));
    let da = max(r.x, r.y);
    let db = max(r.y, r.z);
    let dc = max(r.z, r.x);
    let c = (min(da, min(db, dc)) - 1.0) / s;
    if(c > d) { d = c; }
  }
  return d;
}
fn rendering(id: vec2f, resolution: vec2f) -> vec3f {
  var pw = 1 / resolution.y;
  var t = uniforms.time; var uv = (id.xy + 0.5
     - resolution.xy * 0.5) * pw; uv.y = -uv.y;
  // uv *= t;
  let ro = uniforms.campos;
  let cw = normalize(uniforms.camdir);
  let cu = normalize(cross(cw, vec3f(0, 1, 0)));
  let cv = cross(cu, cw);
  let cam = mat3x3f(cu, cv, cw);
  let rd = cam * normalize(vec3f(uv, 1));

  let maxstep = 100.0; var i = 0.0;
  var depth = 0.0; let end = 100.0;
  for (; i < maxstep; i += 1) {
    let dist = mengersponge(ro + depth * rd);
    if (dist < 0.00001) { break; }
    depth += dist;
    if (depth >= end) { break; }
  }
  return mix(vec3(0), vec3(1), i / maxstep);
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
  // log(1 / dt)
  dt = Math.min(dt, 1 / 60)

  let spd = 10, movero = (rd, s = 1) => {
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