// Page 100 on the home page's laptop: my head (assets/models/me.glb, the About page's model, framed on the head),
// turning slowly, drawn as ASCII in teletext colours. Same method as server3d.js: the scene renders into a tiny image
// (one pixel per character cell), then a shader fills each cell with a glyph picked by brightness.
// It loads after the page has finished loading (the model is ~6 MB), and only draws while page 100 is on and on screen.
// No WebGL or a failed load: the screen keeps its "tuning in" text.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('screen-head');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CELL = { w: 9, h: 15 };   // character size in CSS pixels (Bedstead is .6 as wide as it is tall)
const TURN_SPEED = .5;          // radians per second
// sparsest to densest; brightness picks one
const CHARS = " .:-=+*#%@";

let gl;
try { gl = new THREE.WebGLRenderer({ canvas, alpha: true }); } catch { /* no WebGL: the screen keeps its text */ }

const start = () => gl && new GLTFLoader().load('assets/models/me.glb', ({ scene: model, animations }) => {
  // stand him in his idle pose (the file stores arms-out), like the About page does
  const mixer = new THREE.AnimationMixer(model);
  const idle = THREE.AnimationClip.findByName(animations, 'idle');
  if(idle) mixer.clipAction(idle).play();
  mixer.update(0);
  model.updateMatrixWorld(true);

  // find the head: the box round every vertex in the top 13% of the figure
  const box = new THREE.Box3().setFromObject(model, true), headH = box.getSize(new THREE.Vector3()).y * .13;
  const headBox = new THREE.Box3(), v = new THREE.Vector3();
  model.traverse(o => {
    if(!o.isMesh) return;
    for(let i = 0; i < o.geometry.attributes.position.count; i++){
      o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld);   // with the skeleton's pose applied
      if(v.y > box.max.y - headH) headBox.expandByPoint(v);
    }
    // shaded as plain white: the shape of the face drives the characters, not the dark hair and skin of the texture
    o.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, metalness: 0 });
  });
  const centre = headBox.getCenter(new THREE.Vector3());

  const turn = new THREE.Group(), scene = new THREE.Scene();
  model.position.sub(centre);   // turn around the middle of the head
  turn.add(model);
  scene.add(turn);
  // hard light from one side and a dim fill, so the face has clear bright and dark sides for the characters to show
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, .25));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-1.2, 1, 2);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(24, 1, .01, 20);
  const dist = headH * .62 / Math.tan(THREE.MathUtils.degToRad(12));   // the head fills most of the screen's height
  camera.position.set(0, 0, dist);

  // the character sheet, in the page's teletext face
  const SLOT = { w: CELL.w * 2, h: CELL.h * 2 };
  const sheet = document.createElement('canvas');
  sheet.width = CHARS.length * SLOT.w; sheet.height = SLOT.h;
  const atlas = new THREE.CanvasTexture(sheet);
  Object.assign(atlas, { generateMipmaps: false, minFilter: THREE.LinearFilter });
  const drawSheet = () => {
    const g = sheet.getContext('2d');
    g.clearRect(0, 0, sheet.width, sheet.height);
    g.font = `${SLOT.h}px Bedstead, monospace`;
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [...CHARS].forEach((c, i) => g.fillText(c, (i + .5) * SLOT.w, SLOT.h * .52));
    atlas.needsUpdate = true;
  };
  drawSheet();
  document.fonts?.ready.then(drawSheet);

  const cells = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const ascii = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { scene: { value: cells.texture }, atlas: { value: atlas }, grid: { value: new THREE.Vector2(1, 1) }, count: { value: CHARS.length } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform sampler2D scene, atlas; uniform vec2 grid; uniform float count; varying vec2 vUv;
      void main(){
        vec2 cell = floor(vUv * grid), inCell = clamp(fract(vUv * grid), .02, .98);
        vec4 s = texture2D(scene, (cell + .5) / grid);
        float lum = s.a < .5 ? 0. : pow(dot(s.rgb, vec3(.3, .59, .11)), 1. / 2.2);
        float glyph = floor(lum * (count - 1.) + .5);
        float ink = texture2D(atlas, vec2((glyph + inCell.x) / count, inCell.y)).a;
        // teletext colours by brightness: lit side white, mid cyan, shadow green
        vec3 col = lum > .55 ? vec3(1.) : lum > .3 ? vec3(.18, .88, .94) : vec3(.22, .88, .35);
        gl_FragColor = vec4(col, ink);
      }`,
  }));
  const flat = new THREE.Scene(), flatCam = new THREE.Camera();
  flat.add(ascii);
  gl.setClearColor(0x000000, 1);

  function fit(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if(!w || !h) return;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    cells.setSize(Math.ceil(w / CELL.w), Math.ceil(h / CELL.h));
    ascii.material.uniforms.grid.value.set(w / CELL.w, h / CELL.h);
    gl.setPixelRatio(Math.min(devicePixelRatio, 2));
    gl.setSize(w, h, false);
    draw();
  }
  function draw(){
    gl.setRenderTarget(cells); gl.setClearColor(0x000000, 0); gl.clear(); gl.render(scene, camera);
    gl.setRenderTarget(null); gl.setClearColor(0x000000, 1); gl.render(flat, flatCam);
  }
  new ResizeObserver(fit).observe(canvas);
  turn.rotation.y = -.5;   // a three-quarter view to start (and to stay on, with reduced motion)
  fit();
  canvas.closest('.tt-screen')?.classList.add('head-ready');

  // turn only while page 100 is on, the screen is in view and the tab is showing
  let on = true, seen = true, last = 0;
  addEventListener('tt-page', e => { on = e.detail === '100'; });
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(canvas);
  if(reduceMotion) return;
  (function loop(t){
    requestAnimationFrame(loop);
    const dt = Math.min(.1, (t - last) / 1000); last = t;
    if(!on || !seen || document.hidden) return;
    turn.rotation.y += dt * TURN_SPEED;
    draw();
  })(0);
}, undefined, () => { /* failed to load: the screen keeps its text */ });

// wait for the page itself to finish loading first: the model is big, and the first screen shouldn't wait on it
if(document.readyState === 'complete') setTimeout(start, 200); else addEventListener('load', () => setTimeout(start, 200));
