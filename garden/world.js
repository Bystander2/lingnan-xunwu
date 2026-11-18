/* 岭南寻物 · 园林场景：30×30m 庭园。北：镬耳山墙主厅；西：锦鲤池 + 方亭 + 英石；东：游廊；中：大榕树；南：月洞门。
   午后四点，晴天积云，西南斜阳。 */
(() => {
'use strict';
const T = THREE, V3 = T.Vector3, V2 = T.Vector2;
const { scene, R } = G;
const PI = Math.PI;

/* ======================= 天空 / 光照 ======================= */
const SUN_DIR = new V3(-.72, .5, .48).normalize();       // 指向太阳
G.SUN_DIR = SUN_DIR;
const skyMat = new T.ShaderMaterial({
  side: T.BackSide, depthWrite: false, fog: false,
  uniforms: { sunDir: { value: SUN_DIR }, uTime: G.time },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 sunDir; uniform float uTime; varying vec3 vDir;
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<6;i++){ s+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
    void main(){
      vec3 d = normalize(vDir); float h = max(d.y, 0.);
      vec3 col = mix(vec3(.82,.88,.96), vec3(.16,.40,.92), pow(h, .5)) * 1.45;
      float s = max(dot(d, sunDir), 0.);
      col += vec3(1.,.78,.5) * pow(s, 8.) * .9 + vec3(1.,.9,.7) * pow(s, 64.) * 1.5;
      col += vec3(40.,34.,26.) * smoothstep(.99955, .9998, s);
      vec2 p = d.xz / (d.y + .1) * .55 + uTime * vec2(.004, .0015);
      float c = fbm(p * 1.6);
      float cl = smoothstep(.52, .72, c) * smoothstep(.0, .12, d.y);
      float shade = smoothstep(.62, .92, c);
      vec3 cc = mix(vec3(2.0,1.95,1.88), vec3(1.05,1.1,1.2), shade);
      cc += vec3(1.2,.9,.55) * pow(s, 5.) * 1.4 * (1. - shade);
      col = mix(col, cc, cl * .95);
      col = mix(col, vec3(.62,.66,.7), smoothstep(.0, -.08, d.y));
      gl_FragColor = vec4(col, 1.);
    }`,
});
const sky = new T.Mesh(new T.SphereGeometry(300, 48, 24), skyMat);
sky.frustumCulled = false; scene.add(sky); G.noDepth.push(sky); G.sky = sky;
{
  const pm = new T.PMREMGenerator(G.renderer), es = new T.Scene();
  es.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), skyMat));
  const gnd = new T.Mesh(new T.PlaneGeometry(200, 200).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: new T.Color(.42, .36, .3) }));
  gnd.position.y = -1; es.add(gnd);
  scene.environment = pm.fromScene(es, .03).texture; pm.dispose();
}
scene.fog = new T.Fog(new T.Color(.78, .84, .92), 45, 220);

scene.add(new T.HemisphereLight(new T.Color(.6, .74, 1.0), new T.Color(.55, .42, .3), .8));
const sun = new T.DirectionalLight(new T.Color(1, .87, .7), 3.1);
sun.position.copy(SUN_DIR).multiplyScalar(45); sun.target.position.set(0, 0, 0);
sun.castShadow = true; sun.shadow.mapSize.set(G.LO ? 2048 : 4096, G.LO ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 5, far: 100 });
sun.shadow.bias = -.0003; sun.shadow.normalBias = .03;
scene.add(sun, sun.target); G.sun = sun;

/* ======================= 材质 ======================= */
function brickCanvas() {
  const S = 1024, rows = 20, cols = 5, bh = S / rows, bw = S / cols;
  const c = G.cv(S), g = c.getContext('2d');
  g.fillStyle = '#9a9c98'; g.fillRect(0, 0, S, S);
  for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
    const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh, l = 40 + R() * 14, s = 5 + R() * 7, h = 200 + R() * 20;
    g.fillStyle = `hsl(${h},${s}%,${l}%)`; g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
    for (let k = 0; k < 5; k++) { g.fillStyle = `hsla(${h},${s}%,${l + (R() - .5) * 12}%,.25)`; g.beginPath(); g.ellipse(x + R() * bw, y + R() * bh, R() * 40 + 8, R() * 10 + 3, 0, 0, 7); g.fill(); }
  }
  G.speck(g, S, S, 40000, ['rgba(0,0,0,.12)', 'rgba(255,255,255,.07)']);
  const t = G.canvasTex(c); t.repeat.set(1 / 1.2, 1 / 1.2); return t;
}
const M = G.MAT = {
  plaster: G.phMat('plaster', { color: new T.Color(1.3, 1.26, 1.18), roughness: .95, envMapIntensity: .5, normalScale: new T.Vector2(.6, .6) }),
  brick: new T.MeshStandardMaterial({ map: brickCanvas(), roughness: .85, envMapIntensity: .4 }),
  granite: G.phMat('granite', { color: 0xe6e0d4 }),
  tile: G.phMat('floor', { color: 0xffb49a }),
  roof: G.phMat('roof', { color: 0xa8acaa }),
  wood: G.phMat('wood', { color: 0xd07a58, envMapIntensity: .8 }),
  woodDark: G.phMat('wood', { color: 0x8a4a35 }),
  bark: G.phMat('bark', { color: 0xc4b8a6 }),
  cobble: G.phMat('cobble', { color: 0xe8e2d4 }),
  rock: G.phMat('granite', { color: 0x8a8a84, roughness: 1 }),
  greenGlaze: new T.MeshPhysicalMaterial({ color: 0x2c8a58, roughness: .25, clearcoat: 1, clearcoatRoughness: .1 }),
  interior: new T.MeshStandardMaterial({ color: 0x4a3226, roughness: .9, side: T.BackSide }),
  dark: new T.MeshStandardMaterial({ color: 0x2c2e30, roughness: .7 }),
  red: new T.MeshPhysicalMaterial({ color: 0xc8241a, roughness: .35, clearcoat: .6, emissive: 0x3a0505 }),
  gold: new T.MeshStandardMaterial({ color: 0xe0b040, metalness: .8, roughness: .3 }),
};

/* ======================= 几何工具 ======================= */
const { add, box } = G;
// 斜屋面：从屋脊中点 b 到檐口中点 a，宽 w，厚 t。瓦沟沿坡向。
function slab(a, b, w, t, top, under = M.woodDark) {
  const len = a.distanceTo(b);
  const g = G.boxGeo(w, t, len);
  const m = new T.Mesh(g, [under, under, top, under, under, under]);
  const z = new V3().subVectors(a, b).normalize();
  let x = new V3().crossVectors(new V3(0, 1, 0), z); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize();
  let y = new V3().crossVectors(z, x); if (y.y < 0) { x.negate(); y.negate(); }
  m.matrixAutoUpdate = false;
  m.matrix.makeBasis(x, y, z).setPosition(new V3().addVectors(a, b).multiplyScalar(.5));
  m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
// 绿琉璃瓦当一排
const teGeo = new T.CylinderGeometry(.07, .07, .08, 14); teGeo.rotateX(PI / 2);
function tileEnds(p0, p1, step = .22) {
  const n = Math.max(1, Math.round(p0.distanceTo(p1) / step));
  const dir = new V3().subVectors(p1, p0), out = new V3(-dir.z, 0, dir.x).normalize();
  const im = new T.InstancedMesh(teGeo, M.greenGlaze, n + 1);
  const m4 = new T.Matrix4(), q = new T.Quaternion().setFromUnitVectors(new V3(0, 0, 1), out);
  for (let i = 0; i <= n; i++) im.setMatrixAt(i, m4.compose(new V3().lerpVectors(p0, p1, i / n), q, new V3(1, 1, 1)));
  im.castShadow = true; scene.add(im);
  const bar = new T.Mesh(G.boxGeo(p0.distanceTo(p1), .05, .1), M.greenGlaze);
  bar.position.lerpVectors(p0, p1, .5).y -= .09; bar.rotation.y = -Math.atan2(dir.z, dir.x); scene.add(bar);
}
function lattice(w, h, cols, rows, t, d, mat, parent, pos) {
  for (let i = 0; i <= cols; i++) add(G.boxGeo(t, h, d), mat, [pos[0] - w / 2 + i * w / cols, pos[1], pos[2]], { parent });
  for (let j = 0; j <= rows; j++) add(G.boxGeo(w, t, d), mat, [pos[0], pos[1] - h / 2 + j * h / rows, pos[2]], { parent });
}

/* ======================= 地面 + 锦鲤池 ======================= */
const POND = { x0: -12.8, x1: -4.2, z0: -4, z1: 5, r: 1.8 };
G.POND = POND;
function rrect(x0, z0, x1, z1, r, path = new T.Shape()) {
  path.moveTo(x0 + r, z0); path.lineTo(x1 - r, z0); path.absarc(x1 - r, z0 + r, r, -PI / 2, 0);
  path.lineTo(x1, z1 - r); path.absarc(x1 - r, z1 - r, r, 0, PI / 2);
  path.lineTo(x0 + r, z1); path.absarc(x0 + r, z1 - r, r, PI / 2, PI);
  path.lineTo(x0, z0 + r); path.absarc(x0 + r, z0 + r, r, PI, PI * 1.5);
  return path;
}
{
  // 平面坐标 (x, z) 直接写入 shape 的 (x, -y)，再绕 X 转 -90°
  const ground = new T.Shape(); ground.moveTo(-15.4, -15.4); ground.lineTo(15.4, -15.4); ground.lineTo(15.4, 15.4); ground.lineTo(-15.4, 15.4);
  const pe = .35;
  ground.holes.push(rrect(POND.x0 - pe, POND.z0 - pe, POND.x1 + pe, POND.z1 + pe, POND.r + pe, new T.Path()));
  const gg = new T.ShapeGeometry(ground, 16); gg.rotateX(PI / 2);
  // rotateX(+90°)：shape y → world z，法线朝 -y，翻转索引让它朝上
  const idx = gg.index.array; for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
  gg.computeVertexNormals();
  add(gg, M.cobble, null, { cast: false });
  // 院外：草地 + 巷道
  const os = new T.Shape(); os.moveTo(-120, -120); os.lineTo(120, -120); os.lineTo(120, 120); os.lineTo(-120, 120);
  const oh = new T.Path(); oh.moveTo(-15.3, -15.3); oh.lineTo(-15.3, 15.3); oh.lineTo(15.3, 15.3); oh.lineTo(15.3, -15.3); os.holes.push(oh);
  const og = new T.ShapeGeometry(os).rotateX(-PI / 2);
  add(og, new T.MeshStandardMaterial({ color: 0x5f7a3c, roughness: 1, envMapIntensity: .3 }), [0, -.02, 0], { cast: false });
  const lane = G.uvScale(new T.PlaneGeometry(40, 6).rotateX(-PI / 2), 40, 6);
  add(lane, M.granite, [0, -.005, 18.2], { cast: false });

  // 池沿麻石（环形挤出），顶面 y=.12，向下到池底
  const ring = rrect(POND.x0 - pe, POND.z0 - pe, POND.x1 + pe, POND.z1 + pe, POND.r + pe);
  ring.holes.push(rrect(POND.x0, POND.z0, POND.x1, POND.z1, POND.r, new T.Path()));
  const rg = new T.ExtrudeGeometry(ring, { depth: 1.0, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 16 });
  rg.rotateX(PI / 2); rg.translate(0, .12, 0);
  add(rg, M.granite);
  // 池底
  const bot = new T.ShapeGeometry(rrect(POND.x0, POND.z0, POND.x1, POND.z1, POND.r), 16); bot.rotateX(PI / 2);
  add(bot, new T.MeshStandardMaterial({ color: 0x1e3428, roughness: 1, side: T.DoubleSide }), [0, -.85, 0], { cast: false });

  // 水面：半透明 + 平面倒影 + 粼光
  const wm = new T.MeshStandardMaterial({ color: new T.Color(.02, .09, .085), roughness: .04, metalness: 0, transparent: true, opacity: .38, envMapIntensity: .5 });
  wm.onBeforeCompile = s => {
    Object.assign(s.uniforms, G.REFL);
    s.vertexShader = 'varying vec3 vWP;\n' + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = 'uniform sampler2D tRefl; uniform mat4 texMat; uniform float uTime; uniform vec2 reflTexel; varying vec3 vWP;\n' + s.fragmentShader
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  vec2 gw = vec2(sin(vWP.x*7.+uTime*2.1)*sin(vWP.z*5.3-uTime*1.7) + sin(vWP.x*17.-uTime*3.)*.4, cos(vWP.z*8.+uTime*2.4)*sin(vWP.x*4.7+uTime) + cos(vWP.z*19.+uTime*2.6)*.4);
  normal = normalize(normal + (viewMatrix * vec4(gw.x, 0., gw.y, 0.)).xyz * .09);`)
      .replace('#include <output_fragment>', `
  vec4 rc = texMat * vec4(vWP, 1.); vec2 ruv = rc.xy / rc.w + gw * .006;
  vec3 rr = texture2D(tRefl, ruv).rgb * vec3(.72, .86, .88);
  vec3 Vw = normalize(cameraPosition - vWP);
  float fres = .02 + .98 * pow(1. - clamp(Vw.y, 0., 1.), 5.);
  float k = clamp(.08 + fres, 0., 1.);
  outgoingLight = mix(outgoingLight, rr, k);
  diffuseColor.a = mix(diffuseColor.a, 1., k);
#include <output_fragment>`);
  };
  const wg = new T.ShapeGeometry(rrect(POND.x0, POND.z0, POND.x1, POND.z1, POND.r), 16); wg.rotateX(PI / 2);
  const idx2 = wg.index.array; for (let i = 0; i < idx2.length; i += 3) { const t = idx2[i]; idx2[i] = idx2[i + 2]; idx2[i + 2] = t; }
  wg.computeVertexNormals();
  const water = add(wg, wm, [0, G.waterY, 0], { cast: false });
  water.renderOrder = 2; G.mirrorHide.push(water); G.noDepth.push(water);

  // 埠头（伸入池中的石台），木屐放在这里
  box(1.5, .3, 1.5, M.granite, [-4.55, -.03, .2]);
  G.platform(-5.3, -.55, -3.8, .95, .12);

  // 睡莲 + 莲花
  const padM = new T.MeshStandardMaterial({ color: 0x3f7a2e, roughness: .55, side: T.DoubleSide });
  for (let i = 0; i < 22; i++) {
    const r = .22 + R() * .25, x = -11.8 + R() * 4.5, z = -3 + R() * 3.2;
    add(new T.CircleGeometry(r, 20, .25, PI * 2 - .5).rotateX(-PI / 2), padM, [x, G.waterY + .012, z], { cast: false, rot: [0, R() * 6, 0] });
  }
  const petal = new T.MeshPhysicalMaterial({ color: 0xf6a8c0, roughness: .4, emissive: 0x401020, side: T.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const g = new T.Group(); g.position.set(-11 + R() * 3, G.waterY + .02, -2.6 + R() * 2.4); scene.add(g);
    for (let p = 0; p < 10; p++) {
      const m = add(new T.SphereGeometry(.07, 10, 8, 0, PI, 0, PI / 2), petal, null, { parent: g, cast: false });
      m.scale.set(.6, 1.6, .4); m.rotation.set(-.5 - (p > 4) * .4, p * PI * 2 / 5 + (p > 4) * .6, 0);
    }
    add(new T.SphereGeometry(.03, 10, 8), new T.MeshStandardMaterial({ color: 0xf2d040 }), [0, .03, 0], { parent: g });
  }
  // 池中碰撞：用于 player
  G.inPond = (x, z, pad) => {
    const { x0, x1, z0, z1, r } = POND, e = pe + pad;
    if (x < x0 - e || x > x1 + e || z < z0 - e || z > z1 + e) return false;
    if (x > -5.3 && x < -3.6 && z > -.55 && z < .95) return false;  // 埠头可走
    const cx = Math.max(x0 + r, Math.min(x1 - r, x)), cz = Math.max(z0 + r, Math.min(z1 - r, z));
    return Math.hypot(x - cx, z - cz) < r + e;
  };
}

/* ---------- 锦鲤：纺锤形鱼身 + 分叉尾鳍 / 背鳍 / 胸鳍，整条鱼喺 shader 入面做 S 形摆尾 ---------- */
function koiTex(seed) {
  const c = G.cv(256), x = c.getContext('2d'), r = G.mulberry(seed);
  // lathe 嘅 u 绕身一圈（0.25 附近系背）、v 由鼻到尾
  const base = r() < .55 ? '#f4efe6' : '#f08a2a';
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  const back = x.createLinearGradient(0, 0, 256, 0);
  back.addColorStop(0, 'rgba(255,255,255,.35)'); back.addColorStop(.25, 'rgba(255,255,255,0)'); back.addColorStop(.5, 'rgba(255,255,255,.4)'); back.addColorStop(.75, 'rgba(255,255,255,.55)'); back.addColorStop(1, 'rgba(255,255,255,.35)');
  const red = ['#d8361a', '#e2471c', '#c8281a'][r() * 3 | 0];
  for (let i = 0; i < 4 + r() * 3; i++) {                    // 红斑：集中喺背
    x.fillStyle = red; x.beginPath(); x.ellipse(256 * (.1 + r() * .32), 256 * (.08 + r() * .7), 18 + r() * 34, 22 + r() * 46, r() * 3, 0, 7); x.fill();
  }
  if (r() < .45) for (let i = 0; i < 3; i++) { x.fillStyle = '#1a1612'; x.beginPath(); x.ellipse(256 * (.12 + r() * .28), 256 * (.2 + r() * .6), 6 + r() * 12, 8 + r() * 16, r() * 3, 0, 7); x.fill(); }
  x.fillStyle = back; x.fillRect(0, 0, 256, 256);            // 腹部偏浅
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(255,255,255,${r() * .12})`; x.fillRect(r() * 256, r() * 256, 3, 2); }   // 鳞光
  return G.canvasTex(c, { repeat: false });
}
function mergeGroups(parts) {     // parts: [{geo, mat}] → 一个带 groups 嘅 BufferGeometry
  const pos = [], nor = [], uv = [], g = new T.BufferGeometry(); let off = 0;
  parts.forEach((p, k) => {
    const n = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); uv.push(...n.attributes.uv.array);
    g.addGroup(off, n.attributes.position.count, k); off += n.attributes.position.count;
  });
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  return g;
}
const KOI_LEN = .46;
const koiGeo = (() => {
  // 鼻喺 +z，尾喺 -z
  const prof = [[0, 0], [.022, .006], [.04, .03], [.052, .07], [.058, .12], [.056, .18], [.047, .25], [.034, .31], [.022, .355], [.014, .385], [.011, .4]];
  const body = new T.LatheGeometry(prof.map(p => new V2(p[0], p[1])), 20);
  body.rotateX(-PI / 2); body.translate(0, 0, KOI_LEN / 2 - .02); body.scale(.72, 1, 1);
  // 尾鳍（分叉，竖直）
  const tf = new T.Shape(); tf.moveTo(0, 0); tf.quadraticCurveTo(.05, .03, .1, .075); tf.quadraticCurveTo(.075, .02, .07, 0); tf.quadraticCurveTo(.075, -.02, .1, -.075); tf.quadraticCurveTo(.05, -.03, 0, 0);
  const tail = new T.ShapeGeometry(tf, 6); tail.rotateY(PI / 2); tail.translate(0, 0, KOI_LEN / 2 - .02 - .385);
  // 背鳍
  const df = new T.Shape(); df.moveTo(0, 0); df.quadraticCurveTo(.02, .035, .11, .03); df.lineTo(.13, 0); df.lineTo(0, 0);
  const dorsal = new T.ShapeGeometry(df, 4); dorsal.rotateY(PI / 2); dorsal.translate(0, .05, KOI_LEN / 2 - .02 - .12);
  // 胸鳍
  const pf = new T.Shape(); pf.absellipse(0, 0, .035, .018, 0, PI * 2);
  const pecs = [-1, 1].map(sx => { const g = new T.ShapeGeometry(pf, 8); g.translate(.03, 0, 0); g.rotateX(-PI / 2); g.rotateY(sx * .6); if (sx < 0) g.rotateY(PI); g.translate(sx * .035, -.025, KOI_LEN / 2 - .02 - .085); return g; });
  return mergeGroups([{ geo: body }, { geo: tail }, { geo: dorsal }, { geo: pecs[0] }, { geo: pecs[1] }]);
})();
function swimShader(mat, ph, swim) {
  mat.onBeforeCompile = s => {
    Object.assign(s.uniforms, { uSwim: swim, uPh: { value: ph } });
    s.vertexShader = 'uniform float uSwim, uPh;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float sw = clamp((${(KOI_LEN / 2).toFixed(3)} - transformed.z) / ${(KOI_LEN + .1).toFixed(3)}, 0., 1.);   // 0 = 鼻，1 = 尾鳍末
      float ph = transformed.z * 15. + uSwim + uPh;
      transformed.x += (.006 + .07 * sw * sw) * sin(ph);
      transformed.z -= .012 * sw * sw * abs(sin(ph));`);
  };
  return mat;
}
G.koi = [];
for (let i = 0; i < 9; i++) {
  const ph = R() * 6.28, spd = 7 + R() * 3, swim = { value: R() * 100 };
  const skin = swimShader(new T.MeshPhysicalMaterial({ map: koiTex(i * 31 + 7), roughness: .32, clearcoat: 1, clearcoatRoughness: .15, sheen: .3 }), ph, swim);
  const fin = swimShader(new T.MeshStandardMaterial({ color: i % 3 ? 0xf4c8a0 : 0xf2efe8, transparent: true, opacity: .55, side: T.DoubleSide, roughness: .4, depthWrite: false }), ph, swim);
  const m = new T.Mesh(koiGeo, [skin, fin, fin, fin, fin]);
  m.scale.setScalar(.8 + R() * .45); m.renderOrder = 1;
  const g = new T.Group(); g.add(m);
  g.userData = { swim, spd, cruise: .22 + R() * .12, heading: R() * 6.28, wander: new V3(), wanderT: 0, tail: new T.Object3D(), cx: -8.5 + (R() - .5) * 3, cz: .5 + (R() - .5) * 3, rx: 1.5 + R() * 2.2, rz: 1.2 + R() * 1.8, sp: .12 + R() * .16, ph: R() * 6, y: -.32 - R() * .14 };
  g.position.set(-8.5 + (R() - .5) * 6, g.userData.y, .5 + (R() - .5) * 6); scene.add(g); G.koi.push(g);
}

