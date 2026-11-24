// My own PC, built from shapes sized from each part's spec sheet (metres; x across with the glass on -x, y up, z to the
// front; the origin is the middle of the case body). Used by other-work.js as the featured build.
//   Case Jonsbo D32 Pro (384 x 207 x 302, PSU chamber at the front, radiator at the top), ASRock B550M Pro4, Ryzen 5 3600X
//   under a Cooler Master MasterLiquid 240L Core, 4 x Corsair Vengeance RGB Pro, Gigabyte RTX 3080 Ti Gaming OC,
//   EVGA SuperNOVA 850 GT, Samsung 870 Evo 2.5", Kingston NV3 M.2.
// Lit the way I run it: the fans warm white, the RAM white / orange / white / orange.
// userData.pivot / turn: a part that turns as it comes out (the PSU and graphics card show their fans), by turn
// (radians about x, y, z) on its pivot, a group at the part's middle.
// Every part is a group straight under the root with userData.out: where it moves to when the PC opens up (explodePc),
// userData.order: when it comes off (0 first), and for the named ones userData.label (what the tags on it say) and
// userData.anchor (the point the tag's line points at, inside the part).
// Glowing materials carry userData.glow (their full emissiveIntensity); the lights inside carry userData.range (metres),
// which other-work.js scales to the model's size on screen each frame.
// shortcut: fan count/places (2 on the radiator, 1 rear, 3 bottom) and the SSD's spot are read off one photo; fix them
// here if the real PC differs.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const WARM = 0xffcf9a, ORANGE = 0xff5a12, WHITE = 0xfff4ea;
const W = .207, H = .302, D = .384, T = .003;
const X0 = -W / 2 + T, Y0 = -H / 2 + T, Y1 = H / 2 - T, Z0 = -D / 2 + T, Z1 = D / 2 - T;   // the inside walls
const PX = 4000;   // canvas pixels per metre (4 per mm)
const TRAY = .082, BX = TRAY - .0076;   // the motherboard tray, and the board's front face (6 mm standoffs, 1.6 mm PCB)
const ZB = -.18, YB = .12;              // the board's rear and top edges; board(u, v) is u from the rear edge, v down from the top
const bz = u => ZB + u, by = v => YB - v;
let seed = 11;
const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;

