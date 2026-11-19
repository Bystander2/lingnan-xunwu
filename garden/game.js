/* 岭南寻物 · 第二幕玩法：第一人称漫游、按纸条搵词（拾取 / 定睛两种演出）、被扯入图纸嘅过场、倒计时、HUD、Web Audio 合成音效。
   单独打开 = 搵齐 12 个词；?embed&need=..&torn=..&sec=.. = 由第一幕嵌入，用 postMessage 回报。 */
(() => {
'use strict';
const T = THREE, V3 = T.Vector3;
const { scene, camera, POST, R } = G;
const $ = id => document.getElementById(id);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = t => Math.max(0, Math.min(1, t));
const SHOT = G.Q.get('shot');
let TOUCH = G.Q.has('touch') || matchMedia('(hover: none) and (pointer: coarse)').matches;
if (TOUCH) document.body.classList.add('touch');

/* ======================= 音频（全部合成）======================= */
const A = {
  ctx: null, ksCache: {},
  init() {
    if (this.ctx) return;
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = .9; this.master.connect(ctx.destination);
    const noise = (sec) => { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; l = (l + .02 * w) / 1.02; d[i] = l * 3.5 + w * .15; } return b; };
    this.noiseBuf = noise(3);
    // 风声
    const wind = ctx.createBufferSource(); wind.buffer = this.noiseBuf; wind.loop = true;
    const wl = ctx.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 520;
    const wg = ctx.createGain(); wg.gain.value = .07;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .09; lg.gain.value = .04; lfo.connect(lg); lg.connect(wg.gain); lfo.start();
    wind.connect(wl); wl.connect(wg); wg.connect(this.master); wind.start();
    // 池水潺潺（定位在池中）
    const wat = ctx.createBufferSource(); wat.buffer = this.noiseBuf; wat.loop = true; wat.playbackRate.value = 1.7;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = .6;
    const wgn = ctx.createGain(); wgn.gain.value = .22;
    const pan = this.panner([-8.5, 0, .5], 3, 18);
    wat.connect(bp); bp.connect(wgn); wgn.connect(pan); pan.connect(this.master); wat.start();
    // 鸟鸣
    const bird = () => { this.chirp(); setTimeout(bird, 1800 + Math.random() * 5200); };
    setTimeout(bird, 1200);
    // 预先合成拾到 / 提示用嘅拨弦音，免得第一次㩒「拾」时先算、手机上顿一顿
    setTimeout(() => [587.3, 659.3, 784, 880, 1174.7, 1568].forEach(f => this.ks(f)), 600);
  },
  panner(p, ref = 2, max = 30) {
    const pn = this.ctx.createPanner(); pn.panningModel = 'HRTF'; pn.distanceModel = 'inverse'; pn.refDistance = ref; pn.maxDistance = max; pn.rolloffFactor = 1.2;
    if (pn.positionX) { pn.positionX.value = p[0]; pn.positionY.value = p[1]; pn.positionZ.value = p[2]; } else pn.setPosition(p[0], p[1], p[2]);   // 旧 Safari 冇 positionX
    return pn;
  },
  listen(cam) {
    if (!this.ctx) return;
    const L = this.ctx.listener, f = new V3(0, 0, -1).applyQuaternion(cam.quaternion), u = new V3(0, 1, 0).applyQuaternion(cam.quaternion);
    if (L.positionX) {
      L.positionX.value = cam.position.x; L.positionY.value = cam.position.y; L.positionZ.value = cam.position.z;
      L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z;
    } else { L.setPosition(cam.position.x, cam.position.y, cam.position.z); L.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }
  },
  chirp() {
    const ctx = this.ctx, t = ctx.currentTime, n = 2 + (Math.random() * 5 | 0), base = 2600 + Math.random() * 1800;
    const pn = this.panner([(Math.random() - .5) * 40, 8, (Math.random() - .5) * 40], 6, 60);
    const g = ctx.createGain(); g.gain.value = 0; g.connect(pn); pn.connect(this.master);
    const o = ctx.createOscillator(); o.type = 'sine'; o.connect(g);
    for (let i = 0; i < n; i++) {
      const s = t + i * (.09 + Math.random() * .05);
      o.frequency.setValueAtTime(base * (.8 + Math.random() * .2), s); o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * .4), s + .06);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.05, s + .01); g.gain.exponentialRampToValueAtTime(.001, s + .07);
    }
    o.start(t); o.stop(t + n * .15 + .2);
  },
  // Karplus-Strong 拨弦（扬琴感）
  ks(freq) {
    if (this.ksCache[freq]) return this.ksCache[freq];
    const sr = this.ctx.sampleRate, len = sr * 2.2, b = this.ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    const N = Math.round(sr / freq); for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
    for (let i = N; i < len; i++) d[i] = .497 * (d[i - N] + d[i - N + 1]) + (i < N * 2 ? 0 : 0);
    // 金属感：叠一点二倍频
    for (let i = 0; i < len; i++) d[i] += Math.sin(i / sr * freq * 2 * Math.PI * 2.01) * Math.exp(-i / sr * 3) * .15;
    return this.ksCache[freq] = b;
  },
  pluck(freq, when, gain = .35, dest) {
    const s = this.ctx.createBufferSource(); s.buffer = this.ks(freq);
    const g = this.ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(dest || this.master); s.start(when);
  },
  chime(pos) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + .02, dest = pos ? this.panner([pos.x, pos.y, pos.z], 2, 40) : null;
    if (dest) dest.connect(this.master);
    [587.3, 659.3, 784, 880, 1174.7].forEach((f, i) => this.pluck(f, t + i * .085, .32, dest));
    if (!pos) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.value = 146.8; o.type = 'sine';
      g.gain.setValueAtTime(.0, t); g.gain.linearRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + 2.5);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 2.6);
    }
  },
  hint(pos) { if (!this.ctx) return; const t = this.ctx.currentTime + .02, d = this.panner([pos.x, pos.y, pos.z], 3, 60); d.connect(this.master); this.pluck(1174.7, t, .5, d); this.pluck(1568, t + .12, .4, d); },
  miss() {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(180, t + .1);
    g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + .13);
  },
  tick() {
    if (!this.ctx) return; const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = 2200; g.gain.setValueAtTime(.04, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + .05);
  },
  step(hard) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = .8 + Math.random() * .4;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hard ? 1500 : 700; f.Q.value = .9;
    const g = ctx.createGain(); g.gain.setValueAtTime(hard ? .5 : .35, t); g.gain.exponentialRampToValueAtTime(.001, t + .09);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 2, .12);
  },
};

/* ======================= 词条 / 目标 ======================= */
const WORDS = window.GARDEN_WORDS, BIGW = new Set(window.GARDEN_BIG);
const EMBED = G.Q.has('embed');
const listParam = k => (G.Q.get(k) || '').split(',').filter(Boolean);
const NEED = EMBED ? listParam('need').filter(w => WORDS[w]) : Object.keys(WORDS);   // 仲要搵嘅词
const TORN = listParam('torn').filter(w => WORDS[w]);                               // 第一幕已经撕走
const SECONDS = +(G.Q.get('sec') || (EMBED ? 300 : 0));
let VOICE = G.Q.get('voice') !== '0';
const post = msg => { if (EMBED && window.parent !== window) window.parent.postMessage(Object.assign({ src: 'garden' }, msg), '*'); };

