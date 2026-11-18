/* 岭南寻物 · 渲染核心：渲染器、材质工具、后期管线（倒影 / 体积光+AO / 泛光 / 调色 / 宽银幕）。
   所有模块挂在全局 G 上。 */
window.G = window.G || {};
(() => {
'use strict';
const T = THREE, V3 = T.Vector3;
const Q = new URLSearchParams(location.search);
G.Q = Q; G.LO = Q.has('lo');

/* ---------- 渲染器 ---------- */
const renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('shot') });
G.DPR = Math.min(devicePixelRatio, G.LO ? 1 : 1.5);
renderer.setPixelRatio(G.DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.outputEncoding = T.LinearEncoding;
renderer.toneMapping = T.NoToneMapping;
document.body.prepend(renderer.domElement);
G.renderer = renderer;
G.scene = new T.Scene();
G.camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, .1, 400);
// 毛笔字：楷书为主，行草备用（garden.html 预载 Google Fonts，离线回退系统楷体）
G.BRUSH = '"Ma Shan Zheng","WenKai Local","STKaiti","KaiTi","Kaiti SC",serif';
G.time = { value: 0 };
G.ANISO = renderer.capabilities.getMaxAnisotropy();

/* ---------- 随机 / 画布工具 ---------- */
G.mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
G.R = G.mulberry(20261117);
G.cv = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
G.speck = (g, w, h, n, cols) => { const R = G.R; for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; const s = R() * 2 + .5; g.fillRect(R() * w, R() * h, s, s); } };
G.canvasTex = (c, { srgb = true, repeat = true } = {}) => {
  const t = new T.CanvasTexture(c);
  if (srgb) t.encoding = T.sRGBEncoding;
  if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = G.ANISO; return t;
};

/* ---------- Poly Haven 材质（UV 以米为单位，贴图按 size 平铺）---------- */
const loader = new T.TextureLoader();
const texCache = {};
function phTex(name, kind) {
  const key = name + kind;
  if (texCache[key]) return texCache[key];
  const d = window.GARDEN_TEX[name];
  const t = loader.load(d[kind]);
  t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = G.ANISO;
  if (kind === 'diff') t.encoding = T.sRGBEncoding;
  t.repeat.set(1 / d.size, 1 / d.size);
  return texCache[key] = t;
}
G.phMat = (name, opts = {}) => new T.MeshStandardMaterial(Object.assign({
  map: phTex(name, 'diff'), normalMap: phTex(name, 'nor'), roughnessMap: phTex(name, 'rough'),
  normalScale: new T.Vector2(1, 1), envMapIntensity: .6,
}, opts));

// 把几何体 UV 换算成米
G.uvScale = (g, sx, sy = sx) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); uv.needsUpdate = true; return g; };
G.boxGeo = (w, h, d) => {
  const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return g;
};

/* ---------- 场景添加工具 ---------- */
G.add = (geo, mat, pos, { cast = true, recv = true, rot, parent } = {}) => {
  const m = new T.Mesh(geo, mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = cast; m.receiveShadow = recv;
  (parent || G.scene).add(m); return m;
};
G.box = (w, h, d, mat, pos, o) => G.add(G.boxGeo(w, h, d), mat, pos, o);

/* ---------- 碰撞 / 地面高度（world.js 填充）---------- */
G.colliders = [];          // {c:[x,z,r]} 圆  或 {b:[x0,z0,x1,z1]} 盒
G.platforms = [];          // {b:[x0,z0,x1,z1], y}
G.circle = (x, z, r) => G.colliders.push({ c: [x, z, r] });
G.block = (x0, z0, x1, z1) => G.colliders.push({ b: [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)] });
G.platform = (x0, z0, x1, z1, y) => G.platforms.push({ b: [x0, z0, x1, z1], y });
G.groundY = (x, z) => {
  let y = 0;
  for (const p of G.platforms) { const b = p.b; if (x > b[0] && x < b[2] && z > b[1] && z < b[3]) y = Math.max(y, p.y); }
  return y;
};

/* ---------- 后期 ---------- */
const HALF = { type: T.HalfFloatType, depthBuffer: false };
const rtMain = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: G.LO ? 0 : 4 });
const rtRefl = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType });
const rtDepth = new T.WebGLRenderTarget(1, 1);
const rtVolA = new T.WebGLRenderTarget(1, 1, HALF), rtVolB = new T.WebGLRenderTarget(1, 1, HALF);
const bloomRT = [2, 4, 8, 16].map(d => ({ d, a: new T.WebGLRenderTarget(1, 1, HALF), b: new T.WebGLRenderTarget(1, 1, HALF) }));

const fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsScene = new T.Scene();
const fsQuad = new T.Mesh(new T.PlaneGeometry(2, 2)); fsQuad.frustumCulled = false; fsScene.add(fsQuad);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const shader = (uniforms, fs) => new T.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false });
function pass(mat, target) { fsQuad.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }

// 水面倒影：共享 uniform，供 water 材质注入
G.REFL = { tRefl: { value: null }, texMat: { value: new T.Matrix4() }, reflTexel: { value: new T.Vector2() }, uTime: G.time };
G.waterY = -.25;
G.mirrorHide = [];
G.noDepth = [];            // 不写入深度预通道的物体（粒子、雨、天空）

const depthMat = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });

// 体积光（直射太阳阴影贴图）+ SAO（半分辨率深度重建）
const volMat = shader({
  tDepth: { value: rtDepth.texture }, invProj: { value: new T.Matrix4() }, camWorld: { value: new T.Matrix4() }, camPos: { value: new V3() },
  sMap: { value: null }, sMat: { value: new T.Matrix4() }, lCol: { value: new T.Color() }, lDir: { value: new V3() },
  projY: { value: 1 }, aspect: { value: 1 }, uTime: G.time, texel: { value: new T.Vector2() },
}, `#include <packing>
  uniform sampler2D tDepth, sMap; uniform mat4 invProj, camWorld, sMat;
  uniform vec3 camPos, lCol, lDir; uniform float uTime, projY, aspect; uniform vec2 texel; varying vec2 vUv;
  float h13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(mix(h13(i), h13(i+vec3(1,0,0)), f.x), mix(h13(i+vec3(0,1,0)), h13(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(h13(i+vec3(0,0,1)), h13(i+vec3(1,0,1)), f.x), mix(h13(i+vec3(0,1,1)), h13(i+vec3(1,1,1)), f.x), f.y), f.z); }
  vec3 viewPos(vec2 uv){ float z = unpackRGBAToDepth(texture2D(tDepth, uv)); vec4 v = invProj * vec4(uv * 2. - 1., z * 2. - 1., 1.); return v.xyz / v.w; }
  float lit(vec3 p){
    vec4 c = sMat * vec4(p, 1.); vec3 s = c.xyz / c.w;
    if (s.x < 0. || s.x > 1. || s.y < 0. || s.y > 1. || s.z > 1.) return 1.;
    return step(s.z - .002, unpackRGBAToDepth(texture2D(sMap, s.xy)));
  }
  float hg(float c, float g){ float g2 = g*g; return (1. - g2) / (12.566 * pow(1. + g2 - 2.*g*c, 1.5)); }
  void main(){
    vec3 vp = viewPos(vUv);
    float sky = step(.9999, unpackRGBAToDepth(texture2D(tDepth, vUv)));
    // --- SAO ---
    vec3 n = normalize(cross(dFdx(vp), dFdy(vp)));
    float ao = 0.;
    float rad = .55 * projY * .5 / max(-vp.z, .1);
    float ang = h13(vec3(gl_FragCoord.xy, 3.)) * 6.283;
    for (int i = 0; i < 12; i++) {
      float fi = (float(i) + .5) / 12.;
      float a = ang + fi * 6.283 * 3.;
      vec2 off = vec2(cos(a) / aspect, sin(a)) * rad * fi;
      vec3 d = viewPos(vUv + off) - vp;
      float l = length(d);
      ao += max(0., dot(n, d / max(l, 1e-4)) - .12) * (1. - smoothstep(.25, .9, l));
    }
    ao = mix(clamp(1. - ao / 12. * 2.2, 0., 1.), 1., sky);
    // --- 体积光 ---
    vec3 wp = (camWorld * vec4(vp, 1.)).xyz, rd = wp - camPos;
    float L = min(length(rd), 38.); rd = normalize(rd);
    const int N = 28; float st = L / float(N);
    float j = fract(h13(vec3(gl_FragCoord.xy, 0.)) + uTime * 7.31);
    float ph = hg(dot(lDir, -rd), .55) + .02;
    vec3 acc = vec3(0.);
    for (int i = 0; i < N; i++) {
      vec3 p = camPos + rd * (float(i) + j) * st;
      float dens = (.5 + .8 * vn(p * .6 + vec3(uTime * .08, 0., uTime * .05))) * exp(-max(p.y, 0.) * .22);
      acc += lit(p) * dens;
    }
    gl_FragColor = vec4(lCol * acc * st * ph, ao);
  }`);