function paint(cw, ch, draw, srgb = true){
  const c = document.createElement('canvas');
  c.width = Math.round(cw); c.height = Math.round(ch);
  draw(c.getContext('2d'), c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  if(srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const mat = (color, roughness = .6, metalness = 0, more = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...more });
const glowMat = (color, k, more = {}) => { const m = mat(color, .45, 0, { emissive: color, emissiveIntensity: k, ...more }); m.userData.glow = k; return m; };

const M = {
  shell: mat(0x16171a, .42, .75),            // black anodised aluminium
  inside: mat(0x0d0e10, .7, .4),
  rubber: mat(0x1c1d1f, .9),
  plastic: mat(0x141517, .55, .05),
  pcb: mat(0x121315, .55, .1),
  silver: mat(0xa9aeb5, .32, .9),            // the board's brushed heatsinks
  steel: mat(0xc4c8cd, .28, .95),
  blackMetal: mat(0x101113, .4, .7),
  sleeve: mat(0x101012, .75, .05),
  fanFrame: mat(0x111214, .6, .05),
  hub: mat(0x1a1b1d, .5, .1),
  bladeDark: mat(0x161719, .5, .05, { side: THREE.DoubleSide }),
  ramWhite: glowMat(WHITE, 1.6),
  ramOrange: glowMat(ORANGE, 1.9),
  ring: glowMat(WARM, 2.2),
};
// fan blades: milky plastic lit from the hub, brightest near it (uv.x is 0 at the hub, 1 at the tip)
M.bladeLit = glowMat(0xf3ede4, 1.25, { side: THREE.DoubleSide, roughness: .5, emissive: WARM,
  emissiveMap: paint(64, 4, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(.5, '#b9b9b9'); gr.addColorStop(1, '#6c6c6c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) });
// sleeved cables and tubes: a fine diagonal braid
const braid = paint(64, 64, (g, w, h) => {
  g.fillStyle = '#161618'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2c2d31'; g.lineWidth = 3;
  for(let i = -h; i < w; i += 8){ g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
});
braid.wrapS = braid.wrapT = THREE.RepeatWrapping;

const place = (parent, o, pos, rot) => { o.position.set(...pos); if(rot) o.rotation.set(...rot); parent.add(o); return o; };
const add = (parent, geo, m, pos, rot) => place(parent, new THREE.Mesh(geo, m), pos, rot);
const box = (parent, size, m, pos, rot) => add(parent, new THREE.BoxGeometry(...size), m, pos, rot);
const AXIS = { x: [0, 0, Math.PI / 2], y: null, z: [Math.PI / 2, 0, 0] };
const cyl = (parent, r, len, m, pos, axis = 'y', seg = 40) => add(parent, new THREE.CylinderGeometry(r, r, len, seg), m, pos, AXIS[axis]);
// plane facings: text on them reads towards +z (or +x on the front), upright
const FACE = { glass: [0, -Math.PI / 2, 0], right: [0, Math.PI / 2, 0], front: null, rear: [0, Math.PI, 0], up: [-Math.PI / 2, 0, -Math.PI / 2], down: [Math.PI / 2, 0, Math.PI / 2] };
// a printed or lit surface: a plane w x h with a canvas drawn at 4 px/mm (`glow` draws what lights up)
function decal(parent, w, h, draw, pos, face, { glow, k = 1.4, alpha = true, rough = .5, metal = .3, res = 1 } = {}){
  const map = paint(w * PX * res, h * PX * res, draw);
  const m = mat(0xffffff, rough, metal, { map, alphaTest: alpha ? .4 : 0 });
  if(glow){ m.emissive.set(0xffffff); m.emissiveMap = paint(w * PX, h * PX, glow); m.emissiveIntensity = k; m.userData.glow = k; }
  return add(parent, new THREE.PlaneGeometry(w, h), m, pos, FACE[face]);
}
const text = (g, s, x, y, px, color, font = 'bold', align = 'center') => { g.font = `${font} ${px}px "Helvetica Neue", Arial, sans-serif`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); };
// perforated sheet: square holes on a 6.5 mm pitch with a solid border; keep(u, v) says which holes are cut
function perforated(parent, w, h, pos, face, keep = () => true){
  const alphaMap = paint(w * PX, h * PX, (g, cw, ch) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#000';
    const p = .0065 * PX, s = .0045 * PX, m = .01 * PX, nx = Math.floor((cw - 2 * m - s) / p) + 1, ny = Math.floor((ch - 2 * m - s) / p) + 1;
    const ox = (cw - (nx - 1) * p - s) / 2, oy = (ch - (ny - 1) * p - s) / 2;
    for(let i = 0; i < nx; i++) for(let j = 0; j < ny; j++) if(keep(i / (nx - 1), j / (ny - 1))) g.fillRect(ox + i * p, oy + j * p, s, s);
  }, false);
  const m = M.shell.clone();
  Object.assign(m, { alphaMap, alphaTest: .5, side: THREE.DoubleSide });
  return add(parent, new THREE.PlaneGeometry(w, h), m, pos, FACE[face]);
}

// one blade, pitched: points lean by how far round the blade they are; uv.x runs hub to tip for the glow
function bladeGeometry(r0, r1, n, pitch){
  const span = 2 * Math.PI / n * .74, sweep = .5, pts = [];
  for(let k = 0; k <= 8; k++){ const a = span * .7 * k / 8; pts.push(new THREE.Vector2(r0 * Math.cos(a), r0 * Math.sin(a))); }
  for(let k = 8; k >= 0; k--){ const a = sweep + span * k / 8; pts.push(new THREE.Vector2(r1 * Math.cos(a), r1 * Math.sin(a))); }
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts), 1), pos = geo.attributes.position, uv = geo.attributes.uv;
  for(let i = 0; i < pos.count; i++){
    const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y), f = THREE.MathUtils.clamp((r - r0) / (r1 - r0), 0, 1);
    const lo = f * sweep, hi = mix(span * .7, sweep + span, f), a = Math.atan2(y, x);
    pos.setZ(i, -pitch * ((a - lo) / Math.max(.01, hi - lo) - .5));
    uv.setXY(i, f, .5);
  }
  geo.computeVertexNormals();
  return geo;
}
const mix = (a, b, t) => a + (b - a) * t;
// a fan in the xy plane, blowing along z: square frame (or none, on the graphics card), pitched blades, hub with its LED ring
function fan(size, depth, { frame = true, lit = true, n = lit ? 9 : 11 } = {}){
  const g = new THREE.Group(), r = size * .47;
  if(frame){
    const s = new THREE.Shape(), h = size / 2, c = .007;
    s.moveTo(-h + c, -h); s.lineTo(h - c, -h); s.absarc(h - c, -h + c, c, -Math.PI / 2, 0); s.lineTo(h, h - c); s.absarc(h - c, h - c, c, 0, Math.PI / 2);
    s.lineTo(-h + c, h); s.absarc(-h + c, h - c, c, Math.PI / 2, Math.PI); s.lineTo(-h, -h + c); s.absarc(-h + c, -h + c, c, Math.PI, 1.5 * Math.PI);
    s.holes.push(new THREE.Path().absarc(0, 0, r + .002, 0, Math.PI * 2, true));
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 48 });
    geo.translate(0, 0, -depth / 2);
    add(g, geo, M.fanFrame, [0, 0, 0]);
    for(let i = 0; i < 4; i++) add(g, new THREE.BoxGeometry(.004, r, .003), M.fanFrame, [0, 0, depth / 2 - .0015], [0, 0, i * Math.PI / 2 + .3]).translateY(r / 2 + .012);   // the motor's struts
    for(const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(g, [.012, .012, depth + .001], M.rubber, [x * (h - .007), y * (h - .007), 0]);   // corner pads
  } else add(g, new THREE.TorusGeometry(r + .003, .0025, 8, 64), M.plastic, [0, 0, 0]);
  const blade = bladeGeometry(r * .4, r, n, depth * .45);
  for(let i = 0; i < n; i++) add(g, blade, lit ? M.bladeLit : M.bladeDark, [0, 0, 0], [0, 0, i * 2 * Math.PI / n]);
  cyl(g, r * .4, depth * .7, M.hub, [0, 0, 0], 'z');
  if(lit) add(g, new THREE.TorusGeometry(r * .42, .0016, 8, 48), M.ring, [0, 0, -depth * .36]);
  return g;
}
// a cable or tube along a smooth curve through pts
const tube = (parent, r, pts, m = M.sleeve, seg = 64) => {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  if(m === M.sleeve){ m = M.sleeve.clone(); m.map = braid.clone(); m.map.repeat.set(curve.getLength() / (r * 4), 1); m.map.needsUpdate = true; }
  return add(parent, new THREE.TubeGeometry(curve, seg, r, 10), m, [0, 0, 0]);
};

// what the tags say. name: on every tag once it's open; spec and what: under it when the camera stops on the part
// (zoom: how much bigger it gets when it's clicked). side: which way its tag sits (1 right, -1 left), reach / lift: how
// far out / up (px). at: where its line points, if not the part's middle; points: [part, at] for every line, when
// there's more than one (the first is where the tag hangs from and what the camera centres on). stay: clicking it
// doesn't move the camera (the fans are all over); deepAt: where its tag goes then (fractions of the window).
// groups: which points share a line (indexes into points); the points in a group are tied together by a short line.
// a single fan's tag: only shown when it's clicked (hidden), the camera right in on it
const fanLabel = (name, role, what) => ({ name, spec: `120 mm ARGB, warm white · ${role}`, hidden: true, zoom: 2.1, side: 1, lift: 40, what });
const LABELS = {
  cooler: { name: 'CPU COOLER', spec: 'Cooler Master MasterLiquid 240L Core', zoom: 1.9, side: -1, lift: 40, at: [BX - .045, by(.075), bz(.1)],
    what: 'A pump on the CPU pushes liquid through the tubes to a 240 mm radiator, where two fans blow the heat out the top.' },
  motherboard: { name: 'MOTHERBOARD + CPU', spec: 'ASRock B550M Pro4 · Ryzen 5 3600X', zoom: 1.7, side: -1, lift: -150, at: [BX - .0095, by(.075), bz(.1)],
    what: 'The board every part plugs into. Under the pump sits the CPU: 6 cores and 12 threads running everything that isn\'t graphics.' },
  ram: { name: 'MEMORY', spec: 'Corsair Vengeance RGB Pro · 4 x 8 GB DDR4-3200', zoom: 2.2, side: 1, lift: 70,
    what: 'Fast short-term memory for whatever is running right now, so the CPU never waits on the drives.' },
  gpu: { name: 'GRAPHICS CARD', spec: 'Gigabyte RTX 3080 Ti Gaming OC · 12 GB', zoom: 1.8, side: -1, lift: -30,
    what: 'Draws every frame you see: 10,240 cores working side by side on games, video and anything 3D. The biggest and hungriest part in the box.' },
  psu: { name: 'POWER SUPPLY', spec: 'EVGA SuperNOVA 850 GT · 80+ Gold, fully modular', zoom: 1.9, side: 1, lift: 50,
    what: 'Turns the wall\'s power into the steady 12, 5 and 3.3 volts every part runs on. 850 W leaves headroom for the graphics card\'s spikes.' },
  ssd: { name: 'STORAGE', spec: 'Samsung 870 Evo · 2 TB SATA', zoom: 2.4, side: 1, lift: 40,
    what: 'Where the games and files live. No moving parts, so it loads many times faster than an old spinning hard drive.' },
  nvme: { name: 'BOOT DRIVE', spec: 'Kingston NV3 · 1 TB NVMe', zoom: 2.6, side: 1, lift: -40,
    what: 'Plugged straight into the motherboard, the size of a stick of gum. Windows and apps start from it at up to 6,000 MB/s.' },
  'rear-fan': fanLabel('REAR EXHAUST FAN', 'exhaust',
    'Pulls the hot air off the CPU and memory and pushes it straight out the back, so it never hangs around inside the case.'),
  ...Object.fromEntries([1, 2].map(i => [`rad-fan-${i}`, fanLabel(`RADIATOR FAN ${i}/2`, 'on the 240 mm radiator',
    'It doesn\'t blow on the CPU at all: it pushes air through the radiator\'s fins, cooling the liquid inside, which the pump sends back down to soak up the CPU\'s heat. The warm air leaves through the top.')])),
  ...Object.fromEntries([1, 2, 3].map(i => [`intake-fan-${i}`, fanLabel(`INTAKE FAN ${i}/3`, 'intake, on the floor',
    'One of three pulling cool air in from under the case and blowing it straight up into the graphics card, the hottest part in the box.')])),
  'floor-fans': { name: 'FANS x6', spec: '6 x 120 mm ARGB, warm white', stay: true, deepAt: [.04, .55], side: -1, reach: 130, lift: 0,
    groups: [[0], [1, 2], [3, 4, 5]],   // one line each to the rear fan, the radiator's two and the floor's three
    points: [['rear-fan'], ['rad-fan-1'], ['rad-fan-2'], ['intake-fan-1'], ['intake-fan-2'], ['intake-fan-3']],
    what: 'Three pull cool air in through the floor and up through the graphics card; two on the radiator and one at the back push the warm air out.' },
};

export function buildMyPc(renderer){
  const root = new THREE.Group();
  const named = (o, name) => { o.name = name; o.userData.label = LABELS[name]; };   // a piece inside a part with its own tag (a fan)
  const part = (name, out, order = 0) => {
    const g = new THREE.Group();
    g.name = name;
    Object.assign(g.userData, { out: new THREE.Vector3(...out), order, label: LABELS[name] });
    root.add(g);
    return g;
  };

  // ===== case: frame, perforated top / right side / front / rear, glass on the left, feet
  const cs = part('case', [0, 0, 0]);
  const F = .008;   // the frame's edge bars
  for(const y of [-1, 1]) for(const x of [-1, 1]) box(cs, [F, F, D], M.shell, [x * (W - F) / 2, y * (H - F) / 2, 0]);
  for(const z of [-1, 1]) for(const x of [-1, 1]) box(cs, [F, H, F], M.shell, [x * (W - F) / 2, 0, z * (D - F) / 2]);
  for(const z of [-1, 1]) for(const y of [-1, 1]) box(cs, [W, F, F], M.shell, [0, y * (H - F) / 2, z * (D - F) / 2]);
  perforated(cs, D, W, [0, H / 2 - .0015, 0], 'up');
  perforated(cs, D, H, [W / 2 - .0015, 0, 0], 'right');
  // the front: holes that thin out towards the bottom, over the I/O strip
  const IO = .032;
  perforated(cs, W, H - IO, [0, IO / 2, D / 2 - .0015], 'front', (u, v) => v < .55 || rand() > (v - .55) / .45 * 1.15);
  box(cs, [W, IO, .004], M.shell, [0, -H / 2 + IO / 2, D / 2 - .002]);
  const FRONT = D / 2 + .0005;
  for(let i = 0; i < 4; i++) box(cs, [.011, .007, .002], M.blackMetal, [.008 + i * .014, -H / 2 + .016, FRONT]);   // the four buttons
  box(cs, [.009, .004, .002], M.plastic, [.068, -H / 2 + .016, FRONT]);                                           // USB-C
  for(let i = 0; i < 2; i++) box(cs, [.012, .005, .002], M.plastic, [.082 + i * .015, -H / 2 + .016, FRONT]);    // USB-A
  cyl(cs, .0022, .002, M.plastic, [.074 - .02, -H / 2 + .016, FRONT], 'z', 16);                                   // audio
  cyl(cs, .0055, .003, M.blackMetal, [W / 2 - .02, -H / 2 + .016, FRONT], 'z');                                   // power button...
  add(cs, new THREE.TorusGeometry(.0058, .0008, 6, 32), M.ramOrange, [W / 2 - .02, -H / 2 + .016, FRONT + .0015]);   // ...and its orange ring
  decal(cs, .05, .006, (g, w, h) => text(g, 'JONSBO D32 PRO', w, h / 2, h * .8, '#8d9096', '500', 'right'), [W / 2 - .041, -H / 2 + .035, FRONT + .001], 'front');
  // the rear: holes except down the motherboard side (I/O shield, slots, power inlet)
  perforated(cs, W, H, [0, 0, -D / 2 + .0015], 'rear', (u, v) => u > .3 && v < .62);
  const BACK = -D / 2 - .0005;
  box(cs, [.03, .158, .002], M.steel, [BX - .016, by(.085), BACK]);   // the I/O shield
  const port = (x, y, w, h, m = M.plastic) => box(cs, [w, h, .003], m, [x, y, BACK - .001]);
  for(let i = 0; i < 6; i++) port(BX - .009 - (i % 2) * .013, by(.03 + Math.floor(i / 2) * .016), .012, .005);    // USB
  port(BX - .012, by(.085), .015, .006); port(BX - .012, by(.1), .013, .005);                                     // HDMI, DP
  port(BX - .012, by(.115), .014, .012);                                                                          // LAN
  for(let i = 0; i < 3; i++) cyl(cs, .003, .003, M.plastic, [BX - .022 + i * .009, by(.145), BACK - .001], 'z', 16);   // audio
  for(let i = 0; i < 4; i++) box(cs, [.11, .0185, .002], M.shell, [.022, by(.142 + i * .02), BACK]);              // slot covers
  box(cs, [.03, .022, .006], M.plastic, [.06, Y1 - .02, BACK - .002]);                                            // power inlet
  // inside: the motherboard tray, the floor
  box(cs, [.002, H - 2 * T, D - 2 * T], M.inside, [TRAY + .001, 0, 0]);
  box(cs, [W - 2 * T, .002, D - 2 * T], M.inside, [0, Y0 + .001, 0]);
  for(const x of [-1, 1]) for(const z of [-1, 1]) box(cs, [.034, .012, .05], M.rubber, [x * (W / 2 - .03), -H / 2 - .006, z * (D / 2 - .045)]);   // feet

  // ===== the glass side, a smoked pane with a black printed border
  const glass = part('glass', [-.28, 0, 0], 0);
  add(glass, new THREE.PlaneGeometry(D - .004, H - .004), new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: .04, metalness: .1, transparent: true, opacity: .3, side: THREE.DoubleSide }), [-W / 2 + .001, 0, 0], FACE.glass);
  decal(glass, D - .004, H - .004, (g, w, h) => { const b = .009 * PX; g.fillStyle = '#060607'; g.fillRect(0, 0, w, h); g.clearRect(b, b, w - 2 * b, h - 2 * b); }, [-W / 2 + .0018, 0, 0], 'glass', { rough: .2, metal: .2 }).material.transparent = true;   // transparent: it clears with the pane

  // ===== motherboard (ASRock B550M Pro4, 244 x 244)
  const mb = part('motherboard', [-.035, 0, 0], 10);
  box(mb, [.0016, .244, .244], M.pcb, [BX + .0008, by(.122), bz(.122)]);
  decal(mb, .244, .244, (g, w, h) => {   // the board's face: traces, mounting holes, silkscreen
    g.fillStyle = '#141518'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1f2126'; g.lineWidth = 2;
    for(let i = 0; i < 260; i++){ const x = rand() * w, y = rand() * h, l = (rand() * .04 + .005) * PX; g.beginPath(); g.moveTo(x, y); rand() < .5 ? g.lineTo(x + l, y) : g.lineTo(x, y + l); g.stroke(); }
    g.fillStyle = '#a8a39a';
    for(const [u, v] of [[.006, .01], [.157, .01], [.236, .01], [.006, .234], [.157, .234], [.236, .234]]){ g.beginPath(); g.arc(u * PX, v * PX, .0035 * PX, 0, 7); g.fill(); }
    text(g, 'B550M Pro4', .18 * PX, .232 * PX, .006 * PX, '#d9d6cf');
    text(g, 'DDR4_A1   DDR4_A2   DDR4_B1   DDR4_B2', .2 * PX, .149 * PX, .0022 * PX, '#cfcac0', '500');
  }, [BX - .0001, by(.122), bz(.122)], 'glass', { alpha: false, rough: .6, metal: .1 });
  // I/O cover with PRO4 down it, VRM heatsinks (top and left), chipset heatsink
  box(mb, [.034, .15, .03], M.silver, [BX - .017, by(.085), bz(.017)]);
  decal(mb, .15, .03, (g, w, h) => { text(g, 'PRO4', w * .5, h * .55, h * .62, '#e9e9ea', 'italic 900'); g.fillStyle = '#5a5d63'; g.fillRect(w * .05, h * .88, w * .9, h * .04); }, [BX - .0345, by(.085), bz(.017)], 'glass', { rough: .35, metal: .6 }).rotateZ(Math.PI / 2);   // printed up the cover
  const sink = (u0, u1, v0, v1, tall) => {   // a brushed block with grooves cut across it
    box(mb, [tall, v1 - v0, u1 - u0], M.silver, [BX - tall / 2, by((v0 + v1) / 2), bz((u0 + u1) / 2)]);
    for(let u = u0 + .006; u < u1 - .003; u += .006) box(mb, [.002, v1 - v0 + .0004, .0015], M.blackMetal, [BX - tall + .0009, by((v0 + v1) / 2), bz(u)]);
  };
  sink(.045, .135, .006, .032, .026); sink(.034, .056, .036, .13, .024); sink(.17, .215, .172, .215, .012);
  // CPU socket, DIMM slots, PCIe slots (the first one steel), M.2 slot, 24-pin and CPU 8-pin, SATA, front panel headers
  // the AM4 socket (cream, its lever down one side) with the Ryzen 5 3600X in it: green substrate, printed silver lid
  box(mb, [.005, .052, .046], mat(0xd8d0bd, .6), [BX - .0025, by(.075), bz(.1)]);
  box(mb, [.004, .05, .003], M.steel, [BX - .004, by(.075), bz(.1) + .026]);
  box(mb, [.0012, .04, .04], mat(0x1f4a30, .5, .1), [BX - .0056, by(.075), bz(.1)]);
  box(mb, [.003, .036, .036], M.steel, [BX - .0077, by(.075), bz(.1)]);
  decal(mb, .036, .036, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#c9cbcd'); gr.addColorStop(1, '#a9abae');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    text(g, 'AMD Ryzen 5 3600X', w * .1, h * .12, h * .075, '#3a3b3d', 'italic 800', 'left');
    text(g, 'AMD', w * .14, h * .3, h * .07, '#3a3b3d', '900', 'left');
    g.fillStyle = '#3a3b3d'; g.beginPath(); g.moveTo(w * .3, h * .27); g.lineTo(w * .34, h * .33); g.lineTo(w * .3, h * .33); g.fill();
    text(g, 'RYZEN', w * .5, h * .46, h * .2, '#3f4042', '900');
    for(let i = 0; i < 10; i++) for(let j = 0; j < 10; j++) if(rand() < .5) g.fillRect(w * .2 + i * w * .015, h * .62 + j * h * .015, w * .015, h * .015);   // the code square
    ['100-000000022', 'BF 2023SUS', '9JC6367R00298', 'DIFFUSED IN USA', 'MADE IN CHINA', '© 2019 AMD'].forEach((l, i) => text(g, l, w * .42, h * (.64 + i * .045), h * .035, '#4a4b4d', '500', 'left'));
  }, [BX - .0093, by(.075), bz(.1)], 'glass', { alpha: false, rough: .35, metal: .6, res: 3 });
  for(let i = 0; i < 4; i++) box(mb, [.008, .142, .0062], M.plastic, [BX - .004, by(.077), bz(.158 + i * .0095)]);
  box(mb, [.011, .0075, .089], M.steel, [BX - .0055, by(.15), bz(.06)]);
  box(mb, [.011, .0075, .089], M.plastic, [BX - .0055, by(.21), bz(.06)]);
  box(mb, [.012, .052, .0105], M.plastic, [BX - .006, by(.103), bz(.238)]);
  box(mb, [.012, .009, .019], M.plastic, [BX - .006, by(.007), bz(.024)]);
  for(let i = 0; i < 4; i++) box(mb, [.009, .006, .009], M.plastic, [BX - .0045, by(.17 + i * .011), bz(.236)]);
  for(let i = 0; i < 3; i++) box(mb, [.006, .006, .014], M.plastic, [BX - .003, by(.236), bz(.15 + i * .025)]);
  // neat sleeved cables: the 24-pin ribbon off the front edge into the PSU chamber, the CPU 8-pin along the top
  for(let i = 0; i < 12; i++){ const y = by(.079) - i * .0044; tube(mb, .0017, [[BX - .012, y, bz(.238)], [BX - .02, y, bz(.238) + .008], [BX - .024, y, .085], [BX - .024, y, .1]], M.sleeve, 24); }
  for(let i = 0; i < 8; i++){ const x = BX - .026 + i * .0034; tube(mb, .0016, [[x, by(.012), bz(.016)], [x, YB + .006, bz(.03)], [x, YB + .006, .06], [x, YB + .006, .1]], M.sleeve, 24); }

  // ===== M.2 SSD (Kingston NV3), under the graphics card
  const nvme = part('nvme', [-.311, .012, .513], 5)   // out to sit just under the SATA SSD;
  box(nvme, [.0022, .022, .08], M.pcb, [BX - .0035, by(.182), bz(.1)]);
  decal(nvme, .07, .02, (g, w, h) => { g.fillStyle = '#16233f'; g.fillRect(0, 0, w, h); text(g, 'KINGSTON  NV3', w * .3, h * .5, h * .3, '#fff'); g.fillStyle = '#e1251b'; g.fillRect(w * .8, 0, w * .2, h); }, [BX - .0047, by(.182), bz(.1)], 'glass', { alpha: false });

  // ===== CPU cooler: the pump block on the CPU, its tubes, the radiator at the top with two fans under it
  const cooler = part('cooler', [-.3, .13, -.02], 8);
  const PUMP = { x: BX - .006, y: by(.075), z: bz(.1) };
  cyl(cooler, .034, .04, M.plastic, [PUMP.x - .02, PUMP.y, PUMP.z], 'x', 64);
  cyl(cooler, .03, .004, M.blackMetal, [PUMP.x - .041, PUMP.y, PUMP.z], 'x', 64);
  add(cooler, new THREE.TorusGeometry(.031, .0018, 10, 72), M.ring, [PUMP.x - .041, PUMP.y, PUMP.z], FACE.glass);
  decal(cooler, .05, .05, (g, w, h) => {   // the cap: a dark disc, a raised ring, the CM mark
    g.fillStyle = '#18191c'; g.beginPath(); g.arc(w / 2, h / 2, w * .5, 0, 7); g.fill();
    g.strokeStyle = '#3a3c40'; g.lineWidth = w * .03; g.beginPath(); g.arc(w / 2, h / 2, w * .4, 0, 7); g.stroke();
    text(g, 'CM', w / 2, h * .5, w * .22, '#9a9ca1', '900');
  }, [PUMP.x - .0435, PUMP.y, PUMP.z], 'glass');
  for(const dy of [.011, -.011]) cyl(cooler, .0055, .012, M.blackMetal, [PUMP.x - .022, PUMP.y + dy, PUMP.z + .036], 'z', 20);   // the fittings
  const RAD = { x: -.035, y: Y1 - .0145, z: Z0 + .002 + .1385 }, RAD_FRONT = RAD.z + .1385;
  // tubes: off the pump's front, down in front of the RAM, then up to the radiator's front end
  tube(cooler, .0058, [[PUMP.x - .022, PUMP.y + .011, PUMP.z + .042], [PUMP.x - .03, PUMP.y + .005, PUMP.z + .07], [.005, .005, -.01], [-.012, .02, .045], [-.02, .075, RAD_FRONT - .012], [-.02, RAD.y - .016, RAD_FRONT - .01]]);
  tube(cooler, .0058, [[PUMP.x - .022, PUMP.y - .011, PUMP.z + .042], [PUMP.x - .036, PUMP.y - .02, PUMP.z + .07], [-.004, -.008, 0], [-.03, .012, .05], [-.052, .07, RAD_FRONT - .012], [-.052, RAD.y - .016, RAD_FRONT - .01]]);
  const fins = paint(.24 * PX, .12 * PX, (g, w, h) => { g.fillStyle = '#0e0f11'; g.fillRect(0, 0, w, h); g.fillStyle = '#26282c'; for(let x = 0; x < w; x += 5) g.fillRect(x, 0, 2, h); });
  const finMat = mat(0xffffff, .55, .5, { map: fins, side: THREE.DoubleSide });
  box(cooler, [.1196, .027, .24], M.blackMetal, [RAD.x, RAD.y, RAD.z]);
  add(cooler, new THREE.PlaneGeometry(.24, .1196), finMat, [RAD.x, RAD.y - .0136, RAD.z], FACE.down);   // the fins, seen through the fans
  for(const s of [-1, 1]) box(cooler, [.1196, .03, .0185], M.plastic, [RAD.x, RAD.y - .0015, RAD.z + s * .1293]);   // end tanks
  decal(cooler, .07, .009, (g, w, h) => text(g, 'COOLER MASTER', w / 2, h / 2, h * .62, '#7c7f86', '700'), [RAD.x - .0601, RAD.y, RAD.z - .05], 'glass');
  [-.06, .06].forEach((dz, i) => named(place(cooler, fan(.12, .025), [RAD.x, RAD.y - .0135 - .0125, RAD.z + dz], [Math.PI / 2, 0, 0]), `rad-fan-${i + 1}`));

  // ===== RAM (Corsair Vengeance RGB Pro): black heatspreader, a tall lit bar along its top edge
  const ram = part('ram', [-.17, .02, .06], 7);
  [M.ramWhite, M.ramOrange, M.ramWhite, M.ramOrange].forEach((light, i) => {
    const z = bz(.158 + i * .0095), y = by(.077);
    box(ram, [.036, .1335, .0072], M.blackMetal, [BX - .008 - .018, y, z]);
    for(const dx of [.008, .02]) box(ram, [.0025, .128, .0076], M.plastic, [BX - .008 - dx, y, z]);   // its ridges
    box(ram, [.012, .1335, .0068], light, [BX - .044 - .006, y, z]);
    box(ram, [.0015, .1335, .0072], M.plastic, [BX - .0515, y, z]);   // the dark top lip
  });

  // ===== graphics card (Gigabyte RTX 3080 Ti Gaming OC, 320 x 129 x 55): fans face the floor, backplate up
  // as it comes out it rolls over to show its fans, logo edge up (like the box shot)
  const G = { x0: -.055, x1: BX - .002, y0: by(.15) - .049, y1: by(.15) + .006, z0: Z0 + .009, z1: Z0 + .009 + .31 };
  const gx = (G.x0 + G.x1) / 2, gzc = (G.z0 + G.z1) / 2, gl = G.z1 - G.z0, gw = G.x1 - G.x0;
  const gpuPart = part('gpu', [-.3, -.07, -.02], 4), gpuPivot = new THREE.Group(), gpu = new THREE.Group();
  gpuPivot.position.set(gx, (G.y0 + G.y1) / 2, gzc);
  gpu.position.copy(gpuPivot.position).negate();
  gpuPart.add(gpuPivot); gpuPivot.add(gpu);
  Object.assign(gpuPart.userData, { pivot: gpuPivot, turn: [0, 0, -1.25] });
  const WELL = .013;   // how deep the fans sit in the shroud
  box(gpu, [gw, G.y1 - G.y0 - .006 - WELL, gl], M.plastic, [gx, (G.y0 + WELL + G.y1 - .006) / 2, gzc]);
  for(const x of [G.x0 + .001, G.x1 - .001]) box(gpu, [.002, WELL, gl], M.plastic, [x, G.y0 + WELL / 2, gzc]);   // the shroud's sides round the fans
  for(const z of [G.z0 + .001, G.z1 - .001]) box(gpu, [gw, WELL, .002], M.plastic, [gx, G.y0 + WELL / 2, z]);
  box(gpu, [gw, .003, gl], M.blackMetal, [gx, G.y1 - .0015, gzc]);   // backplate
  box(gpu, [gw - .003, .003, gl - .004], M.pcb, [gx + .0015, G.y1 - .0045, gzc]);   // the board between it and the cooler
  const FANS_Z = [-.1, -.004, .092];
  const fx = (z, w) => (z + gl / 2) / gl * w, fy = h => h * (gx + .002 - G.x0) / gw;
  decal(gpu, gl, gw, (g, w, h) => {   // behind the fans: the fin stack, three copper heatpipes across it
    g.fillStyle = '#0b0b0c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2d2f33'; for(let x = 0; x < w; x += 6) g.fillRect(x, 0, 2, h);
    g.fillStyle = '#b8733a'; for(const o of [-.25, 0, .25]) g.fillRect(0, fy(h) + o * h, w, 5);
  }, [gx, G.y0 + WELL - .0002, gzc], 'down', { alpha: false, rough: .6, metal: .5 });
  decal(gpu, gl, gw, (g, w, h) => {   // the fan side's face: black, silver trim between the fans, a hole round each fan
    g.fillStyle = '#141517'; g.fillRect(0, 0, w, h);
    const R = .046 * PX;
    g.fillStyle = '#8d9299';
    for(const [a, b] of [[-.155, -.15], [-.052, -.05], [.044, .046], [.14, .155]]){   // angled silver strips at the ends and between the fans
      g.beginPath(); g.moveTo(fx(a, w), 0); g.lineTo(fx(a, w) + .012 * PX, 0); g.lineTo(fx(b, w) - .004 * PX, h); g.lineTo(fx(b, w) - .016 * PX, h); g.fill();
    }
    g.fillStyle = '#26282c'; g.beginPath(); g.moveTo(0, h * .82); g.lineTo(w, h * .9); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    for(const dz of FANS_Z){
      const cx = fx(dz, w);
      g.strokeStyle = '#3a3c41'; g.lineWidth = 8; g.beginPath(); g.arc(cx, fy(h), R + 4, 0, 7); g.stroke();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx, fy(h), R, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
    }
  }, [gx, G.y0 - .0002, gzc], 'down', { rough: .5, metal: .4 });
  decal(gpu, gl, gw, (g, w, h) => {   // backplate: the logo, a few cut lines, the flow-through window at the end
    g.fillStyle = '#111215'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#26282d'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * .05, h * .2); g.lineTo(w * .7, h * .2); g.lineTo(w * .75, h * .35); g.stroke();
    text(g, 'GIGABYTE', w * .4, h * .55, h * .14, '#9fa1a6', 'italic 900');
    g.fillStyle = '#060607'; g.fillRect(w * .82, h * .12, w * .15, h * .76);
    g.fillStyle = '#2a2c31'; for(let x = w * .82; x < w * .97; x += 6) g.fillRect(x, h * .12, 2, h * .76);
  }, [gx, G.y1 + .0002, gzc], 'up', { alpha: false, metal: .6, rough: .4 });
  decal(gpu, gl, G.y1 - G.y0 - .003, (g, w, h) => {   // the edge facing the glass: angled silver trim, the lit logo
    g.fillStyle = '#17181b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#44474d'; g.beginPath(); g.moveTo(0, h * .15); g.lineTo(w * .3, h * .15); g.lineTo(w * .26, h * .3); g.lineTo(0, h * .3); g.fill();
    g.beginPath(); g.moveTo(w, h * .7); g.lineTo(w * .86, h * .7); g.lineTo(w * .9, h * .85); g.lineTo(w, h * .85); g.fill();
    g.fillStyle = '#0c0c0e'; for(let x = w * .05; x < w * .3; x += 7) g.fillRect(x, h * .42, 3, h * .4);   // fins through the shroud
    text(g, 'GIGABYTE', w * .6, h * .45, h * .28, '#e9e9ea', 'italic 900');
    g.fillStyle = '#d06424'; g.fillRect(w * .48, h * .7, w * .24, h * .035);
  }, [G.x0 - .0002, (G.y0 + G.y1 - .003) / 2, gzc], 'glass', { alpha: false, k: 1.3, glow: (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); text(g, 'GIGABYTE', w * .6, h * .45, h * .28, '#fff', 'italic 900');
    g.fillStyle = '#ff6a1a'; g.fillRect(w * .48, h * .7, w * .24, h * .035);
  } });
  for(const dz of FANS_Z){
    place(gpu, fan(.09, .011, { frame: false, lit: false }), [gx + .002, G.y0 + .0065, gzc + dz], [Math.PI / 2, 0, 0]);   // sunk in its well
    decal(gpu, .032, .032, (g, w, h) => {   // the silver hub cap
      g.fillStyle = '#b9bcc0'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, 7); g.fill();
      g.strokeStyle = '#8a8d92'; g.lineWidth = w * .04; g.beginPath(); g.arc(w / 2, h / 2, w * .46, 0, 7); g.stroke();
      text(g, 'GIGABYTE', w / 2, h / 2, h * .13, '#2b2c2f', 'italic 900');
    }, [gx + .002, G.y0 + .0005, gzc + dz], 'down', { rough: .3, metal: .8, res: 3 });
  }
  box(gpu, [.12, .058, .0015], M.steel, [gx + .005, (G.y0 + G.y1) / 2, Z0 - .0005]);   // bracket, its ports out the back
  for(let i = 0; i < 4; i++) box(gpu, [.016, .007, .003], M.plastic, [G.x1 - .02 - i * .022, G.y0 + .015, -D / 2 - .002]);
  // two 8-pins on its top edge near the end, their sleeved leads straight up into the PSU chamber
  for(const z of [.088, .108]){
    box(gpu, [.008, .009, .019], M.plastic, [G.x0 - .004, G.y1 - .012, z]);
    for(let i = 0; i < 4; i++){ const zz = z - .0067 + i * .0045; tube(gpu, .0017, [[G.x0 - .007, G.y1 - .012, zz], [G.x0 - .012, G.y1 - .008, zz], [G.x0 - .013, G.y1 + .006, zz]], M.sleeve, 16); }
  }

  // ===== PSU chamber at the front: its cover, the EVGA SuperNOVA 850 GT inside, the 2.5" SSD beside it
  const CH = { z0: .098, y0: G.y1 + .001 };
  const cover = part('cover', [-.2, .03, .06], 1);
  const coverMat = M.shell.clone();
  coverMat.transparent = true;   // a panel like the glass: it clears as the PC opens
  box(cover, [.002, Y1 - CH.y0, Z1 - CH.z0], coverMat, [X0 + .004, (Y1 + CH.y0) / 2, (Z1 + CH.z0) / 2]);
  box(cover, [TRAY - X0 - .004, .002, Z1 - CH.z0], coverMat, [(TRAY + X0 + .004) / 2, CH.y0, (Z1 + CH.z0) / 2]);
  box(cover, [TRAY - X0 - .004, Y1 - CH.y0, .002], coverMat, [(TRAY + X0 + .004) / 2, (Y1 + CH.y0) / 2, CH.z0]);
  decal(cover, Y1 - CH.y0 - .01, .03, (g, w, h) => {   // printed up the cover, read with your head tilted: BACK-CONNECT DESIGN, PRO in red
    text(g, 'BACK-CONNECT DESIGN', w * .55, h * .5, h * .34, '#9c9fa5', '600');
    text(g, 'PRO', w * .06, h * .5, h * .3, '#c8342a', 'italic 800');
  }, [X0 + .0028, (Y1 + CH.y0) / 2, Z1 - .018], 'glass').rotateZ(Math.PI / 2).material.transparent = true;
  // the EVGA SuperNOVA 850 GT (150 x 150 x 86): its fan behind a teal grille on the big face, modular sockets on the -x end,
  // its label on top; it turns its fan to the viewer as it comes out
  const psuPart = part('psu', [-.05, .05, .24], 2), psu = new THREE.Group();
  psu.position.set(TRAY - .075, CH.y0 + .08, Z1 - .05);   // its grille stays inside the case front
  psuPart.add(psu);
  Object.assign(psuPart.userData, { pivot: psu, turn: [0, -1.22, 0] });
  const TEAL = mat(0x0f5f58, .28, .8), FZ = .0435;
  box(psu, [.15, .15, .086], mat(0x141416, .55, .5), [0, 0, 0]);
  decal(psu, .15, .15, (g, w, h) => {   // the fan face: the dark well the fan sits in, a fine mesh behind it
    g.fillStyle = '#151517'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#060607'; g.beginPath(); g.arc(w / 2, h / 2, w * .44, 0, 7); g.fill();
    g.fillStyle = '#1b1c1f'; for(let x = 0; x < w; x += 8) for(let y = (x / 8 % 2) * 4; y < h; y += 8) if(Math.hypot(x - w / 2, y - h / 2) < w * .44) g.fillRect(x, y, 3, 3);
  }, [0, 0, FZ], 'front', { alpha: false, rough: .6, metal: .4 });
  place(psu, fan(.13, .004, { frame: false, lit: false }), [0, 0, FZ + .0015]);
  for(const r of [.024, .038, .052, .064]) add(psu, new THREE.TorusGeometry(r, .0016, 8, 72), TEAL, [0, 0, FZ + .0042]);   // the grille's rings...
  for(let i = 0; i < 4; i++){
    const a = Math.PI / 4 + i * Math.PI / 2;
    add(psu, new THREE.BoxGeometry(.004, .044, .003), TEAL, [Math.cos(a) * .044, Math.sin(a) * .044, FZ + .0042], [0, 0, a - Math.PI / 2]);   // ...its spokes...
    add(psu, new THREE.BoxGeometry(.03, .03, .003), TEAL, [Math.cos(a) * .072, Math.sin(a) * .072, FZ + .0035], [0, 0, a]);              // ...and the tabs it's screwed on by
    cyl(psu, .0028, .002, M.steel, [Math.cos(a) * .078, Math.sin(a) * .078, FZ + .0055], 'z', 12);
  }
  cyl(psu, .015, .003, TEAL, [0, 0, FZ + .0045], 'z', 40);
  decal(psu, .022, .022, (g, w, h) => text(g, 'E', w / 2, h / 2, h * .7, '#0a2d2a', '900'), [0, 0, FZ + .0062], 'front', { res: 2 });
  for(const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cyl(psu, .0022, .002, M.steel, [x * .069, y * .069, FZ + .001], 'z', 12);   // case screws
  decal(psu, .15, .086, (g, w, h) => {   // the modular end: labelled sockets
    g.fillStyle = '#121214'; g.fillRect(0, 0, w, h);
    const sock = (x, y, cols, rows, label) => {
      const p = .0042 * PX, sw = cols * p + 6, sh = rows * p + 6;
      g.fillStyle = '#050505'; g.fillRect(x, y, sw, sh);
      g.fillStyle = '#2a2b2e'; for(let i = 0; i < cols; i++) for(let j = 0; j < rows; j++) g.fillRect(x + 3 + i * p + 2, y + 3 + j * p + 2, p - 4, p - 4);
      text(g, label, x + sw / 2, y + sh + 10, 13, '#d9d9d9', '600');
    };
    sock(w * .04, h * .12, 12, 2, 'MB'); sock(w * .42, h * .12, 4, 2, 'CPU2'); sock(w * .6, h * .12, 3, 2, 'SATA3'); sock(w * .76, h * .12, 3, 2, 'SATA2');
    sock(w * .04, h * .56, 4, 2, 'VGA4'); sock(w * .2, h * .56, 4, 2, 'VGA3'); sock(w * .36, h * .56, 4, 2, 'VGA2'); sock(w * .52, h * .56, 4, 2, 'VGA1');
    sock(w * .68, h * .56, 4, 2, 'CPU1'); sock(w * .84, h * .56, 3, 2, 'SATA1');
    text(g, 'EVGA', w * .9, h * .9, h * .07, '#bdbdbd', 'italic 900');
  }, [-.0755, 0, 0], 'glass', { alpha: false, rough: .6, metal: .3, res: 1.5 }).rotateZ(Math.PI / 2);   // the end that turns towards the camera
  decal(psu, .15, .086, (g, w, h) => {   // the label: EVGA, the orange 850 GT, the 80 Plus Gold badge, the fine print
    g.fillStyle = '#121214'; g.fillRect(0, 0, w, h);
    text(g, 'EVGA', w * .06, h * .2, h * .16, '#f2f2f2', 'italic 900', 'left');
    text(g, 'SUPERNOVA', w * .06, h * .33, h * .06, '#b0b0b0', '700', 'left');
    const og = g.createLinearGradient(0, h * .4, 0, h * .6); og.addColorStop(0, '#ffb24a'); og.addColorStop(1, '#e0561c');
    g.font = `900 ${h * .2}px "Helvetica Neue", Arial, sans-serif`; g.fillStyle = og; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('850 GT', w * .06, h * .52);
    text(g, '80+ GOLD  ·  FULLY MODULAR', w * .06, h * .7, h * .045, '#9a9a9a', '600', 'left');
    g.fillStyle = '#c9a23a'; g.fillRect(w * .78, h * .56, w * .1, h * .3); text(g, '80', w * .83, h * .66, h * .09, '#3a2c08', '900'); text(g, 'GOLD', w * .83, h * .78, h * .05, '#3a2c08', '800');
    g.strokeStyle = '#3a3a3e'; g.lineWidth = 2; for(let i = 0; i < 6; i++){ g.strokeRect(w * .45, h * (.12 + i * .06), w * .28, h * .06); }   // the ratings table
    text(g, 'CE  FC  UL', w * .55, h * .86, h * .06, '#8a8a8a', '700');
  }, [0, .0755, 0], 'up', { alpha: false, rough: .55, metal: .3, res: 1.5 }).rotateZ(Math.PI / 2);
  const ssd = part('ssd', [-.16, -.02, .29], 3);
  box(ssd, [.0068, .1, .0699], M.blackMetal, [X0 + .02, CH.y0 + .065, Z1 - .046]);
  decal(ssd, .0699, .1, (g, w, h) => { g.fillStyle = '#121214'; g.fillRect(0, 0, w, h); text(g, 'SAMSUNG', w / 2, h * .2, w * .14, '#e6e6e6', '700'); text(g, '870 EVO', w / 2, h * .32, w * .12, '#b9b9b9'); }, [X0 + .0164, CH.y0 + .065, Z1 - .046], 'glass', { alpha: false });

  // ===== case fans: one exhausting out the back, three on the floor blowing up through the graphics card
  const rear = part('rear-fan', [-.1, 0, -.17], 9);
  place(rear, fan(.12, .025), [-.035, .03, Z0 + .0125]);
  const floor = part('floor-fans', [-.12, -.22, -.02], 6);
  [-.12, 0, .12].forEach((z, i) => named(place(floor, fan(.12, .025), [(X0 + TRAY) / 2, Y0 + .014, z], [Math.PI / 2, 0, 0]), `intake-fan-${i + 1}`));

  // ===== the light the RGB throws on the parts round it (ranges in metres; scaled to the screen in other-work.js)
  const glowAt = (color, k, range, pos) => { const l = new THREE.PointLight(color, k, 0, 0); l.userData.range = range; l.position.set(...pos); root.add(l); };
  glowAt(WARM, .35, .2, [RAD.x, RAD.y - .05, RAD.z]);
  glowAt(WARM, .3, .17, [-.04, .03, Z0 + .05]);
  glowAt(WARM, .35, .2, [0, Y0 + .05, 0]);
  glowAt(ORANGE, .35, .1, [BX - .065, by(.06), bz(.17)]);
  glowAt(WHITE, .2, .1, [BX - .065, by(.11), bz(.16)]);

  root.updateMatrixWorld(true);
  const tagged = [];
  root.traverse(o => { if(o.userData.label) tagged.push(o); });
  for(const g of tagged){
    const L = g.userData.label;
    g.userData.anchors = (L.points ?? [[g.name, L.at]]).map(([name, at]) => {
      const a = new THREE.Object3D(), host = root.getObjectByName(name);
      const p = at ? new THREE.Vector3(...at) : new THREE.Box3().setFromObject(host).getCenter(new THREE.Vector3());
      a.position.copy(host.worldToLocal(p));   // the root is untransformed here, so its space is the world's
      host.add(a);
      return a;
    });
    g.userData.anchor = g.userData.anchors[0];
  }

  // reflections: a soft studio room, so the black metal and the glass have something to show
  const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  root.traverse(o => { if(o.isMesh && !o.material.envMap){ o.material.envMap = env; o.material.envMapIntensity = o.material.isMeshPhysicalMaterial ? 1.2 : .3; } });
  return root;
}
