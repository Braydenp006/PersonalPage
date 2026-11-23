// Opening a photo link: a window opens inside the photo showing the real page and grows to fill the screen.
// The page is loaded into a hidden full-screen frame when the pointer first comes over (or focuses) a photo, and the
// window is just a cut-out of that frame, so what you see is the page itself. Once it fills the screen it simply stays
// as the page (the address bar changes to it), so nothing reloads or flickers. Back shrinks it into its photo again;
// reloading or sharing the address opens the real page directly.
// Until the frame has loaded, the window shows the page's background colour (--to on the link in index.html).
// New-tab clicks (ctrl / cmd / shift / middle) and reduced motion just follow the link.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tiles = document.querySelector('.tiles');
const homeTitle = document.title, home = location.href.replace(/index\.html$/, '');
const windows = new Map();   // link href -> { layer, frame, ready }
let busy = false, open = null;   // open: { w, link } while a page is showing in its window

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
  frame.addEventListener('load', () => frame.contentDocument.addEventListener('click', leave), { once: true });
  layer.append(frame);
  document.body.append(layer);
  const w = { layer, frame, ready };
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

tiles.addEventListener('click', async e => {
  const link = e.target.closest('a.tile');
  if(!link || reduceMotion || busy || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  busy = true;
  const w = prepare(link), s = shapes(link, w.layer);
  // 1. the window opens out from the middle of the photo
  await w.layer.animate({ clipPath: [s.dot, s.card] }, { duration: 320, easing: OPEN, fill: 'forwards' }).finished;
  await w.ready;
  // 2. then grows to fill the screen
  await w.layer.animate({ clipPath: [s.card, s.full] }, { duration: 620, easing: GROW, fill: 'forwards' }).finished;
  // 3. and becomes the page
  history.pushState({ tile: link.href }, '', link.href);
  open = { w, link };
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
  const { w, link } = open;
  open = null;
  document.title = homeTitle;
  document.documentElement.style.overflow = '';
  w.layer.classList.remove('open');
  w.frame.setAttribute('aria-hidden', 'true');
  w.frame.tabIndex = -1;
  link.focus({ preventScroll: true });
  const s = shapes(link, w.layer);
  await w.layer.animate({ clipPath: [s.full, s.card] }, { duration: 520, easing: GROW, fill: 'forwards' }).finished;
  await w.layer.animate({ clipPath: [s.card, s.dot] }, { duration: 260, easing: OPEN, fill: 'forwards' }).finished;
  // drop the held pixel shapes: back on the stylesheet's inset(50%), the window stays hidden even if the zoom or window size changes
  w.layer.getAnimations().forEach(a => a.cancel());
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
