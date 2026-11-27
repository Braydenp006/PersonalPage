// Projects page: a dot you click to set off a big bang, then a guided orbit round a system of planets (one per <li> in #list).
import * as THREE from 'three';
import { buildZ420 } from './z420.js';
import { buildMyPc } from './my-pc.js?v=32';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);

const renderer = new THREE.WebGLRenderer({ canvas: $('#sky'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
const resize = () => { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
addEventListener('resize', resize); resize();

// ---------- helpers ----------
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, '#fff'); r.addColorStop(.25, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const glow = (color, size, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(size); return s;
};
// Surface texture: bands for gas giants, blotches for the rest; seeded so a planet looks the same each load.
function surface(color, kind, seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, 256, 128);
  let s = seed * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < (kind === 'gas' ? 45 : 170); i++) {
    const l = rnd() > .5 ? 255 : 0; g.fillStyle = `rgba(${l},${l},${l},${.05 + rnd() * .1})`;
    if (kind === 'gas') g.fillRect(0, rnd() * 128, 256, 2 + rnd() * 10);
    else { g.beginPath(); g.arc(rnd() * 256, rnd() * 128, 3 + rnd() * 18, 0, 7); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- the scene ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
scene.add(new THREE.PointLight(0xfff0d8, 16, 0, 1));   // the sun, at the origin
const sun = glow(0xffd9a0, 3); scene.add(sun);
// The starting star is hand-pixelled: a 48x48 canvas, drawn crisp (nearest-neighbour), shaded like a little sphere (its highlight
// leans towards the cursor), with a rim that flickers and thin spikes.
const N = 48, pc = document.createElement('canvas'); pc.width = pc.height = N;
const pg = pc.getContext('2d'), pixTex = new THREE.CanvasTexture(pc);
pixTex.magFilter = pixTex.minFilter = THREE.NearestFilter; pixTex.generateMipmaps = false;
function drawPix(q, lx, ly) {
  pg.clearRect(0, 0, N, N);
  const L = new THREE.Vector3(lx, ly, .8).normalize(), B = .6;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x - N / 2 + .5) / (N / 2), dy = (y - N / 2 + .5) / (N / 2), d = Math.hypot(dx, dy), r = (((x * 73856093) ^ (y * 19349663) ^ (q * 83492791)) >>> 0) % 100 / 100;
    let c = null;
    if (d < B) {
      const nx = dx / B, ny = dy / B, nz = Math.sqrt(1 - nx * nx - ny * ny), t = Math.max(0, nx * L.x + ny * L.y + nz * L.z) * .85 * Math.pow(nz, .3) + .15 + (r - .5) * .1;
      c = t > .8 ? '#fffbe8' : t > .62 ? '#ffe48a' : t > .45 ? '#ffb050' : t > .3 ? '#f27a2a' : '#b8431c';
    } else if (d < B + .18 && r < .6 * (1 - (d - B) / .18)) c = r < .25 ? '#ff9f45' : '#c4582a';
    else if ((Math.abs(dx) < .035 || Math.abs(dy) < .035) && d < .95 && r < 1.1 - d) c = '#ffd9a0';
    if (c) { pg.fillStyle = c; pg.fillRect(x, y, 1, 1); }
  }
  pixTex.needsUpdate = true;
}
const pix = new THREE.Sprite(new THREE.SpriteMaterial({ map: pixTex, transparent: true, depthWrite: false })); pix.scale.setScalar(2.2); scene.add(pix);
let pixQ = -1;
// The cursor is the second particle: a small pixel star that follows the pointer; when it touches the big one, that sets the bang off.
const cc = document.createElement('canvas'); cc.width = cc.height = 16; const cg = cc.getContext('2d');
for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
  const d = Math.hypot(x - 7.5, y - 7.5), col = d < 2.2 ? '#ffffff' : d < 4 ? '#7fe8ff' : d < 6 && (x + y) % 2 ? '#3a7fff' : null;
  if (col) { cg.fillStyle = col; cg.fillRect(x, y, 1, 1); }
}
const curTex = new THREE.CanvasTexture(cc); curTex.magFilter = curTex.minFilter = THREE.NearestFilter; curTex.generateMipmaps = false;
const cur = new THREE.Sprite(new THREE.SpriteMaterial({ map: curTex, transparent: true, depthWrite: false })); cur.scale.setScalar(.34); cur.visible = false; scene.add(cur);
const curGlow = glow(0x5fb8ff, 3.2, .6); cur.add(curGlow);
const ptr = { x: 0, y: 0, seen: false }, plane = new THREE.Plane(), camDir = new THREE.Vector3(), hitP = new THREE.Vector3();
document.body.classList.add('dotc');   // hide the real cursor: the particle stands in for it
// Expanding ring, used for the big shockwave.
const waveTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 50, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.7, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
})();
const wave = c => new THREE.Sprite(new THREE.SpriteMaterial({ map: waveTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
const bigWave = wave(0xffe6b0); scene.add(bigWave);
// The afterglow of the bang: a blinding lilac core, a horizontal lens streak, purple nebula clouds and tiny galaxies.
// All additive sprites; they dim as the camera pulls away (see `afterglow` in the loop).
const cloudTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const x = 128 + (Math.random() - .5) * 150, y = 128 + (Math.random() - .5) * 150, r = 20 + Math.random() * 50, q = g.createRadialGradient(x, y, 0, x, y, r);
    q.addColorStop(0, `rgba(255,255,255,${.05 + Math.random() * .1})`); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(c);
})();
const afterglow = new THREE.Group(); afterglow.visible = false; scene.add(afterglow);
const AG = [];   // [sprite, base opacity]
const ag = (map, color, pos, sx, sy, op, rot = 0) => {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, rotation: rot }));
  m.position.copy(pos); m.scale.set(sx, sy, 1); afterglow.add(m); AG.push([m, op]); return m;
};
const O = new THREE.Vector3(), flare = ag(glowTex, 0xd9c2ff, O, 22, 22, 1), streak = ag(glowTex, 0xc9a8ff, O, 120, 2.4, 1), streak2 = ag(glowTex, 0xffffff, O, 60, .8, 1);
const hot = ag(glowTex, 0xffffff, O, 9, 9, 1);
const hues = [0x9a5cff, 0xc26bd8, 0x6f6ad8, 0xd078b8];
for (let i = 0; i < 16; i++) ag(cloudTex, hues[i % 4], new THREE.Vector3().randomDirection().multiplyScalar(4 + Math.random() * 26), 14 + Math.random() * 22, 14 + Math.random() * 22, .35, Math.random() * 6.3);
for (let i = 0; i < 28; i++) ag(glowTex, [0xffc38a, 0xffffff, 0xbcd6ff][i % 3], new THREE.Vector3().randomDirection().multiplyScalar(8 + Math.random() * 40), .8 + Math.random() * 1.6, .3 + Math.random() * .6, .9, Math.random() * 3.14);
const core = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff4e0 })); scene.add(core);

