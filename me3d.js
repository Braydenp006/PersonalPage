// The 3D figure on the About page: me (assets/models/me.glb, made with Meshy AI), turned a little towards the stats.
// Drag it (or focus it and use the arrow keys) to spin it round. The model has no skeleton, so it can't play animations: it just breathes and sways a little
// (scripted below). If it gets rigged later (e.g. in Blender), put its animation names in IDLE and GESTURES and the
// idle / nod code takes over. (placeholder-me.glb, three.js's "Xbot" mannequin, is the old stand-in, unused.)
// No WebGL: the card shows its lit floor only. Reduced motion: it holds still in its idle pose.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL = 'assets/models/me.glb', IDLE = 'idle', GESTURES = ['agree', 'headShake'];
const stage = document.getElementById('char-stage');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let gl;
try { gl = new THREE.WebGLRenderer({ antialias: false, alpha: true }); } catch { /* no WebGL: the stage stays empty */ }

if(gl && stage) new GLTFLoader().load(MODEL, ({ scene: model, animations }) => {
  const scene = new THREE.Scene();
  scene.add(model);
  model.rotation.y = -.35;   // a three-quarter turn, facing the stats beside it
  // light like the page: a soft white fill, a key from the front left, a blue rim from behind, an orange kick from the right
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a5a5a, 1.6));
  const light = (c, p, x, y, z) => { const l = new THREE.DirectionalLight(c, p); l.position.set(x, y, z); scene.add(l); };
  light(0xffffff, 1.8, -1.5, 2.5, 2);
  light(0x2f8fd0, 1.6, 1.5, 1.8, -2);
  light(0xf7931e, .6, 2.5, .5, 1);

  // the idle runs all the time; gestures play once on top of it (as additive layers, so only the head and arms move)
  const mixer = new THREE.AnimationMixer(model);
  const idle = THREE.AnimationClip.findByName(animations, IDLE);
  if(idle) mixer.clipAction(idle).play();
  mixer.update(0);
  model.updateMatrixWorld(true);

  // the camera fits the whole figure, head to toe, measured in its idle pose (not the arms-out pose it's stored in)
  const box = new THREE.Box3().setFromObject(model, true), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 50);
  const tan = Math.tan(THREE.MathUtils.degToRad(13));
  const fit = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if(!w || !h) return;
    camera.aspect = w / h;
    const dist = Math.max(size.y * .58 / tan, size.x * .75 / (tan * camera.aspect));
    camera.position.set(mid.x, mid.y + size.y * .04, mid.z + dist);
    camera.lookAt(mid.x, mid.y, mid.z);
    camera.updateProjectionMatrix();
    gl.setPixelRatio(.6);   // drawn at a bit over half resolution and scaled up pixelated (styles.css): a hint of early 3D
    gl.setSize(w, h, false);
    gl.render(scene, camera);   // now: resizing clears the canvas, a frame of blank is a flicker
  };
  stage.append(gl.domElement);
  fit();

  // spin: dragging sideways turns me round; arrow keys do the same once the model is focused
  const el = gl.domElement;
  let spin = 0, dragX = null;
  el.tabIndex = 0;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', '3D model of me. Drag, or use the left and right arrow keys, to turn it round.');
  const turn = by => { spin += by; if(reduceMotion){ model.rotation.y = -.35 + spin; gl.render(scene, camera); } };
  el.addEventListener('pointerdown', e => { dragX = e.clientX; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if(dragX === null) return; turn((e.clientX - dragX) * .012); dragX = e.clientX; });
  el.addEventListener('pointerup', () => dragX = null);
  el.addEventListener('pointercancel', () => dragX = null);
  el.addEventListener('keydown', e => {
    const by = { ArrowLeft: -.3, ArrowRight: .3 }[e.key];
    if(by){ e.preventDefault(); turn(by); }
  });
  new ResizeObserver(fit).observe(stage);

  const gestures = Object.fromEntries(GESTURES.map(name => {
    const clip = THREE.AnimationClip.findByName(animations, name);
    if(!clip) return [name, null];
    THREE.AnimationUtils.makeClipAdditive(clip);
    const action = mixer.clipAction(clip);
    action.blendMode = THREE.AdditiveAnimationBlendMode;
    action.setLoop(THREE.LoopOnce);
    return [name, action];
  }));
  const gesture = name => gestures[name]?.reset().setEffectiveWeight(1).fadeIn(.25).play();
  if(reduceMotion){ gl.render(scene, camera); return; }

  // render only while on screen; a gesture every 7-12 s
  const clock = new THREE.Clock();
  let visible = true, next = 4, t = 0;
  const rest = { y: model.position.y, turn: model.rotation.y };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; loop(); }).observe(stage);
  function loop(){
    gl.setAnimationLoop(visible ? () => {
      const dt = Math.min(clock.getDelta(), .1);
      if((next -= dt) <= 0){ gesture(GESTURES[Math.floor(Math.random() * GESTURES.length)]); next = 7 + Math.random() * 5; }
      mixer.update(dt);
      if(!idle){   // no animations in the model: breathe (a slight rise and fall) and sway (a slow small turn)
        t += dt;
        model.position.y = rest.y + Math.sin(t * 1.7) * size.y * .003;
        model.rotation.y = rest.turn + spin + Math.sin(t * .45) * .06;
      } else model.rotation.y = rest.turn + spin;
      gl.render(scene, camera);
    } : null);
    clock.getDelta();   // don't count the paused time
  }
  loop();
}, undefined, err => console.warn('character model failed to load', err));
