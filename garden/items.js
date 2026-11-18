/* 岭南寻物 · 六件宝物（程序建模）+ 屋脊陶塑公仔。每个构造函数返回一个 Group，原点在物件底部中心。 */
(() => {
'use strict';
const T = THREE, V2 = T.Vector2, PI = Math.PI, PI2 = Math.PI / 2;
const glaze = (color, o = {}) => new T.MeshPhysicalMaterial(Object.assign({ color, roughness: .22, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1 }, o));
const lathe = (pts, seg = 40) => new T.LatheGeometry(pts.map(p => new V2(p[0], p[1])), seg);
const mesh = (g, m, parent, pos, rot, scl) => {
  const o = new T.Mesh(g, m); o.castShadow = o.receiveShadow = true;
  if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); if (scl) o.scale.set(...scl);
  parent.add(o); return o;
};

/* ---------- 石湾公仔：釉色浑厚的老翁 ---------- */
G.makeFigure = (robe = 0x6b4a2a, accent = 0x2f6f5a, scale = 1) => {
  const g = new T.Group();
  const skin = new T.MeshPhysicalMaterial({ color: 0xb98a62, roughness: .7 });     // 石湾素胎露胎
  mesh(lathe([[0, 0], [.17, 0], [.19, .04], [.16, .2], [.13, .38], [.09, .5], [0, .52]]), glaze(robe), g);
  mesh(new T.TorusGeometry(.12, .035, 10, 24), glaze(accent), g, [0, .43, 0], [Math.PI / 2, 0, 0]);
  mesh(new T.SphereGeometry(.085, 24, 16), skin, g, [0, .6, 0]);
  mesh(new T.ConeGeometry(.06, .16, 12), new T.MeshStandardMaterial({ color: 0xf2efe6, roughness: .6 }), g, [0, .5, .06], [Math.PI, 0, 0]);
  mesh(new T.SphereGeometry(.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), glaze(accent), g, [0, .63, 0], null, [1, .6, 1]);
  mesh(new T.CylinderGeometry(.012, .012, .7, 8), new T.MeshStandardMaterial({ color: 0x5a3a1e, roughness: .6 }), g, [.18, .35, .05], [0, 0, -.12]);
  mesh(new T.SphereGeometry(.035, 12, 8), glaze(0xd8a020), g, [.22, .7, .05]);
  g.scale.setScalar(scale);
  return g;
};

/* ---------- 醒狮头 ---------- */
function lionTex() {
  const c = G.cv(512, 256), x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#d8261c'); gr.addColorStop(.45, '#e8462a'); gr.addColorStop(.55, '#f2c230'); gr.addColorStop(1, '#2f8f4e');
  x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
  x.strokeStyle = '#ffe28a'; x.lineWidth = 6;
  for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(i * 64, 128, 40, Math.PI, 0); x.stroke(); }
  x.fillStyle = '#1a1a1a'; for (let i = 0; i < 16; i++) { x.beginPath(); x.arc(16 + i * 32, 60, 6, 0, 7); x.fill(); }
  return G.canvasTex(c, { repeat: false });
}
G.makeLion = () => {
  const g = new T.Group();
  const head = mesh(new T.SphereGeometry(.3, 40, 28), glaze(0xffffff, { map: lionTex(), roughness: .35 }), g, [0, .3, 0], null, [1.1, .9, 1]);
  const white = new T.MeshStandardMaterial({ color: 0xfaf6ee, roughness: .9 });
  mesh(new T.TorusGeometry(.3, .05, 12, 40, Math.PI * 1.4), white, g, [0, .32, .12], [0, 0, -.2 + Math.PI * -.2], [1.1, .95, 1]);
  for (const s of [-1, 1]) {
    mesh(new T.SphereGeometry(.075, 20, 14), new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: .1, clearcoat: 1 }), g, [s * .12, .42, .24]);
    mesh(new T.SphereGeometry(.04, 16, 10), new T.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: .05, clearcoat: 1 }), g, [s * .12, .42, .3]);
    mesh(new T.SphereGeometry(.085, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), glaze(0x2f8f4e), g, [s * .12, .45, .24], [-.5, 0, 0]);
    mesh(new T.ConeGeometry(.06, .16, 12), glaze(0xf2c230), g, [s * .2, .58, .02], [0, 0, -s * .5]);
  }
  mesh(new T.ConeGeometry(.04, .2, 12), glaze(0xf2c230, { metalness: .5 }), g, [0, .64, .12], [.4, 0, 0]);
  mesh(new T.CircleGeometry(.045, 24), new T.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .05 }), g, [0, .53, .27], [-.4, 0, 0]);
  const mouth = mesh(new T.SphereGeometry(.16, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new T.MeshStandardMaterial({ color: 0x5a0d0d, roughness: .6, side: T.DoubleSide }), g, [0, .22, .18], [.3, 0, 0], [1.1, .6, .8]);
  mesh(new T.TorusGeometry(.16, .025, 8, 24, Math.PI), glaze(0xffffff), g, [0, .22, .24], [Math.PI, 0, 0], [1.1, .5, 1]);
  for (let i = 0; i < 9; i++) mesh(new T.SphereGeometry(.035, 8, 6), white, g, [Math.cos(i / 8 * Math.PI) * .3, .2 + Math.sin(i / 8 * Math.PI) * -.08, .22]);
  // 白眉、胡须、彩色绒球
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) mesh(new T.SphereGeometry(.03, 8, 6), white, g, [s * (.05 + i * .035), .52 + Math.sin(i / 5 * Math.PI) * .03, .26 - i * .012]);
  for (let i = 0; i < 14; i++) mesh(new T.SphereGeometry(.03 + Math.random() * .015, 8, 6), white, g, [(Math.random() - .5) * .22, .08 + Math.random() * .06, .2 + Math.random() * .05]);
  const pom = [0xe8302a, 0xf2c230, 0x2f8f4e, 0x2f6fc0, 0xe86aa0];
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - .5) * 2.2;
    mesh(new T.SphereGeometry(.045, 14, 10), new T.MeshStandardMaterial({ color: pom[i % 5], roughness: 1 }), g, [Math.sin(a) * .3, .52 + Math.cos(a) * .12, -.02 + Math.cos(a) * .05]);
  }
  return g;
};