// Background stars (fade in with the bang) and the blast debris (flies out, then drifts to a stop as dust).
function points(n, spread, size, atten, opacity) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(spread[0] + Math.random() * (spread[1] - spread[0]));
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size, sizeAttenuation: atten, color: 0xffffff, map: glowTex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const p = new THREE.Points(g, m); scene.add(p); return p;
}
const stars = points(2500, [150, 400], 4, false, 0);
const DUST_N = 2500;
const dust = points(DUST_N, [0, 0.01], .5, true, 0);
const dustV = Array.from({ length: DUST_N }, () => new THREE.Vector3().randomDirection().multiplyScalar(15 + Math.random() * 45));

// The Arcade planet IS this cabinet (boxes), floating and turning like any planet. Front faces +z; about 2.1 units tall before scaling.
function cabinet(h) {
  const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({ color: 0x241a4a, roughness: .6 });
  const box = (w, hh, d, x, y, z, mat, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  const sc = document.createElement('canvas'); sc.width = 64; sc.height = 48; const x = sc.getContext('2d');
  x.fillStyle = '#05040f'; x.fillRect(0, 0, 64, 48);
  x.fillStyle = '#fff'; for (let i = 0; i < 24; i++) x.fillRect((i * 37) % 64, (i * 23) % 48, 1, 1);
  x.fillStyle = '#7fe8ff'; x.fillRect(30, 38, 4, 3); x.fillRect(31, 35, 2, 3);                  // the ship
  x.fillStyle = '#ff9f5a'; x.fillRect(12, 10, 6, 6); x.fillRect(44, 18, 5, 5); x.fillRect(26, 6, 4, 4);   // meteors
  const st = new THREE.CanvasTexture(sc); st.magFilter = st.minFilter = THREE.NearestFilter; st.colorSpace = THREE.SRGBColorSpace;
  box(1, 1, .9, 0, .5, 0, dark);                                                                   // lower body
  box(1.04, .12, .5, 0, 1.04, .42, new THREE.MeshStandardMaterial({ color: 0x3a2f7a }), -.28);     // control panel
  box(1, .95, .55, 0, 1.5, -.12, dark);                                                            // screen housing
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.84, .66), new THREE.MeshBasicMaterial({ map: st }));
  scr.position.set(0, 1.5, .17); scr.rotation.x = -.12; g.add(scr); g.userData.screen = scr;
  box(1.06, .24, .6, 0, 2.08, -.1, new THREE.MeshBasicMaterial({ color: 0xff5fd2 }));              // glowing marquee
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .22), dark); stick.position.set(-.22, 1.17, .45); g.add(stick);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff3a3a })); ball.position.set(-.22, 1.3, .45); g.add(ball);
  [.12, .3].forEach(bx => { const b = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe14a })); b.position.set(bx, 1.1, .46); g.add(b); });
  const sg = glow(0x7fe8ff, 2.2, .45); sg.position.set(0, 1.5, .5); g.add(sg);
  g.scale.setScalar(h / 2.2); return g;
}

