// Swaps the CSS monitor for the real CRT model (assets/models/CRT.glb). The terminal stays real HTML: CSS3DRenderer
// pins the existing .crt-screen onto the model's glass, so resume.js keeps working untouched.
// It follows the same tilt resume.js sets on #monitor (--rx/--ry, and .facing). No WebGL or a failed load: the CSS monitor stays.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// Where the glass is, measured from the model (units: model metres, after centring it and turning it by TURN).
const TURN = THREE.MathUtils.degToRad(143.5);              // the scan's screen faces this way; this turns it to the camera
const GLASS = { x: -.009, y: .087, z: .262, w: .4, h: .275 };
const FOV = 30;

const stage = document.querySelector('.stage'), monitor = document.getElementById('monitor'), screen = document.querySelector('.crt-screen');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let gl;
const showFallback = () => document.documentElement.classList.remove('crt-loading');   // see the <head> of resume.html
try { gl = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { showFallback(); /* no WebGL: keep the CSS monitor */ }
if(gl) new GLTFLoader().load('assets/models/CRT.glb', ({ scene: model }) => {
  model.position.sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
  const turn = new THREE.Group(), pivot = new THREE.Group(), scene = new THREE.Scene();
  turn.rotation.y = TURN;
  pivot.position.set(GLASS.x, GLASS.y, GLASS.z);   // tilt around the glass, so it stays centred when the camera is close
  turn.position.copy(pivot.position).negate();
  turn.add(model);
  pivot.add(turn);
  scene.add(pivot);
  const size = new THREE.Box3().setFromObject(turn, true).getSize(new THREE.Vector3());   // as it faces the camera
  // a dark room: dim fill, and the screen's green glow falling on the case
  scene.add(new THREE.HemisphereLight(0xcfe8d6, 0x050706, 1.4));
  const glow = new THREE.PointLight(0x50ff8c, 1.2, 1.5, 1.5);
  glow.position.set(0, GLASS.y, .6);
  scene.add(glow);

  // the terminal, laid on the glass
  const box3d = document.createElement('div'), css = new CSS3DRenderer();
  box3d.className = 'crt3d';
  css.domElement.className = 'crt3d-html';
  box3d.append(gl.domElement, css.domElement);
  const glass = new CSS3DObject(screen);
  pivot.add(glass);
  stage.classList.add('is-3d');
  stage.append(box3d);
  showFallback();   // nothing to fall back to any more, just drops the class

  const camera = new THREE.PerspectiveCamera(FOV, 1, .05, 10);
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  function resize(){
    const w = box3d.clientWidth, h = box3d.clientHeight;
    camera.aspect = w / h;
    // back off until the whole model fits with a little room around it. Below the PC layout (see styles.css)
    // stop before the glass gets narrower than ~760px (or 90% of a phone's width), so the terminal stays readable
    const whole = Math.max(size.y * .5 / tan, size.x * .5 / (tan * camera.aspect)) + size.z / 2;
    const glassFills = GLASS.w / 2 / Math.min(.9, 760 / w) / (tan * camera.aspect) + GLASS.z;
    const dist = matchMedia('(min-width:1100px)').matches ? whole : Math.min(whole, glassFills);
    camera.position.set(0, dist < whole ? GLASS.y : 0, dist);   // level with the model's centre, so the space above and below it is even
    camera.updateProjectionMatrix();
    gl.setPixelRatio(Math.min(devicePixelRatio, 2));
    gl.setSize(w, h, false);
    css.setSize(w, h);
    // lay the terminal out at about the size it shows on screen, so its text sizes stay the same as before
    const px = Math.round(GLASS.w * h / (2 * tan * (dist - GLASS.z)));
    screen.style.width = `${px}px`;
    screen.style.height = `${Math.round(px * GLASS.h / GLASS.w)}px`;
    glass.scale.setScalar(GLASS.w / px);
    gl.render(scene, camera);   // now, not next frame: resizing clears the canvas, and a frame of blank is the flicker
    css.render(scene, camera);
    draw();
  }

  // ease towards the tilt resume.js asks for; render only while moving
  const target = new THREE.Euler(), deg = THREE.MathUtils.degToRad;
  let raf = 0;
  function aim(){
    const s = getComputedStyle(monitor), facing = monitor.classList.contains('facing');
    // CSS rotateX tips the other way to three's, hence the minus
    target.set(facing ? 0 : -deg(parseFloat(s.getPropertyValue('--rx'))), facing ? 0 : deg(parseFloat(s.getPropertyValue('--ry'))), 0);
    draw();
  }
  function draw(){ if(!raf) raf = requestAnimationFrame(frame); }
  function frame(){
    raf = 0;
    const k = reduceMotion ? 1 : .08;
    pivot.rotation.x += (target.x - pivot.rotation.x) * k;
    pivot.rotation.y += (target.y - pivot.rotation.y) * k;
    gl.render(scene, camera);
    css.render(scene, camera);
    if(Math.abs(target.x - pivot.rotation.x) + Math.abs(target.y - pivot.rotation.y) > 1e-4) draw();
  }
  new MutationObserver(aim).observe(monitor, { attributes: true, attributeFilter: ['style', 'class'] });
  new ResizeObserver(resize).observe(box3d);
  aim();
}, undefined, err => { showFallback(); console.warn('CRT model failed to load, keeping the CSS monitor', err); });
