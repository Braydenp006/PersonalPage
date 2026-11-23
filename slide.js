// Links in a [data-slide] bar (the function keys on "How this site runs"): the next page slides down in from the top,
// pushing this page down and off the bottom. Like the homepage's photo windows (home.js), the next page is loaded into
// a hidden full-screen frame when the pointer first comes over (or focuses) its link; once it has slid in, the browser
// goes to that page for real (already loaded, so the swap is instant). Back comes back here from the browser's cache
// with the page still slid in, and it slides up and away, this page back up into place.
// New-tab clicks (ctrl / cmd / shift / middle) and reduced motion just follow the link.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const bar = document.querySelector('[data-slide]');
const frames = new Map();   // link href -> { frame, ready }
let busy = false, open = null;   // open: the frame that slid in, once the browser has gone to its page
const EASE = { duration: 760, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' };

function prepare(link){
  if(frames.has(link.href)) return frames.get(link.href);
  const frame = document.createElement('iframe');
  frame.className = 'slide-frame';
  frame.src = link.href;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  const ready = new Promise(done => { frame.addEventListener('load', done, { once: true }); setTimeout(done, 2500); });   // shortcut: a slow page gets 2.5s
  document.documentElement.append(frame);   // outside <body>, because <body> is what gets pushed down
  const f = { frame, ready };
  frames.set(link.href, f);
  return f;
}
if(bar && !reduceMotion){
  const warm = e => { const a = e.target.closest('a[href]'); if(a) prepare(a); };
  bar.addEventListener('pointerover', warm);
  bar.addEventListener('focusin', warm);
  bar.addEventListener('click', async e => {
    const a = e.target.closest('a[href]');
    if(!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();   // even while busy: an extra click mid-slide must not load the page plainly
    if(busy) return;
    busy = true;
    const f = prepare(a);
    await f.ready;
    document.documentElement.style.overflow = 'hidden';
    f.frame.classList.add('in');
    f.frame.animate({ transform: ['translateY(-100%)', 'translateY(0)'] }, EASE);
    await document.body.animate({ transform: ['none', 'translateY(100vh)'] }, EASE).finished;
    open = f;
    top.location.href = a.href;   // the page itself, already loaded in the frame (top: the whole tab, never a frame)
  });
}

// Back to here from the browser's cache: slide it up and away, and this page back up into place
addEventListener('pageshow', async e => {
  if(!e.persisted || !open) return;
  const f = open;
  open = null;
  f.frame.animate({ transform: ['translateY(0)', 'translateY(-100%)'] }, EASE);
  await document.body.animate({ transform: ['translateY(100vh)', 'none'] }, EASE).finished;
  f.frame.classList.remove('in');
  f.frame.getAnimations().forEach(a => a.cancel());
  document.body.getAnimations().forEach(a => a.cancel());
  document.documentElement.style.overflow = '';
  busy = false;
});