const starTex = (() => {
  const c = G.cv(128), x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(.15, 'rgba(255,220,140,.8)'); g.addColorStop(1, 'rgba(255,200,100,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(255,250,230,.9)';
  for (const a of [0, Math.PI / 2]) { x.save(); x.translate(64, 64); x.rotate(a); x.beginPath(); x.moveTo(-60, 0); x.lineTo(0, 3); x.lineTo(60, 0); x.lineTo(0, -3); x.fill(); x.restore(); }
  return G.canvasTex(c, { repeat: false });
})();
const softTex = (() => { const c = G.cv(64), x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return G.canvasTex(c, { repeat: false }); })();

const place = (o, p, yaw = 0) => { o.position.copy(p); o.rotation.y = yaw; scene.add(o); return o; };
const lion = place(G.makeLion(), G.SPOT_LION, Math.PI / 2);     // 干扰物：纸条冇写
const PICKS = {
  '大葵扇': () => { const o = G.makeFan(); o.position.copy(G.SPOT_FAN); o.rotation.order = 'YXZ'; o.rotation.y = Math.atan2(G.SPOT_FAN.x - 5, G.SPOT_FAN.z - 3.5); o.rotation.x = -.38; scene.add(o); return o; },
  '一只屐': () => place(G.makeClogs(), G.SPOT_CLOGS, 2.2),
  '饮早茶': () => { const o = place(G.makeSteamer(), G.SPOT_STEAMER, 0); const cup = G.makeCup(); cup.position.set(-.32, 0, .12); o.add(cup); return o; },
  '油纸遮': () => place(G.makeUmbrella(), G.SPOT_UMBRELLA, .6),
  '担凳仔': () => place(G.makeStool(), G.SPOT_STOOL, .4),
  '树仔头': () => place(G.makeBonsai(), G.SPOT_BONSAI, .2),
};
const SPOTS = {
  '瓦公仔': { objs: G.ridgeFigs, center: new V3(0, 8.95, -12.6), seg: [new V3(-6.6, 8.95, -12.6), new V3(6.6, 8.95, -12.6)], range: 26, tol: 1.0 },
  '琉璃瓦': { center: new V3(0, 4.86, -7.4), seg: G.EAVE_SEG, range: 15, tol: .45 },
  '太师椅': { objs: G.TAISHI_OBJS, center: G.TAISHI.clone().add(new V3(0, .6, 0)), radius: 1.1, range: 8 },
  '龙牙蕉': { objs: [G.BANANA_OBJ], center: G.BANANA, radius: 1.0, range: 8 },
  '花阶砖': { cond: () => inBox(G.TERRACE, .4) && P.pitch < -.2, at: () => camera.position.clone().add(fwd().multiplyScalar(1.6)).setY(.1) },
  '瓦檐口': { cond: () => P.pos.z < -7.5 && P.pos.z > -10.9 && Math.abs(P.pos.x) < 8.6 && P.pitch > .05, at: () => new V3(P.pos.x, 4.9, -7.5) },
};
const fwd = () => new V3(0, 0, -1).applyQuaternion(camera.quaternion);
const inBox = (b, pad = 0) => P.pos.x > b.x0 - pad && P.pos.x < b.x1 + pad && P.pos.z > b.z0 - pad && P.pos.z < b.z1 + pad;

const targets = Object.keys(WORDS).map(w => {
  const t = { word: w, info: WORDS[w], big: BIGW.has(w), active: NEED.includes(w), found: false, flare: 0, phase: R() * 10 };
  if (PICKS[w]) {
    t.kind = 'pick'; t.obj = PICKS[w](); t.objs = [t.obj];
    if (TORN.includes(w)) t.obj.visible = false;                      // 喺图纸度撕走咗，园入面就冇咗
    const bs = new T.Box3().setFromObject(t.obj).getBoundingSphere(new T.Sphere());
    t.center = bs.center.clone(); t.radius = bs.radius; t.range = 6;
    t.base = t.obj.position.clone(); t.baseRot = t.obj.rotation.clone();
  } else Object.assign(t, { kind: 'spot', radius: .6, range: 6 }, SPOTS[w]);
  if (t.active && t.center && !t.cond) {
    t.spark = new T.Sprite(new T.SpriteMaterial({ map: starTex, color: 0xffe2a0, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    t.spark.position.copy(t.center).add(new V3(0, (t.radius || .4) * .6, 0)); scene.add(t.spark); G.noDepth.push(t.spark);
  }
  return t;
});
const DISTRACT = [{ name: '醒狮头', center: new T.Box3().setFromObject(lion).getCenter(new V3()), radius: .3, range: 5, msg: '醒狮头好威！不过纸条冇写喔～' }];

// 蒸笼冒烟
const steam = (() => {
  const it = targets.find(t => t.word === '饮早茶'); const N = 40;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 4), life = new Float32Array(N);
  for (let i = 0; i < N; i++) life[i] = Math.random();
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 4));
  const p = new T.Points(g, new T.PointsMaterial({ size: .35, map: softTex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true }));
  p.frustumCulled = false; scene.add(p); G.noDepth.push(p);
  return { it, p, g, pos, col, life, N, on: it.obj.visible };
})();

// 金粉
const burst = (() => {
  const N = 160, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), col = new Float32Array(N * 4);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 4));
  const p = new T.Points(g, new T.PointsMaterial({ size: .06, map: softTex, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  p.frustumCulled = false; p.visible = false; scene.add(p); G.noDepth.push(p);
  return { p, g, pos, vel, col, N, t: 9,
    fire(c, spread = 1) { this.t = 0; p.visible = true; for (let i = 0; i < N; i++) { const d = new V3(Math.random() - .5, Math.random() * .8, Math.random() - .5).normalize().multiplyScalar((.8 + Math.random() * 2.2) * spread); pos.set([c.x, c.y, c.z], i * 3); vel.set([d.x, d.y, d.z], i * 3); } },
    update(dt) {
      if (!p.visible) return; this.t += dt;
      for (let i = 0; i < N; i++) {
        const o = i * 3; vel[o] *= .96; vel[o + 1] = vel[o + 1] * .96 - .6 * dt; vel[o + 2] *= .96;
        pos[o] += vel[o] * dt; pos[o + 1] += vel[o + 1] * dt; pos[o + 2] += vel[o + 2] * dt;
        col.set([3, 2.4, 1.3, Math.max(0, 1 - this.t / 2.2) * (.6 + .4 * Math.sin(this.t * 20 + i))], i * 4);
      }
      g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
      if (this.t > 2.3) p.visible = false;
    },
  };
})();
G.buildDepthList();

/* ======================= 玩家 ======================= */
const P = { pos: G.SPAWN.pos.clone(), vel: new V3(), yaw: G.SPAWN.yaw, pitch: 0, y: 0, bob: 0, lastStep: 0, fov: 64, sway: 0 };
const keys = {};
const JOY = { x: 0, y: 0, run: false };   // 触屏摇杆：x 右正、y 下正（向上推 = 向前）
// 操作面板：㩒住边个键就亮边个（方向键当 WASD）
const KEYMAP = { ArrowUp: 'KeyW', ArrowLeft: 'KeyA', ArrowDown: 'KeyS', ArrowRight: 'KeyD', ShiftLeft: 'Shift', ShiftRight: 'Shift' };
const litKey = (code, on) => { const k = document.querySelector(`#keys [data-code="${KEYMAP[code] || code}"]`); if (k) k.classList.toggle('on', on); };
addEventListener('keydown', e => { keys[e.code] = true; litKey(e.code, true); onKey(e); });
addEventListener('keyup', e => { keys[e.code] = false; litKey(e.code, false); });
addEventListener('blur', () => { for (const c in keys) { keys[c] = false; litKey(c, false); } });
let mouseLitT = 0;
addEventListener('mousemove', e => {
  if (document.pointerLockElement && state === 'play') {
    P.yaw -= e.movementX * .0021; P.pitch = Math.max(-1.35, Math.min(1.35, P.pitch - e.movementY * .0021));
    if (e.movementX || e.movementY) { document.getElementById('kMouse').classList.add('on'); clearTimeout(mouseLitT); mouseLitT = setTimeout(() => document.getElementById('kMouse').classList.remove('on'), 150); }
  }
});
function collide(p) {
  const r = .3;
  for (const c of G.colliders) {
    if (c.c) { const [x, z, rr] = c.c, dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz), m = rr + r; if (d < m && d > 1e-5) { p.x = x + dx / d * m; p.z = z + dz / d * m; } }
    else {
      const [x0, z0, x1, z1] = c.b, cx = Math.max(x0, Math.min(x1, p.x)), cz = Math.max(z0, Math.min(z1, p.z));
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < r) {
        if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
        else { const pen = [p.x - x0 + r, x1 - p.x + r, p.z - z0 + r, z1 - p.z + r], k = pen.indexOf(Math.min(...pen)); if (k === 0) p.x = x0 - r; else if (k === 1) p.x = x1 + r; else if (k === 2) p.z = z0 - r; else p.z = z1 + r; }
      }
    }
  }
  const B = G.BOUNDS; p.x = Math.max(B.x0, Math.min(B.x1, p.x)); p.z = Math.max(B.z0, Math.min(B.z1, p.z));
}
function updatePlayer(dt) {
  const f = Math.max(-1, Math.min(1, (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - JOY.y));
  const s = Math.max(-1, Math.min(1, (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + JOY.x));
  const run = keys.ShiftLeft || keys.ShiftRight || JOY.run;
  const sp = run ? 5.4 : 3.1;
  const fw = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), rt = new V3(-fw.z, 0, fw.x);
  const want = fw.multiplyScalar(f).add(rt.multiplyScalar(s));
  if (want.lengthSq() > 1) want.normalize();
  want.multiplyScalar(sp);
  P.vel.lerp(want, 1 - Math.exp(-dt * 10));
  const prev = P.pos.clone();
  P.pos.addScaledVector(P.vel, dt);
  collide(P.pos);
  if (G.inPond(P.pos.x, P.pos.z, .25)) {
    const tx = new V3(P.pos.x, 0, prev.z), tz = new V3(prev.x, 0, P.pos.z);
    if (!G.inPond(tx.x, tx.z, .25)) P.pos.copy(tx); else if (!G.inPond(tz.x, tz.z, .25)) P.pos.copy(tz); else P.pos.copy(prev);
  }
  const gy = G.groundY(P.pos.x, P.pos.z);
  P.y += (gy - P.y) * (1 - Math.exp(-dt * 14));
  const speed = Math.hypot(P.vel.x, P.vel.z), amp = Math.min(1, speed / 3);
  P.bob += dt * (run ? 11.5 : 8.6) * amp;
  const bobY = Math.sin(P.bob) * .04 * amp, bobX = Math.cos(P.bob * .5) * .03 * amp;
  if (amp > .3 && Math.sin(P.bob) < -.92 && G.time.value - P.lastStep > .22) { P.lastStep = G.time.value; A.step(gy > .05); }
  P.sway += ((s * -.025) - P.sway) * (1 - Math.exp(-dt * 6));
  P.fov += ((run && speed > 3.5 ? 71 : 64) - P.fov) * (1 - Math.exp(-dt * 5));
  return { bobX, bobY };
}
const _e = new T.Euler(0, 0, 0, 'YXZ');
const playerPose = () => ({ pos: new V3(P.pos.x, P.y + 1.62, P.pos.z), quat: new T.Quaternion().setFromEuler(_e.set(P.pitch, P.yaw, P.sway, 'YXZ')) });

/* ======================= 瞄准 ======================= */
function segAim(o, f, seg, range) {
  let best = 1e9, bt = 0, bp = null;
  for (let i = 0; i <= 24; i++) {
    const p = new V3().lerpVectors(seg[0], seg[1], i / 24), v = p.clone().sub(o), t = v.dot(f);
    if (t < .5 || t > range) continue;
    const d = v.addScaledVector(f, -t).length();
    if (d < best) { best = d; bt = t; bp = p; }
  }
  return { d: best, t: bt, p: bp };
}
/* 视线检测：由眼睛射去目标中心，中途撞到墙 / 柱 / 屋就当睇唔到（隔墙唔可以拾）。
   唔计树叶、蕉叶呢类镂空 / 半透明贴片同目标自己；结果缓存 0.15 秒，慳啲 raycast。 */
const losRay = new T.Raycaster();
// 遮挡物清单：只要实心网格（墙、柱、屋顶、家具），唔要成千上万块叶片嘅 InstancedMesh、镂空 / 半透明贴片、天空。
// 第一次用先建；手机上逐块叶片做 raycast 会卡成几十毫秒一次。
let OCC = null;
const occluders = () => OCC || (OCC = (() => { const out = []; scene.traverse(m => {
  if (m.isMesh && !m.isInstancedMesh && !m.isSprite && m !== G.sky && !(m.material && (m.material.transparent || m.material.alphaTest > 0))) out.push(m);
}); return out; })());
// 已经拾走嘅嘢係成个 Group 收埋（visible=false），所以要连父层一齐睇
const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
const ownedBy = (o, objs) => { for (; o; o = o.parent) if (objs.includes(o)) return true; return false; };
// 线状目标（瓦公仔、琉璃瓦）验准星最近嗰点，留 .45 余量免得撞到佢脚下嘅屋脊 / 瓦面
function canSee(t) {
  if (t.cond || !t.center) return true;
  const now = G.time.value; if (t.losT !== undefined && now - t.losT < .15) return t.los;
  const to = t.seg ? t.aimPt : t.center; if (!to) return true;
  const o = camera.position, dir = to.clone().sub(o), d = dir.length();
  losRay.set(o, dir.normalize()); losRay.near = .05; losRay.camera = camera;
  losRay.far = t.seg ? Math.max(.1, d - .45) : t.objs ? d : Math.max(.1, d - t.radius * .6);
  t.los = !losRay.intersectObjects(occluders(), false).some(h => shown(h.object) && !(t.objs && ownedBy(h.object, t.objs)));
  t.losT = now; return t.los;
}
function aim() {
  const o = camera.position, f = fwd();
  const cands = [];
  const test = (c, radius, range) => { const to = c.clone().sub(o), d = to.length(); if (d > range) return null; const a = f.angleTo(to), lim = Math.atan((radius + .45) / d) + .09; return a < lim ? a / lim : null; };
  for (const t of targets) {
    if (!t.active || t.found || (t.obj && !t.obj.visible)) continue;
    let s = null;
    if (t.cond) s = t.cond() ? .9 : null;
    else if (t.seg) { const r = segAim(o, f, t.seg, t.range); if (r.d < t.tol + r.t * .015) { s = r.d / (t.tol + r.t * .015); t.aimPt = r.p; } }
    else s = test(t.center, t.radius, t.range);
    if (s !== null) cands.push([s, t]);
  }
  cands.sort((a, b) => a[0] - b[0]);
  const best = (cands.find(([, t]) => canSee(t)) || [])[1] || null;
  if (!best) for (const d of DISTRACT) { const s = test(d.center, d.radius, d.range); if (s !== null) return { distract: d }; }
  return best;
}

/* ======================= HUD ======================= */
const wordList = $('words');
const ROUND = EMBED ? TORN.concat(NEED) : NEED;
ROUND.forEach(w => {
  const li = document.createElement('li'); li.dataset.w = w; li.innerHTML = `<span class="w">${w}</span><small>${WORDS[w].jp}</small>`;
  if (TORN.includes(w)) li.classList.add('done', 'torn');
  wordList.appendChild(li);
});
function showTip(text, sec = 4) { const t = $('tip'); t.textContent = text; t.classList.add('on'); clearTimeout(showTip.h); showTip.h = setTimeout(() => t.classList.remove('on'), sec * 1000); }
let voice = null;
function say(w, force) { const a = WORDS[w] && WORDS[w].audio; if (!a || (!VOICE && !force)) return; try { if (voice) voice.pause(); voice = new Audio(a); voice.play().catch(() => {}); } catch (_) {} }
function showCard(t) {
  $('card-word').textContent = t.word; $('card-jp').textContent = t.info.jp; $('card-desc').textContent = t.info.mean;
  $('card-tag').textContent = t.big ? '搵 到 大 件' : '搵 到 一 样';
  $('card-count').textContent = `仲差 ${NEED.length - foundN - 1} 样`;
  $('card').classList.add('on');
  setTimeout(() => say(t.word), 250);
}
const hideCard = () => $('card').classList.remove('on');
const updCount = () => { $('cnt').textContent = `${TORN.length + foundN} / ${ROUND.length}`; };
const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');

/* ======================= 状态机 ======================= */
let state = 'title', st = 0, playT = 0, timeLeft = SECONDS, wasPaused = false;   // playT：真正玩咗几耐（暂停唔计）
// 暂停 = 放开咗鼠标（Esc / 切走窗口）；暂停期间倒计时同行路都停
const isPaused = () => !SHOT && !TOUCH && (state === 'play' || state === 'find') && !document.pointerLockElement;
let foundN = 0, cine = null, hintCD = 0, hintT = 0, hintIt = null, hover = null;
POST.bars = 1;
// 图纸视角：同第一幕张图纸一模一样（用嚟渲染图纸、亦都系被扯入嚟嘅起点）
const PLAN = { pos: new V3(.5, 21, 24.5), look: new V3(.3, 0, -1.6), fov: 46 };

function onKey(e) {
  if (state === 'play') {
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyQ' && hintCD <= 0) hint();
  }
  if (e.code === 'KeyV') toggleVoice();
  if (e.code === 'KeyH') toggleKeys();
  if (e.code === 'KeyR' && state !== 'title') again();
  if (state === 'find' && (e.code === 'KeyE' || e.code === 'Space') && cine.t > 1.6 && cine.t < cine.D0) cine.t = cine.D0;
}
let lastHover = null, lastHoverT = -9;
function nearestAhead() {
  const f = fwd(); let best = null, bd = 1e9;
  for (const t of targets) {
    if (!t.active || t.found || !t.center || t.cond || (t.obj && !t.obj.visible)) continue;
    const to = t.center.clone().sub(camera.position), d = to.length();
    if (d < Math.min(t.range, 4) && f.angleTo(to) < .65 && d < bd && canSee(t)) { bd = d; best = t; }
  }
  return best;
}
// 㩒 E / 点击：准星扩散一圈；E 键闪一下；乜都冇对准就话俾佢知
function ping(gold) {
  const p = $('ping'); p.classList.remove('go', 'gold'); void p.offsetWidth; p.classList.add('go'); p.classList.toggle('gold', !!gold);
  const k = document.querySelector('#keys [data-code="KeyE"]'); k.classList.add('on'); setTimeout(() => k.classList.toggle('on', !!keys.KeyE), 160);
  $('prompt').classList.add('press'); setTimeout(() => $('prompt').classList.remove('press'), 140);
}
let missT = -9;
function interact() {
  if (!hover) hover = (G.time.value - lastHoverT < .4 ? lastHover : null) || nearestAhead();
  ping(hover && !hover.distract);
  if (!hover) {
    A.miss();
    if (G.time.value - missT > 3) { missT = G.time.value; showTip(TOUCH ? '呢度冇嘢拾 —— 行近啲，准星对准闪光嘅嘢，等「拾」掣变金先㩒' : '呢度冇嘢拾 —— 行近啲，准星对准闪光嘅嘢，等佢变金圈先㩒 E', 2.6); }
    return;
  }
  if (hover.distract) { showTip(hover.distract.msg, 2.2); A.tick(); return; }
  beginFind(hover);
}
function hint() {
  if (hintCD > 0) return;
  post({ type: 'hint' });
  const left = targets.filter(t => t.active && !t.found); if (!left.length) return;
  hintIt = left.reduce((a, b) => (a.center || camera.position).distanceTo(camera.position) < (b.center || camera.position).distanceTo(camera.position) ? a : b);
  hintIt.flare = 2.5; hintT = 2.5; hintCD = 4;
  if (hintIt.center) A.hint(hintIt.center);
  showTip(`「${hintIt.word}」：${window.GARDEN_HINT3D[hintIt.word]}`, 4);
}
let againArm = 0;
function again() {
  if (G.time.value - againArm > 2.5) { againArm = G.time.value; showTip('再㩒一次 R 就重新嚟过（会出返去图纸，重新抽纸条）', 2.5); return; }
  if (EMBED) post({ type: 'again' }); else location.reload();
}
function toggleKeys(min = !$('keys').classList.contains('min')) { $('keys').classList.toggle('min', min); $('keysFold').textContent = min ? '打开操作说明' : '收埋操作说明'; }
$('keys').onclick = e => { e.stopPropagation(); toggleKeys(); };
function toggleVoice() { VOICE = !VOICE; $('bVoice').lastChild.textContent = '读音：' + (VOICE ? '开' : '关'); post({ type: 'voice', on: VOICE }); }
$('bHint').onclick = e => { e.stopPropagation(); if (state === 'play') hint(); };
$('bAgain').onclick = e => { e.stopPropagation(); again(); };
$('bVoice').onclick = e => { e.stopPropagation(); toggleVoice(); };
const renderer = () => G.renderer;
function lockPointer() { try { const p = renderer().domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
addEventListener('mousedown', e => {
  if (e.target.closest && e.target.closest('button, #keys')) return;
  if (state === 'title' && !EMBED) { startEnter(); return; }
  if (TOUCH) return;   // 触屏由 touch 事件处理
  if (state === 'play') { if (!document.pointerLockElement) { lockPointer(); return; } interact(); }
  else if (state === 'find' && cine.t > 1.6 && cine.t < cine.D0) cine.t = cine.D0;
});
/* ---------- 触屏：左边 40% 摇杆（喺边度㩒落就喺边度做中心）、右边拖动转视角、轻点 = 拾取 ---------- */
{
  const joyEl = $('joy'), knob = $('joyKnob'), R0 = 46;
  let joyId = null, jx = 0, jy = 0, lookId = null, lx = 0, ly = 0, tapT = 0, tapMove = 0;
  const home = () => { joyEl.style.left = joyEl.style.top = joyEl.style.bottom = ''; joyEl.classList.remove('on', 'run'); knob.style.transform = ''; JOY.x = JOY.y = 0; JOY.run = false; };
  const enableTouch = () => { if (!TOUCH) { TOUCH = true; document.body.classList.add('touch'); $('paused').classList.remove('on'); } };
  const cv = renderer().domElement;
  cv.addEventListener('touchstart', e => {
    e.preventDefault(); enableTouch(); A.init();
    if (state === 'title' && !EMBED) { startEnter(); return; }
    if (state === 'find') { if (cine.t > 1.6 && cine.t < cine.D0) cine.t = cine.D0; return; }
    if (state !== 'play') return;
    for (const t of e.changedTouches) {
      if (joyId === null && t.clientX < innerWidth * .4) {
        joyId = t.identifier; jx = t.clientX; jy = t.clientY;
        joyEl.style.left = (jx - 54) + 'px'; joyEl.style.top = (jy - 54) + 'px'; joyEl.style.bottom = 'auto'; joyEl.classList.add('on');
      } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; tapT = performance.now(); tapMove = 0; }
    }
  }, { passive: false });
  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        let dx = t.clientX - jx, dy = t.clientY - jy; const d = Math.hypot(dx, dy);
        if (d > R0) { dx *= R0 / d; dy *= R0 / d; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        JOY.x = dx / R0; JOY.y = dy / R0; JOY.run = d > R0 * 1.15; joyEl.classList.toggle('run', JOY.run);
      } else if (t.identifier === lookId && state === 'play') {
        const dx = t.clientX - lx, dy = t.clientY - ly; lx = t.clientX; ly = t.clientY; tapMove += Math.abs(dx) + Math.abs(dy);
        // 横屏高度细，上下拖距离短，所以竖向灵敏度高啲（横屏手机拖成个屏高 ≈ 由望天到望地）
        P.yaw -= dx * .006; P.pitch = Math.max(-1.35, Math.min(1.35, P.pitch - dy * Math.max(.0075, 1.4 / innerHeight)));
      }
    }
  }, { passive: false });
  const end = e => {
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();   // iOS 要喺手指离开时先解锁声音
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) { joyId = null; home(); }
      else if (t.identifier === lookId) { lookId = null; if (state === 'play' && tapMove < 10 && performance.now() - tapT < 300) interact(); }
    }
  };
  cv.addEventListener('touchend', end); cv.addEventListener('touchcancel', end);
  $('actBtn').addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (state === 'play') interact(); else if (state === 'find' && cine.t > 1.6 && cine.t < cine.D0) cine.t = cine.D0; }, { passive: false });
  $('actBtn').onclick = e => { e.stopPropagation(); if (state === 'play') interact(); };
}
document.addEventListener('pointerlockchange', () => { $('paused').classList.toggle('on', isPaused()); });
$('sysGo').onclick = () => { $('sys').classList.remove('on'); window.focus(); startEnter(); };