// Phisher is a literal fish, nose towards +x with its flank to +z, plus the hook it has been caught on. `tail` is what wags.
function fish(size, color) {
  const g = new THREE.Group(), c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const grad = x.createLinearGradient(0, 0, 0, 64); grad.addColorStop(0, '#7a1f18'); grad.addColorStop(.5, color); grad.addColorStop(1, '#ffe2cf');
  x.fillStyle = grad; x.fillRect(0, 0, 64, 64); x.strokeStyle = 'rgba(0,0,0,.18)';
  for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) { x.beginPath(); x.arc(q * 8 + (r % 2) * 4, r * 8 + 8, 5, Math.PI, 0); x.stroke(); }   // scales
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const skin = new THREE.MeshStandardMaterial({ map: tx, roughness: .45 }), fin = new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: .6, side: THREE.DoubleSide });
  const part = (geo, mat, pos, sc, rot = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos.map(p => p * size)); m.scale.set(...sc); m.rotation.set(...rot); g.add(m); return m; };
  part(new THREE.SphereGeometry(size, 40, 28), skin, [0, 0, 0], [1.3, .75, .45]);                                   // body
  const tail = new THREE.Group(); tail.position.x = -1.2 * size; g.add(tail);
  const t = new THREE.Mesh(new THREE.ConeGeometry(.8 * size, 1.1 * size, 4), fin); t.rotation.z = -Math.PI / 2; t.position.x = -.5 * size; t.scale.set(1, 1, .25); tail.add(t);   // tail fin
  part(new THREE.ConeGeometry(.45 * size, .8 * size, 4), fin, [-.1, .72, 0], [1, 1, .2], [0, 0, -.25]);               // dorsal fin
  part(new THREE.ConeGeometry(.25 * size, .6 * size, 4), fin, [.2, -.5, .3], [1, 1, .2], [0, 0, Math.PI + .5]);       // belly fin
  part(new THREE.ConeGeometry(.28 * size, .6 * size, 4), fin, [.1, -.1, .42], [1, 1, .2], [0, 0, Math.PI / 2 + .6]);  // flank fin
  part(new THREE.SphereGeometry(.17 * size, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }), [.78, .18, .36], [1, 1, 1]);   // eye
  part(new THREE.SphereGeometry(.09 * size, 12, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }), [.82, .18, .47], [1, 1, 1]);
  part(new THREE.TorusGeometry(.3 * size, .035 * size, 8, 24, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: 0xcfd4dc, metalness: .8, roughness: .3 }), [1.45, -.05, 0], [1, 1, 1], [0, 0, Math.PI * .4]);   // the hook
  g.userData.tail = tail; return g;
}

