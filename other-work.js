// Other work. The landing floats the home page's laptop and the Z420 side by side; picking one swings the light onto it,
// shows its title and opens its section, and scrolling flies that model from the landing into the section:
//  - Websites: highlights from each client's site, live on the laptop's glass. Each highlight puts the laptop on one side
//    and the text on the other; between them the laptop spins across, the site scrolls to the next part, and callouts
//    draw arrows to what they're about. The backdrop fades to the colour on the screen.
//  - Custom PCs: the PC lands on the desk, the monitor turns on and grows to fill the window, then a viewer steps
//    through the builds (photos, specs, what the owner said).
// Both models live in one fixed layer over the page, placed over the .ow-slot boxes (1 world unit = 1 CSS pixel at z = 0).
// No WebGL: the buttons still open the sections, and the site shows flat.
import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { loadLaptop, onGlass, MIDDLE, ACROSS } from './laptop-model.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const hero = document.getElementById('ow-hero'), chosen = hero.querySelector('.ow-chosen'), hint = hero.querySelector('.ow-hint');
const site = document.getElementById('ow-site'), pc = document.getElementById('ow-pc');
const TITLES = { site: 'Websites', pc: "Custom PC's" };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// always open at the top: the picked path isn't remembered, so a restored scroll position lands somewhere meaningless
history.scrollRestoration = 'manual';
scrollTo(0, 0);
const clamp = x => Math.min(1, Math.max(0, x)), ease = t => t * t * (3 - 2 * t), mix = (a, b, k) => a + (b - a) * k;
const easeCubic = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;   // soft in, soft out
let pick = null;

// ===== picking one
const picks = [...hero.querySelectorAll('.ow-pick')];
picks.forEach(b => b.addEventListener('click', () => {
  pick = b.dataset.path;
  hero.dataset.pick = pick;
  chosen.textContent = TITLES[pick];
  hint.textContent = 'Scroll to discover ↓';
  site.hidden = pick !== 'site';
  pc.hidden = pick !== 'pc';
  picks.forEach(x => x.setAttribute('aria-pressed', x === b));
  syncSite(); syncPc();
}));
picks.forEach(b => b.setAttribute('aria-pressed', false));

// how far through a sticky section (0 as its stage pins, 1 as it lets go)
const through = el => clamp(-el.getBoundingClientRect().top / (el.offsetHeight - innerHeight));

