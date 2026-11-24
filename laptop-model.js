// The home page's laptop model (assets/models/laptop: CC0, by While Fun Games), split into a base and a lid that turns
// about its hinge. Used by laptop3d.js (home) and other-work.js.
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// Measured from laptop.obj (its units): the lid hinges along z at HINGE; the glass is the inner face of the lid.
export const HINGE = new THREE.Vector3(-.919, .298, 0);
export const LID_SHUT = -1.889;   // radians about the hinge from the modelled (open) angle to lying flat on the keyboard
export const GLASS = { centre: new THREE.Vector3(-1.209, 1.1245, -.287), w: 2.418, h: 1.682, up: new THREE.Vector3(-.534, 1.595, 0) };
export const MIDDLE = new THREE.Vector3(-.29, 1, -.287);   // middle of the whole model, so it turns about its centre
export const ACROSS = 3.7;        // model units that should span the slot's width

export async function loadLaptop(){
  const [obj, tex] = await Promise.all([
    new OBJLoader().loadAsync('assets/models/laptop/laptop.obj'),
    new THREE.TextureLoader().loadAsync('assets/models/laptop/laptop.png'),
  ]);
  // its 128px texture shown crisp: chunky pixels suit the page
  Object.assign(tex, { magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter, colorSpace: THREE.SRGBColorSpace });

  // the model is one mesh; split the lid off (every triangle with a corner above the keyboard) so it can open and shut
  const src = obj.children[0].geometry.toNonIndexed(), pos = src.attributes.position, uv = src.attributes.uv;
  const parts = { base: { p: [], u: [] }, lid: { p: [], u: [] } };
  for(let t = 0; t < pos.count; t += 3){
    const isLid = [0, 1, 2].some(k => pos.getY(t + k) > .3);
    for(let k = 0; k < 3; k++){
      const part = parts[isLid ? 'lid' : 'base'];
      part.p.push(pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k));
      part.u.push(uv.getX(t + k), uv.getY(t + k));
    }
  }
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, flatShading: true });
  const edge = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 });   // a white outline, like the page's block drawings
  const mesh = part => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(part.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(part.u, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), edge));
    return m;
  };
  const base = mesh(parts.base), lidMesh = mesh(parts.lid);
  const lid = new THREE.Group();   // turns about the hinge
  lid.position.copy(HINGE);
  lidMesh.position.copy(HINGE).negate();
  lid.add(lidMesh);
  return { base, lid, lidMesh };
}

// lays a real HTML element (`px` CSS pixels wide) on the glass, inside the lid so it shuts with it; render with CSS3DRenderer
export function onGlass(lid, el, px){
  const glass = new CSS3DObject(el);
  const n = new THREE.Vector3(1.595, .534, 0).normalize(), up = GLASS.up.clone().normalize(), right = new THREE.Vector3().crossVectors(up, n);
  glass.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n));
  glass.position.copy(GLASS.centre).addScaledVector(n, .012).sub(HINGE);
  glass.scale.setScalar(GLASS.w / px);
  lid.add(glass);
  return glass;
}