// God's hand: a flattened-sphere palm, four fingers and a thumb (capsule chains) curled round a ball 1.5 units across, ball centre at (0,-1.9,0).
function godHand() {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0xf3d9b8, roughness: .55, emissive: 0x7a5528, emissiveIntensity: .7 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z), up = V(0, 1, 0);
  const add = m => { g.add(m); return m; };
  const limb = (a, b, r) => {
    const d = b.clone().sub(a), L = d.length(), m = add(new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(L - 2 * r, .01), 6, 12), mat));
    m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(up, d.normalize());
  };
  const chain = (pts, rs) => pts.slice(1).forEach((p, i) => limb(pts[i], p, rs[i]));
  add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat)).scale.set(1.75, .55, 1.75);   // palm
  [[-1.2, .9], [-.4, 1.05], [.4, 1], [1.2, .8]].forEach(([x, l]) => chain([V(x, -.1, 1.45), V(x, -1.3 * l, 1.9), V(x, -2.3 * l, 1.65), V(x, -2.9 * l, 1.35)], [.3, .27, .24]));
  chain([V(.6, -.1, -1.4), V(.5, -1.2, -1.9), V(.3, -2.3, -1.6), V(.1, -2.8, -1.3)], [.36, .32, .28]);   // thumb, opposite the fingers
  limb(V(0, .2, -.8), V(0, 60, -.8), 1.05);                                                                 // forearm, off the top of the screen
  limb(V(0, 7, -.8), V(0, 60, -.8), 1.5);                                                                   // sleeve
  const halo = glow(0xffe2a8, 12, .5); add(halo);
  const beam = glow(0xffe2a8, 1, .25); beam.scale.set(10, 80, 1); beam.position.y = 38; add(beam);
  g.rotation.y = .9; g.visible = false; scene.add(g); return g;
}

// One planet per list item.
const items = [...document.querySelectorAll('#list > li')];
const labels = $('#labels');
const planets = items.map((li, i) => {
  const color = li.dataset.c, size = +li.dataset.s, kind = li.dataset.k;
  const god = li.hasAttribute('data-hand'), hand = god ? godHand() : null;
  if (god) hand.scale.setScalar(size / 1.5);
  const R = 8 + i * 1.9, pivot = new THREE.Group();
  pivot.rotation.x = (Math.sin(i * 7.3)) * .22; pivot.rotation.z = Math.cos(i * 3.1) * .12;   // tilted, so the system is properly 3D
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 40, 28),
    new THREE.MeshStandardMaterial({ map: surface(color, kind, i + 1), roughness: .85, metalness: 0, visible: !['arcade', 'model', 'pc', 'fish', 'server'].includes(kind) }));   // those five draw their own model; the sphere is just the click target
  mesh.add(glow(color, size * 3.4, .3));
  let cab = null;
  if (kind === 'arcade') { cab = cabinet(size * 2.1); cab.position.y = -size * 1.05; mesh.add(cab); }
  let faceOff = 0, tail = null;
  if (kind === 'fish') { cab = fish(size, color); tail = cab.userData.tail; cab.scale.setScalar(.8); mesh.add(cab); }
  if (kind === 'server') {   // my Z420 (js/z420.js, the How it runs model) with its side panel off so the insides show; that open side faces the camera when picked
    const z = new THREE.Group(), { hinge } = buildZ420(z); hinge.parent && hinge.parent.remove(hinge);
    const box = new THREE.Box3().setFromObject(z), d = box.getSize(new THREE.Vector3());
    z.position.sub(box.getCenter(new THREE.Vector3()));
    cab = new THREE.Group(); cab.add(z); cab.scale.setScalar(size * 2.4 / Math.max(d.x, d.y, d.z)); mesh.add(cab); faceOff = Math.PI / 2;
  }
  if (kind === 'pc') {   // my own PC (js/my-pc.js, the Other work page's build) is the planet: centred, fitted to the planet's size, glass side to the camera when picked
    const pc = buildMyPc(renderer), box = new THREE.Box3().setFromObject(pc);
    pc.traverse(o => { if (o.isPointLight) o.intensity = 0; });   // its inner lights are tuned for the Other work page's scale
    pc.position.sub(box.getCenter(new THREE.Vector3()));
    cab = new THREE.Group(); cab.add(pc); cab.scale.setScalar(size * 2.1 / box.getSize(new THREE.Vector3()).y); mesh.add(cab); faceOff = Math.PI / 2;
  }
  if (kind === 'model') new GLTFLoader().load(li.dataset.model, ({ scene: m }) => {   // fitted to a ball of radius `size`
    const sp = new THREE.Box3().setFromObject(m).getBoundingSphere(new THREE.Sphere()), w = new THREE.Group();
    m.position.sub(sp.center); w.add(m); w.scale.setScalar(size / sp.radius); mesh.add(w); mesh.userData.head = w;
  }, undefined, () => { mesh.material.visible = true; });   // model failed to load: show a plain planet instead
  if (kind === 'ring') {
    const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.5, size * 2.3, 64), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: .5 }));
    ring.rotation.x = Math.PI / 2 - .35; mesh.add(ring);
  }
  const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, k) => new THREE.Vector3(Math.cos(k / 128 * 6.2832) * R, 0, Math.sin(k / 128 * 6.2832) * R))),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .1 }));
  pivot.add(orbit, mesh); pivot.visible = false; scene.add(pivot);
  const lbl = document.createElement('button'); lbl.type = 'button'; lbl.className = 'lbl'; lbl.textContent = li.querySelector('h2').textContent;
  lbl.addEventListener('click', () => focus(i)); labels.append(lbl);
  return { tail, faceOff, cab, screen: cab && cab.userData.screen, face: 0, god, hand, placed: !god, mesh, pivot, orbit, delay: i * .17, R, size, a: i * 2.4, w: 1.1 * Math.pow(R, -1.5), lbl, pos: new THREE.Vector3() };
});

