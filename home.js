// Opening a photo link: a window opens inside the photo showing the real page and grows to fill the screen.
// The page is loaded into a hidden full-screen frame when the pointer first comes over (or focuses) a photo, and the
// window is just a cut-out of that frame, so what you see is the page itself. Once it fills the screen it simply stays
// as the page (the address bar changes to it), so nothing reloads or flickers. Back shrinks it into its photo again;
// reloading or sharing the address opens the real page directly.
// Until the frame has loaded, the window shows the page's background colour (--to on the link in index.html).
// New-tab clicks (ctrl / cmd / shift / middle) and reduced motion just follow the link.
// On the home page (the teletext one) there are two other ways in, instead of the window:
// - the TV screen: static zooms out of the screen to fill the page, then breaks up while the page comes into focus;
// - a link marked data-open="draw" (GET MY RESUME): the page arrives row by row from the top, like a teletext page.
// The About page keeps the plain window.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tiles = document.querySelector('.tiles, .cards');   // the homepage's photos, or the About page's page cards
const homeTitle = document.title, home = location.href.replace(/index\.html$/, '');
const windows = new Map();   // link href -> { layer, frame, ready }
let busy = false, open = null, opening = null;   // open: { w, link, how } while a page is in (or opening into) its window; opening: that animation
const TUNE = tiles.matches('.tiles');   // the home page
const how = link => TUNE && link.matches('.tt-screen') ? 'tune' : link.dataset.open === 'draw' ? 'draw' : 'window';

function prepare(link){
  if(windows.has(link.href)) return windows.get(link.href);
  const layer = document.createElement('div'), frame = document.createElement('iframe');
  layer.className = 'tile-window';
  layer.style.background = getComputedStyle(link).getPropertyValue('--to') || 'var(--paper)';
  frame.src = link.href;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  const ready = new Promise(done => { frame.addEventListener('load', done, { once: true }); setTimeout(done, 2500); })   // shortcut: a slow page gets 2.5s, then the colour fills in for it
    .then(() => { frame.style.opacity = 1; });
  frame.addEventListener('load', () => frame.contentDocument?.addEventListener('click', leave));   // every load, not just the first: a reload would drop it
  layer.append(frame);
  let snow = null;
  if(TUNE){ snow = document.createElement('canvas'); snow.className = 'tune-static'; snow.width = 160; snow.height = 100; layer.append(snow); }
  document.body.append(layer);
  const w = { layer, frame, ready, snow };
  windows.set(link.href, w);
  return w;
}
if(!reduceMotion){
  const warm = e => { const link = e.target.closest('a.tile'); if(link) prepare(link); };
  tiles.addEventListener('pointerover', warm);
  tiles.addEventListener('focusin', warm);
}

// clip-path insets for the photo's rectangle, and for a point in its middle
function shapes(link, layer){
  const r = link.querySelector('.frame').getBoundingClientRect(), W = layer.clientWidth, H = layer.clientHeight;
  const cut = (t, rt, b, l, round = 3) => `inset(${t}px ${rt}px ${b}px ${l}px round ${round}px)`;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  return { dot: cut(cy, W - cx, H - cy, cx), card: cut(r.top, W - r.right, H - r.bottom, r.left), full: cut(0, 0, 0, 0, 0) };
}
const OPEN = 'cubic-bezier(.2,.7,.2,1)', GROW = 'cubic-bezier(.75,0,.2,1)';
// the teletext way in: the page appears a row at a time from the top (24 rows, like a teletext screen), and back up again
const ROWS_IN = { clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0 0)'] }, ROWS_OUT = { clipPath: ['inset(0 0 0 0)', 'inset(0 0 100% 0)'] };
async function drawIn(w){ await w.ready; await w.layer.animate(ROWS_IN, { duration: 720, easing: 'steps(24, end)', fill: 'forwards' }).finished; }
async function drawOut(w){ await w.layer.animate(ROWS_OUT, { duration: 480, easing: 'steps(24, end)', fill: 'forwards' }).finished; }