volMat.extensions = { derivatives: true };

const blurMat = shader({ tSrc: { value: null }, dir: { value: new T.Vector2() } },
  `uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec4 c = texture2D(tSrc, vUv) * .227;
    c += (texture2D(tSrc, vUv + dir * 1.385) + texture2D(tSrc, vUv - dir * 1.385)) * .316;
    c += (texture2D(tSrc, vUv + dir * 3.231) + texture2D(tSrc, vUv - dir * 3.231)) * .070;
    gl_FragColor = c; }`);

G.POST = { paper: 0, volK: .02, aoK: .85, exposure: 1.0, bloom: .2, bars: 0, fade: 1, flash: 0, sat: 1.12, vignette: .32, lens: 0 };

const brightMat = shader({ tScene: { value: rtMain.texture }, tVol: { value: rtVolA.texture }, volK: { value: 0 }, thr: { value: 1.25 } },
  `uniform sampler2D tScene, tVol; uniform float volK, thr; varying vec2 vUv;
  void main(){ vec4 v = texture2D(tVol, vUv); vec3 c = texture2D(tScene, vUv).rgb * v.a + v.rgb * volK;
    float l = max(max(c.r, c.g), c.b); float k = max(l - thr, 0.) / max(l, 1e-4);
    gl_FragColor = vec4(min(c * k, vec3(40.)), 1.); }`);