/* ---------- 广彩瓷杯 + 碟 ---------- */
function guangcaiTex() {
  const c = G.cv(1024, 256), x = c.getContext('2d');
  x.fillStyle = '#fbf8f1'; x.fillRect(0, 0, 1024, 256);
  const band = (y, h, col) => { x.fillStyle = col; x.fillRect(0, y, 1024, h); };
  band(16, 10, '#c9982e'); band(210, 8, '#c9982e'); band(30, 22, '#b9271c');
  for (let i = 0; i < 64; i++) { x.fillStyle = i % 2 ? '#2f7d4a' : '#c9982e'; x.fillRect(i * 16, 33, 8, 16); }
  for (let i = 0; i < 6; i++) {
    const cx = 85 + i * 170, cy = 135;
    for (let p = 0; p < 6; p++) { x.fillStyle = ['#d8352a', '#e86a8a', '#e04a3a'][i % 3]; x.beginPath(); x.ellipse(cx + Math.cos(p) * 22, cy + Math.sin(p) * 22, 20, 12, p, 0, 7); x.fill(); }
    x.fillStyle = '#f2c230'; x.beginPath(); x.arc(cx, cy, 10, 0, 7); x.fill();
    x.strokeStyle = '#2f7d4a'; x.lineWidth = 5;
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 30, cy + 10); x.quadraticCurveTo(cx + s * 70, cy - 30, cx + s * 80, cy + 20); x.stroke(); }
    x.strokeStyle = '#c9982e'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 52, 0, 7); x.stroke();
  }
  return G.canvasTex(c);
}
G.makeCup = () => {
  const g = new T.Group();
  const m = glaze(0xffffff, { map: guangcaiTex(), side: T.DoubleSide });
  mesh(lathe([[0, .012], [.18, .012], [.2, .02], [.205, .028], [.1, .03], [0, .03]]), glaze(0xfbf8f1, { side: T.DoubleSide }), g);
  mesh(lathe([[0, .03], [.04, .03], [.045, .04], [.07, .06], [.085, .12], [.09, .135], [.083, .135], [.078, .12], [.062, .06], [0, .05]]), m, g);
  mesh(new T.TorusGeometry(.04, .009, 8, 20, Math.PI * 1.2), glaze(0xc9982e, { metalness: .6 }), g, [.095, .09, 0], [0, 0, -Math.PI * .6]);
  return g;
};

