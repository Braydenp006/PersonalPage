// Links in a [data-slide] bar (the function keys on "How this site runs"): the next page slides down in from the top,
// pushing this page down and off the bottom. Like the homepage's photo windows (home.js), the next page is loaded into
// a hidden full-screen frame when the pointer first comes over (or focuses) its link, and once it's in, it simply stays
// as the page (the address bar changes to it), so nothing reloads. Back slides it up and this page back up into place;
// reloading or sharing the address opens the real page directly.
// New-tab clicks (ctrl / cmd / shift / middle) and reduced motion just follow the link.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const bar = document.querySelector('[data-slide]');
const title = document.title, here = location.href;
const frames = new Map();   // link href -> { frame, ready }
let busy = false, open = null, opening = null;
const EASE = { duration: 760, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' };

function prepare(link){
  if(frames.has(link.href)) return frames.get(link.href);
  const frame = document.createElement('iframe');
  frame.className = 'slide-frame';
  frame.src = link.href;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  const ready = new Promise(done => { frame.addEventListener('load', done, { once: true }); setTimeout(done, 2500); });   // shortcut: a slow page gets 2.5s
  frame.addEventListener('load', () => frame.contentDocument?.addEventListener('click', leave));   // every load: a reload would drop it
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
    history.pushState({ slide: a.href }, '', a.href);   // now, so Back during the slide brings it straight back
    open = f;
    let done;
    opening = new Promise(r => { done = r; });
    document.documentElement.style.overflow = 'hidden';
    f.frame.classList.add('in');
    f.frame.animate({ transform: ['translateY(-100%)', 'translateY(0)'] }, EASE);
    await document.body.animate({ transform: ['none', 'translateY(100vh)'] }, EASE).finished;
    opening = null;
    done();
    if(open !== f) return;   // Back was pressed mid-slide: the popstate handler takes it from here
    document.title = f.frame.contentDocument?.title || title;
    f.frame.removeAttribute('aria-hidden');
    f.frame.tabIndex = 0;
    f.frame.contentWindow.focus();
  });
}

// Back: slide it up and away, and this page back up into place
addEventListener('popstate', async e => {
  if(e.state?.slide){ location.reload(); return; }   // Forward into a slid-in page: just load it for real
  if(!open) return;
  const f = open;
  open = null;
  if(opening) await opening;
  document.title = title;
  f.frame.setAttribute('aria-hidden', 'true');
  f.frame.tabIndex = -1;
  f.frame.animate({ transform: ['translateY(0)', 'translateY(-100%)'] }, EASE);
  await document.body.animate({ transform: ['translateY(100vh)', 'none'] }, EASE).finished;
  f.frame.classList.remove('in');
  f.frame.getAnimations().forEach(a => a.cancel());
  document.body.getAnimations().forEach(a => a.cancel());
  document.documentElement.style.overflow = '';
  busy = false;
});

// A link clicked inside the slid-in page: back to this page goes Back (the slide up); anything else loads normally.
// Pages that run their own leaving transition (they cancel the click) are left to it.
function leave(e){
  const a = e.target.closest('a[href]');
  if(!open || !a || e.defaultPrevented || a.target || a.hasAttribute('download') || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if(a.href === here) history.back();
  else location.href = a.href;
}
