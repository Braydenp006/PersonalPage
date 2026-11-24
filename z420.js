// The HP Z420 built from boxes (metres; x across with the side panel on -x, y up, z to the front), added to `scene`.
// Used by server3d.js (How this site runs) and other-work.js. Returns the panel's hinge and the meshes by part, for hovering.
// shortcut: a hand-built approximation of the Z420 (where the drives/PSU sit is a guess); swap in a real .glb scan if you get one.
import * as THREE from 'three';

export function buildZ420(scene){
  // the case, in metres: x across (the side panel is on -x), y up, z towards the front
  const W = .17, H = .445, D = .52, T = .004, IN = W / 2 - T;   // IN: the inside of the right wall, where the motherboard sits
  const hits = [], byPart = {};
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
  return { W, D, hinge, hits, byPart };
}
