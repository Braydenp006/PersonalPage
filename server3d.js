// The server in 3D on "How this site runs": an HP Z420 built from boxes, with a side panel that swings open.
// Hovering a part shows its label, taken from the #parts list in how-it-runs.html (edit the words there).
// No WebGL or a failed load: the #parts list just stays on the page as text.
// shortcut: a hand-built approximation of the Z420 (where the drives/PSU sit is a guess); swap in a real .glb scan if you get one.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const rig = document.getElementById('rig'), toggle = document.getElementById('panel-toggle'), tip = document.getElementById('rig-tip');
const parts = document.getElementById('parts');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let gl;
try { gl = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { /* no WebGL: the parts list stays */ }

if(gl){
  // the case, in metres: x across (the side panel is on -x), y up, z towards the front
  const W = .17, H = .445, D = .52, T = .004, IN = W / 2 - T;   // IN: the inside of the right wall, where the motherboard sits
  const scene = new THREE.Scene(), hits = [], byPart = {};
  const EDGE = new THREE.LineBasicMaterial({ color: 0x8a8e96, transparent: true, opacity: .35 });
  function box(size, color, pos, part, parent = scene, geo = new THREE.BoxGeometry(...size)){
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: .5 }));
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

  // shell: right wall, top, bottom, back, and the front bezel with its silver stripe and bay covers
  box([T, H, D], 0x3a3d42, [IN + T / 2, 0, 0], 'case');
  box([W, T, D], 0x3a3d42, [0, H / 2 - T / 2, 0], 'case');
  box([W, T, D], 0x3a3d42, [0, -H / 2 + T / 2, 0], 'case');
  box([W, H, T], 0x3a3d42, [0, 0, -D / 2 + T / 2], 'case');
  box([W, H, .03], 0x1f2124, [0, 0, D / 2 - .015], 'case');
  box([.012, H * .92, .002], 0xb9bec4, [-W / 2 + .018, 0, D / 2 + .001], 'case');
  box([.13, .042, .002], 0x0c0d0f, [.01, .17, D / 2 + .001], 'case');
  box([.13, .2, .002], 0x0c0d0f, [.01, -.1, D / 2 + .001], 'case');
  box([.146, .042, .17], 0x202226, [-.005, .17, .14], 'case');               // empty 5.25" bay

  // the side panel hangs off a hinge at its back edge
  const hinge = new THREE.Group();
  hinge.position.set(-W / 2, 0, -D / 2);
  scene.add(hinge);
  box([T, H, D], 0x45484e, [-T / 2, 0, D / 2], 'panel', hinge);
  box([.01, .07, .03], 0x111214, [-T - .005, .06, D - .05], 'panel', hinge); // the latch handle

  // inside
  const BOARD = IN - .003, CPU = { y: .05, z: -.07 };
  box([.003, .3, .3], 0x1e3a2e, [BOARD + .0015, -.03, -.06], 'board');
  box([.075, .1, .1], 0x9ea4aa, [BOARD - .0375, CPU.y, CPU.z], 'cpu');      // cooler
  fan(.042, 'z', 0x141518, [BOARD - .085, CPU.y, CPU.z], 'cpu');
  for(const side of [-1, 1]) for(let i = 0; i < 4; i++)                       // 8 DIMMs, 4 either side of the CPU
    box([.032, .133, .0035], 0x3a3f47, [BOARD - .016, CPU.y, CPU.z + side * (.062 + i * .009)], 'ram');
  box([W - 2 * T - .002, .09, .17], 0x3b3e43, [0, H / 2 - T - .046, -D / 2 + T + .086], 'psu');
  fan(.04, 'x', 0x141518, [.01, -.05, -D / 2 + T + .012], 'fan');
  const DRIVE_Z = D / 2 - .03 - .076;
  box([.102, .026, .147], 0x8c9198, [-.02, -.195, DRIVE_Z], 'mirror');
  box([.102, .026, .147], 0x8c9198, [-.02, -.16, DRIVE_Z], 'mirror');
  box([.102, .026, .147], 0x7a7f86, [-.02, -.125, DRIVE_Z], 'pool2');
  box([.07, .007, .1], 0x23262b, [-.02, -.095, DRIVE_Z + .02], 'ssd');

  scene.add(new THREE.HemisphereLight(0xbfe2ff, 0x2a3442, 1.4));   // daylight: blue sky above, darker ground below
  const light = (color, power, x, y, z) => { const l = new THREE.DirectionalLight(color, power); l.position.set(x, y, z); scene.add(l); };
  light(0xfff1d6, 3.6, -1.2, 2, 1.2);   // the sun: warm white, high up on the left, like the glare on the page behind
  light(0x9fd4ff, .8, 1, .3, -1);       // sky bouncing off the glass behind it

  const camera = new THREE.PerspectiveCamera(30, 1, .05, 10);
  camera.position.set(-.8, .4, 1);
  const controls = new OrbitControls(camera, gl.domElement);
  Object.assign(controls, { enableZoom: false, enablePan: false, enableDamping: !reduceMotion });   // no zoom: the scroll wheel keeps scrolling the page
  rig.prepend(gl.domElement);
  rig.classList.add('is-3d');

  new ResizeObserver(() => {
    const w = rig.clientWidth, h = rig.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // back off until a sphere round the case (with room for the open panel) fits the narrower side
    const half = THREE.MathUtils.degToRad(15), across = Math.min(half, Math.atan(Math.tan(half) * camera.aspect));
    camera.position.setLength(.4 / Math.sin(across));
    gl.setPixelRatio(Math.min(devicePixelRatio, 2));
    gl.setSize(w, h, false);
  }).observe(rig);

  // opening the panel
  let open = 0, target = 0;
  function setOpen(on){
    target = on ? 1 : 0;
    toggle.setAttribute('aria-pressed', on);
    toggle.textContent = on ? 'Close the side panel' : 'Open the side panel';
  }
  toggle.addEventListener('click', () => setOpen(!target));

  // hovering: light the part up and show its label next to the pointer
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null;
  const glow = (part, hex) => byPart[part]?.forEach(m => m.material.emissive.setHex(hex));
  function pick(e){
    const r = rig.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    let part = ray.intersectObjects(hits, false)[0]?.object.userData.part ?? null;   // false: skip the outlines, which would catch every ray
    if(part === 'case') part = null;   // the shell only blocks the view; it has nothing to show
    if(part !== hovered){
      glow(hovered, 0);
      glow(part, 0x1c4a2b);
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
  gl.domElement.addEventListener('click', e => {   // a click on the panel opens it, unless the pointer was dragging the view
    if(hovered === 'panel' && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) setOpen(!target);
  });

  gl.setAnimationLoop(() => {
    open = reduceMotion ? target : open + (target - open) * .1;
    hinge.rotation.y = -1.9 * open;   // ~110°, swung out to the left
    controls.update();
    gl.render(scene, camera);
  });
}