const titlePose = t => { const a = -.6 + t * .045; return { pos: new V3(Math.sin(a) * 25, 12.5 + Math.sin(t * .2) * .8, Math.cos(a) * 25), look: new V3(0, 2.5, -1) }; };
let enterPath = null, titleT = SHOT === 'title' ? 3 : 0;
function startEnter() {
  A.init(); if (!TOUCH) lockPointer();
  state = 'enter'; st = 0;
  $('title').classList.remove('on');
  const a = EMBED ? PLAN : titlePose(titleT);
  const pts = [a.pos, new V3(a.pos.x * .4 + 3, 10, 24), new V3(.4, 2.6, 18.6), new V3(0, 1.75, 15.0), new V3(0, 1.62, G.SPAWN.pos.z)];
  const looks = [a.look, new V3(0, 2, 2), new V3(0, 1.9, 6), new V3(0, 1.7, 2), new V3(0, 1.62, G.SPAWN.pos.z - 10)];
  enterPath = { p: new T.CatmullRomCurve3(pts, false, 'centripetal'), l: new T.CatmullRomCurve3(looks, false, 'centripetal'), D: EMBED ? 7.2 : 6.2, fov0: EMBED ? PLAN.fov : 52 };
  if (EMBED) { A.whoosh && A.whoosh(); }
}
function beginFind(t) {
  state = 'find'; hover = null; $('prompt').classList.remove('on'); $('cross').classList.remove('hot'); $('actBtn').classList.remove('hot');
  const from = playerPose();
  const c = { t0: t, t: 0, from, D0: 5.0, D1: 6.1 };
  if (t.kind === 'pick') {
    const toCam = from.pos.clone().sub(t.center); toCam.y = 0;
    const front = t.obj.rotation.y, aP = Math.atan2(toCam.x, toCam.z), diff = Math.atan2(Math.sin(aP - front), Math.cos(aP - front));
    c.a0 = Math.abs(diff) < 1.2 ? aP : front - .55 * Math.sign(diff || 1);
    c.r = Math.max(.75, t.radius * 3.2); c.c = t.center.clone();
    burst.fire(t.center);
  } else {
    c.look = (t.at ? t.at() : t.center).clone();
    const dir = c.look.clone().sub(from.pos), d = dir.length();
    c.push = from.pos.clone().addScaledVector(dir.normalize(), Math.min(d * .35, 2.2));
    // 推近途中如果有嘢挡住（柱、树干），绕去侧面揾个睇得清嘅机位
    if (!t.at && blocked(c.push, c.look)) {
      const flat = from.pos.clone().sub(c.look).setY(0).normalize(), dist = Math.min(d, 2.6);
      for (const a of [.45, -.45, .9, -.9, 1.3, -1.3]) {
        const v = flat.clone().applyAxisAngle(new V3(0, 1, 0), a).multiplyScalar(dist).add(c.look); v.y = c.look.y + .5;
        if (!blocked(v, c.look)) { c.push = v; break; }
      }
    }
    burst.fire(c.look, t.big ? 1.8 : 1);
  }
  if (t.spark) t.spark.visible = false;
  A.chime(); POST.flash = .55;
  if (t.word === '饮早茶') steam.on = false;
  cine = c;
}
const ray = new T.Raycaster();
function blocked(from, to) {
  const dir = to.clone().sub(from), d = dir.length();
  ray.set(from, dir.normalize()); ray.far = d - .5; ray.camera = camera;
  return ray.intersectObjects(occluders(), false).some(h => shown(h.object));
}
function orbitPose(c, ang, lift) { const cc = c.c.clone().add(new V3(0, .25, 0)); return { pos: new V3(cc.x + Math.sin(ang) * c.r, cc.y + lift, cc.z + Math.cos(ang) * c.r), look: cc }; }
function setCam(pos, look) { camera.position.copy(pos); camera.lookAt(look); }
const lookQuat = (pos, look) => new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(pos, look, new V3(0, 1, 0)));
function gain(t) {
  t.found = true; foundN++; updCount();
  const li = wordList.querySelector(`li[data-w="${t.word}"]`); if (li) li.classList.add('done');
  post({ type: 'gain', w: t.word });
}

