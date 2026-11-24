// The home page's 3D laptop (assets/models/laptop: CC0, by While Fun Games). It sits over #hero-slot beside my name, with the
// real screen (#screen: me in ASCII, or a page's preview) laid on its lid with CSS3DRenderer, so it stays a clickable link.
// Scrolling down to the desk it closes, pops out, spins once and drops onto the ASCII table (#desk-slot), then opens again
// and the guide beside it draws in. Scrolling back up plays it backwards.
// Phones and reduced motion: no flight (reduced motion just swaps places halfway). No WebGL or a failed load: the flat
// screen stays in #hero-slot and the guide shows as normal.
import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { loadLaptop, onGlass, HINGE, LID_SHUT, MIDDLE, ACROSS } from './laptop-model.js';

const slotA = document.getElementById('hero-slot'), slotB = document.getElementById('desk-slot');
const desk = document.getElementById('tv'), screenEl = document.getElementById('screen');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 900px)');

const SCREEN_PX = 640;     // the screen's own CSS width before it's scaled onto the glass
const POSE = { yaw: -.38, pitch: .22 };   // a three-quarter view, a little from above, turned towards the text

let gl;
try { gl = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { /* no WebGL: the flat screen stays */ }

if(gl) loadLaptop().then(({ base, lid, lidMesh }) => {
  // the real screen, laid on the glass (inside the lid group, so it shuts with it)
  screenEl.style.width = `${SCREEN_PX}px`;
  const glass = onGlass(lid, screenEl, SCREEN_PX);

  const model = new THREE.Group(), rig = new THREE.Group(), scene = new THREE.Scene();
  model.add(base, lid);
  model.position.copy(MIDDLE).negate();
  const facing = new THREE.Group();   // turns the model so its screen faces the camera (+z)
  facing.rotation.y = -Math.PI / 2;
  facing.add(model);
  rig.add(facing);
  scene.add(rig);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303040, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-1, 2, 3);
  scene.add(key);

  // two see-through copies, in teletext cyan and magenta, that trail behind it on the way down (like bad reception)
  const ghosts = [0x2ee0f0, 0xff4df2].map((color, i) => {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const gBase = new THREE.Mesh(base.geometry, m), gLidMesh = new THREE.Mesh(lidMesh.geometry, m), gLid = new THREE.Group();
    gLid.position.copy(HINGE); gLidMesh.position.copy(HINGE).negate(); gLid.add(gLidMesh);
    const gModel = new THREE.Group(), gFacing = new THREE.Group(), gRig = new THREE.Group();
    gModel.add(gBase, gLid); gModel.position.copy(MIDDLE).negate();
    gFacing.rotation.y = -Math.PI / 2; gFacing.add(gModel); gRig.add(gFacing);
    scene.add(gRig);
    return { rig: gRig, lid: gLid, mat: m, p: 0, lag: [.1, .22][i] };   // lag: seconds it takes to catch up
  });

  // one layer fixed over the page: the WebGL laptop, and the HTML screen on top. 1 world unit = 1 CSS pixel at z = 0.
  const stage = document.createElement('div'), css = new CSS3DRenderer();
  stage.className = 'lt-stage';
  css.domElement.className = 'lt-html';
  gl.domElement.setAttribute('aria-hidden', 'true');
  stage.append(gl.domElement, css.domElement);
  slotA.after(stage);   // in the same place in the page's order, so tabbing to the screen still comes after the name
  document.documentElement.classList.add('lt-on');
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 20000);

  const ease = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  const smooth = t => t * t * (3 - 2 * t);
  const span = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  // opening a page from the screen: the camera flies in until the glass fills the window. home.js calls lt.zoom and
  // clips its static to lt.poly (the glass's outline on screen) every frame, so the static sits on the laptop's screen.
  let zoom = 0;
  const camHome = new THREE.Vector3(), camTo = new THREE.Vector3(), turnTo = new THREE.Quaternion(), still = new THREE.Quaternion(), corner = new THREE.Vector3();
  window.lt = {
    poly: '',
    zoom: (to, ms) => new Promise(done => {
      const from = zoom, t0 = performance.now();
      (function step(t){ const k = Math.min(1, (t - t0) / ms); zoom = from + (to - from) * ease(k); k < 1 ? requestAnimationFrame(step) : done(); })(t0);
    }),
  };
  const centre = r => ({ x: r.left + r.width / 2, y: r.bottom - r.width * .05, w: r.width });   // y: it stands on the bottom edge of its spot (a little up: the near corner dips in perspective)
  // how far below its middle the laptop's lowest point is (per unit of scale), in its resting pose
  rig.rotation.set(POSE.pitch, POSE.yaw, 0);
  rig.updateMatrixWorld(true);
  const FOOT = -new THREE.Box3().setFromObject(rig).min.y;
  const LIFT = .1, LAND = .86;   // it leaves the page at LIFT and reaches its landing spot at LAND (fractions of the scroll)
  let W = 0, H = 0, last = '', then = 0, searching = false;
  const count = document.getElementById('count'), pageNum = document.getElementById('ch-num'), hint = document.getElementById('scroll-hint');

  // where the laptop is at progress p, for the page scrolled to p * end. Before LIFT it rides on the page beside my
  // name. Then it flies (leaving at the page's own speed, so it never jumps) to the spot where the table will end up,
  // slows to a stop there and hovers while the table rises to meet it at p = 1; past that it rides the table.
  function pose(p, A, B, end, scroll = p * end){
    const d = LAND - LIFT;
    const ya = A.doc - LIFT * end, yb = B.doc - end, v = -end * d;   // where it leaves, where it lands, the page's speed
    const t = span(p, LIFT, LAND);
    let y = p <= LIFT ? A.doc - scroll : p >= LAND ? yb
      : (2*t**3 - 3*t**2 + 1) * ya + (t**3 - 2*t**2 + t) * v + (-2*t**3 + 3*t**2) * yb;   // a smooth curve between them
    const go = smooth(t), x = A.x + (B.x - A.x) * go, width = A.w + (B.w - A.w) * go;
    const pop = Math.sin(Math.PI * span(p, LIFT * .8, .7));
    return {
      x, y, width, scale: width / ACROSS * (1 + .25 * pop),
      rot: [POSE.pitch + .2 * pop, POSE.yaw + Math.PI * 2 * ease(span(p, .2, .78)), -.12 * pop],   // one slow full spin
      shut: ease(span(p, .04, .2)) * (1 - ease(span(p, LAND, .98))),   // the lid shuts as it lifts off, opens as the table arrives
    };
  }
  function place(target, lidGroup, q){
    target.position.set(q.x - W / 2, H / 2 - q.y + FOOT * q.width / ACROSS, 0);
    target.scale.setScalar(q.scale);
    target.rotation.set(...q.rot);
    lidGroup.rotation.z = LID_SHUT * q.shut;
  }

  function frame(now){
    requestAnimationFrame(frame);
    const dt = Math.min(.1, (now - then) / 1000 || 0); then = now;
    if(innerWidth !== W || innerHeight !== H){
      W = innerWidth; H = innerHeight;
      gl.setPixelRatio(Math.min(devicePixelRatio, 2));
      gl.setSize(W, H); css.setSize(W, H);
      camera.aspect = W / H;
      camHome.set(0, 0, H / 2 / Math.tan(THREE.MathUtils.degToRad(15)));
      camera.position.copy(camHome);
      camera.updateProjectionMatrix();
    }
    const aRect = slotA.getBoundingClientRect(), bRect = slotB.getBoundingClientRect();
    const a = centre(aRect), b = bRect.width ? centre(bRect) : a;
    // how far through the flight: 0 at the top of the page, 1 once the table's spot reaches the middle of the screen
    const end = Math.max(1, scrollY + bRect.top + bRect.height / 2 - H / 2);
    const flying = !small.matches && bRect.width;
    let p = flying ? Math.min(1, Math.max(0, scrollY / end)) : 0;
    if(reduceMotion) p = p > .5 ? 1 : 0;
    const A = { ...a, doc: a.y + scrollY }, B = { ...b, doc: b.y + scrollY };
    const beyond = scrollY - end;   // scrolled past the landing: it rides the table up the page
    ghosts.forEach(g => { g.p += (p - g.p) * (reduceMotion ? 1 : 1 - Math.exp(-dt / g.lag)); });
    const key = `${p.toFixed(4)} ${ghosts.map(g => g.p.toFixed(3))} ${a.x} ${a.y} ${b.x} ${b.y} ${W} ${H} ${zoom}`;
    if(key === last) return;   // nothing moved: no redraw
    last = key;

    const q = pose(p, A, B, end, scrollY);   // the real scroll: on a phone it never flies, it just rides the page
    if(p >= 1 && beyond > 0) q.y = b.y;
    place(rig, lid, q);
    screenEl.style.visibility = q.shut > .5 ? 'hidden' : '';   // shut, the screen would show through the keyboard
    // the trailing ghosts: only in the air, and only as far behind as it has just moved
    ghosts.forEach(g => {
      const inAir = p > LIFT && p < LAND && g.p > LIFT * .5;
      g.mat.opacity = inAir ? Math.min(.5, Math.abs(p - g.p) * 12) : 0;
      g.rig.visible = g.mat.opacity > .01;
      if(g.rig.visible) place(g.rig, g.lid, pose(g.p, A, B, end));
    });
    desk.classList.toggle('landed', p > .97);
    hint?.classList.toggle('gone', p > .02 || scrollY > 40);
    // while it's in the air, the header's page counter flicks through numbers, like a set searching for a page
    const nowSearching = p > LIFT && p < LAND && !reduceMotion;
    if(nowSearching){ count.textContent = 100 + Math.floor(Math.random() * 800); count.classList.add('searching'); }
    else if(searching){ count.textContent = pageNum.textContent; count.classList.remove('searching'); }
    searching = nowSearching;
    if(zoom > 0){
      // stand in front of the glass, facing it square on, close enough that it covers the whole window
      scene.updateMatrixWorld();
      const m = glass.matrixWorld, e = m.elements, px = new THREE.Vector3().setFromMatrixScale(m).x;   // world units per screen pixel
      const right = new THREE.Vector3(e[0], e[1], e[2]).normalize(), up = new THREE.Vector3(e[4], e[5], e[6]).normalize(), out = new THREE.Vector3(e[8], e[9], e[10]).normalize();
      const tan = Math.tan(THREE.MathUtils.degToRad(15));
      const dist = Math.min(screenEl.offsetHeight * px / 2 / tan, SCREEN_PX * px / 2 / (tan * camera.aspect)) * .97;
      camTo.setFromMatrixPosition(m).addScaledVector(out, dist);
      turnTo.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, out));
      camera.position.lerpVectors(camHome, camTo, zoom);
      camera.quaternion.slerpQuaternions(still, turnTo, zoom);
    } else { camera.position.copy(camHome); camera.quaternion.identity(); }
    camera.updateMatrixWorld();
    gl.render(scene, camera);
    css.render(scene, camera);
    if(zoom > 0){
      const hw = SCREEN_PX / 2, hh = screenEl.offsetHeight / 2;
      lt.poly = `polygon(${[[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => {
        corner.set(x, y, 0).applyMatrix4(glass.matrixWorld).project(camera);
        return `${(corner.x + 1) / 2 * W}px ${(1 - corner.y) / 2 * H}px`;
      })})`;
    }
  }
  requestAnimationFrame(frame);
}).catch(() => { /* the model didn't load: the flat screen stays where it is */ });