/* ---------- 英石假山（池北角）+ 石湾公仔落脚点 ---------- */
function rockGeo(seed, s) {
  const g = new T.SphereGeometry(1, 36, 24), p = g.attributes.position, r = G.mulberry(seed);
  const o = [r() * 10, r() * 10, r() * 10];
  for (let i = 0; i < p.count; i++) {
    const v = new V3().fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 3.1 + o[0]) * Math.sin(v.y * 2.7 + o[1]) * Math.sin(v.z * 3.3 + o[2]) * .25 + Math.sin(v.x * 7 + v.z * 5 + o[1]) * .08;
    v.multiplyScalar(1 + n).multiply(s); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return G.uvScale(g, 2);
}
const ROCKS = [[-13.2, .5, -6.6, 1.2, .9, 1.0], [-12.2, .35, -5.7, .9, .55, .8], [-13.6, 1.25, -6.9, .7, .6, .6], [-12.9, 1.05, -6.1, .55, .45, .5], [-11.3, .2, -5.4, .6, .35, .5], [-5.0, .2, 5.9, .7, .4, .6], [-12.6, .25, 5.9, .8, .5, .7]];
ROCKS.forEach(([x, y, z, sx, sy, sz], i) => { add(rockGeo(i * 13 + 3, new V3(sx, sy, sz)), M.rock, [x, y, z], { rot: [0, R() * 6, 0] }); G.circle(x, z, Math.max(sx, sz) * .9); });
G.SPOT_FIGURE = new V3(-12.95, 1.48, -6.15);