/* 锦鲤：平时随意游；人行近池边就全部凑过嚟（好似等人喂） */
const _kv = new V3();
function pondClamp(v, m = .55) { const P0 = G.POND; v.x = Math.max(P0.x0 + m, Math.min(P0.x1 - m, v.x)); v.z = Math.max(P0.z0 + m, Math.min(P0.z1 - m, v.z)); return v; }
function updateKoi(dt, time) {
  if (!dt) return;
  const cam = camera.position, P0 = G.POND;
  const nx = Math.max(P0.x0, Math.min(P0.x1, cam.x)), nz = Math.max(P0.z0, Math.min(P0.z1, cam.z));
  const dEdge = Math.hypot(cam.x - nx, cam.z - nz);
  const lure = state === 'play' || state === 'find' ? clamp01((3.2 - dEdge) / 1.6) : 0;   // 离池边 3.2m 内开始吸引
  const spot = pondClamp(new V3(nx, 0, nz), .75);
  G.koi.forEach((k, i) => {
    const u = k.userData;
    u.wanderT -= dt;
    if (u.wanderT <= 0 || k.position.distanceTo(u.wander) < .4) { u.wander.set(P0.x0 + Math.random() * (P0.x1 - P0.x0), 0, P0.z0 + Math.random() * (P0.z1 - P0.z0)); pondClamp(u.wander, .9); u.wanderT = 4 + Math.random() * 5; }
    let tgt = u.wander;
    if (lure > 0) {
      const a = i / G.koi.length * Math.PI * 2 + time * .4, r = .35 + (i % 3) * .22;
      tgt = pondClamp(_kv.set(spot.x + Math.cos(a) * r, 0, spot.z + Math.sin(a) * r), .5);
    }
    const dx = tgt.x - k.position.x, dz = tgt.z - k.position.z, dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let dh = Math.atan2(Math.sin(want - u.heading), Math.cos(want - u.heading));
    const turn = (lure > 0 ? 3.4 : 1.1) * dt;
    u.heading += Math.max(-turn, Math.min(turn, dh));
    const arrive = clamp01(dist / .5);
    const dash = clamp01((dist - .6) / 2.5);   // 远就冲，近就慢慢埋位
    const speed = u.cruise * (1 - lure) + lure * (.12 + (.6 + 1.0 * dash + (i % 4) * .06) * arrive);
    // 分开少少，唔好叠埋
    let sx = 0, sz = 0;
    for (const o of G.koi) if (o !== k) { const ox = k.position.x - o.position.x, oz = k.position.z - o.position.z, d = Math.hypot(ox, oz); if (d < .3 && d > 1e-4) { sx += ox / d * (.3 - d); sz += oz / d * (.3 - d); } }
    k.position.x += Math.sin(u.heading) * speed * dt + sx * dt * 3;
    k.position.z += Math.cos(u.heading) * speed * dt + sz * dt * 3;
    pondClamp(k.position, .4);
    const ty = lure > 0 ? -.14 - (i % 3) * .04 : u.y;   // 凑过嚟时浮上水面
    k.position.y += (ty - k.position.y) * (1 - Math.exp(-dt * 1.5));
    k.rotation.y = u.heading;
    k.rotation.z = Math.sin(time * 1.3 + i) * .05;
    u.swim.value += dt * u.spd * (.6 + speed * 2.2);
  });
}

