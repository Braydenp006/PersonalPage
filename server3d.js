// The server in 3D on "How this site runs": an HP Z420 built from boxes, with a side panel that falls off,
// drawn as ASCII characters, on the GPU: the scene renders into a tiny image (one pixel per character cell), then a shader
// fills each cell with a glyph from a pre-drawn character sheet, picked by brightness and tinted with that pixel's colour.
// Hovering a part shows its label, taken from the #parts list in how-it-runs.html (edit the words there).
// No WebGL or a failed load: the #parts list just stays on the page as text.
// shortcut: a hand-built approximation of the Z420 (where the drives/PSU sit is a guess); swap in a real .glb scan if you get one.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const rig = document.getElementById('rig'), toggle = document.getElementById('panel-toggle'), tip = document.getElementById('rig-tip');
const parts = document.getElementById('parts');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let gl;
try { gl = new THREE.WebGLRenderer({ alpha: true }); } catch { /* no WebGL: the parts list stays */ }

if(gl){
  // the case, in metres: x across (the side panel is on -x), y up, z towards the front
  const W = .17, H = .445, D = .52, T = .004, IN = W / 2 - T;   // IN: the inside of the right wall, where the motherboard sits
  const scene = new THREE.Scene(), hits = [], byPart = {};
  const EDGE = new THREE.LineBasicMaterial({ color: 0x8a8e96, transparent: true, opacity: .35 });
  function box(size, color, pos, part, parent = scene, geo = new THREE.BoxGeometry(...size)){
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: .15 }));
    if(part === 'case' || part === 'panel') mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), EDGE));   // a faint outline so the dark case reads as 3D
    mesh.position.set(...pos);
    mesh.userData.part = part;
    (byPart[part] ??= []).push(mesh);
    hits.push(mesh);
    parent.add(mesh);
    return mesh;
  }
  const fan = (r, axis, color, pos, part) => {
    const m = box(null, color, pos, part, scene, new THREE.CylinderGeometry(r, r, .02, 32));
    m.rotation[axis] = Math.PI / 2;
  };

  // Layout follows photos of a real Z420: PSU top rear; motherboard over the rear two-thirds of the right wall with the
  // CPU cooler near its top, 4 DIMMs either side and the PCIe slots across its lower half; 5.25" bays top front,
  // drive cage below them; vertical-slat grille on the front; 92 mm exhaust fan on the back under the PSU.
  // Colours are lighter than the real black case: the ASCII view needs brightness to have something to draw.
  const SHELL = 0x8a9098, BEZEL = 0x3a3e44, LATCH = 0x3ddc6a;

  // shell: right wall, top, bottom, back
  box([T, H, D], SHELL, [IN + T / 2, 0, 0], 'case');
  box([W, T, D], SHELL, [0, H / 2 - T / 2, 0], 'case');
  box([W, T, D], SHELL, [0, -H / 2 + T / 2, 0], 'case');
  box([W, H, T], SHELL, [0, 0, -D / 2 + T / 2], 'case');
  // front bezel: three 5.25" bay covers at the top, then the tall grille of vertical slats, power button, HP badge, USB ports
  const FRONT = D / 2 + .001;
  box([W, H, .03], BEZEL, [0, 0, D / 2 - .015], 'case');
  for(let i = 0; i < 3; i++) box([W - .03, .038, .004], 0x9aa0a8, [-.006, .19 - i * .045, FRONT], 'case');
  for(let i = 0; i < 10; i++) box([.007, .27, .008], 0xb4bac2, [-W / 2 + .018 + i * .012, -.065, FRONT], 'case');   // slats wide enough to survive the ASCII grid
  fan(.009, 'x', 0xdfe3e8, [W / 2 - .02, .062, FRONT], 'case');          // power button
  fan(.011, 'x', 0xf2f4f7, [-.008, .015, FRONT + .002], 'case');          // HP badge
  for(let i = 0; i < 3; i++) box([.008, .012, .003], 0x2f6fe0, [W / 2 - .02, .03 - i * .02, FRONT], 'case');   // USB 3 ports

  // the side panel hangs off a pivot at its back edge; its latch handle is near the rear, the HP badge pressed into the middle
  const hinge = new THREE.Group();
  hinge.position.set(-W / 2, 0, -D / 2);
  scene.add(hinge);
  box([T, H, D], 0x959ba3, [-T / 2, 0, D / 2], 'panel', hinge);
  box([.01, .09, .035], 0x4a4e55, [-T - .005, .06, .07], 'panel', hinge);   // the latch handle
  const badge = box(null, 0xa8aeb6, [-T - .001, .02, D / 2 + .03], 'panel', hinge, new THREE.CylinderGeometry(.05, .05, .002, 40));
  badge.rotation.z = Math.PI / 2;

  // power supply, top rear
  box([W - 2 * T - .002, .085, .2], 0xb4bac2, [0, H / 2 - T - .044, -D / 2 + T + .1], 'psu');

  // motherboard on the right wall: rear I/O at its top-rear corner, sits under the PSU
  const BOARD = IN - .003, MB = { y: -.04, z: -.115, h: .3, d: .27 };
  box([.003, MB.h, MB.d], 0x3dff6e, [BOARD + .0015, MB.y, MB.z], 'board');
  const CPU = { y: .035, z: -.1 };
  // CPU cooler: a stack of fins with a fan on its outer face
  for(let i = 0; i < 10; i++) box([.08, .006, .1], 0x8c929a, [BOARD - .042, CPU.y - .05 + i * .011, CPU.z], 'cpu');
  fan(.04, 'z', 0x4a4d52, [BOARD - .092, CPU.y, CPU.z], 'cpu');
  // 8 DIMMs, 4 either side of the socket, standing up along the board
  for(const z0 of [-.185, -.042]) for(let i = 0; i < 4; i++)
    box([.032, .133, .0035], 0xe6e9ee, [BOARD - .016, CPU.y, z0 + i * .009], 'ram');
  // PCIe slots across the lower half (nothing in them), the last one an old white PCI slot
  for(let i = 0; i < 5; i++) box([.01, .008, .09], i === 4 ? 0xf2f2f2 : 0x2a2c30, [BOARD - .005, -.045 - i * .026, -.16], 'slots');
  box([.02, .04, .04], 0xd8dde3, [BOARD - .01, -.07, -.06], 'chipset');   // chipset heatsink

  // the back, from the rear photo. Seen from behind, the motherboard side (+x) is on the left
  const BACK = -D / 2 - .001;
  fan(.046, 'x', 0x4a4d52, [-.015, .02, -D / 2 + T + .012], 'fan');                 // 92 mm exhaust fan, inside
  fan(.044, 'x', 0x6a6f77, [-.015, .02, BACK - .002], 'fan');                        // its grille on the outside
  fan(.012, 'x', 0xb4bac2, [-.015, .02, BACK - .004], 'fan');                        // ...and hub
  box([W - .016, .09, .004], 0x9aa0a8, [-.002, .17, BACK], 'psu');                  // PSU rear plate
  fan(.038, 'x', 0x55595f, [-.012, .17, BACK - .002], 'psu');                        // its fan grille
  box([.022, .016, .006], 0x1e2024, [.055, .175, BACK - .002], 'psu');               // power socket
  // rear I/O panel, below the PSU on the motherboard side, with its coloured ports
  box([.05, .17, .004], 0xc8ccd2, [.05, .03, BACK], 'io');
  const port = (c, x, y, w = .012, h = .009) => box([w, h, .006], c, [x, y, BACK - .002], 'io');
  port(0x8a4fd0, .06, .1, .011, .011); port(0x3cb04a, .04, .1, .011, .011);          // PS/2 keyboard, mouse
  for(let i = 0; i < 4; i++) port(0x1e2024, .065 - (i % 2) * .02, .07 - Math.floor(i / 2) * .012);   // USB 2
  port(0x2f6fe0, .065, .042); port(0x2f6fe0, .045, .042);                            // USB 3
  port(0xe07a2a, .055, .015, .016, .014);                                            // Ethernet
  port(0xe05a8a, .065, -.012, .008, .008); port(0x3cb04a, .052, -.012, .008, .008); port(0x3a8ae0, .039, -.012, .008, .008);   // audio
  // padlock loop, expansion slot covers, vent holes, green thumbscrews
  box([.02, .03, .012], 0xb4bac2, [-.055, .07, BACK - .006], 'case');
  for(let i = 0; i < 5; i++) box([.06, .014, .003], 0xaab0b8, [.045, -.09 - i * .025, BACK], 'case');
  for(let r = 0; r < 9; r++) for(let c = 0; c < 4; c++) box([.006, .006, .003], 0x2a2c30, [-.025 - c * .012, -.09 - r * .013, BACK], 'case');
  for(const y of [-.07, -.2]) box([.01, .012, .01], LATCH, [-.075, y, BACK - .004], 'case');

  // front bays: three 5.25" trays at the top (empty), green latches on the open side
  for(let i = 0; i < 3; i++){
    box([.146, .004, .17], 0x6a6f77, [-.008, .171 - i * .045, D / 2 - .03 - .085], 'bays');
    box([.004, .016, .022], LATCH, [-W / 2 + .006, .19 - i * .045, D / 2 - .06], 'bays');
  }
  // drive cage below them: the mirrored pair, the second pool and the boot SSD
  const DRIVE_Z = D / 2 - .03 - .08;
  box([.102, .026, .147], 0x9aa0a8, [-.01, .04, DRIVE_Z], 'mirror');
  box([.102, .026, .147], 0x9aa0a8, [-.01, .005, DRIVE_Z], 'mirror');
  box([.102, .026, .147], 0x868c94, [-.01, -.03, DRIVE_Z], 'pool2');
  box([.07, .007, .1], 0x6a7280, [-.01, -.06, DRIVE_Z + .02], 'ssd');
  for(const [y, part] of [[.04, 'mirror'], [.005, 'mirror'], [-.03, 'pool2']]) box([.004, .012, .02], LATCH, [-W / 2 + .006, y, D / 2 - .06], part);

  // cables: tubes along curves through the open space in front of the motherboard, like the photo's
  const wire = (color, ...pts) => box(null, color, [0, 0, 0], 'wires', scene,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, .0035, 6));
  for(let i = 0; i < 3; i++){   // 24-pin bundle: out of the PSU, along the top, down the front edge of the board
    const o = i * .008;
    wire(0x5a5e66, [.02 + o, .125, -.09], [.03 + o, .1, .03], [.05 + o, -.02, .05], [.068, -.12 + o, .025]);
  }
  wire(0x5a5e66, [0, .125, -.21], [.04, .113, -.2], [.07, .105, -.175]);   // CPU 8-pin, to the top of the board
  [0xf0c43a, 0xe0483a, 0x5a5e66].forEach((c, i) => {   // SATA power: yellow, red, black, from the PSU to the drives
    const o = i * .006;
    wire(c, [-.03 - o, .125, -.086], [-.03 - o, .155, .02], [-.045 - o, .09, .068], [-.05 - o, .04, .074], [-.05 - o, -.05, .074]);
  });
  wire(0xd03a3a, [.07, -.17, .02], [.03, -.18, .05], [0, -.1, .07], [.01, -.03, .074]);   // SATA data, board to drives
  wire(0x4a4d52, [.07, -.16, .02], [.035, -.165, .055], [.01, -.08, .072], [.02, .04, .074]);
  wire(0x4a4d52, [.07, -.19, 0], [.02, -.205, .1], [-.03, -.2, .23]);   // front-panel cable, along the floor

  // bright, matte lighting: the ASCII view turns brightness into characters, so each face needs a clearly different level
  scene.add(new THREE.HemisphereLight(0xb4c8f0, 0x1a2030, 2.2));
  const light = (color, power, x, y, z) => { const l = new THREE.DirectionalLight(color, power); l.position.set(x, y, z); scene.add(l); };
  light(0xeef3ff, 4.2, -1.4, 1.8, 1);   // key, from the upper left
  light(0x9fb8ff, 1.8, 1, .8, -1.4);    // a cold rim from behind, so the dark edges still read

  const camera = new THREE.PerspectiveCamera(30, 1, .05, 10);
  camera.position.set(-.6, .35, 1);   // front-left three-quarter view, like the product photos
  scene.background = new THREE.Color(0x000000);   // black renders as the blank character

  // ===== the ASCII pass =====
  // the classic 70-step ASCII-art ramp, sparsest to densest: more steps means finer shading
  const CHARS = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const CELL = { w: 5, h: 9 };   // character size in CSS pixels: smaller means more characters, more detail
  // the character sheet: every glyph side by side, white on transparent, drawn at 2x the on-screen character size
  // (the sharpest pixel ratio used), so glyphs land on screen pixels instead of being shrunk down and thinned out
  const SLOT = { w: CELL.w * 2, h: CELL.h * 2 };
  const sheet = document.createElement('canvas');
  sheet.width = CHARS.length * SLOT.w; sheet.height = SLOT.h;
  const atlas = new THREE.CanvasTexture(sheet);
  Object.assign(atlas, { generateMipmaps: false, minFilter: THREE.LinearFilter });
  function drawSheet(){
    const g = sheet.getContext('2d');
    g.clearRect(0, 0, sheet.width, sheet.height);
    g.font = `700 ${SLOT.w / .6}px "IBM Plex Mono", monospace`;   // a monospace glyph is ~0.6em wide, so this fills its slot
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...CHARS].forEach((c, i) => g.fillText(c, (i + .5) * SLOT.w, SLOT.h * .55));
    atlas.needsUpdate = true;
    dirty = true;
  }
  const cells = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const ascii = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { scene: { value: cells.texture }, atlas: { value: atlas }, grid: { value: new THREE.Vector2(1, 1) }, count: { value: CHARS.length } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform sampler2D scene, atlas; uniform vec2 grid; uniform float count; varying vec2 vUv;
      void main(){
        vec2 cell = floor(vUv * grid), inCell = fract(vUv * grid);
        vec3 c = pow(texture2D(scene, (cell + .5) / grid).rgb, vec3(1. / 2.2));   // linear -> screen colour
        float glyph = floor(dot(c, vec3(.3, .59, .11)) * (count - 1.) + .5);   // brightness picks the character
        inCell = clamp(inCell, .02, .98);   // keep each cell's sample off its neighbours
        float ink = texture2D(atlas, vec2((glyph + inCell.x) / count, inCell.y)).a;
        gl_FragColor = vec4(min(c * 2., 1.), ink);   // lifted so the grey reads on the blue page
      }`,
  }));
  const screen = new THREE.Scene(), flat = new THREE.Camera();
  screen.add(ascii);
  gl.setClearColor(0x000000, 0);   // the ASCII pass sits on the page's own background

  const controls = new OrbitControls(camera, gl.domElement);
  Object.assign(controls, { enableDamping: !reduceMotion });   // left-drag turns, scroll zooms, right-drag moves it around
  controls.target.set(0, -.06, 0);   // aim a little low, so the case sits higher in the panel, clear of the button
  gl.domElement.setAttribute('aria-hidden', 'true');   // the #parts list says what's there for screen readers
  rig.prepend(gl.domElement);
  rig.classList.add('is-3d');

  let dirty = true;   // only redraw when something changed
  drawSheet();
  document.fonts?.ready.then(drawSheet);   // again once IBM Plex Mono has loaded

  function fit(){
    const w = rig.clientWidth, h = rig.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // back off until a sphere round the case fits the narrower side
    const half = THREE.MathUtils.degToRad(15), across = Math.min(half, Math.atan(Math.tan(half) * camera.aspect));
    const fitted = .36 / Math.sin(across);
    camera.position.sub(controls.target).setLength(fitted).add(controls.target);
    Object.assign(controls, { minDistance: fitted * .25, maxDistance: fitted * 1.8 });   // zoom right in to the parts, or out a bit
    const cols = w / CELL.w, rows = h / CELL.h;
    cells.setSize(Math.ceil(cols), Math.ceil(rows));
    ascii.material.uniforms.grid.value.set(cols, rows);
    gl.setPixelRatio(Math.min(devicePixelRatio, 2));
    gl.setSize(w, h, false);
    dirty = true;
  }
  fit();
  new ResizeObserver(fit).observe(rig);
  controls.addEventListener('change', () => { dirty = true; });

  // opening the panel: it falls off the case and drops out of the bottom of the view, for good
  let fall = null;   // { y speed, time } while it's falling
  function dropPanel(){
    if(fall || !hinge.parent) return;
    toggle.remove();   // there's no putting it back
    hits.splice(0, hits.length, ...hits.filter(m => m.userData.part !== 'panel'));   // the raycaster still hits hidden meshes, so drop them
    if(reduceMotion){ scene.remove(hinge); dirty = true; return; }
    fall = { v: 0, t: performance.now() };
  }
  toggle.addEventListener('click', dropPanel);

  // hovering: light the part up and show its label next to the pointer
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null;
  const glow = (part, hex) => { byPart[part]?.forEach(m => m.material.emissive.setHex(hex)); dirty = true; };
  function pick(e){
    const r = rig.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    let part = ray.intersectObjects(hits, false)[0]?.object.userData.part ?? null;   // false: skip the outlines, which would catch every ray
    if(part === 'case') part = null;   // the shell only blocks the view; it has nothing to show
    if(part !== hovered){
      glow(hovered, 0);
      glow(part, 0x5a7aa8);   // brighter means denser characters, so the part stands out
      hovered = part;
      if(part) tip.innerHTML = parts.querySelector(`[data-part="${part}"]`)?.innerHTML ?? '';
    }
    tip.hidden = !part;
    tip.style.left = `${e.clientX - r.left}px`;
    tip.style.top = `${e.clientY - r.top}px`;
    rig.style.cursor = part === 'panel' ? 'pointer' : '';
  }
  let down;
  gl.domElement.addEventListener('pointermove', pick);
  gl.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; pick(e); });
  gl.domElement.addEventListener('pointerleave', () => { glow(hovered, 0); hovered = null; tip.hidden = true; });
  gl.domElement.addEventListener('click', e => {   // a click on the panel drops it, unless the pointer was dragging the view
    if(hovered === 'panel' && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) dropPanel();
  });

  // redraw only when something moved
  let last = 0;
  gl.setAnimationLoop(now => {
    const dt = Math.min(.1, (now - last) / 1000);
    last = now;
    if(controls.update()) dirty = true;   // true while the view is turning (including the damping glide)
    if(fall){
      // tips out from the top as it drops, sliding away from the case, speeding up like it's falling
      fall.v += 2.5 * dt;
      hinge.position.y -= fall.v * dt;
      hinge.position.x -= .6 * dt;   // fast enough that the bottom edge clears the case as the top tips out
      hinge.rotation.z = Math.min(.6, hinge.rotation.z + 1.6 * dt);
      if(hinge.position.y < -1.5){ scene.remove(hinge); fall = null; }   // well below the bottom of the view
      dirty = true;
    }
    if(!dirty) return;
    dirty = false;
    gl.setRenderTarget(cells);   // the scene, one pixel per character
    gl.render(scene, camera);
    gl.setRenderTarget(null);    // then the characters
    gl.render(screen, flat);
  });
}