// ===== websites. The client's site is a local copy (work/<client>/) so its colours and layout can be read.
// Each page the highlights use gets its own iframe on the laptop's screen, all loaded up front; only the current
// highlight's page is shown (swapped mid-spin, while the screen faces away).
const screenEl = site.querySelector('.ow-screen'), base = screenEl.dataset.base;
const frames = { 'index.html': screenEl.querySelector('iframe') };
// first non-transparent background at or above el, as [r,g,b]
function bgOf(el, win){
  for(; el; el = el.parentElement){
    const m = win.getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    if(m && (m[3] === undefined || +m[3] > 0)) return m.slice(0, 3).map(Number);
  }
}
// the highlights: scrolling the section steps through them. Each one gets 180% of the window's height of scrolling:
// the first half holds it (h: 0 to 1, its site drifting by data-drift), the second half is the move to the next
// (e: 0 to 1), a full spin when the laptop changes side
const features = [...site.querySelectorAll('.ow-feature')], N = features.length, STEP = 1.8;
site.style.height = `${((N - .5) * STEP + 1) * 100}vh`;
const pageOf = f => f.dataset.page || 'index.html';
for(const f of features){
  const page = pageOf(f);
  if(frames[page]) continue;
  const fr = frames['index.html'].cloneNode();
  fr.src = base + page;
  screenEl.append(fr);
  frames[page] = fr;
}
// smoothC: the scroll position eased by the 3D loop, so wheel steps glide instead of jump (null: use the raw one)
let smoothC = null;
const rawC = () => through(site) * (N - .5);
function chapter(c = smoothC ?? rawC()){
  const i = Math.min(N - 1, Math.floor(c)), j = Math.min(N - 1, i + 1), f = c - i;
  const u = j === i ? 0 : clamp((f - .5) / .5), e = ease(u);   // u: linear through the move, e: eased
  return { i, j, u, e, h: clamp(f / .5), on: e > .5 ? j : i };
}
// puts highlight f's page where it should be, d (0 to 1) of the way through its drift: scrolled to its data-at element
// (just under their fixed nav), then drifted down by data-drift px, or sideways if data-drift-in names a sideways
// scroller (like the gallery's photo carousel). Returns the page's vertical scroll, for blending into the next.
function placeSite(f, d){
  const win = frames[pageOf(f)].contentWindow, doc = win?.document;
  if(!doc?.body) return 0;
  const at = doc.querySelector(f.dataset.at), drift = +f.dataset.drift || 0;
  const top = at ? Math.max(0, at.getBoundingClientRect().top + win.scrollY - 70) : 0;
  const along = f.dataset.driftIn && doc.querySelector(f.dataset.driftIn);
  if(along){
    along.dataset.owStart ??= along.scrollLeft;   // where it sat before we moved it
    along.scrollLeft = +along.dataset.owStart + drift * d;
    return top;
  }
  return top + drift * d;
}
let lastBg = '', onNow = -1, onAt = 0, lastText = -1;
const shownFrame = () => frames[pageOf(features[Math.max(0, onNow)])];
function syncSite(){
  if(site.hidden) return;
  const ch = chapter(), A = features[ch.i], B = features[ch.j];
  // the text is off while the laptop crosses: the old leaves as the spin starts, the new arrives as it lands
  const textOn = ch.e < .15 ? ch.i : ch.e > .85 ? ch.j : -1;
  features.forEach((f, n) => f.classList.toggle('is-on', n === textOn));
  if(textOn !== lastText){ lastText = textOn; onAt = performance.now(); }   // the arrows draw in after the text arrives
  if(ch.on !== onNow){
    onNow = ch.on;
    for(const [page, fr] of Object.entries(frames)) fr.style.visibility = page === pageOf(features[onNow]) ? '' : 'hidden';
  }
  const scrollTo = (f, top) => frames[pageOf(f)].contentWindow?.scrollTo({ top, behavior: 'instant' });
  const samePage = pageOf(A) === pageOf(B);
  if(!ch.e) scrollTo(A, placeSite(A, ch.h));                                   // holding: its site drifts
  else if(samePage) scrollTo(A, mix(placeSite(A, 1), placeSite(B, 0), ch.e));  // moving on, same page: glide down to the next part
  else scrollTo(A, placeSite(A, 1));
  if(!samePage) scrollTo(B, placeSite(B, 0));                                  // the next page waits, ready for the swap
  const win = shownFrame().contentWindow, doc = win?.document;
  if(!doc?.body) return;
  const rgb = bgOf(doc.elementFromPoint(win.innerWidth / 2, win.innerHeight / 2), win);
  if(!rgb || rgb.join() === lastBg) return;
  lastBg = rgb.join();
  const lum = (.2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]) / 255;   // a light backdrop gets dark text
  site.style.setProperty('--ow-bg', `rgb(${lastBg})`);
  site.style.setProperty('--ow-fg', lum > .55 ? '#111' : '#fff');
}
Object.values(frames).forEach(fr => fr.addEventListener('load', () => { syncSite(); setTimeout(syncSite, 900); }));   // again once the site's own load cover lifts