function update(dt) {
  G.time.value += dt;
  const time = G.time.value;
  updateKoi(dt, time);
  for (const t of targets) {
    if (!t.spark || t.found) continue;
    const d = t.center.distanceTo(camera.position);
    const pulse = Math.pow(Math.max(0, Math.sin(time * 1.6 + t.phase)), 12);
    t.flare = Math.max(0, t.flare - dt);
    t.spark.scale.setScalar((.18 + .5 * pulse + t.flare * .6) * Math.min(1, .4 + d * .06) * (t.word === '瓦公仔' ? 2 : 1));
    t.spark.material.rotation = time * .5 + t.phase;
    t.spark.material.opacity = Math.min(1, .25 + pulse + t.flare) * clamp01((24 - d) / 6) * (state === 'plan' ? 0 : 1);
  }
  if (steam.on) {
    const c = steam.it.center;
    for (let i = 0; i < steam.N; i++) {
      steam.life[i] += dt * .45; if (steam.life[i] > 1) steam.life[i] -= 1;
      const l = steam.life[i], sw = Math.sin(i * 7.3 + time) * .08 * l;
      steam.pos.set([c.x + sw + Math.sin(i) * .05, c.y + .1 + l * .9, c.z + Math.cos(i * 3.1) * .05 * l], i * 3);
      steam.col.set([1, 1, 1, Math.sin(l * Math.PI) * .22], i * 4);
    }
    steam.g.attributes.position.needsUpdate = steam.g.attributes.color.needsUpdate = true;
  } else steam.p.visible = false;
  burst.update(dt);
  POST.flash = Math.max(0, POST.flash - dt * 2.2);
  hintCD = Math.max(0, hintCD - dt); hintT = Math.max(0, hintT - dt);
  st += dt;

  if (state === 'plan') {
    setCam(PLAN.pos, PLAN.look); camera.fov = PLAN.fov; POST.bars = 0; POST.paper = 1;
  } else if (state === 'title') {
    titleT += dt;
    if (EMBED) { setCam(PLAN.pos, PLAN.look); camera.fov = PLAN.fov; POST.paper = 1; POST.bars = 0; }
    else { const p = titlePose(titleT); setCam(p.pos, p.look); POST.bars = 1; POST.fade = Math.min(1, titleT / 2); }
  } else if (state === 'enter') {
    const k = ease(clamp01(st / enterPath.D));
    setCam(enterPath.p.getPoint(k), enterPath.l.getPoint(k));
    camera.fov = enterPath.fov0 + (64 - enterPath.fov0) * k;
    if (EMBED) { POST.paper = 1 - clamp01((st - .5) / 3.2); POST.bars = 0; }
    else POST.bars = 1 - clamp01((st - enterPath.D + 1.4) / 1.4);
    if (st >= enterPath.D) {
      state = 'play'; st = 0; playT = 0; P.yaw = 0; P.pitch = 0; POST.paper = 0; planLook(false);
      $('hud').classList.add('on');
      showTip(TOUCH ? '左下摇杆行路 · 右边画面拖动望上望落、左右转身 · 准星对准纸条上嘅嘢㩒「拾」' + (innerHeight > innerWidth ? ' · 打横部手机玩更好' : '')
                    : 'WASD 前后左右行 · 移动鼠标望上望落、左右转身 · 对准纸条上嘅嘢㩒 E 拾取', 8);
    }
  } else if (state === 'play') {
    const { bobX, bobY } = updatePlayer(isPaused() ? 0 : dt);
    const pose = playerPose();
    camera.position.copy(pose.pos).add(new V3(bobX, bobY, 0).applyQuaternion(pose.quat));
    camera.quaternion.copy(pose.quat);
    camera.updateMatrixWorld();
    const h = aim();
    if (h !== hover && !(h && hover && h.distract && hover.distract && h.distract === hover.distract)) {
      if (hover && !hover.distract) { lastHover = hover; lastHoverT = G.time.value; }
      hover = h; if (h && !h.distract) A.tick();
      $('cross').classList.toggle('hot', !!(h && !h.distract)); $('actBtn').classList.toggle('hot', !!(h && !h.distract));
      $('prompt').classList.toggle('on', !!h);
      if (h) { $('prompt-name').textContent = h.distract ? h.distract.name : h.word; $('prompt').classList.toggle('dim', !!h.distract); }
    }
    POST.bars += (0 - POST.bars) * (1 - Math.exp(-dt * 4));
  } else if (state === 'find') {
    const c = cine, t = c.t0; c.t += dt;
    const tt = c.t < .14 ? 0 : c.t - .14;            // 卡肉
    if (c.t < c.D0) {
      const k = ease(clamp01(tt / 1.15));
      if (t.kind === 'pick') {
        const lift = ease(clamp01(tt / 1.0)) * .3;
        t.obj.position.copy(t.base).add(new V3(0, lift, 0)); t.obj.rotation.y = t.baseRot.y + Math.sin(tt * .9) * .45;
        c.c.copy(t.center).add(new V3(0, lift, 0));
        const o = orbitPose(c, c.a0 + Math.min(tt, 4.5) * .38, .18 + .12 * Math.sin(tt * .6));
        if (k < 1) { camera.position.lerpVectors(c.from.pos, o.pos, k); camera.quaternion.slerpQuaternions(c.from.quat, lookQuat(o.pos, o.look), k); } else setCam(o.pos, o.look);
      } else {
        const pos = new V3().lerpVectors(c.from.pos, c.push, ease(clamp01(tt / 3.6)));
        camera.position.copy(pos); camera.quaternion.slerpQuaternions(c.from.quat, lookQuat(pos, c.look), k);
      }
      POST.bars = ease(clamp01(tt / .6));
      if (tt > 1.0 && !$('card').classList.contains('on')) showCard(t);
      camera.fov = 64 - 6 * k;
    } else {
      if (!c.done) {
        c.done = true; hideCard(); gain(t);
        c.endPos = camera.position.clone(); c.endQuat = camera.quaternion.clone();
      }
      const k = ease(clamp01((c.t - c.D0) / (c.D1 - c.D0)));
      camera.position.lerpVectors(c.endPos, c.from.pos, k); camera.quaternion.slerpQuaternions(c.endQuat, c.from.quat, k);
      if (t.kind === 'pick') t.obj.scale.setScalar(Math.max(.001, 1 - k * 1.2));
      POST.bars = 1 - k; camera.fov = 58 + 6 * k;
      if (c.t >= c.D1) {
        if (t.kind === 'pick') { t.obj.visible = false; G.renderer.shadowMap.needsUpdate = true; }
        if (foundN >= NEED.length) startEnd(); else { state = 'play'; if (foundN === 1 && TOUCH) toggleKeys(true); if (foundN === 1 && !EMBED) showTip((TOUCH ? '好眼力！留意闪光，亦可以㩒「提示」' : '好眼力！留意闪光，亦可以㩒 Q 睇提示'), 5); }
      }
    }
  } else if (state === 'end') {
    const k = ease(clamp01(st / 7)), a = st * .05 - .2, o = new V3(Math.sin(a) * 22, 4 + 10 * k, 6 + Math.cos(a) * 22);
    camera.position.lerpVectors(endFrom.pos, o, k);
    camera.quaternion.slerpQuaternions(endFrom.quat, lookQuat(camera.position, new V3(0, 2, -2)), Math.min(1, k * 1.4));
    POST.bars = Math.max(0, POST.bars - dt * 2);              // 收尾唔要电影黑边（平板 / 手机上会黑咗一大截）
    if (EMBED) POST.paper = clamp01((st - 3.2) / 2.5);       // 慢慢变返张图纸
  }
  // 倒计时（暂停时唔行）
  if ((state === 'play' || state === 'find') && !isPaused()) playT += dt;
  const pz = isPaused();
  if (pz !== wasPaused) { wasPaused = pz; $('paused').classList.toggle('on', pz); post({ type: 'pause', on: pz }); }   // 只喺变化时先改 DOM   // 第一幕嘅总用时都要扣返暂停
  if (SECONDS && (state === 'play' || state === 'find')) {
    timeLeft = Math.max(0, SECONDS - playT);
    const tm = $('timer'); tm.textContent = fmt(timeLeft); tm.classList.toggle('warn', timeLeft < 30);
    if (timeLeft <= 0 && state === 'play') timeUp();
  } else if (!SECONDS && (state === 'play' || state === 'find')) $('timer').textContent = fmt(playT);   // 单独玩：显示用时
  // 提示箭头
  const ha = $('hintArrow');
  if (hintT > 0 && hintIt && hintIt.center && state === 'play') {
    const v = hintIt.center.clone().project(camera), behind = v.z > 1;
    let x = v.x, y = v.y; if (behind) { x = -x; y = -y; }
    const on = !behind && Math.abs(x) < .85 && Math.abs(y) < .8, ang = Math.atan2(y, x);
    ha.style.opacity = on ? 0 : Math.min(1, hintT);
    ha.style.transform = `translate(-50%,-50%) translate(${Math.cos(ang) * 38}vmin, ${-Math.sin(ang) * 38}vmin) rotate(${-ang}rad)`;
  } else ha.style.opacity = 0;

  if (state === 'play') camera.fov = P.fov;
  else if (state === 'title' && !EMBED) camera.fov = 52;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  A.listen(camera);
}
let endFrom = null;
function startEnd() {
  state = 'end'; st = 0; endFrom = { pos: camera.position.clone(), quat: camera.quaternion.clone() };
  document.exitPointerLock && document.exitPointerLock();
  $('hud').classList.remove('on');
  $('end-time').textContent = EMBED ? '张纸条上嘅嘢全部搵齐，张图纸放返你出嚟喇' : `用时 ${fmt(playT)}`;
  setTimeout(() => $('end').classList.add('on'), 2200);
  setTimeout(() => A.chime(), 600);
  if (EMBED) setTimeout(() => post({ type: 'done' }), 6000);
}
function timeUp() {
  state = 'timeup'; document.exitPointerLock && document.exitPointerLock();
  const left = targets.filter(t => t.active && !t.found).map(t => t.word);
  post({ type: 'timeup', left });
  $('scrolls').hidden = true;
  if (!EMBED) { $('end-title').textContent = '时间到'; $('end-time').textContent = `仲有 ${left.length} 样未搵到：${left.join('、')}`; $('end').classList.add('on'); }
}