/* ======================= 院墙 ======================= */
const WALL_H = 3.4;
function coping(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = -Math.atan2(z1 - z0, x1 - x0);
  const g = new T.Group(); g.position.set((x0 + x1) / 2, WALL_H, (z0 + z1) / 2); g.rotation.y = ang; scene.add(g);
  for (const s of [-1, 1]) {
    const m = add(G.boxGeo(len + .3, .07, .42), [M.dark, M.dark, M.roof, M.dark, M.dark, M.dark], [0, .12, s * .17], { parent: g });
    m.rotation.x = s * .38;
  }
  add(G.boxGeo(len + .3, .1, .12), M.dark, [0, .26, 0], { parent: g });
  add(G.boxGeo(len + .3, .06, .06), M.greenGlaze, [0, .02, .26], { parent: g });
  add(G.boxGeo(len + .3, .06, .06), M.greenGlaze, [0, .02, -.26], { parent: g });
}
function plainWall(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = -Math.atan2(z1 - z0, x1 - x0);
  const m = box(len, WALL_H - .5, .3, M.plaster, [(x0 + x1) / 2, .5 + (WALL_H - .5) / 2, (z0 + z1) / 2]); m.rotation.y = ang;
  const b = box(len, .5, .34, M.granite, [(x0 + x1) / 2, .25, (z0 + z1) / 2]); b.rotation.y = ang;
  coping(x0, z0, x1, z1);
}
// 带洞的墙（Shape 在墙面局部坐标：u 沿墙，v 向上）
function holedWall(len, holes, mat, place) {
  const s = new T.Shape(); s.moveTo(-len / 2, .5); s.lineTo(len / 2, .5); s.lineTo(len / 2, WALL_H); s.lineTo(-len / 2, WALL_H); s.lineTo(-len / 2, .5);
  holes.forEach(h => s.holes.push(h));
  const g = new T.ExtrudeGeometry(s, { depth: .3, bevelEnabled: false, curveSegments: 32 }); g.translate(0, 0, -.15);
  const m = add(g, mat); place(m); return m;
}
const circ = (u, v, r) => { const p = new T.Path(); p.absarc(u, v, r, 0, PI * 2, true); return p; };
const hexP = (u, v, r) => { const p = new T.Path(); for (let i = 0; i <= 6; i++) { const a = i / 6 * PI * 2 + PI / 6; i ? p.lineTo(u + Math.cos(a) * r, v + Math.sin(a) * r) : p.moveTo(u + Math.cos(a) * r, v + Math.sin(a) * r); } return p; };