// ---------- state ----------
let zoomed = false, phase = 'dot', t0 = 0, sel = -1, hover = -1, ang = .6, el = .45, mx = 0, my = 0;
const camPos = new THREE.Vector3(0, 1.2, 6), camLook = new THREE.Vector3();
const want = new THREE.Vector3(), wantLook = new THREE.Vector3();

function bang() {
  if (phase !== 'dot') return;
  phase = 'bang'; t0 = performance.now() / 1000; $('#bang').classList.add('gone'); cur.visible = false; document.body.classList.remove('dotc');
  $('#flash').animate([{ opacity: 0 }, { opacity: 1, offset: .05 }, { opacity: .9, offset: .25 }, { opacity: 0 }], { duration: reduce ? 300 : 2800, easing: 'ease-out' });
  afterglow.visible = true;
  planets.forEach(p => { p.pivot.visible = true; p.placed = !p.god; });
  const a = dust.geometry.attributes.position.array; a.fill(0);   // debris starts at the origin
  dust.material.opacity = .8; stars.material.opacity = 0;
}
$('#bang').addEventListener('click', bang);

const panel = $('#panel');
function focus(i) {
  if (phase !== 'orbit') return;
  i = (i + planets.length) % planets.length;
  if (!planets[i].placed) return;   // willbot isn't down yet
  zoomed = false; sel = i;
  $('#panel-body').innerHTML = items[sel].innerHTML; panel.hidden = false;
  planets.forEach((p, k) => p.lbl.classList.toggle('sel', k === sel));
}
function unfocus() { zoomed = false; sel = -1; panel.hidden = true; planets.forEach(p => p.lbl.classList.remove('sel')); }
$('#prev').onclick = () => focus(sel - 1);
$('#next').onclick = () => focus(sel + 1);
$('#back').onclick = unfocus;
const cab = $('#cab'), frame = $('#cab-frame');
function play(href, title) {   // zoom the camera into the screen first, then the game fills it
  zoomed = true; panel.hidden = true;
  setTimeout(() => { if (!zoomed) return; $('#cab-title').textContent = title; frame.src = href; cab.hidden = false; $('#cab-x').focus(); }, reduce ? 0 : 1300);
}
function stopGame() { cab.hidden = true; frame.src = 'about:blank'; zoomed = false; if (sel >= 0) panel.hidden = false; }
frame.addEventListener('load', () => { if (!cab.hidden) frame.focus(); });   // so the game gets the keyboard
$('#cab-x').onclick = stopGame;
$('#panel-body').addEventListener('click', e => { const a = e.target.closest('a[data-play]'); if (a) { e.preventDefault(); play(a.href, a.textContent); } });
addEventListener('keydown', e => {
  if (!cab.hidden) { if (e.key === 'Escape') stopGame(); return; }
  if (e.key === 'Escape') unfocus();
  else if (e.key === 'ArrowRight') focus(sel + 1);
  else if (e.key === 'ArrowLeft') focus(sel < 0 ? -1 : sel - 1);
});