/* ======================= 图纸渲染 / 点击区导出 ======================= */
// ?shot=plan：以图纸视角、图纸画风渲染，并喺 console 输出每个词喺图上嘅矩形（第一幕用）
function planHits() {
  const W = innerWidth, H = innerHeight, out = [];
  const rect = box => {
    const pts = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const v = new V3(x, y, z).project(camera); pts.push([(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]);
    }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.max(0, Math.min(...xs)), y0 = Math.max(0, Math.min(...ys)), x1 = Math.min(W, Math.max(...xs)), y1 = Math.min(H, Math.max(...ys));
    return [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)];
  };
  const objBox = objs => { const b = new T.Box3(); [].concat(objs).forEach(o => b.expandByObject(o)); return b; };
  const B = (x0, y0, z0, x1, y1, z1) => new T.Box3(new V3(x0, y0, z0), new V3(x1, y1, z1));
  const pad = (b, p) => b.expandByScalar(p);
  // 超大件（撕唔郁）
  out.push(['big', '镬耳大屋', rect(B(-9.2, 0, -16, 9.2, 10.6, -7.4))]);
  out.push(['big', '大榕树', rect(B(-2.4, 4.5, -3.9, 12.4, 10, 10.9))]);
  // 大件词
  out.push(['w', '瓦檐口', rect(B(-8.6, .45, -10.9, 8.6, 4.9, -7.5))]);
  out.push(['w', '花阶砖', rect(B(-9, 0, -7.15, 9, .1, -4.85))]);
  out.push(['w', '琉璃瓦', rect(pad(B(-8.5, 4.78, -7.5, 8.5, 4.95, -7.3), .12))]);
  // 干扰物
  out.push(['d', '锦鲤', rect(B(-12.8, -.3, -4, -4.2, 0, 5))]);
  G.WINDOWS.forEach(w => out.push(['d', '满洲窗', rect(B(w.x - .65, 1, w.z - .2, w.x + .65, 4.1, w.z + .1))]));
  [-6.1, -3.1, 3.1, 6.1].forEach(x => out.push(['d', '灯笼', rect(B(x - .32, 3.2, -8.57, x + .32, 3.95, -7.93))]));
  out.push(['d', '簕杜鹃', rect(B(2.2, 2.4, 14, 12, 4.4, 15))]);
  out.push(['d', '鸡蛋花', rect(B(8.2, 1.2, -5, 11, 3.6, -2.2))]);
  // 细件词
  for (const t of targets) {
    if (t.kind === 'pick') out.push(['w', t.word, rect(pad(objBox(t.obj), .15))]);
  }
  out.push(['w', '瓦公仔', rect(pad(objBox(G.ridgeFigs), .1))]);
  out.push(['w', '太师椅', rect(B(-7.1, .45, -10.8, -5.1, 1.8, -10.1))]);
  out.push(['w', '龙牙蕉', rect(B(-14.6, 0, 11.6, -12.4, 3.6, 14))]);
  console.log('PLANHITS ' + JSON.stringify({ W, H, hits: out }));
}