// 南墙 + 月洞门
{
  const s = new T.Shape(); s.moveTo(-15, 0); s.lineTo(15, 0); s.lineTo(15, WALL_H); s.lineTo(-15, WALL_H); s.lineTo(-15, 0);
  s.holes.push(circ(0, 1.5, 1.35));
  const g = new T.ExtrudeGeometry(s, { depth: .3, bevelEnabled: false, curveSegments: 48 }); g.translate(0, 0, -.15);
  add(g, M.plaster, [0, 0, 15]);
  const ring = new T.Shape(); ring.absarc(0, 0, 1.58, 0, PI * 2); ring.holes.push(circ(0, 0, 1.35));
  const rg = new T.ExtrudeGeometry(ring, { depth: .42, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, curveSegments: 48 }); rg.translate(0, 0, -.21);
  add(rg, M.granite, [0, 1.5, 15]);
  box(13.4, .5, .34, M.granite, [-8.3, .25, 15]); box(13.4, .5, .34, M.granite, [8.3, .25, 15]);   // 两段勒脚
  coping(-15, 15, 15, 15);
  // 匾：「寻芳」
  const c = G.cv(512, 200), x = c.getContext('2d');
  x.fillStyle = '#efe6d2'; x.fillRect(0, 0, 512, 200); x.strokeStyle = '#2a5a44'; x.lineWidth = 12; x.strokeRect(10, 10, 492, 180);
  x.fillStyle = '#1e3a30'; x.font = `120px ${G.BRUSH}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('寻芳', 256, 108);
  add(new T.PlaneGeometry(1.1, .43), new T.MeshStandardMaterial({ map: G.canvasTex(c, { repeat: false }), roughness: .7 }), [0, 3.25, 14.83], { cast: false, rot: [0, PI, 0] });
  // 门外小巷
  G.platform(-1.2, 14.6, 1.2, 15.4, .02);
}
plainWall(-15, -15, -15, 15);
plainWall(-15, -15, -8.9, -15);
plainWall(8.9, -15, 15, -15);
// 东墙（游廊背墙）带绿琉璃漏窗
const LEAK = [[-4.5, 'c'], [.5, 'h'], [5.5, 'c'], [10, 'h']];
{
  holedWall(30, LEAK.map(([u, t]) => t === 'c' ? circ(u, 1.95, .62) : hexP(u, 1.95, .62)), M.plaster, m => { m.rotation.y = -PI / 2; m.position.set(15, 0, 0); });
  box(30, .5, .34, M.granite, [15, .25, 0]).rotation.y = PI / 2;
  coping(15, -15, 15, 15);
  // 绿琉璃花格
  const c = G.cv(256), x = c.getContext('2d');
  x.strokeStyle = '#2c8a58'; x.lineWidth = 14; x.lineCap = 'round';
  for (let i = -2; i <= 6; i++) { x.beginPath(); x.moveTo(i * 48, 0); x.lineTo(i * 48 + 256, 256); x.stroke(); x.beginPath(); x.moveTo(i * 48 + 256, 0); x.lineTo(i * 48, 256); x.stroke(); }
  x.strokeStyle = '#1f6a42'; x.lineWidth = 6; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(24 + i * 48, 128, 18, 0, 7); x.stroke(); }
  const tex = G.canvasTex(c); tex.repeat.set(1.2, 1.2);
  const lm = new T.MeshPhysicalMaterial({ map: tex, alphaMap: null, transparent: false, alphaTest: .5, side: T.DoubleSide, roughness: .2, clearcoat: 1 });
  // 用 alpha：画布透明处镂空
  const dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: .5 });
  LEAK.forEach(([u, t]) => {
    const geo = t === 'c' ? new T.CircleGeometry(.62, 40) : new T.CircleGeometry(.62, 6, PI / 6 + PI / 2);
    const m = add(geo, lm, [14.98, 1.95, u], { rot: [0, -PI / 2, 0] }); m.customDepthMaterial = dm;
    const fr = new T.Shape(); fr.absarc(0, 0, .72, 0, PI * 2, false); fr.holes.push(circ(0, 0, .62));
    if (t === 'c') add(new T.ExtrudeGeometry(fr, { depth: .36, bevelEnabled: false, curveSegments: 40 }).translate(0, 0, -.18), M.granite, [15, 1.95, u], { rot: [0, PI / 2, 0] });
  });
}

/* ======================= 主厅（北）======================= */
const HZ = -11.05;           // 立面
{
  box(17.4, .45, 3.6, [M.granite, M.granite, M.tile, M.granite, M.granite, M.granite], [0, .225, -9.45]);
  G.platform(-8.7, -11.3, 8.7, -7.65, .45);
  box(4.6, .3, .5, M.granite, [0, .15, -7.4]);
  G.platform(-2.3, -7.65, 2.3, -7.15, .3);
  // 立面墙：门 + 两扇满洲窗
  const s = new T.Shape(); s.moveTo(-8.6, .2); s.lineTo(8.6, .2); s.lineTo(8.6, 4.8); s.lineTo(-8.6, 4.8); s.lineTo(-8.6, .2);
  const WIN = [-6.1, -3.1, 3.1, 6.1], WW = 1.15, WY0 = 1.0, WY1 = 3.3;   // 拱顶长窗：矩形 + 半圆扇窗
  const rectH = (x0, y0, x1, y1) => { const p = new T.Path(); p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.lineTo(x0, y0); return p; };
  const archH = x => { const p = new T.Path(); p.moveTo(x - WW / 2, WY0); p.lineTo(x - WW / 2, WY1); p.absarc(x, WY1, WW / 2, PI, 0, true); p.lineTo(x + WW / 2, WY0); p.lineTo(x - WW / 2, WY0); return p; };
  s.holes.push(rectH(-1.1, .45, 1.1, 3.4));
  WIN.forEach(x => s.holes.push(archH(x)));
  const fg = new T.ExtrudeGeometry(s, { depth: .3, bevelEnabled: false }); fg.translate(0, 0, -.3);
  add(fg, M.brick, [0, 0, HZ]);
  G.block(-8.7, HZ - .5, 8.7, HZ + .25);
  // 室内（暗）
  box(17, 4.4, 4.2, M.interior, [0, 2.65, HZ - 2.4], { cast: false });
  // 门框 + 趟栊
  box(.16, 3.0, .4, M.granite, [-1.18, 1.95, HZ - .1]); box(.16, 3.0, .4, M.granite, [1.18, 1.95, HZ - .1]); box(2.52, .18, .4, M.granite, [0, 3.48, HZ - .1]);
  const barG = new T.CylinderGeometry(.03, .03, 2.2, 12); barG.rotateZ(PI / 2);
  for (let i = 0; i < 13; i++) add(barG, M.woodDark, [0, .65 + i * .21, HZ - .02]);
  box(.08, 2.95, .08, M.woodDark, [-1.06, 1.95, HZ - .02]); box(.08, 2.95, .08, M.woodDark, [1.06, 1.95, HZ - .02]);
  // 牌匾 + 对联
  const pl = G.cv(1024, 300), px = pl.getContext('2d');
  px.fillStyle = '#2a1a10'; px.fillRect(0, 0, 1024, 300); px.strokeStyle = '#d4a548'; px.lineWidth = 14; px.strokeRect(20, 20, 984, 260);
  px.fillStyle = '#e2b450'; px.font = `180px ${G.BRUSH}`; px.textAlign = 'center'; px.textBaseline = 'middle'; px.fillText('竹苞松茂', 512, 158);
  add(new T.BoxGeometry(2.8, .78, .08), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, new T.MeshStandardMaterial({ map: G.canvasTex(pl, { repeat: false }), roughness: .4, metalness: .2 }), M.woodDark], [0, 4.1, HZ + .06]);
  const couplet = t => {
    const c = G.cv(180, 900), x = c.getContext('2d'); x.fillStyle = '#b8261c'; x.fillRect(0, 0, 180, 900);
    G.speck(x, 180, 900, 4000, ['rgba(0,0,0,.1)', 'rgba(255,200,150,.08)']);
    x.fillStyle = '#e8c060'; x.font = `120px ${G.BRUSH}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    [...t].forEach((ch, i) => x.fillText(ch, 90, 100 + i * 170));
    return new T.MeshStandardMaterial({ map: G.canvasTex(c, { repeat: false }), roughness: .8 });
  };
  add(new T.PlaneGeometry(.36, 1.9), couplet('忠厚传家久'), [1.6, 2.05, HZ + .01], { cast: false });
  add(new T.PlaneGeometry(.36, 1.9), couplet('诗书继世长'), [-1.6, 2.05, HZ + .01], { cast: false });

  // 满洲窗（参考西关大屋：三格八瓣彩色玻璃花 + 半圆扇窗）
  const PET = ['#2f9fb0', '#2f5fc8', '#7a4aa8', '#e8b020', '#d8402a', '#e87a2a', '#3aa060', '#3fb5c0'];
  const flower = (x, cx, cy, r, seed) => {
    const rr = G.mulberry(seed);
    for (let p = 0; p < 8; p++) {
      const a = p / 8 * PI * 2;
      x.fillStyle = PET[(p + (rr() * 8 | 0)) % 8];
      x.beginPath(); x.ellipse(cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55, r * .42, r * .26, a, 0, 7); x.fill();
      x.strokeStyle = '#141010'; x.lineWidth = 5; x.stroke();
      x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse(cx + Math.cos(a) * r * .5, cy + Math.sin(a) * r * .5, r * .2, r * .09, a, 0, 7); x.fill();
    }
    x.fillStyle = '#f4f0e6'; x.beginPath(); x.arc(cx, cy, r * .2, 0, 7); x.fill(); x.strokeStyle = '#141010'; x.lineWidth = 5; x.stroke();
  };
  const scroll = (x, cx, cy, sx, sy) => { x.strokeStyle = '#2a1a12'; x.lineWidth = 7; x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + sx * 40, cy, cx + sx * 40, cy + sy * 40); x.stroke(); x.beginPath(); x.arc(cx + sx * 26, cy + sy * 26, 9, 0, 7); x.stroke(); };
  const winTex = seed => {
    const c = G.cv(256, 512), x = c.getContext('2d'), ph = 512 / 3;
    x.fillStyle = '#e8e2d2'; x.fillRect(0, 0, 256, 512);
    for (let k = 0; k < 3; k++) {
      const cy = ph * k + ph / 2;
      x.fillStyle = 'rgba(220,214,196,1)'; x.fillRect(8, ph * k + 8, 240, ph - 16);
      flower(x, 128, cy, 70, seed * 7 + k);
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) scroll(x, 128 - sx * 112, cy - sy * 75, sx, sy);
    }
    return G.canvasTex(c, { repeat: false });
  };
  const fanTex = seed => {
    const c = G.cv(512, 256), x = c.getContext('2d'), rr = G.mulberry(seed);
    x.fillStyle = '#e8e2d2'; x.fillRect(0, 0, 512, 256);
    for (const [r0, r1, n] of [[230, 160, 11], [160, 95, 7]]) for (let i = 0; i < n; i++) {
      const a0 = PI + i / n * PI, a1 = PI + (i + 1) / n * PI;
      x.fillStyle = PET[rr() * 8 | 0]; x.beginPath(); x.arc(256, 256, r0, a0, a1); x.arc(256, 256, r1, a1, a0, true); x.closePath(); x.fill();
      x.strokeStyle = '#141010'; x.lineWidth = 6; x.stroke();
    }
    x.fillStyle = '#f4f0e6'; x.beginPath(); x.arc(256, 256, 95, PI, 0); x.fill(); x.strokeStyle = '#141010'; x.lineWidth = 6; x.stroke();
    flower(x, 256, 230, 70, seed + 99);
    return G.canvasTex(c, { repeat: false });
  };
  const glassMat = t => new T.MeshPhysicalMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .45, roughness: .06, clearcoat: 1, envMapIntensity: 1.1 });
  const archMould = new T.Shape(); archMould.absarc(0, 0, .82, 0, PI, false); archMould.lineTo(-.6, 0); archMould.absarc(0, 0, .6, PI, 0, true); archMould.lineTo(.82, 0);
  const mouldGeo = new T.ExtrudeGeometry(archMould, { depth: .12, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 32 });
  const mouldMat = G.phMat('plaster', { color: new T.Color(1.15, 1.13, 1.08), roughness: .9 });
  WIN.forEach((x, k) => {
    const H = WY1 - WY0;
    add(new T.PlaneGeometry(WW, H), glassMat(winTex(k + 1)), [x, (WY0 + WY1) / 2, HZ - .2], { cast: false });
    add(new T.CircleGeometry(WW / 2, 32, 0, PI), glassMat(fanTex(k + 11)), [x, WY1, HZ - .2], { cast: false });
    // 深色窗框 + 两道横档
    const fr = (w, h, px, py) => box(w, h, .08, M.woodDark, [px, py, HZ - .16]);
    fr(.07, H, x - WW / 2 + .035, (WY0 + WY1) / 2); fr(.07, H, x + WW / 2 - .035, (WY0 + WY1) / 2); fr(.05, H, x, (WY0 + WY1) / 2).scale.x = .4;
    for (let r = 0; r <= 3; r++) fr(WW, .06, x, WY0 + r * H / 3);
    const ring = new T.Shape(); ring.absarc(0, 0, WW / 2, 0, PI, false); ring.lineTo(-WW / 2 + .07, 0); ring.absarc(0, 0, WW / 2 - .07, PI, 0, true); ring.lineTo(WW / 2, 0);
    add(new T.ExtrudeGeometry(ring, { depth: .08, bevelEnabled: false, curveSegments: 32 }), M.woodDark, [x, WY1, HZ - .2]);
    // 灰塑拱眉 + 两侧托座
    add(mouldGeo, mouldMat, [x, WY1, HZ + .0]);
    for (const sx of [-1, 1]) box(.26, .22, .2, mouldMat, [x + sx * .71, WY1 - .06, HZ + .08]);
    box(.18, .2, .16, mouldMat, [x, WY1 + .78, HZ + .08]);
    box(WW + .3, .09, .3, M.granite, [x, WY0 - .04, HZ + .1]);
  });
  G.WINDOWS = WIN.map(x => new V3(x, 2.4, HZ));

  // 柱 + 柱础 + 梁
  [-7.6, -4.6, -1.6, 1.6, 4.6, 7.6].forEach(x => {
    add(new T.CylinderGeometry(.17, .18, 4.3, 24), M.wood, [x, .45 + 2.15, -8.25]);
    add(new T.CylinderGeometry(.25, .3, .4, 8), M.granite, [x, .65, -8.25]);
    G.circle(x, -8.25, .35);
  });
  box(17.2, .38, .26, M.woodDark, [0, 4.6, -8.25]);
  box(17.2, .2, .2, M.wood, [0, 4.2, -8.25]);
  for (let x = -8; x <= 8; x += 2) box(.12, .5, 3, M.woodDark, [x, 4.95, -9.6]);
  // 灯笼
  [-6.1, -3.1, 3.1, 6.1].forEach(x => {
    add(new T.CylinderGeometry(.008, .008, .5, 6), M.dark, [x, 4.15, -8.25]);
    const l = add(new T.SphereGeometry(.3, 24, 16), new T.MeshPhysicalMaterial({ color: 0xd8281c, roughness: .5, emissive: 0x6a0a04, sheen: 1 }), [x, 3.65, -8.25]);
    l.scale.set(1, .82, 1);
    add(new T.CylinderGeometry(.13, .13, .07, 16), M.gold, [x, 3.92, -8.25]); add(new T.CylinderGeometry(.13, .13, .07, 16), M.gold, [x, 3.39, -8.25]);
    add(new T.CylinderGeometry(.02, .05, .35, 8), M.red, [x, 3.17, -8.25]);
  });
  // 屋面
  const W = 17.1;
  slab(new V3(0, 4.9, -7.45), new V3(0, 7.75, -12.6), W, .2, M.roof);
  slab(new V3(0, 5.0, -15.9), new V3(0, 7.75, -12.6), W, .2, M.roof);
  tileEnds(new V3(-8.5, 4.86, -7.4), new V3(8.5, 4.86, -7.4));
  // 灰塑屋脊
  const rc = G.cv(2048, 128), rx = rc.getContext('2d');
  rx.fillStyle = '#f4efe4'; rx.fillRect(0, 0, 2048, 128);
  for (let i = 0; i < 10; i++) {
    const x0 = 20 + i * 203; rx.fillStyle = ['#2f7aa8', '#2c8a58', '#d8a030'][i % 3]; rx.fillRect(x0, 14, 180, 100);
    rx.fillStyle = '#f6f1e6'; rx.fillRect(x0 + 8, 22, 164, 84);
    for (let k = 0; k < 6; k++) { rx.fillStyle = ['#d83a2a', '#e86a9a', '#f2c230', '#3a9a5a', '#2f6fc0'][(i + k) % 5]; rx.beginPath(); rx.arc(x0 + 25 + k * 26, 64 + Math.sin(k + i) * 16, 9 + (k % 2) * 4, 0, 7); rx.fill(); }
    rx.strokeStyle = '#3a8a4a'; rx.lineWidth = 3; rx.beginPath(); rx.moveTo(x0 + 15, 95); for (let k = 0; k < 6; k++) rx.quadraticCurveTo(x0 + 28 + k * 26, 60, x0 + 40 + k * 26, 90); rx.stroke();
  }
  const ridgePaint = new T.MeshStandardMaterial({ map: G.canvasTex(rc, { repeat: false }), roughness: .7 });
  box(16.8, .8, .5, [M.plaster, M.plaster, M.dark, M.dark, ridgePaint, ridgePaint], [0, 8.1, -12.6]);
  box(17.0, .12, .62, M.greenGlaze, [0, 8.55, -12.6]);
  for (const s of [-1, 1]) { const e = box(.5, 1.4, .5, M.plaster, [s * 8.5, 8.6, -12.6]); e.rotation.z = -s * .35; box(.6, .12, .62, M.greenGlaze, [s * 8.72, 9.28, -12.6]).rotation.z = -s * .35; }
  // 屋脊陶塑公仔
  const figCols = [[0x2f6fc0, 0xe0a020], [0x2c8a58, 0xc8241a], [0xe0a020, 0x2f6fc0], [0xc8241a, 0x2c8a58], [0x7a4a22, 0x2c8a58]];
  for (let i = 0; i < 9; i++) {
    const f = G.makeFigure(figCols[i % 5][0], figCols[i % 5][1], 1.0);
    f.position.set(-6.4 + i * 1.6, 8.61, -12.6); f.rotation.y = (R() - .5) * .6; scene.add(f);
    (G.ridgeFigs = G.ridgeFigs || []).push(f);
  }
  // 镬耳山墙
  [-8.8, 8.8].forEach(xs => {
    const p = new T.Shape(); p.moveTo(7.2, 0); p.lineTo(7.2, 5.1); p.quadraticCurveTo(7.4, 10.6, 11.6, 10.5); p.quadraticCurveTo(15.8, 10.6, 16.1, 5.1); p.lineTo(16.1, 0); p.lineTo(7.2, 0);
    const g = new T.ExtrudeGeometry(p, { depth: .45, bevelEnabled: false, curveSegments: 32 });
    const m = add(g, M.brick, [xs - .225, 0, 0], { rot: [0, PI / 2, 0] });
    // 黑色压顶
    const top = new T.Path(); top.moveTo(7.2, 5.1); top.quadraticCurveTo(7.4, 10.6, 11.6, 10.5); top.quadraticCurveTo(15.8, 10.6, 16.1, 5.1);
    const pts = top.getPoints(40), outer = [], inner = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const n = new V2(-(b.y - a.y), b.x - a.x).normalize();
      outer.push(pts[i].clone().addScaledVector(n, .3)); inner.push(pts[i].clone().addScaledVector(n, -.08));
    }
    const band = new T.Shape(outer.concat(inner.slice().reverse()));
    const bg = new T.ExtrudeGeometry(band, { depth: .66, bevelEnabled: false });
    add(bg, M.dark, [xs - .33, 0, 0], { rot: [0, PI / 2, 0] });
    const wl = new T.Shape(inner.map(v => v.clone()).concat(inner.map(v => v.clone().add(new V2(0, -.18))).reverse()));
    add(new T.ExtrudeGeometry(wl, { depth: .56, bevelEnabled: false }), M.plaster, [xs - .28, 0, 0], { rot: [0, PI / 2, 0] });
    G.block(xs - .3, -16, xs + .3, -7.1);
  });
}