/* ---------- 木屐（一对）---------- */
G.makeClogs = () => {
  const g = new T.Group();
  const wood = G.phMat('wood', { color: 0xd8a070, roughness: .55 });
  const s = new T.Shape(); s.absellipse(0, 0, .055, .13, 0, Math.PI * 2);
  const sole = new T.ExtrudeGeometry(s, { depth: .03, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2 });
  sole.rotateX(-Math.PI / 2);
  const strap = new T.MeshPhysicalMaterial({ color: 0xc0201a, roughness: .35, clearcoat: .6 });
  for (const [x, rz, ry] of [[0, 0, .2]]) {
    const c = new T.Group(); c.position.set(x, 0, rz); c.rotation.y = ry; g.add(c);
    mesh(sole, wood, c, [0, .045, 0]);
    mesh(G.boxGeo(.09, .04, .03), wood, c, [0, .02, -.07]);
    mesh(G.boxGeo(.09, .04, .03), wood, c, [0, .02, .07]);
    mesh(new T.TorusGeometry(.055, .014, 8, 20, Math.PI), strap, c, [0, .08, .03], [0, Math.PI / 2, 0], [1, .6, 1]);
  }
  return g;
};

/* ---------- 新会葵扇 ---------- */
function fanTex() {
  const c = G.cv(512), x = c.getContext('2d');
  x.clearRect(0, 0, 512, 512);
  const gr = x.createRadialGradient(256, 400, 20, 256, 300, 250);
  gr.addColorStop(0, '#e9cf92'); gr.addColorStop(1, '#c79d58');
  x.fillStyle = gr; x.beginPath(); x.ellipse(256, 250, 240, 230, 0, 0, 7); x.fill();
  x.strokeStyle = 'rgba(120,80,30,.55)'; x.lineWidth = 2;
  for (let a = -2.6; a <= -.5; a += .06) { x.beginPath(); x.moveTo(256, 430); x.lineTo(256 + Math.cos(a) * 420, 430 + Math.sin(a) * 420); x.stroke(); }
  x.strokeStyle = '#6a3d1a'; x.lineWidth = 16; x.beginPath(); x.ellipse(256, 250, 232, 222, 0, 0, 7); x.stroke();
  x.fillStyle = '#b8261c'; x.beginPath(); x.arc(256, 300, 26, 0, 7); x.fill();
  x.fillStyle = '#f5e2b0'; x.font = `40px ${G.BRUSH}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('福', 256, 301);
  const t = G.canvasTex(c, { repeat: false }); return t;
}
G.makeFan = () => {
  const g = new T.Group();
  const leaf = new T.MeshStandardMaterial({ map: fanTex(), transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .8 });
  const p = mesh(new T.PlaneGeometry(.5, .5, 8, 8), leaf, g, [0, .38, 0]);
  const pos = p.geometry.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, -Math.pow(pos.getX(i) * 2, 2) * .03);
  p.geometry.computeVertexNormals();
  p.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: leaf.map, alphaTest: .4 });
  mesh(new T.CylinderGeometry(.012, .015, .3, 10), new T.MeshStandardMaterial({ color: 0x8a5a2a, roughness: .5 }), g, [0, .1, 0]);
  return g;
};

/* ---------- 竹蒸笼（会冒烟）---------- */
function bambooTex() {
  const c = G.cv(512, 128), x = c.getContext('2d');
  x.fillStyle = '#d9b26e'; x.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 512; i += 8) { x.fillStyle = i % 16 ? 'rgba(140,95,40,.35)' : 'rgba(255,240,200,.25)'; x.fillRect(i, 0, 3, 128); }
  x.fillStyle = 'rgba(110,70,30,.6)'; x.fillRect(0, 0, 512, 10); x.fillRect(0, 118, 512, 10);
  return G.canvasTex(c);
}
G.makeSteamer = () => {
  const g = new T.Group();
  const m = new T.MeshStandardMaterial({ map: bambooTex(), roughness: .75 });
  const top = new T.MeshStandardMaterial({ color: 0xc89a55, roughness: .8 });
  mesh(new T.CylinderGeometry(.17, .17, .09, 40, 1, true), m, g, [0, .045, 0]);
  mesh(new T.CylinderGeometry(.172, .172, .09, 40, 1, true), m, g, [0, .135, 0]);
  mesh(new T.CircleGeometry(.17, 40), top, g, [0, .09, 0], [-Math.PI / 2, 0, 0]);
  mesh(new T.SphereGeometry(.175, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), m, g, [0, .18, 0], null, [1, .35, 1]);
  mesh(new T.TorusGeometry(.025, .008, 8, 16), top, g, [0, .23, 0], [Math.PI / 2, 0, 0]);
  // 下面垫一个小碟，里面两只虾饺
  mesh(lathe([[0, 0], [.2, 0], [.22, .015], [0, .015]]), glaze(0xf6f2ea), g, [.33, 0, .05]);
  for (const dx of [-.05, .05]) mesh(new T.SphereGeometry(.045, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshPhysicalMaterial({ color: 0xf3e6d6, roughness: .3, transmission: .3, thickness: .05 }), g, [.33 + dx, .015, .05], null, [1, 1, .7]);
  g.userData.steam = true;
  return g;
};

/* ---------- 油纸遮（打开，斜放）---------- */
function umbrellaTex() {
  const c = G.cv(512), x = c.getContext('2d'), R = G.mulberry(5);
  x.fillStyle = '#e8b23a'; x.fillRect(0, 0, 512, 512);
  const g = x.createRadialGradient(256, 256, 30, 256, 256, 256); g.addColorStop(0, 'rgba(180,40,30,.0)'); g.addColorStop(.8, 'rgba(180,40,30,.0)'); g.addColorStop(.82, '#b8261c'); g.addColorStop(1, '#8a1810');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9; i++) {           // 花
    const a = R() * 6.28, r = 60 + R() * 120, cx = 256 + Math.cos(a) * r, cy = 256 + Math.sin(a) * r;
    for (let p = 0; p < 5; p++) { x.fillStyle = ['#d83a2a', '#e86a9a', '#f6f0e0'][i % 3]; x.beginPath(); x.ellipse(cx + Math.cos(p * 1.256) * 12, cy + Math.sin(p * 1.256) * 12, 12, 7, p * 1.256, 0, 7); x.fill(); }
    x.fillStyle = '#2f6f3a'; x.beginPath(); x.ellipse(cx + 22, cy + 10, 16, 6, .6, 0, 7); x.fill();
  }
  x.strokeStyle = 'rgba(90,50,20,.55)'; x.lineWidth = 2;
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(a) * 256, 256 + Math.sin(a) * 256); x.stroke(); }
  return G.canvasTex(c, { repeat: false });
}
G.makeUmbrella = () => {
  const g = new T.Group(), top = new T.Group(); g.add(top);
  const geo = new T.ConeGeometry(.55, .2, 24, 1, true);
  const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const px = pos.getX(i), pz = pos.getZ(i); uv.setXY(i, .5 + px / 1.1, .5 + pz / 1.1); }
  mesh(geo, new T.MeshPhysicalMaterial({ map: umbrellaTex(), side: T.DoubleSide, roughness: .45, clearcoat: .4, transmission: .0 }), top, [0, .7, 0]);
  mesh(new T.CylinderGeometry(.012, .012, .82, 8), new T.MeshStandardMaterial({ color: 0x6a4020, roughness: .6 }), top, [0, .41, 0]);
  mesh(new T.SphereGeometry(.03, 10, 8), new T.MeshStandardMaterial({ color: 0x3a2010 }), top, [0, .81, 0]);
  top.rotation.z = 1.05; top.position.y = .08;
  return g;
};

/* ---------- 担凳仔 ---------- */
G.makeStool = () => {
  const g = new T.Group(), w = G.phMat('wood', { color: 0xe0a070 });
  mesh(G.boxGeo(.46, .045, .2), w, g, [0, .3, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = mesh(G.boxGeo(.035, .31, .035), w, g, [sx * .17, .15, sz * .06]); l.rotation.z = sx * .12; l.rotation.x = -sz * .1; }
  mesh(G.boxGeo(.36, .03, .03), w, g, [0, .12, 0]);
  return g;
};

/* ---------- 树仔头（盆景）：渐细扭曲嘅树干 + 小叶云片 + 釉面长方盆 ---------- */
function taperTube(pts, r0, r1, mat, parent, seg = 18) {
  const curve = new T.CatmullRomCurve3(pts), g = new T.TubeGeometry(curve, seg, 1, 8, false), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = Math.floor(i / 9) / seg, c = curve.getPointAt(t), r = r0 + (r1 - r0) * Math.pow(t, .8);
    const v = new T.Vector3().fromBufferAttribute(p, i).sub(c).normalize().multiplyScalar(r * (1 + .12 * Math.sin(i * 1.7))).add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); G.uvScale(g, .3, 1.5);
  return mesh(g, mat, parent);
}
let bonsaiLeafTex = null;
function bonsaiLeaves() {
  if (bonsaiLeafTex) return bonsaiLeafTex;
  const c = G.cv(128), x = c.getContext('2d'), R = G.mulberry(77);
  x.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 46; i++) {
    const cx = 14 + R() * 100, cy = 14 + R() * 100, a = R() * 6.3, l = 10 + R() * 7;
    x.save(); x.translate(cx, cy); x.rotate(a);
    x.fillStyle = ['#17321a', '#1f4220', '#284e22', '#2f5a28', '#3a6630'][R() * 5 | 0];
    x.beginPath(); x.ellipse(0, 0, l * .45, l, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(200,230,150,.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, -l * .8); x.lineTo(0, l * .8); x.stroke();
    x.restore();
  }
  return bonsaiLeafTex = G.canvasTex(c, { repeat: false });
}
G.makeBonsai = () => {
  const g = new T.Group(), R = G.mulberry(4242);
  // 盆：圆角长方、釉面、四只小脚
  const glaze = new T.MeshPhysicalMaterial({ color: 0x16304a, roughness: .22, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: .7 });
  const rr = new T.Shape(), w = .27, d = .17, r = .03;
  rr.moveTo(-w + r, -d); rr.lineTo(w - r, -d); rr.quadraticCurveTo(w, -d, w, -d + r); rr.lineTo(w, d - r); rr.quadraticCurveTo(w, d, w - r, d); rr.lineTo(-w + r, d); rr.quadraticCurveTo(-w, d, -w, d - r); rr.lineTo(-w, -d + r); rr.quadraticCurveTo(-w, -d, -w + r, -d);
  const pot = new T.ExtrudeGeometry(rr, { depth: .11, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3 });
  pot.rotateX(-PI2); pot.translate(0, .03, 0);
  mesh(pot, glaze, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(new T.CylinderGeometry(.018, .022, .03, 10), glaze, g, [sx * .22, .015, sz * .12]);
  mesh(G.boxGeo(.52, .012, .32), new T.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 1 }), g, [0, .148, 0]);
  const moss = new T.MeshStandardMaterial({ color: 0x2c4418, roughness: 1, envMapIntensity: .2 });
  for (let i = 0; i < 9; i++) mesh(new T.SphereGeometry(.03 + R() * .03, 10, 6), moss, g, [(R() - .5) * .42, .15, (R() - .5) * .24], null, [1, .25, 1]);
  const peb = new T.MeshStandardMaterial({ color: 0xb8b0a2, roughness: .7 });
  for (let i = 0; i < 6; i++) mesh(new T.SphereGeometry(.012 + R() * .01, 8, 6), peb, g, [(R() - .5) * .4, .155, (R() - .5) * .22], null, [1, .6, 1]);
  // 树干 + 枝
  const bark = G.phMat('bark', { color: 0x7a6858, roughness: .95 });
  const V = (x, y, z) => new T.Vector3(x, y, z);
  taperTube([V(-.06, .14, 0), V(-.03, .24, .02), V(.07, .32, -.01), V(.02, .42, .02), V(-.06, .5, 0), V(-.02, .58, -.02)], .045, .014, bark, g);
  mesh(new T.SphereGeometry(.05, 10, 8), bark, g, [-.06, .15, 0], null, [1.4, .5, 1.1]);   // 根盘
  const branches = [
    [V(.06, .32, -.01), V(.15, .36, .0), V(.24, .35, .03)],
    [V(.03, .41, .02), V(-.08, .44, .04), V(-.18, .43, .02)],
    [V(-.05, .5, 0), V(.04, .55, -.03), V(.13, .57, -.02)],
    [V(-.02, .57, -.02), V(-.08, .63, 0), V(-.1, .68, .01)],
  ];
  branches.forEach(b => taperTube(b, .016, .006, bark, g, 10));
  // 叶云片：每个枝顶一片扁平嘅叶团，由好多小叶卡片组成
  const tex = bonsaiLeaves();
  const lm = new T.MeshStandardMaterial({ map: tex, alphaTest: .5, side: T.DoubleSide, roughness: .6, emissive: new T.Color(.02, .04, .01) });
  lm.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);'); };
  const pads = [[V(.25, .37, .03), .11], [V(-.19, .45, .02), .1], [V(.13, .59, -.02), .1], [V(-.1, .7, .01), .085], [V(.0, .62, .0), .07]];
  const card = new T.PlaneGeometry(.07, .07);
  const N = pads.length * 70, im = new T.InstancedMesh(card, lm, N), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  let k = 0;
  for (const [c, rad] of pads) for (let i = 0; i < 70; i++) {
    const a = R() * PI * 2, rr2 = Math.sqrt(R()) * rad;
    const p = V(c.x + Math.cos(a) * rr2, c.y + (R() - .3) * .035 * (1 - rr2 / rad + .3), c.z + Math.sin(a) * rr2 * .75);
    e.set(-PI2 + (R() - .5) * 1.1, R() * 6.3, (R() - .5) * .6); q.setFromEuler(e);
    const sc = .7 + R() * .6; im.setMatrixAt(k++, m4.compose(p, q, V(sc, sc, sc)));
  }
  im.castShadow = im.receiveShadow = true;
  im.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: .5 });
  g.add(im);
  return g;
};

/* ---------- 太师椅 ---------- */
G.makeTaishi = () => {
  const g = new T.Group(), w = G.phMat('wood', { color: 0x8a4a35 });
  mesh(G.boxGeo(.62, .06, .5), w, g, [0, .48, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(G.boxGeo(.05, .48, .05), w, g, [sx * .27, .24, sz * .21]);
  const c = G.cv(256, 320), x = c.getContext('2d');
  x.fillStyle = '#4a2418'; x.fillRect(0, 0, 256, 320);
  x.strokeStyle = '#2a120a'; x.lineWidth = 8; x.beginPath(); x.arc(128, 130, 70, 0, 7); x.stroke();
  x.lineWidth = 4; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(128 + Math.cos(i * .785) * 40, 130 + Math.sin(i * .785) * 40, 22, 0, 7); x.stroke(); }
  x.strokeRect(20, 230, 216, 70);
  const back = new T.MeshStandardMaterial({ map: G.canvasTex(c, { repeat: false }), roughness: .5 });
  mesh(G.boxGeo(.58, .7, .05), [w, w, w, w, back, w], g, [0, .86, -.23]);
  mesh(G.boxGeo(.66, .07, .08), w, g, [0, 1.23, -.23]);
  for (const sx of [-1, 1]) { mesh(G.boxGeo(.05, .3, .46), w, g, [sx * .3, .66, -.01]); mesh(G.boxGeo(.07, .04, .5), w, g, [sx * .3, .82, 0]); }
  return g;
};

/* ---------- 龙牙蕉串 ---------- */
G.makeBananaBunch = () => {
  const g = new T.Group();
  const fruit = new T.MeshStandardMaterial({ color: 0x9ab83a, roughness: .5 });
  mesh(new T.CylinderGeometry(.025, .03, .7, 8), new T.MeshStandardMaterial({ color: 0x4a5a2a }), g, [0, -.35, 0]);
  for (let h = 0; h < 4; h++) for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 1.6 - .8 + h, b = mesh(new T.CapsuleGeometry ? new T.CapsuleGeometry(.025, .14, 4, 8) : new T.CylinderGeometry(.025, .025, .18, 8), fruit, g, [Math.cos(a) * .07, -.12 - h * .12, Math.sin(a) * .07]);
    b.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9);
  }
  mesh(new T.ConeGeometry(.06, .2, 10), new T.MeshStandardMaterial({ color: 0x6a1a3a, roughness: .6 }), g, [0, -.78, 0], [Math.PI, 0, 0]);
  return g;
};

/* ---------- 物件清单（旧）---------- */

G.ITEM_DEFS = [
  { id: 'lion', seal: '狮', name: '醒狮头', make: G.makeLion,
    desc: '广东醒狮，南狮之首。竹篾扎骨、纱纸裱糊、彩绘描金，眼能开合、口可张闭——采青之时，一眨一合都是戏。' },
  { id: 'cup', seal: '杯', name: '广彩瓷杯', make: G.makeCup,
    desc: '广彩，清代广州「织金彩瓷」。白胎来自景德镇，在珠江南岸加彩烧制，金碧辉煌，一船船远销欧洲。' },
  { id: 'clogs', seal: '屐', name: '木屐', make: G.makeClogs,
    desc: '岭南湿热，旧时家家户户都着木屐。木底配红皮带，行起路来「嘀嗒嘀嗒」，一条巷都听得见。' },
  { id: 'fan', seal: '扇', name: '新会葵扇', make: G.makeFan,
    desc: '新会葵扇，以蒲葵叶晒制、剪裁、锁边而成，轻巧耐用。老广夏日纳凉，一把葵扇不离手。' },
  { id: 'steamer', seal: '笼', name: '竹蒸笼', make: G.makeSteamer,
    desc: '广式早茶的灵魂。虾饺、烧卖、叉烧包——「一盅两件」，叹足一个早上。' },
  { id: 'figure', seal: '偶', name: '石湾公仔', make: () => G.makeFigure(0x7a4a22, 0x2f6f5a, .55),
    desc: '佛山石湾陶塑，「石湾瓦，甲天下」。人物多取渔樵耕读、神仙老翁，釉色浑厚，神态传神。' },
];
})();