// 图纸上嘅榕树画得疏啲，唔好遮住树下嘅嘢（只影响出图纸 / 扯入图纸前嗰一刻）
let fullLeaves = 0;
function planLook(on = true) {
  const L = G.banyanLeaves; if (!fullLeaves) fullLeaves = L.count; L.count = on ? Math.floor(fullLeaves * .1) : fullLeaves;
  const k = on ? 1 : 0;
  for (const t of targets) if (t.kind === 'pick') t.obj.scale.setScalar(1 + .8 * k);
  G.ridgeFigs.forEach(f => f.scale.setScalar(1 + .35 * k));
  G.BANANA_OBJ.scale.setScalar(1 + .6 * k);
  G.renderer.shadowMap.needsUpdate = true;
}

/* ======================= 截图 / 调试入口 ======================= */
// ?shot=title | plan | play&x=&z=&yaw=&pitch= | pick&w=词&t=2.5 | enter&t=3
if (SHOT) {
  const q = k => +(G.Q.get(k) || 0);
  $('title').classList.remove('on'); $('sys').classList.remove('on');
  if (SHOT === 'title' && !EMBED) $('title').classList.add('on');
  if (SHOT === 'plan') { state = 'plan'; targets.forEach(t => t.spark && (t.spark.visible = false)); planLook(); }
  if (SHOT === 'play' || SHOT === 'pick') {
    state = 'play'; POST.bars = 0; $('hud').classList.add('on');
    if (G.Q.has('x')) P.pos.set(q('x'), 0, q('z'));
    P.yaw = q('yaw'); P.pitch = q('pitch'); P.y = G.groundY(P.pos.x, P.pos.z);
  }
  G.debug = { P, targets, beginFind, get state() { return state; } };
}

