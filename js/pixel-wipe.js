// The About page's way between pages: the screen fills with big pixels in the page's blue, spreading out from what
// was clicked in ordered-dither order with an orange leading edge (cover), and later clears the same way (uncover).
// Used by home.js (the page cards) and about.js (Home, GitHub, LinkedIn).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const BLOCK = 22;   // CSS px per pixel
const BLUE = '#2f8fd0', ORANGE = '#f7931e', EDGE = .14;   // EDGE: how far behind the front the pixels stay orange

function canvasFor(rect){
  const c = document.createElement('canvas'), cols = Math.ceil(innerWidth / BLOCK), rows = Math.ceil(innerHeight / BLOCK);
  c.className = 'pixel-cover';
  c.width = cols; c.height = rows;
  c.style.cssText = `position:fixed;left:0;top:0;width:${cols * BLOCK}px;height:${rows * BLOCK}px;z-index:200;pointer-events:none;image-rendering:pixelated`;
  // each pixel's turn, 0 to 1: mostly how far it is from the clicked thing, roughed up by the dither so the front is ragged
  const cx = (rect.left + rect.width / 2) / BLOCK, cy = (rect.top + rect.height / 2) / BLOCK;
  const far = Math.max(...[[0, 0], [cols, 0], [0, rows], [cols, rows]].map(([x, y]) => Math.hypot(x - cx, y - cy)));
  c.turn = new Float32Array(cols * rows);
  for(let y = 0; y < rows; y++) for(let x = 0; x < cols; x++)
    c.turn[y * cols + x] = Math.hypot(x + .5 - cx, y + .5 - cy) / far * .8 + BAYER[(y % 4) * 4 + x % 4] / 16 * .2;
  document.body.append(c);
  return c;
}
function run(c, out, ms){
  const g = c.getContext('2d'), { width: cols, turn } = c, start = performance.now();
  return new Promise(done => (function frame(now){
    const p = Math.min(1, (now - start) / ms) * (1 + EDGE);   // runs past 1 so the last orange turns blue
    g.clearRect(0, 0, c.width, c.height);
    for(let i = 0; i < turn.length; i++){
      const t = turn[i], on = out ? t >= p - EDGE : t < p;   // out: cleared from the clicked spot outwards, orange front first
      if(!on) continue;
      g.fillStyle = (out ? t < p : p - t < EDGE) ? ORANGE : BLUE;
      g.fillRect(i % cols, Math.floor(i / cols), 1, 1);
    }
    if(p < 1 + EDGE) requestAnimationFrame(frame); else done(c);
  })(start));
}
console.assert(BAYER.length === 16 && new Set(BAYER).size === 16, 'bayer');

export const cover = (rect, ms = 460) => run(canvasFor(rect), false, ms);   // resolves with the cover, left on screen
export const uncover = (c, ms = 460) => run(c, true, ms).then(() => c.remove());