/* ======================= 红阶砖平台 + 小径 ======================= */
function encausticTex() {
  const S = 512, n = 4, t = S / n, c = G.cv(S), x = c.getContext('2d');
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const X = i * t, Y = j * t;
    x.fillStyle = '#efe4cc'; x.fillRect(X, Y, t, t);
    x.fillStyle = '#b8342a'; for (const [cx, cy] of [[0, 0], [t, 0], [0, t], [t, t]]) { x.beginPath(); x.arc(X + cx, Y + cy, t * .36, 0, 7); x.fill(); }
    x.fillStyle = '#efe4cc'; for (const [cx, cy] of [[0, 0], [t, 0], [0, t], [t, t]]) { x.beginPath(); x.arc(X + cx, Y + cy, t * .2, 0, 7); x.fill(); }
    x.fillStyle = '#2f6f5a'; x.beginPath(); x.moveTo(X + t / 2, Y + t * .18); x.lineTo(X + t * .82, Y + t / 2); x.lineTo(X + t / 2, Y + t * .82); x.lineTo(X + t * .18, Y + t / 2); x.fill();
    x.fillStyle = '#e0a830'; x.beginPath(); x.arc(X + t / 2, Y + t / 2, t * .12, 0, 7); x.fill();
    x.strokeStyle = 'rgba(60,40,30,.5)'; x.lineWidth = 2; x.strokeRect(X + 1, Y + 1, t - 2, t - 2);
  }
  G.speck(x, S, S, 14000, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.08)']);
  const tex = G.canvasTex(c); tex.repeat.set(1 / 1.2, 1 / 1.2); return tex;
}
M.huajie = new T.MeshStandardMaterial({ map: encausticTex(), roughness: .35, envMapIntensity: .6 });
box(18, .08, 2.3, [M.granite, M.granite, M.huajie, M.granite, M.granite, M.granite], [0, .04, -6.0]);
G.TERRACE = { x0: -9, x1: 9, z0: -7.15, z1: -4.85 };
G.EAVE_SEG = [new V3(-8.5, 4.86, -7.4), new V3(8.5, 4.86, -7.4)];
G.platform(-9, -7.15, 9, -4.85, .08);
{
  const slabG = G.boxGeo(1.4, .08, .72);
  const path = (x0, z0, x1, z1, w = 1.4) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / .86), ang = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t + (R() - .5) * .06, z = z0 + (z1 - z0) * t;
      const m = add(slabG, M.granite, [x, .03, z], { rot: [0, ang + (R() - .5) * .05, 0] }); m.scale.x = w / 1.4;
    }
  };
  path(0, 14.3, 0, -4.6);
  path(-1.2, 9.5, -7.0, 9.5);
  path(1.2, 4.6, 11.4, 4.6);
  path(-1.2, -1.0, -3.4, .2, 1.1);
}