/* ======================= 主循环 ======================= */
renderer().shadowMap.needsUpdate = true;
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min((now - last) / 1000, .05); last = now;
  if (SHOT) dt = G.Q.has('freeze') ? 0 : 1 / 60;
  update(dt);
  G.render();
}
G.renderer.compile(scene, camera);
if (SHOT === 'enter') { startEnter(); for (let k = 0; k < (+(G.Q.get('t') || 3)) * 60; k++) update(1 / 60); }
if (G.Q.has('sim')) for (let k = 0; k < +G.Q.get('sim') * 60; k++) update(1 / 60);
if (SHOT === 'pick') {
  const t = targets.find(x => x.word === G.Q.get('w')) || targets[0]; t.active = true;
  update(1 / 60); beginFind(t); for (let k = 0; k < (+(G.Q.get('t') || 2.5)) * 60; k++) update(1 / 60);
}
if (SHOT === 'plan') { update(1 / 60); G.render(); planHits(); }
if (G.Q.has('bench')) {
  const gl = G.renderer.getContext(), px = new Uint8Array(4), ts = [];
  for (let k = 0; k < 40; k++) { const t0 = performance.now(); update(1 / 60); G.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - t0); }
  ts.splice(0, 5); ts.sort((a, b) => a - b);
  console.log(`BENCH ${innerWidth}x${innerHeight}@${G.DPR} frame ms p50=${ts[ts.length >> 1].toFixed(1)} p90=${ts[Math.floor(ts.length * .9)].toFixed(1)}`);
}
requestAnimationFrame(frame);
$('loading').classList.add('off');
if (SHOT) { document.body.classList.add('shot'); $('loading').style.display = 'none'; }
if (!SHOT) {
  if (EMBED) {
    $('sys-text').innerHTML = `要喺 <b>${fmt(SECONDS)}</b> 之内搵齐纸条上仲未搵到嘅 <b>${NEED.length}</b> 样嘢，先可以离开呢张图纸。<br>${TOUCH ? '对准纸条上嘅嘢㩒 <b>「拾」</b>；唔识揾就㩒 <b>提示</b>。' : '对准纸条上嘅嘢㩒 <b>E</b>；唔识揾就㩒 <b>Q</b>。'}`;
    $('sys').classList.add('on'); planLook();
  } else { $('title').classList.add('on'); $('timer').textContent = '00:00'; }
}
updCount();
post({ type: 'ready' });
})();