// ===== PC builds: the model of my build glides down from the landing into the frame of its photo (the 3D loop does
// that), then the photo soaks in over it (--seep) and the gallery of other builds rises in (--show). Measured in windows
// of scrolling once the stage pins: the photo from 0.05 to 0.6, the gallery from 0.55 to 1.
const shot = pc.querySelector('.ow-hero-shot'), PC_SPAN = 1.5;
pc.style.height = `${(PC_SPAN + 1) * 100}vh`;
pc.querySelectorAll('.ow-gallery > li').forEach((li, n) => li.style.setProperty('--i', n));   // staggers their entrance
let pcSeep = 0, smoothPc = null;
function syncPc(){
  if(pc.hidden) return;
  const u = (smoothPc ?? through(pc)) * PC_SPAN, show = easeCubic(clamp((u - .55) / .45));
  pcSeep = easeCubic(clamp((u - .05) / .55));
  pc.style.setProperty('--seep', pcSeep);
  pc.style.setProperty('--show', show);
  pc.classList.toggle('is-shown', show > .4);
}
// a build's details open in a dialog: a copy of the hidden .ow-detail beside its card (or beside the featured photo)
const dialog = pc.querySelector('.ow-dialog'), dialogBody = dialog.querySelector('.ow-dialog-body');
pc.querySelectorAll('.ow-card, .ow-hero-shot').forEach(btn => btn.addEventListener('click', () => {
  const detail = (btn.closest('li') ?? btn.parentElement).querySelector('.ow-detail').cloneNode(true);
  detail.hidden = false;
  dialogBody.replaceChildren(detail);
  dialog.showModal();
}));
dialog.querySelector('.ow-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if(e.target === dialog) dialog.close(); });   // a click on the backdrop
addEventListener('scroll', () => requestAnimationFrame(() => { syncSite(); syncPc(); }), { passive: true });
addEventListener('resize', syncPc);

// ===== the two models, in 3D
let gl;
try { gl = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { /* no WebGL: no models */ }
if(gl) Promise.all([loadLaptop(), new GLTFLoader().loadAsync(shot.dataset.model)]).then(([{ base, lid }, pcModel]) => {
  const scene = new THREE.Scene();
  const glassObj = onGlass(lid, screenEl, 1280);
  const model = new THREE.Group(), facing = new THREE.Group(), laptop = new THREE.Group();
  model.add(base, lid);
  model.position.copy(MIDDLE).negate();
  facing.rotation.y = -Math.PI / 2;   // its screen towards the camera (+z)
  facing.add(model);
  laptop.add(facing);
  // the featured build's PC (for now a CC-BY stand-in, credited in the footer): centred, and scaled to stand .445 tall
  const tower = new THREE.Group(), pcScene = pcModel.scene, size = new THREE.Box3().setFromObject(pcScene).getSize(new THREE.Vector3());
  pcScene.position.sub(new THREE.Box3().setFromObject(pcScene).getCenter(new THREE.Vector3()));
  const pcFit = new THREE.Group();
  pcFit.add(pcScene);
  pcFit.scale.setScalar(.445 / size.y);
  pcFit.rotation.y = Math.PI / 2;   // stand-in model: so its glass side faces forward at yaw 0 (check this for the real one)
  tower.add(pcFit);
  const rgb = [], pcMats = new Set();   // rgb: the red fan rings, which glow; pcMats: everything, to fade it out
  pcScene.traverse(o => {
    if(!o.isMesh) return;
    const m = o.material;
    m.userData.opacity = m.opacity;
    m.userData.transparent = m.transparent;
    if(m.transparent) m.depthWrite = false;   // the glass side panel: don't hide what's behind it
    if(m.color.r > .8 && m.color.g < .1){ m.emissive.copy(m.color); rgb.push(m); }
    pcMats.add(m);
  });
  let pcFaded = false;
  function fadePc(f){   // 0: solid, 1: gone; while fading every part is drawn see-through
    const fading = f > 0;
    pcMats.forEach(m => {
      if(fading !== pcFaded){ m.transparent = fading || m.userData.transparent; m.needsUpdate = true; }
      m.opacity = m.userData.opacity * (1 - f);
    });
    pcFaded = fading;
  }
  scene.add(laptop, tower, new THREE.HemisphereLight(0xffffff, 0x202030, .35));

  // one spotlight per model, from in front and a little above: the picked one brightens, the other dims
  const spot = target => {
    const s = new THREE.SpotLight(0xffc98a, 3, 0, .3, .4, 0);   // narrow, so it lights one model, not both
    s.target = target;
    scene.add(s);
    return s;
  };
  const lights = { site: spot(laptop), pc: spot(tower) };

  const layer = document.createElement('div'), css = new CSS3DRenderer();
  layer.className = 'ow-3d-layer';
  gl.domElement.setAttribute('aria-hidden', 'true');
  layer.append(gl.domElement, css.domElement);
  document.body.append(layer);
  document.documentElement.classList.add('ow-3d');
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 20000);

  const slot = (root, cls) => root.querySelector(cls);
  const heroSlot = { site: slot(hero, '.ow-slot-laptop'), pc: slot(hero, '.ow-slot-pc') };
  const box = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };

  // the landing's spotlight: drifts slowly around while nothing is picked, then glides onto the picked one
  const spotAt = { x: innerWidth / 2 };
  // the light on the room, drawn at 1/16 size and scaled up with hard pixels: a pool on the back wall behind the lit
  // model and an oval on the floor in front of it
  const room = hero.querySelector('.ow-light'), ink = room.getContext('2d'), PX = 16;
  function drawLight(hr, slots){
    const w = Math.ceil(hr.width / PX), h = Math.ceil(hr.height / PX);
    if(room.width !== w || room.height !== h){ room.width = w; room.height = h; }
    const x = (spotAt.x - hr.left) / PX, r = spotAt.r / PX;
    const mid = (Math.min(...slots.map(s => s.top)) + Math.max(...slots.map(s => s.bottom))) / 2 - hr.top, floor = Math.max(...slots.map(s => s.bottom)) - hr.top;
    ink.clearRect(0, 0, w, h);
    const glow = (cy, rx, ry, a) => {
      ink.save();
      ink.translate(x, cy / PX); ink.scale(1, ry / rx);
      const g = ink.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(255,176,96,${a})`); g.addColorStop(.55, `rgba(232,128,64,${a * .45})`); g.addColorStop(1, 'rgba(160,70,30,0)');
      ink.fillStyle = g; ink.fillRect(-rx, -rx, rx * 2, rx * 2);
      ink.restore();
    };
    glow(mid, r * 1.6, r * 1.4, .32);       // on the wall behind
    glow(floor, r * 1.5, r * .35, .45);     // on the floor
  }

  // a highlight's laptop: 40% of the window wide, a little in from its side, turned towards the text
  const stage = site.querySelector('.ow-stage');
  function featurePose(f){
    const left = f.dataset.side === 'left';
    return { x: W * (left ? .28 : .72), y: H * (.5 + (+f.dataset.y || 0)), w: W * .47, yaw: left ? .3 : -.3, left };   // .47: the model spans about 40% once turned
  }

  // the callouts' arrows: from beside each line of text to the part of the client's site it's about, drawn in once
  // the text has arrived. Points on the site are found by selector and carried through the glass's transform.
  const NS = 'http://www.w3.org/2000/svg', arrows = document.createElementNS(NS, 'svg');
  arrows.classList.add('ow-arrows');
  layer.append(arrows);
  const marks = new Map();   // callout li -> { path, dot }
  for(const li of site.querySelectorAll('.ow-callouts li')){
    const path = document.createElementNS(NS, 'path'), dot = document.createElementNS(NS, 'circle');
    path.setAttribute('pathLength', 1); path.style.strokeDasharray = 1;
    dot.setAttribute('r', 4);
    arrows.append(path, dot);
    marks.set(li, { path, dot });
  }
  const pt = new THREE.Vector3();
  function drawArrows(now, show){
    const doc = shownFrame().contentDocument;
    marks.forEach(m => { m.path.style.opacity = m.dot.style.opacity = 0; });
    if(!show || !doc || onNow < 0) return;
    const f = features[onNow], left = f.dataset.side === 'left';
    scene.updateMatrixWorld(); camera.updateMatrixWorld();
    [...f.querySelectorAll('.ow-callouts li')].forEach((li, n) => {
      const el = doc.querySelector(li.dataset.point), m = marks.get(li);
      if(!el) return;
      const r = el.getBoundingClientRect();   // in the site's own window (1280 x 890), as it sits on the glass
      pt.set(r.left + r.width / 2 - 640, 445 - (r.top + r.height / 2), 0).applyMatrix4(glassObj.matrixWorld).project(camera);
      const tx = (pt.x + 1) / 2 * W, ty = (1 - pt.y) / 2 * H;
      const lr = li.getBoundingClientRect(), sx = left ? lr.left - 16 : lr.right + 16, sy = lr.top + 11;
      const drawn = clamp((now - onAt - 650 - n * 280) / 700) * show;
      m.path.setAttribute('d', `M${sx},${sy} C${(sx + tx) / 2},${sy} ${(sx + tx) / 2},${ty} ${tx},${ty}`);
      m.path.style.strokeDashoffset = 1 - drawn;
      m.path.style.opacity = drawn > 0 ? 1 : 0;
      m.dot.setAttribute('cx', tx); m.dot.setAttribute('cy', ty);
      m.dot.style.opacity = clamp(drawn * 4 - 3);   // the dot lands as the line arrives
    });
  }

  // the ways the laptop gets from one highlight to the next (a highlight's data-move): how high it arcs, how much it
  // swells towards you, how far it banks into the move, and what extra turn it makes (k: 0 to 1 through the turn)
  const MOVES = {
    spin:    { rise: .05, swell: .12, bank: .06, turn: k => Math.PI * 2 * k },          // a full 360
    quarter: { rise: .07, swell: .06, bank: .1,  turn: k => Math.PI / 2 * Math.sin(Math.PI * k) },   // turns a quarter away and back
    slide:   { rise: .09, swell: .04, bank: .14, turn: () => 0 },                        // just glides across, in an arc
  };
  const easeBack = (t, c = .9) => {   // in-out with a small pull-back at the start and overshoot at the end (c: how much)
    const d = c * 1.525;
    return t < .5 ? (2 * t) ** 2 * ((d + 1) * 2 * t - d) / 2 : ((2 * t - 2) ** 2 * ((d + 1) * (t * 2 - 2) + d) + 2) / 2;
  };

  let W = 0, H = 0, lastNow = 0, glidePc = null;
  function frameLoop(now){
    requestAnimationFrame(frameLoop);
    const t = reduceMotion ? 0 : now / 1000, dt = Math.min(.1, (now - lastNow) / 1000 || 0);
    lastNow = now;
    // follow the scroll with a short lag, so it glides (reduced motion: straight to it)
    const follow = (now, goal) => now === null || reduceMotion ? goal : now + (goal - now) * (1 - Math.exp(-dt / .14));
    if(pick === 'site'){ smoothC = follow(smoothC, rawC()); syncSite(); }
    if(pick === 'pc'){
      const top = pc.getBoundingClientRect().top;
      glidePc = follow(glidePc, clamp(scrollY / Math.max(1, scrollY + top)));
      smoothPc = follow(smoothPc, through(pc));
      syncPc();
    }
    if(innerWidth !== W || innerHeight !== H){
      W = innerWidth; H = innerHeight;
      gl.setPixelRatio(Math.min(devicePixelRatio, 2));
      gl.setSize(W, H); css.setSize(W, H);
      camera.aspect = W / H;
      camera.position.set(0, 0, H / 2 / Math.tan(THREE.MathUtils.degToRad(15)));
      camera.updateProjectionMatrix();
    }
    for(const [key, rig, phase] of [['site', laptop, 0], ['pc', tower, 2]]){
      const sec = key === 'site' ? site : pc, a = box(heroSlot[key]);
      // k: 0 on the landing, 1 once its section's stage pins (the picked one flies across; the other stays behind)
      const top = sec.getBoundingClientRect().top;
      const k = pick === key ? (reduceMotion ? +(top <= 0) : ease(clamp(scrollY / Math.max(1, scrollY + top)))) : 0;
      let b = a, yaw = 0, bump = 0, tilt = 0, bank = 0;
      if(key === 'site' && k > 0){
        // the highlight it's on, or partway between two, moving the way the next one's data-move says
        const ch = chapter(), A = featurePose(features[ch.i]), B = featurePose(features[ch.j]);
        const move = MOVES[features[ch.j].dataset.move] ?? MOVES.slide;
        const lift = Math.min(0, stage.getBoundingClientRect().top);   // past the end, it rides the stage up the page
        // soft in, soft out, with a little overshoot that settles; the turn starts a beat after the move (overlap)
        const go = easeBack(ch.u), turn = easeCubic(clamp((ch.u - .1) / .9)), arc = Math.sin(Math.PI * ch.u);
        b = { x: mix(A.x, B.x, go), y: mix(A.y, B.y, go) - arc * H * move.rise + lift, w: mix(A.w, B.w, go) };
        yaw = mix(A.yaw, B.yaw, turn) + move.turn(turn);
        bump = arc * move.swell;
        tilt = arc * .1;
        bank = -Math.sign(B.x - A.x) * arc * move.bank;   // leans into the way it's going
      } else if(k > 0) b = box(shot);
      const pop = Math.sin(Math.PI * k);
      const x = mix(a.x, b.x, k), y = mix(a.y, b.y, k) + Math.sin(t * 1.3 + phase) * 8 * (1 - k);   // floats on the landing
      const sway = Math.sin(t * .6 + phase) * .1 * (1 - k);
      rig.position.set(x - W / 2, H / 2 - y, 0);
      if(key === 'site'){
        rig.scale.setScalar(mix(a.w, b.w, k) / ACROSS * (1 + .2 * pop + .12 * bump));   // swells a little mid-spin, like it's coming at you
        rig.rotation.set(.22 + .25 * pop + tilt, mix(-.38 + sway, yaw, k), -.08 * pop + bank);   // tips up as it pops out
        drawArrows(now, pick === 'site' && k === 1 ? clamp(1 - chapter().e * 7) : 0);
      } else {
        // the glide: no spin. Across and down with soft in / soft out; the drop uses a gentle back-ease, so it lifts a
        // touch before it goes and sinks a touch past the frame before settling into it; the turn lags a beat behind
        const g = pick === 'pc' ? glidePc ?? 0 : 0, go = easeCubic(g), drop = easeBack(g, .45), turn = easeCubic(clamp((g - .12) / .88));
        const tb = g > 0 ? box(shot) : a, fill = +shot.dataset.fill || .7;
        rig.position.set(mix(a.x, tb.x, go) - W / 2, H / 2 - (mix(a.y, tb.y, drop) + Math.sin(t * 1.3 + phase) * 8 * (1 - g)), 0);
        rig.scale.setScalar(mix(a.h * .78, tb.h * fill, go) / .445);   // .445: the model's height
        rig.rotation.set(mix(.12, +shot.dataset.pitch || 0, turn), mix(.55 + sway, +shot.dataset.yaw || 0, turn), 0);
        fadePc(pick === 'pc' ? clamp(pcSeep * 1.6 - .3) : 0);   // gone a little before the photo has fully soaked in
        rgb.forEach(m => { m.emissiveIntensity = .35 + .9 * go + .15 * Math.sin(t * 2); });
      }
      const l = lights[key];
      l.position.set(rig.position.x, rig.position.y + 200, 1600);
      const near = Math.exp(-(((spotAt.x - a.x) / Math.max(100, (spotAt.r ?? 200) * .5)) ** 2));   // how close the landing's spotlight is
      l.intensity = k > 0 ? 6 : .3 + (pick === key ? 7 : 4) * near;
      if(key === 'site') screenEl.style.filter = `brightness(${k > 0 ? 1 : .35 + .65 * Math.min(1, l.intensity / 4)})`;   // the HTML screen isn't lit by WebGL
    }
    const hr = hero.getBoundingClientRect();
    // the front light: drifts between the thirds while nothing is picked, then settles on the picked one
    const want = pick ? { x: box(heroSlot[pick]).x, r: box(heroSlot[pick]).w * .6 } : { x: hr.left + hr.width * (.5 + .2 * Math.sin(t * .35)), r: hr.width * .16 };
    spotAt.x += (want.x - spotAt.x) * .04; spotAt.r = (spotAt.r ?? want.r) + (want.r - (spotAt.r ?? want.r)) * .04;
    if(hr.bottom > 0) drawLight(hr, Object.values(heroSlot).map(el => el.getBoundingClientRect()));
    gl.render(scene, camera);
    css.render(scene, camera);
  }
  requestAnimationFrame(frameLoop);
}).catch(() => { /* the model didn't load: the buttons and sections still work */ });
