// The server in 3D on "How this site runs": an HP Z420 built from boxes, with a side panel that falls off,
// drawn as ASCII characters, on the GPU: the scene renders into a tiny image (one pixel per character cell), then a shader
// fills each cell with a glyph from a pre-drawn character sheet, picked by brightness and tinted with that pixel's colour.
// Hovering a part shows its label, taken from the #parts list in how-it-runs.html (edit the words there).
// No WebGL or a failed load: the #parts list just stays on the page as text.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildZ420 } from './z420.js';

const rig = document.getElementById('rig'), toggle = document.getElementById('panel-toggle'), tip = document.getElementById('rig-tip');
const parts = document.getElementById('parts');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let gl;
try { gl = new THREE.WebGLRenderer({ alpha: true }); } catch { /* no WebGL: the parts list stays */ }

if(gl){
  const scene = new THREE.Scene();
  const { W, D, hinge, hits, byPart } = buildZ420(scene);

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

  let fitted = 1;   // the camera distance that fits the case for the current size (set by fit)
  function fit(){
    const w = rig.clientWidth, h = rig.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // back off until a sphere round the case fits the narrower side
    const half = THREE.MathUtils.degToRad(15), across = Math.min(half, Math.atan(Math.tan(half) * camera.aspect));
    fitted = .36 / Math.sin(across);
    camera.position.sub(controls.target).setLength(fitted).add(controls.target);
    Object.assign(controls, { minDistance: fitted * .25, maxDistance: fitted * 1.8 });   // zoom right in to the parts, or out a bit
    const cols = w / CELL.w, rows = h / CELL.h;
    cells.setSize(Math.ceil(cols), Math.ceil(rows));
    ascii.material.uniforms.grid.value.set(cols, rows);
    gl.setPixelRatio(Math.min(devicePixelRatio, 2));
    gl.setSize(w, h, false);
    render();   // now, not next frame: resizing clears the canvas, and a frame of blank is the flicker
  }
  function render(){
    dirty = false;
    gl.setRenderTarget(cells);   // the scene, one pixel per character
    gl.render(scene, camera);
    gl.setRenderTarget(null);    // then the characters
    gl.render(screen, flat);
  }
  fit();
  new ResizeObserver(fit).observe(rig);
  controls.addEventListener('change', () => { dirty = true; });

  // opening the panel: it falls off the case and drops out of the bottom of the view (Reset puts it back)
  let fall = null;   // { y speed, time } while it's falling
  const allHits = [...hits];
  function dropPanel(){
    if(fall || !hinge.parent) return;
    toggle.hidden = true;
    hits.splice(0, hits.length, ...hits.filter(m => m.userData.part !== 'panel'));   // the raycaster still hits hidden meshes, so drop them
    if(reduceMotion){ scene.remove(hinge); dirty = true; return; }
    fall = { v: 0, t: performance.now() };
  }
  toggle.addEventListener('click', dropPanel);

  // Reset: the view glides back to where it started (zoom, turn and pan), and a fallen panel is back on the case
  const START = { dir: camera.position.clone().sub(controls.target).normalize(), target: controls.target.clone() };   // the opening view, at whatever distance fits now
  let back = null;   // { from, t } while gliding back
  document.getElementById('rig-reset').addEventListener('click', () => {
    fall = null;
    hinge.position.set(-W / 2, 0, -D / 2);
    hinge.rotation.set(0, 0, 0);
    scene.add(hinge);
    hits.splice(0, hits.length, ...allHits);
    toggle.hidden = false;
    back = { from: { pos: camera.position.clone(), target: controls.target.clone() }, t: 0 };
    if(reduceMotion) back.t = 1;
    dirty = true;
  });

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
    if(back){
      back.t = Math.min(1, back.t + dt / .7);
      const k = 1 - (1 - back.t) ** 3;   // ease out
      camera.position.lerpVectors(back.from.pos, START.dir.clone().multiplyScalar(fitted).add(START.target), k);
      controls.target.lerpVectors(back.from.target, START.target, k);
      if(back.t === 1) back = null;
      dirty = true;
    }
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
    if(dirty) render();
  });
}