const finalMat = shader({
  tScene: { value: rtMain.texture }, tVol: { value: rtVolA.texture },
  tB1: { value: bloomRT[0].a.texture }, tB2: { value: bloomRT[1].a.texture }, tB3: { value: bloomRT[2].a.texture }, tB4: { value: bloomRT[3].a.texture },
  res: { value: new T.Vector2() }, uTime: G.time, tDepth: { value: rtDepth.texture }, paper: { value: 0 }, cNear: { value: .1 }, cFar: { value: 400 },
  volK: { value: 0 }, aoK: { value: 0 }, exposure: { value: 1 }, bloom: { value: 0 }, bars: { value: 0 }, fade: { value: 1 }, flash: { value: 0 }, sat: { value: 1 }, vignette: { value: 0 }, barH: { value: 0 },
}, `#include <packing>
  uniform sampler2D tScene, tVol, tB1, tB2, tB3, tB4, tDepth; uniform vec2 res; uniform float paper, cNear, cFar;
  uniform float uTime, volK, aoK, exposure, bloom, bars, fade, flash, sat, vignette, barH; varying vec2 vUv;
  vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
  float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vz(vec2 uv){ return -perspectiveDepthToViewZ(unpackRGBAToDepth(texture2D(tDepth, uv)), cNear, cFar); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h12(i), h12(i+vec2(1,0)), f.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.1; a *= .5; } return s; }
  float lumAt(vec2 uv){ return dot(texture2D(tScene, uv).rgb, vec3(.3,.59,.11)); }
  // 图纸画风：墨线勾边 + 淡彩 + 纸纹
  vec3 paperize(vec3 col, vec2 uv){
    vec2 px = 1. / res, dp = 2. / res;
    float z = vz(uv);
    float zx = vz(uv + vec2(dp.x, 0.)) + vz(uv - vec2(dp.x, 0.)), zy = vz(uv + vec2(0., dp.y)) + vz(uv - vec2(0., dp.y));
    float ed = clamp((abs(zx - 2. * z) + abs(zy - 2. * z)) / max(z, .5) * 9. - .25, 0., 1.);
    float gx = lumAt(uv + vec2(px.x, 0.)) - lumAt(uv - vec2(px.x, 0.)), gy = lumAt(uv + vec2(0., px.y)) - lumAt(uv - vec2(0., px.y));
    float el = smoothstep(.16, .5, length(vec2(gx, gy)) / (.25 + lumAt(uv)));
    float l = dot(col, vec3(.3, .59, .11));
    vec3 wash = mix(vec3(l), col, .95);
    wash = floor(wash * 6. + .5 * fbm(uv * 40.)) / 6. * .25 + wash * .75;
    vec3 paperC = vec3(.94, .89, .76) * (.93 + .07 * fbm(uv * vec2(160., 220.))) * (.97 + .03 * n2(uv * vec2(900., 30.)));
    vec3 c = paperC * mix(vec3(1.), wash * 1.2 + .04, .92);
    float ink = clamp(ed * .95 + el * .3, 0., 1.) * (.75 + .25 * fbm(uv * 90.));
    return mix(c, vec3(.2, .14, .09), ink * .85);
  }
  void main(){
    vec2 uv = vUv, d = uv - .5;
    float ca = .0025 * dot(d, d);
    vec3 col = vec3(texture2D(tScene, uv - d * ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv + d * ca).b);
    vec4 v = texture2D(tVol, uv);
    col *= mix(1., v.a, aoK);
    col += v.rgb * volK;
    col += (texture2D(tB1, uv).rgb * .4 + texture2D(tB2, uv).rgb * .6 + texture2D(tB3, uv).rgb * .8 + texture2D(tB4, uv).rgb) * bloom;
    col *= exposure;
    col = aces(col);
    float l = dot(col, vec3(.2126, .7152, .0722));
    col = mix(vec3(l), col, sat);
    col *= mix(vec3(.94, 1.0, 1.06), vec3(1.0), smoothstep(.0, .35, l));       // 暗部微青（天光）
    col *= mix(vec3(1.0), vec3(1.05, 1.0, .9), smoothstep(.45, 1., l));        // 亮部暖
    col = mix(col, col * col * (3. - 2. * col), .18);
    col *= 1. - dot(d * vec2(1., .75), d * vec2(1., .75)) * vignette * 2.;
    col = pow(max(col, 0.), vec3(1. / 2.2));
    col += (h12(uv * res + fract(uTime * 13.) * 517.) - .5) * .028;
    if (paper > 0.) {
      vec3 pc = paperize(col, uv);
      float n = fbm(uv * 3.2 + 1.7) * .9 + fbm(uv * 18.) * .1;
      float r = paper * 1.25 - .12;
      float m = 1. - smoothstep(r - .06, r, n);
      float live = step(.001, paper) * step(paper, .999);
      float edge = smoothstep(r - .05, r - .025, n) * (1. - smoothstep(r - .025, r, n)) * live;       // 纸边焦痕
      float glow = smoothstep(r, r + .04, n) * (1. - smoothstep(r + .04, r + .1, n)) * live;           // 外圈微光
      col = mix(col, pc, m);
      col = mix(col, vec3(.28, .16, .08), edge * .85) + vec3(1., .72, .38) * glow * .3;
    }
    col = mix(col, vec3(1., .97, .9), flash);
    col *= fade;
    float bar = mix(.5, barH * .5, bars); float e = 1.5 / res.y;
    col *= smoothstep(bar + e, bar - e, abs(uv.y - .5));
    gl_FragColor = vec4(col, 1.);
  }`);

let W = 1, H = 1;
function resize() {
  if (Q.get('shot') === 'plan' && W > 1) return;   // 出图纸时锁死尺寸，点击区先对得上
  renderer.setSize(innerWidth, innerHeight);
  W = Math.floor(innerWidth * G.DPR); H = Math.floor(innerHeight * G.DPR);
  const w2 = W >> 1, h2 = H >> 1;
  rtMain.setSize(W, H); rtRefl.setSize(w2, h2); rtDepth.setSize(w2, h2); rtVolA.setSize(w2, h2); rtVolB.setSize(w2, h2);
  bloomRT.forEach(r => { const w = Math.max(1, W / r.d | 0), h = Math.max(1, H / r.d | 0); r.a.setSize(w, h); r.b.setSize(w, h); });
  G.REFL.reflTexel.value.set(1 / w2, 1 / h2);
  finalMat.uniforms.res.value.set(W, H);
  finalMat.uniforms.barH.value = Math.min(1, (W / 2.39) / H);
  G.camera.aspect = W / H; G.camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------- 镜像相机 ---------- */
const mirrorCam = new T.PerspectiveCamera();
const BIAS = new T.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
const clipPlane = new T.Plane(new V3(0, 1, 0), 0);
function updateMirror(cam) {
  const h = G.waterY;
  mirrorCam.copy(cam);
  const fwd = new V3(0, 0, -1).applyQuaternion(cam.quaternion), up = new V3(0, 1, 0).applyQuaternion(cam.quaternion);
  const p = cam.position.clone(), tg = p.clone().add(fwd);
  p.y = 2 * h - p.y; tg.y = 2 * h - tg.y; up.y = -up.y;
  mirrorCam.position.copy(p); mirrorCam.up.copy(up); mirrorCam.lookAt(tg);
  mirrorCam.updateMatrixWorld(); mirrorCam.projectionMatrix.copy(cam.projectionMatrix);
  G.REFL.texMat.value.copy(BIAS).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
  clipPlane.constant = -h;
}

// 深度预通道：逐物体换深度材质（带 alphaTest 的叶片用自己的 customDepthMaterial）
const depthList = [];
G.buildDepthList = () => {
  depthList.length = 0;
  G.scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && !G.noDepth.includes(o)) depthList.push(o); });
};