/* ======================= 方亭（西南，池畔）======================= */
const PAV = new V3(-9.5, 0, 9.6);
{
  const { x, z } = PAV;
  box(4.6, .35, 4.6, [M.granite, M.granite, M.granite, M.granite, M.granite, M.granite], [x, .175, z]);
  G.platform(x - 2.3, z - 2.3, x + 2.3, z + 2.3, .35);
  const C = 1.85;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(new T.CylinderGeometry(.13, .14, 3.1, 20), M.wood, [x + sx * C, .35 + 1.55, z + sz * C]);
    add(new T.CylinderGeometry(.2, .24, .3, 8), M.granite, [x + sx * C, .5, z + sz * C]);
    G.circle(x + sx * C, z + sz * C, .28);
  }
  // 美人靠：北、西、南三面
  const bench = (cx, cz, rotY) => {
    const g = new T.Group(); g.position.set(cx, .35, cz); g.rotation.y = rotY; scene.add(g);
    add(G.boxGeo(3.4, .45, .14), M.woodDark, [0, .225, 0], { parent: g });
    add(G.boxGeo(3.4, .07, .48), M.wood, [0, .48, -.08], { parent: g });
    for (let i = 0; i < 18; i++) { const sl = add(G.boxGeo(.04, .55, .04), M.woodDark, [-1.6 + i * .19, .8, -.38], { parent: g }); sl.rotation.x = -.45; }
    add(G.boxGeo(3.4, .06, .06), M.wood, [0, 1.05, -.5], { parent: g });
  };
  bench(x, z - C, 0); bench(x - C, z, PI / 2); bench(x, z + C, PI);
  G.block(x - 2.25, z - 2.25, x + 2.0, z - 1.55); G.block(x - 2.25, z - 2.25, x - 1.55, z + 2.25); G.block(x - 2.25, z + 1.55, x + 2.0, z + 2.25);
  G.SPOT_LION = new V3(x - C + .25, .84, z);
  // 攒尖屋顶，四角起翘
  const eaveY = 3.55, apexY = 5.6, half = 2.75, lift = .55;
  const roofGeo = () => {
    const pos = [], uv = [], idx = [], N = 14;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let f = 0; f < 4; f++) {
      const a = corners[f], b = corners[(f + 1) % 4], base = pos.length / 3;
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const u = i / N, v = j / N;
        const ex = a[0] + (b[0] - a[0]) * u, ez = a[1] + (b[1] - a[1]) * u;
        const k = Math.pow(Math.abs(u * 2 - 1), 3);
        const s = (1 - v) * half * (1 + k * .06);
        const y = eaveY + (apexY - eaveY) * Math.pow(v, .85) + lift * k * (1 - v) * (1 - v) - .18 * Math.sin(v * PI) * (1 - v);
        pos.push(ex * s, y, ez * s); uv.push(u * half * 2, v * 3.4);
      }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const p = base + j * (N + 1) + i; idx.push(p, p + 1, p + N + 2, p, p + N + 2, p + N + 1); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const rg = roofGeo();
  // 法线朝外：若朝下则翻转
  const top = add(rg, M.roof, [x, 0, z]);
  const under = add(rg, new T.MeshStandardMaterial({ map: M.woodDark.map, color: 0x8a4a35, roughness: .8, side: T.BackSide }), [x, -.02, z], { cast: false });
  if (rg.attributes.normal.getY(0) < 0) { top.material = new T.MeshStandardMaterial().copy(M.roof); top.material.side = T.BackSide; under.material.side = T.FrontSide; }
  for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]])
    tileEnds(new V3(x + ax * half, eaveY - .02, z + az * half), new V3(x + bx * half, eaveY - .02, z + bz * half), .24);
  add(new T.SphereGeometry(.22, 20, 14), M.greenGlaze, [x, apexY + .15, z]);
  add(new T.ConeGeometry(.1, .4, 12), M.gold, [x, apexY + .5, z]);
  box(4.0, .2, .2, M.woodDark, [x, 3.45, z - C]); box(4.0, .2, .2, M.woodDark, [x, 3.45, z + C]);
  box(.2, .2, 4.0, M.woodDark, [x - C, 3.45, z]); box(.2, .2, 4.0, M.woodDark, [x + C, 3.45, z]);
}

/* ======================= 游廊（东）======================= */
{
  const x0 = 11.8, x1 = 14.85, z0 = -9, z1 = 12.5;
  box(x1 - x0, .25, z1 - z0, [M.granite, M.granite, M.tile, M.granite, M.granite, M.granite], [(x0 + x1) / 2, .125, (z0 + z1) / 2]);
  G.platform(x0, z0, x1, z1, .25);
  for (let z = -8.5; z <= 12.1; z += 2.95) {
    add(new T.CylinderGeometry(.12, .13, 3.0, 20), M.wood, [12.1, .25 + 1.5, z]);
    add(new T.CylinderGeometry(.18, .22, .26, 8), M.granite, [12.1, .38, z]);
    G.circle(12.1, z, .25);
    box(.18, .35, .18, M.wood, [12.1, 3.05, z]);
  }
  box(.2, .22, z1 - z0, M.woodDark, [12.1, 3.2, (z0 + z1) / 2]);
  slab(new V3(11.55, 3.35, 1.75), new V3(15.0, 4.2, 1.75), 21.8, .16, M.roof);
  tileEnds(new V3(11.5, 3.32, z0 - .3), new V3(11.5, 3.32, z1 + .3));
  // 石桌 + 石凳
  box(1.1, .09, .75, M.granite, [13.7, .25 + .78, 4.4]); box(.35, .74, .35, M.granite, [13.7, .25 + .37, 4.4]);
  add(new T.CylinderGeometry(.2, .22, .45, 16), M.granite, [13.7, .25 + .225, 3.6]); add(new T.CylinderGeometry(.2, .22, .45, 16), M.granite, [13.7, .25 + .225, 5.2]);
  G.circle(13.7, 4.4, .65);
  G.SPOT_STEAMER = new V3(1.55, .45, 7.2);   // 榕树下石凳上（图纸上睇得到）
  // 坐凳栏杆（面向园子一侧，留出入口）
  for (const [za, zb] of [[-8.5, -2.6], [6.25, 12.1]]) {
    box(.3, .45, zb - za, M.woodDark, [12.1, .25 + .225, (za + zb) / 2]); box(.38, .06, zb - za, M.wood, [12.1, .25 + .48, (za + zb) / 2]);
    G.block(11.9, za, 12.3, zb);
  }
}