// hover + click on the planets themselves
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pick = e => {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  const hit = ray.intersectObjects(planets.map(p => p.mesh), false)[0];
  return hit ? planets.findIndex(p => p.mesh === hit.object) : -1;
};
addEventListener('pointermove', e => {
  mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; ptr.x = e.clientX; ptr.y = e.clientY; ptr.seen = true;
  if (phase === 'orbit') { hover = pick(e); $('#sky').style.cursor = hover >= 0 ? 'pointer' : ''; }
});
$('#sky').addEventListener('click', e => { if (phase === 'orbit') { const i = pick(e); if (i >= 0) focus(i); } });

// ---------- loop ----------
let last = performance.now() / 1000;
const v = new THREE.Vector3(), qa = new THREE.Quaternion(), HEAD_FIX = new THREE.Quaternion();   // HEAD_FIX: spin about y if the model's front isn't +z
renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000, dt = Math.min(now - last, .1), bt = now - t0; last = now;
  const pulse = 1 + .08 * Math.sin(now * 2.2);

  const pq = Math.floor(now * 14); if (pq !== pixQ) { pixQ = pq; if (phase === 'dot' || bt < .6) drawPix(pq >> 1, -.3 + mx * 1.6, -.35 + my * 1.6); }
  if (phase === 'dot') {
    // the cursor particle sits where the pointer is (on the plane through the star); touching the star is the collision
    let prox = 0;
    if (ptr.seen) {
      ndc.set(ptr.x / innerWidth * 2 - 1, -(ptr.y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
      cam.getWorldDirection(camDir); plane.setFromNormalAndCoplanarPoint(camDir, scene.position);
      if (ray.ray.intersectPlane(plane, hitP)) cur.position.copy(hitP);
      cur.visible = true;
      const R = .089 * innerHeight, dist = Math.hypot(ptr.x - innerWidth / 2, ptr.y - innerHeight / 2);   // R: the star's body, in pixels (it is ~6 units away)
      prox = clamp(1 - dist / (3 * R));
      if (dist < R) bang();
    }
    pix.scale.setScalar(2.2 * (1 + .03 * Math.sin(now * 2.2) + .08 * prox)); sun.visible = core.visible = false;
  }
  else {
    sun.visible = core.visible = true;
    // the pixel star blows itself apart, and a shockwave rolls out through the whole scene
    pix.visible = bt < .5; pix.scale.setScalar(2.2 * (1 + bt * 16)); pix.material.opacity = 1 - bt * 2;
    bigWave.material.opacity = .7 * (1 - clamp(bt / 2)); bigWave.scale.setScalar(2 + 90 * easeOut(clamp(bt / 2)));
    // afterglow: full blaze at the start, dimming as the camera zooms out; the nebula drifts outward a little
    const b = reduce ? 0 : Math.pow(clamp(1 - (bt - .3) / 4.5), 1.5);
    afterglow.visible = b > 0.002;
    AG.forEach(([m, op]) => m.material.opacity = op * b);
    flare.scale.setScalar(22 * (1 + bt * .15)); afterglow.scale.setScalar(1 + bt * .06);
    const dur = reduce ? .01 : 2.4;
    planets.forEach((p, i) => {
      // each planet glides straight out from the centre to its orbit, growing as it goes, with one ease in / ease out
      // willbot is the exception: God's hand carries it down from above and sets it on its orbit (gt = seconds since the hand appeared)
      const G = p.god && !reduce, gt = bt - 3.2, GD = 2.4;
      const u = G ? clamp(gt / GD) : clamp((bt - (reduce ? 0 : p.delay)) / dur), r = G ? p.R : p.R * easeInOut(u), e = G ? (gt > 0 ? 1 : 0) : easeInOut(u);
      if (!reduce) p.a += p.w * dt;
      const th = p.a;
      p.mesh.position.set(Math.cos(th) * r, G ? 36 * (1 - easeInOut(u)) : 0, Math.sin(th) * r); p.mesh.scale.setScalar(Math.max(e, 0.001));
      if (p.god) p.placed = !G || gt >= GD;
      p.orbit.geometry.setDrawRange(0, Math.ceil(129 * easeInOut(clamp((u - .25) / .75)))); p.orbit.visible = u > .25;
      p.mesh.rotation.y += dt * .4;
      if (p.tail) p.tail.rotation.y = Math.sin(now * 5) * .35;   // the fish wags
      if (p.cab) {   // turns like a planet, but swings round to face the camera side when picked
        p.face += ((sel === i ? 1 : 0) - p.face) * (1 - Math.exp(-dt * 4));
        const a0 = p.mesh.rotation.y, d = ((Math.atan2(-Math.cos(th), -Math.sin(th)) + p.faceOff - a0 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        p.cab.rotation.y = d * p.face;
      }
      p.mesh.children[0].visible = i !== sel;   // the halo would flood the screen up close
      p.mesh.getWorldPosition(p.pos);
      if (p.god) {   // hand rides with the planet, lets go, then pulls back up out of frame
        const w = clamp((gt - GD - .4) / 1.5), k = p.hand.scale.x;
        p.hand.visible = G && gt > 0 && w < 1;
        p.hand.position.copy(p.pos); p.hand.position.y += 1.9 * k + 45 * w * w;
      }
    });
    sun.scale.setScalar((3 + 2 * clamp(bt)) * pulse * (1 + 2 * Math.exp(-bt * 5))); core.scale.setScalar(.6 + .6 * clamp(bt));
    stars.material.opacity = clamp(bt / 3);
    // debris: blast out fast, then slow right down and hang there as dust
    const a = dust.geometry.attributes.position.array, k = Math.exp(-dt * 1.3);
    for (let i = 0; i < DUST_N; i++) {
      a[i * 3] += dustV[i].x * dt; a[i * 3 + 1] += dustV[i].y * dt; a[i * 3 + 2] += dustV[i].z * dt;
      dustV[i].multiplyScalar(k);
    }
    dust.geometry.attributes.position.needsUpdate = true;
    if (phase === 'bang' && bt > (reduce ? .3 : 2.6)) { phase = 'orbit'; labels.classList.add('on'); }
  }

  // camera: slow orbit round the whole system, or glide to the chosen planet
  if (sel < 0) {
    if (!reduce && phase !== 'dot') ang += dt * .05;
    const D = phase === 'dot' ? 6 : 38, a = ang + mx * .5, b = el - my * .3;
    want.set(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).multiplyScalar(D);
    wantLook.set(0, 0, 0);
  } else {
    const p = planets[sel], dist = p.size * 4 + 3;
    if (zoomed && p.cab) {   // Play pressed: fly right up to the cabinet's screen
      p.screen.getWorldPosition(wantLook); v.set(-p.pos.x, 0, -p.pos.z).normalize(); want.copy(wantLook).addScaledVector(v, 1.7); want.y += .55;   // a touch above, so the joystick doesn't block the screen
    } else {
    v.copy(p.pos).normalize();                       // from the sun outwards: camera sits on the sun side, so the planet is lit
    want.copy(p.pos).addScaledVector(v, -dist).y += p.size * 1.2;
    const fwd = p.pos.clone().sub(want).normalize(), right = fwd.cross(cam.up).normalize();
    wantLook.copy(p.pos).addScaledVector(right, dist * .45);   // planet sits left of centre, clear of the panel
    }
  }
  const f = 1 - Math.exp(-dt * (phase === 'bang' ? 1.1 : 2.2));
  camPos.lerp(want, f); camLook.lerp(wantLook, f);
  cam.position.copy(camPos);
  if (phase === 'bang' && !reduce) cam.position.addScalar((Math.random() - .5) * .8 * Math.exp(-bt * 3));   // shake from the blast
  cam.lookAt(camLook);

  // labels follow their planets
  if (phase === 'orbit') planets.forEach((p, i) => {
    v.copy(p.pos).y += p.size + .6; v.project(cam);
    p.lbl.style.display = v.z < 1 && p.placed ? '' : 'none';
    p.lbl.style.transform = `translate(${(v.x * .5 + .5) * innerWidth}px,${(-v.y * .5 + .5) * innerHeight}px) translate(-50%,-100%)`;
    p.lbl.classList.toggle('hot', i === hover);
  });
  // the willbot head never turns away: its quaternion is the camera's (in the parent's space), so it always looks out of the screen
  planets.forEach(p => { const h = p.mesh.userData.head; if (h) h.quaternion.copy(p.mesh.getWorldQuaternion(qa).invert()).multiply(cam.quaternion).multiply(HEAD_FIX); });
  renderer.render(scene, cam);
});