// TV static: random grey dots redrawn every frame. `level` is how much of the screen is still static, 1 to 0:
// as it drops, more and more dots go clear and the page shows through them, like a set slowly picking up the signal.
function hiss(w){
  const g = w.snow.getContext('2d'), img = g.createImageData(w.snow.width, w.snow.height), d = img.data;
  const ctl = { level: 1, on: true };
  (function frame(){
    if(!ctl.on) return;
    const W = w.snow.width;
    for(let i = 0, p = 0; i < d.length; i += 4, p++){
      // whole rows drop out together now and then (the rolling bars of a weak signal), the rest dot by dot
      const row = (p / W | 0), roll = Math.sin(row * .35 + performance.now() / 90) * .25;
      const shows = Math.random() < ctl.level + roll * ctl.level;
      d[i] = d[i+1] = d[i+2] = Math.random() * 255;
      d[i+3] = shows ? 255 : 0;
    }
    g.putImageData(img, 0, 0);
    requestAnimationFrame(frame);
  })();
  return ctl;
}
// change the amount of static from one level to another over `ms`
const fadeStatic = (ctl, from, to, ms) => new Promise(done => {
  const t0 = performance.now();
  (function step(t){
    const k = Math.min(1, (t - t0) / ms);
    ctl.level = from + (to - from) * (k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);   // slow, quick, slow
    k < 1 ? requestAnimationFrame(step) : done();
  })(t0);
});
// home page opening: static fills the preview and zooms out to the whole screen, then breaks up while the page sharpens into focus
async function tuneIn(w, s){
  const ctl = hiss(w);
  w.snow.style.opacity = 1;
  await w.layer.animate({ clipPath: [s.card, s.full] }, { duration: 620, easing: GROW, fill: 'forwards' }).finished;
  await w.ready;
  await Promise.all([
    fadeStatic(ctl, 1, 0, 1800),
    w.frame.animate({ filter: ['blur(10px) contrast(1.4)', 'blur(4px) contrast(1.2)', 'blur(0) contrast(1)'], transform: ['scale(1.06)', 'scale(1)'] }, { duration: 1800, easing: 'ease-in-out' }).finished,
  ]);
  ctl.on = false;
  w.snow.style.opacity = 0;
}
// and back again: the static comes back over the page and the picture shrinks into its preview
async function tuneOut(w, s){
  const ctl = hiss(w);
  ctl.level = 0;
  w.snow.style.opacity = 1;
  await fadeStatic(ctl, 0, 1, 350);
  await w.layer.animate({ clipPath: [s.full, s.card] }, { duration: 480, easing: GROW, fill: 'forwards' }).finished;
  ctl.on = false;
  w.snow.style.opacity = 0;
}

tiles.addEventListener('click', async e => {
  const link = e.target.closest('a.tile');
  if(!link || reduceMotion || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();   // even while busy: an extra click mid-animation must not load the page plainly
  if(busy) return;
  busy = true;
  const w = prepare(link), s = shapes(link, w.layer);
  // the address changes now, not at the end, so Back during the opening shrinks it instead of leaving the site
  history.pushState({ tile: link.href }, '', link.href);
  const way = how(link);
  open = { w, link, way };
  let done;
  opening = new Promise(r => { done = r; });
  if(way === 'tune') await tuneIn(w, s);
  else if(way === 'draw') await drawIn(w);
  else {
    // 1. the window opens out from the middle of the photo
    await w.layer.animate({ clipPath: [s.dot, s.card] }, { duration: 320, easing: OPEN, fill: 'forwards' }).finished;
    await w.ready;
    // 2. then grows to fill the screen
    await w.layer.animate({ clipPath: [s.card, s.full] }, { duration: 620, easing: GROW, fill: 'forwards' }).finished;
  }
  opening = null;
  done();
  if(open?.w !== w) return;   // Back was pressed during the opening: the popstate handler takes it from here
  // 3. and becomes the page
  document.title = w.frame.contentDocument?.title || homeTitle;
  document.documentElement.style.overflow = 'hidden';   // the page in the window scrolls, not the one behind it
  w.layer.classList.add('open');
  w.frame.removeAttribute('aria-hidden');
  w.frame.tabIndex = 0;
  w.frame.contentWindow.focus();
});

// Back: shrink the window into its photo again
addEventListener('popstate', async e => {
  if(e.state?.tile){ location.reload(); return; }   // Forward into a window: just load that page for real
  if(!open) return;
  const { w, link, way } = open;
  open = null;
  if(opening) await opening;   // Back mid-opening: let it finish growing, then shrink it straight back
  document.title = homeTitle;
  document.documentElement.style.overflow = '';
  w.layer.classList.remove('open');
  w.frame.setAttribute('aria-hidden', 'true');
  w.frame.tabIndex = -1;
  link.focus({ preventScroll: true });
  const s = shapes(link, w.layer);
  if(way === 'tune') await tuneOut(w, s);
  else if(way === 'draw') await drawOut(w);
  else {
    await w.layer.animate({ clipPath: [s.full, s.card] }, { duration: 520, easing: GROW, fill: 'forwards' }).finished;
    await w.layer.animate({ clipPath: [s.card, s.dot] }, { duration: 260, easing: OPEN, fill: 'forwards' }).finished;
  }
  // drop the held pixel shapes: back on the stylesheet's inset(50%), the window stays hidden even if the zoom or window size changes
  w.layer.getAnimations({ subtree: true }).forEach(a => a.cancel());
  busy = false;
});

// A link clicked inside the window: home goes Back (the shrink), anything else loads normally.
// New-tab clicks, target="_blank" and downloads are left to the browser.
function leave(e){
  const a = e.target.closest('a[href]');
  if(!open || !a || e.defaultPrevented || a.target || a.hasAttribute('download') || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if(a.href.replace(/index\.html$/, '') === home) history.back();
  else location.href = a.href;
}