/* ======================= 植物 ======================= */
// 叶簇贴图（带 alpha）
function leafCard(draw, size = 256) { const c = G.cv(size), x = c.getContext('2d'); x.clearRect(0, 0, size, size); draw(x, size); const t = G.canvasTex(c, { repeat: false }); return t; }
const leafShape = (x, cx, cy, l, w, a, col) => {
  x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = col;
  x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(w, l * .45, 0, l); x.quadraticCurveTo(-w, l * .45, 0, 0); x.fill();
  x.strokeStyle = 'rgba(255,255,220,.25)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, 2); x.lineTo(0, l - 3); x.stroke(); x.restore();
};
const greens = ['#1f4a1a', '#2a5a20', '#356a26', '#183c14', '#3f7428'];
const TEX = {
  banyan: leafCard((x, s) => { for (let i = 0; i < 70; i++) leafShape(x, 30 + R() * (s - 60), 30 + R() * (s - 60), 26 + R() * 14, 10 + R() * 4, R() * 6.3, greens[R() * 5 | 0]); }),
  shrub: leafCard((x, s) => { for (let i = 0; i < 90; i++) leafShape(x, 25 + R() * (s - 50), 25 + R() * (s - 50), 18 + R() * 10, 7, R() * 6.3, greens[R() * 5 | 0]); }),
  bougain: leafCard((x, s) => {
    for (let i = 0; i < 40; i++) leafShape(x, 30 + R() * (s - 60), 30 + R() * (s - 60), 22, 10, R() * 6.3, greens[R() * 5 | 0]);
    for (let i = 0; i < 70; i++) leafShape(x, 30 + R() * (s - 60), 30 + R() * (s - 60), 18 + R() * 6, 11, R() * 6.3, ['#e0247a', '#c81a6a', '#f0509a', '#d8308a'][R() * 4 | 0]);
  }),
  frangi: leafCard((x, s) => {
    for (let i = 0; i < 18; i++) leafShape(x, s / 2 + (R() - .5) * 60, s / 2 + (R() - .5) * 60, 80 + R() * 30, 22, R() * 6.3, greens[R() * 3 | 0]);
    for (let i = 0; i < 9; i++) {
      const cx = s / 2 + (R() - .5) * 120, cy = s / 2 + (R() - .5) * 120;
      for (let p = 0; p < 5; p++) {
        x.save(); x.translate(cx, cy); x.rotate(p * 1.2566 + i); const gr = x.createLinearGradient(0, 0, 0, 22);
        gr.addColorStop(0, '#f6d040'); gr.addColorStop(.5, '#fffaf0'); gr.addColorStop(1, '#ffffff'); x.fillStyle = gr;
        x.beginPath(); x.ellipse(5, 11, 7, 12, .4, 0, 7); x.fill(); x.restore();
      }
    }
  }),
  bamboo: leafCard((x, s) => { for (let i = 0; i < 60; i++) leafShape(x, 20 + R() * (s - 40), 20 + R() * (s - 40), 50 + R() * 20, 6, R() * 6.3, ['#3a7a2a', '#4a8a30', '#2f6a24', '#5a9038'][R() * 4 | 0]); }),
};
const foliageMats = {};
function foliage(name, center) {
  const m = new T.MeshStandardMaterial({ map: TEX[name], alphaTest: .5, side: T.DoubleSide, roughness: .55, emissive: new T.Color(.012, .022, .006), envMapIntensity: .45 });
  m.onBeforeCompile = s => {
    s.uniforms.cCenter = { value: center }; s.uniforms.uTime = G.time;
    s.vertexShader = 'uniform vec3 cCenter; uniform float uTime;\n' + s.vertexShader
      .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
  { vec3 ip = (instanceMatrix * vec4(position, 1.)).xyz; transformedNormal = normalize(normalMatrix * normalize((ip - cCenter) * vec3(1., 1.8, 1.) + vec3(0., .4, 0.))); }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  { vec3 i0 = (instanceMatrix * vec4(0., 0., 0., 1.)).xyz; float w = sin(uTime * 1.4 + i0.x * .6 + i0.z * .4) * .6 + sin(uTime * 3.1 + i0.y * 1.7) * .25;
    transformed.x += w * .05 * (position.y + .5); transformed.z += w * .03; }`);
    s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
  };
  m.userData.depth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: TEX[name], alphaTest: .5, side: T.DoubleSide });
  return m;
}
function cards(name, center, pts, size) {
  const mat = foliage(name, center);
  const im = new T.InstancedMesh(new T.PlaneGeometry(size, size), mat, pts.length);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  pts.forEach((p, i) => { e.set(R() * 6.3, R() * 6.3, R() * 6.3); q.setFromEuler(e); const s = .7 + R() * .6; im.setMatrixAt(i, m4.compose(p, q, new V3(s, s, s))); });
  im.castShadow = im.receiveShadow = true; im.customDepthMaterial = mat.userData.depth;
  scene.add(im); return im;
}
const shell = (c, r, n, minR = .55) => { const out = []; for (let i = 0; i < n; i++) { const d = new V3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1); if (d.lengthSq() > 1) { i--; continue; } d.normalize().multiplyScalar(minR + (1 - minR) * Math.pow(R(), .4)); out.push(new V3(c.x + d.x * r.x, c.y + d.y * r.y, c.z + d.z * r.z)); } return out; };
const tube = (pts, r0, r1, mat, seg = 24) => {
  const curve = new T.CatmullRomCurve3(pts);
  const g = new T.TubeGeometry(curve, seg, 1, 10, false);
  // 锥化
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const t = Math.floor(i / 11) / seg, c = curve.getPointAt(t), r = r0 + (r1 - r0) * t;
    const v = new V3().fromBufferAttribute(p, i).sub(c).normalize().multiplyScalar(r).add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); G.uvScale(g, 1, 4);
  return add(g, mat);
};

// 大榕树
const BANYAN = new V3(5, 0, 3.5);
{
  const { x, z } = BANYAN;
  const tr = add(new T.CylinderGeometry(.75, 1.25, 4.4, 28, 8), M.bark, [x, 2.2, z]);
  const p = tr.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new V3().fromBufferAttribute(p, i), a = Math.atan2(v.z, v.x); const k = 1 + Math.sin(a * 5 + v.y) * .12 + Math.sin(a * 11) * .05; p.setXYZ(i, v.x * k, v.y, v.z * k); }
  tr.geometry.computeVertexNormals(); G.uvScale(tr.geometry, 3, 2);
  G.circle(x, z, 1.55);
  // 板根
  for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2 + R() * .4, r = 2.2 + R() * 1.2; tube([new V3(x + Math.cos(a) * .6, 1.2, z + Math.sin(a) * .6), new V3(x + Math.cos(a) * 1.3, .3, z + Math.sin(a) * 1.3), new V3(x + Math.cos(a) * r, -.05, z + Math.sin(a) * r)], .32, .06, M.bark, 12); }
  // 枝干 + 气根
  const rootM = new T.MeshStandardMaterial({ color: 0x4a3a2c, roughness: .9 });
  const roots = [];   // [x, topY, z, len, radius]
  const tips = [];
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * PI * 2 + R() * .5, r = 4 + R() * 2.6, h = 6 + R() * 1.6;
    const pts = [new V3(x, 3.6 + R() * .6, z), new V3(x + Math.cos(a) * r * .4, 5 + R(), z + Math.sin(a) * r * .4), new V3(x + Math.cos(a) * r, h, z + Math.sin(a) * r)];
    tube(pts, .38, .08, M.bark, 16); tips.push(pts[2], pts[1]);
    for (let k = 0; k < 4; k++) {
      const t = .45 + R() * .5, px = x + Math.cos(a) * r * t, pz = z + Math.sin(a) * r * t, py = 4.6 + (h - 4.6) * t;
      const len = 1.5 + R() * (py - 1.5), bx = px + (R() - .5) * .3, bz = pz + (R() - .5) * .3, n = 1 + (R() * 3 | 0);
      for (let b = 0; b < n; b++) roots.push([bx + (R() - .5) * .07, py, bz + (R() - .5) * .07, len * (.75 + R() * .25), .006 + R() * .008]);
    }
  }
  // 气根：合并成一个几何体；每个顶点带「离挂点距离」同「随机种子」，喺 shader 入面随风飘
  {
    const pos = [], nor = [], uv = [], hang = [], seed = [], idx = [];
    for (const [rx, top, rz, len, rad] of roots) {
      const SEG = 14, RAD = 5, base = pos.length / 3, sd = R() * 100;
      const cx = (R() - .5) * .12, cz = (R() - .5) * .12;          // 自然微弯
      for (let j = 0; j <= SEG; j++) {
        const t = j / SEG, r = rad * (1 - t * .75) + .002, y = top - len * t;
        const ox = cx * Math.sin(t * PI), oz = cz * Math.sin(t * PI);
        for (let k = 0; k <= RAD; k++) {
          const a = k / RAD * PI * 2, c = Math.cos(a), s2 = Math.sin(a);
          pos.push(rx + ox + c * r, y, rz + oz + s2 * r); nor.push(c, 0, s2); uv.push(k / RAD, t * len * 2);
          hang.push(len * t); seed.push(sd);
        }
      }
      for (let j = 0; j < SEG; j++) for (let k = 0; k < RAD; k++) { const a = base + j * (RAD + 1) + k, b = a + RAD + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('aHang', new T.Float32BufferAttribute(hang, 1)); g.setAttribute('aSeed', new T.Float32BufferAttribute(seed, 1)); g.setIndex(idx);
    const sway = `
      attribute float aHang; attribute float aSeed; uniform float uTime;
      vec3 rootSway(vec3 p) {
        // 微风：单一方向（由东南吹嚟），一阵阵慢慢起、慢慢落，中间有停歇；只会顺风飘起再返原位
        const vec2 dir = vec2(-.62, -.78);
        float w = sin(uTime * .42 + p.x * .05 + p.z * .03);            // 风由一边扫过另一边，稍有先后
        float gust = smoothstep(.15, 1., w);                            // 0 ~ 1，负半周 = 停风
        gust *= .8 + .2 * sin(uTime * 1.1 + aSeed);                     // 每条根略有差异
        float k = pow(aHang, 1.3);                                      // 挂点唔郁，越落越飘
        float amt = gust * .028 * k;                                    // 4m 长嘅根末端约 0.15 ~ 0.2m
        p.xz += dir * amt;
        p.y += amt * amt / max(aHang, .1) * .6;                         // 飘起时下端微微抬
        return p;
      }`;
    const inject = sh => {
      sh.uniforms.uTime = G.time;
      sh.vertexShader = sway + '\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = rootSway(transformed);');
    };
    rootM.onBeforeCompile = inject;
    const dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }); dm.onBeforeCompile = inject;
    const rm = add(g, rootM, null, { cast: false });   // 阴影贴图系静态，飘动嘅细根唔投影，免得影同根对唔上
    rm.customDepthMaterial = dm; rm.frustumCulled = false;
  }
  const pts = shell(new V3(x, 7.6, z), new V3(7.2, 2.4, 7.2), G.LO ? 700 : 1300, .6);
  tips.forEach(t => { for (let i = 0; i < 60; i++) pts.push(t.clone().add(new V3((R() - .5) * 2.6, (R() - .3) * 1.6, (R() - .5) * 2.6))); });
  G.banyanLeaves = cards('banyan', new V3(x, 5.8, z), pts, 1.5);
  G.SPOT_FAN = new V3(x + .55, .02, z + 1.55);
}

// 鸡蛋花（主厅东侧阶前）
{
  const c = new V3(9.6, 0, -3.6);
  add(new T.CylinderGeometry(.14, .2, 1.6, 12), M.bark, [c.x, .8, c.z]);
  G.circle(c.x, c.z, .35);
  const tips = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * PI * 2 + R() * .5, r = 1.2 + R() * .8;
    const p = [new V3(c.x, 1.5, c.z), new V3(c.x + Math.cos(a) * r * .5, 2.2, c.z + Math.sin(a) * r * .5), new V3(c.x + Math.cos(a) * r, 2.9 + R() * .5, c.z + Math.sin(a) * r)];
    tube(p, .1, .05, new T.MeshStandardMaterial({ map: M.bark.map, normalMap: M.bark.normalMap, color: 0x9a948a, roughness: .9 }), 10); tips.push(p[2]);
  }
  const pts = []; tips.forEach(t => { for (let i = 0; i < 9; i++) pts.push(t.clone().add(new V3((R() - .5) * .8, R() * .5, (R() - .5) * .8))); });
  cards('frangi', new V3(c.x, 2.6, c.z), pts, .9);
}

// 簕杜鹃：南墙头 + 月洞门上方 + 游廊屋面
{
  const pts = [];
  for (const [xa, xb] of [[-12, -2.2], [2.2, 12]]) for (let i = 0; i < 140; i++) { const x = xa + R() * (xb - xa); pts.push(new V3(x, WALL_H + (R() - .6) * 1.6, 14.75 - R() * .7)); }
  for (let i = 0; i < 60; i++) { const a = R() * PI; pts.push(new V3(Math.cos(a) * 1.9, 1.5 + Math.sin(a) * 2.0 + R() * .4, 14.7 - R() * .5)); }
  for (let i = 0; i < 90; i++) pts.push(new V3(12.2 + R() * 2.5, 3.6 + R() * .9, -8 + R() * 7));
  cards('bougain', new V3(0, 2.5, 13), pts, .85);
}

// 芭蕉
function bananaTex() {
  const c = G.cv(128, 512), x = c.getContext('2d'); x.clearRect(0, 0, 128, 512);
  const gr = x.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, '#2a6020'); gr.addColorStop(.5, '#4a8a2c'); gr.addColorStop(1, '#2a6020');
  x.fillStyle = gr; x.beginPath(); x.moveTo(64, 0); x.quadraticCurveTo(140, 200, 64, 512); x.quadraticCurveTo(-12, 200, 64, 0); x.fill();
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) { const y = 80 + R() * 400, s = R() < .5 ? -1 : 1; x.beginPath(); x.moveTo(64 + s * 6, y); x.lineTo(64 + s * 80, y - 14); x.lineTo(64 + s * 80, y - 8); x.fill(); x.lineWidth = 2; x.stroke(); }
  x.globalCompositeOperation = 'source-over';
  x.strokeStyle = 'rgba(230,240,180,.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(64, 0); x.lineTo(64, 512); x.stroke();
  x.strokeStyle = 'rgba(30,70,20,.3)'; x.lineWidth = 1; for (let y = 10; y < 512; y += 8) { x.beginPath(); x.moveTo(64, y); x.lineTo(4, y - 18); x.moveTo(64, y); x.lineTo(124, y - 18); x.stroke(); }
  return G.canvasTex(c, { repeat: false });
}
{
  const bt = bananaTex();
  const bm = new T.MeshStandardMaterial({ map: bt, alphaTest: .5, side: T.DoubleSide, roughness: .55, emissive: new T.Color(.03, .07, .02) });
  const bd = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: bt, alphaTest: .5 });
  const stem = new T.MeshStandardMaterial({ color: 0x3a4a22, roughness: .8 });
  const plant = (x, z, h) => {
    add(new T.CylinderGeometry(.09, .15, h, 10), stem, [x, h / 2, z]); G.circle(x, z, .35);
    for (let i = 0; i < 8; i++) {
      const g = new T.PlaneGeometry(.95, 2.4, 2, 14); g.translate(0, 1.2, 0);
      const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, Math.pow(y / 2.4, 2) * 1.7 - Math.abs(p.getX(k)) * .2); }
      g.computeVertexNormals();
      const m = add(g, bm, [x, h - .1 - R() * .4, z], { rot: [.45 + R() * .45, i / 8 * PI * 2 + R() * .3, 0] });
      m.rotation.order = 'YXZ'; m.customDepthMaterial = bd;
    }
  };
  plant(-13.6, 12.8, 2.2); { const bb = G.makeBananaBunch(); bb.position.set(-13.15, 2.0, 12.45); scene.add(bb); G.BANANA = new V3(-13.3, 1.7, 12.6); G.BANANA_OBJ = bb; } plant(-12.6, 13.5, 1.8); plant(-13.7, -11.6, 2.4); plant(13.4, 13.6, 2.0); plant(-11.2, -13.6, 2.1); plant(11.0, -13.7, 1.9);
}

// 墙外竹林 + 远处树冠（天际线）
{
  const stemM = new T.MeshStandardMaterial({ color: 0x6a9a3a, roughness: .5 });
  const pts = [];
  const grove = (cx, cz, rx, rz, n, hmax) => {
    for (let i = 0; i < n; i++) {
      const x = cx + (R() - .5) * rx, z = cz + (R() - .5) * rz, h = hmax * (.6 + R() * .4);
      add(new T.CylinderGeometry(.03, .045, h, 6), stemM, [x, h / 2, z], { recv: false });
      for (let k = 0; k < 8; k++) pts.push(new V3(x + (R() - .5) * 1.4, h * (.55 + R() * .45), z + (R() - .5) * 1.4));
    }
  };
  grove(0, 18.5, 9, 3, 40, 8); grove(-18, 2, 3, 26, 50, 9); grove(18, -6, 3, 14, 30, 8); grove(-10, -18, 10, 3, 26, 9);
  cards('bamboo', new V3(0, 5, 0), pts, 1.2);
  // 远树
  const far = [];
  [[22, -22], [-24, -20], [26, 14], [-24, 22], [10, -26], [-6, 26]].forEach(([x, z]) => { far.push(...shell(new V3(x, 9, z), new V3(5, 4, 5), 220, .5)); add(new T.CylinderGeometry(.4, .6, 8, 10), M.bark, [x, 4, z]); });
  cards('banyan', new V3(0, 8, 0), far, 2.2);
  // 院外屋顶
  [[-8, -21, 10], [9, -21, 9], [21, 4, 8]].forEach(([x, z, w]) => {
    box(w, 5, 6, M.plaster, [x, 2.5, z]);
    slab(new V3(x, 5, z + 3.2), new V3(x, 7, z), w, .2, M.roof); slab(new V3(x, 5, z - 3.2), new V3(x, 7, z), w, .2, M.roof);
  });
}

// 盆栽（阶前）
{
  const potM = [new T.MeshPhysicalMaterial({ color: 0x1f4fa0, roughness: .2, clearcoat: 1 }), new T.MeshPhysicalMaterial({ color: 0x2c8a58, roughness: .2, clearcoat: 1 }), new T.MeshPhysicalMaterial({ color: 0xc8701a, roughness: .25, clearcoat: 1 })];
  const potG = new T.LatheGeometry([[0, 0], [.2, 0], [.24, .05], [.32, .45], [.36, .5], [.3, .52], [0, .48]].map(p => new V2(p[0], p[1])), 32);
  const pts = [];
  [[-7, -4.6], [-5, -4.6], [5, -4.6], [7, -4.6], [11.2, 12.6], [-1.6, 13.4], [1.6, 13.4]].forEach(([x, z], i) => {
    add(potG, potM[i % 3], [x, .0, z]); G.circle(x, z, .45);
    for (let k = 0; k < 14; k++) pts.push(new V3(x + (R() - .5) * .7, .75 + R() * .6, z + (R() - .5) * .7));
  });
  cards('shrub', new V3(0, 1, 0), pts, .7);
  // 榕树下石凳
  box(1.8, .45, .5, M.granite, [1.9, .225, 7.2]); G.block(1, 6.95, 2.8, 7.45);
  // 太师椅一对 + 茶几（廊下，两扇满洲窗之间）
  const TX = -6.1;   // 西侧满洲窗下，两柱之间
  G.TAISHI = new V3(TX, .45, -10.45);
  for (const dx of [-.72, .72]) { const ch = G.makeTaishi(); ch.position.set(TX + dx, .45, -10.45); scene.add(ch); G.block(TX + dx - .35, -10.75, TX + dx + .35, -10.15); }
  box(.5, .7, .45, M.woodDark, [TX, .45 + .35, -10.55]);
  G.TAISHI_OBJS = [];
  // 盆景台
  box(.7, .6, .45, M.granite, [-3.3, .38, -5.9]); G.block(-3.7, -6.15, -2.9, -5.65);
  G.SPOT_BONSAI = new V3(-3.3, .68, -5.9);
  G.SPOT_STOOL = new V3(3.15, 0, 6.2);
  G.SPOT_UMBRELLA = new V3(PAV.x + 3.0, 0, PAV.z + .9);   // 亭边晒遮
}

/* ======================= 碰撞边界 ======================= */
G.BOUNDS = { x0: -14.55, x1: 14.55, z0: -14.55, z1: 14.55 };
G.SPAWN = { pos: new V3(0, 0, 12.6), yaw: 0 };
G.SPOT_CLOGS = new V3(-4.5, .12, .25);
G.buildDepthList();
})();