G.render = () => {
  const scene = G.scene, cam = G.camera, P = G.POST;
  // 1) 水面倒影
  if (!G.LO) {
    updateMirror(cam);
    G.mirrorHide.forEach(m => m.visible = false);
    G.REFL.tRefl.value = null;
    renderer.clippingPlanes = [clipPlane];
    renderer.setRenderTarget(rtRefl); renderer.render(scene, mirrorCam);
    renderer.clippingPlanes = [];
    G.mirrorHide.forEach(m => m.visible = true);
    G.REFL.tRefl.value = rtRefl.texture;
  }
  // 2) 半分辨率深度
  const saved = [];
  G.noDepth.forEach(o => { saved.push(o.visible); o.visible = false; });
  for (const m of depthList) { m.userData._mat = m.material; m.material = m.customDepthMaterial || depthMat; }
  const bg = scene.background; scene.background = null;
  renderer.setClearColor(0xffffff, 1);
  renderer.setRenderTarget(rtDepth); renderer.render(scene, cam);
  renderer.setClearColor(0x000000, 1);
  scene.background = bg;
  for (const m of depthList) m.material = m.userData._mat;
  G.noDepth.forEach((o, i) => o.visible = saved[i]);
  // 3) 主画面
  renderer.setRenderTarget(rtMain); renderer.render(scene, cam);
  // 4) 体积光 + AO
  const u = volMat.uniforms, sun = G.sun;
  u.invProj.value.copy(cam.projectionMatrixInverse); u.camWorld.value.copy(cam.matrixWorld); u.camPos.value.copy(cam.position);
  u.projY.value = cam.projectionMatrix.elements[5]; u.aspect.value = cam.aspect;
  u.sMap.value = sun.shadow.map && sun.shadow.map.texture; u.sMat.value.copy(sun.shadow.matrix);
  u.lCol.value.copy(sun.color).multiplyScalar(sun.intensity);
  u.lDir.value.subVectors(sun.target.position, sun.position).normalize();
  pass(volMat, rtVolA);
  blurMat.uniforms.tSrc.value = rtVolA.texture; blurMat.uniforms.dir.value.set(1 / rtVolA.width, 0); pass(blurMat, rtVolB);
  blurMat.uniforms.tSrc.value = rtVolB.texture; blurMat.uniforms.dir.value.set(0, 1 / rtVolA.height); pass(blurMat, rtVolA);
  // 5) 泛光
  brightMat.uniforms.volK.value = P.volK;
  pass(brightMat, bloomRT[0].a);
  let src = bloomRT[0].a;
  for (const r of bloomRT) {
    blurMat.uniforms.tSrc.value = src.texture; blurMat.uniforms.dir.value.set(1 / src.width, 0); pass(blurMat, r.b);
    blurMat.uniforms.tSrc.value = r.b.texture; blurMat.uniforms.dir.value.set(0, 1 / r.b.height); pass(blurMat, r.a);
    src = r.a;
  }
  // 6) 合成
  const f = finalMat.uniforms;
  f.volK.value = P.volK; f.aoK.value = P.aoK; f.exposure.value = P.exposure; f.bloom.value = P.bloom;
  f.paper.value = P.paper; f.bars.value = P.bars; f.fade.value = P.fade; f.flash.value = P.flash; f.sat.value = P.sat; f.vignette.value = P.vignette;
  pass(finalMat, null);
};
})();
