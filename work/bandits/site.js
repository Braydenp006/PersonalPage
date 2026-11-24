// Shared script for every page of the Bandits site.
// ===== EDIT HERE: to add a photo, put it in img/ and add one line. =====
const GALLERY = [
  {src:'mill-1.jpg', cat:'milling', cap:'Backyard log ready to mill'},
  {src:'mill-2.jpg', cat:'milling', cap:'Long slab off the mill'},
  {src:'mill-3.jpg', cat:'milling', cap:'Slabs stacked to dry'},
  {src:'mill-4.jpg', cat:'milling', cap:'Walnut slabs, fresh cut'},
  {src:'mill-5.jpg', cat:'milling', cap:'Mill setup'},
  {src:'mill-6.jpg', cat:'milling', cap:'Opening up a log'},
  {src:'mill-7.jpg', cat:'milling', cap:'Stickered lumber'},
  {src:'mill-8.jpg', cat:'milling', cap:'Milling on a hillside'},
  {src:'mill-9.jpg', cat:'milling', cap:'Bookmatched walnut'},
  {src:'mill-10.jpg',cat:'milling', cap:'A full stack, drying'},
  {src:'live-1.jpg', cat:'live', cap:'Walnut round side table'},
  {src:'live-2.jpg', cat:'live', cap:'Walnut live edge bench'},
  {src:'live-3.jpg', cat:'live', cap:'Live edge desk'},
  {src:'live-4.jpg', cat:'live', cap:'Ash console'},
  {src:'live-5.jpg', cat:'live', cap:'Slab in the making'},
  {src:'live-6.jpg', cat:'live', cap:'Figured walnut'},
  {src:'live-7.jpg', cat:'live', cap:'River coffee table'},
  {src:'live-8.jpg', cat:'live', cap:'Epoxy river side table'},
  {src:'live-9.jpg', cat:'live', cap:'Coffee table'},
  {src:'table-1.jpg', cat:'tables', cap:'Oak dining table'},
  {src:'table-2.jpg', cat:'tables', cap:'Console with shelf'},
  {src:'table-3.jpg', cat:'tables', cap:'Dark-stained dining table'},
  {src:'table-4.jpg', cat:'tables', cap:'Harvest table'},
  {src:'table-5.jpg', cat:'tables', cap:'Entry console'},
  {src:'table-6.jpg', cat:'tables', cap:'Media console'},
  {src:'table-7.jpg', cat:'tables', cap:'Trestle dining table'},
  {src:'table-8.jpg', cat:'tables', cap:'Writing desk'},
  {src:'table-9.jpg', cat:'tables', cap:'Storage bench'},
  {src:'table-10.jpg',cat:'tables', cap:'Walnut countertops'},
  {src:'table-11.jpg',cat:'tables', cap:'Window seat'},
];
// ===== EDIT HERE: placeholder reviews. Replace with real ones before launch. =====
const REVIEWS = [
  {text:'Placeholder: a customer quote about their table goes here.', name:'Customer name', job:'Dining table'},
  {text:'Placeholder: a quote about the milling day, e.g. how their tree was saved.', name:'Customer name', job:'Mobile milling'},
  {text:'Placeholder: a short quote about a live edge piece.', name:'Customer name', job:'Live edge desk'},
];

const $ = s => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Lightbox: the photo grows out of its spot on the page, and shrinks back into it when closed.
const lb = $('#lb'), lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.lb-cap');
const BG = 'rgba(20,14,9,.94)', BG0 = 'rgba(20,14,9,0)';
let lbSrc = null, lbFc = null, lbBusy = false, lbReady = false; // lbReady: fully enlarged, so zooming can start
// The photo's own caption on the page, if it's on screen: the enlarged title flies out of it and back into it.
const capRect = fc => { const r = fc?.getBoundingClientRect(); return r && r.width && r.bottom > 0 && r.top < innerHeight ? r : null; };
// Moves the enlarged title onto the page caption: lined up at the same first letter, in the caption's colour.
const capAt = (r, fc) => {
  const b = lbCap.getBoundingClientRect(), was = fc.style.color;
  fc.style.color = ''; const color = getComputedStyle(fc).color; fc.style.color = was; // its real colour, even while it's hidden (transparent)
  return { transform: `translate(${r.left - b.left}px,${r.top - b.top}px)`, color };
};
// The visible box of a thumbnail: its clipping frame if it has one (photos are cropped to fit), else itself.
const shownRect = img => { const p = img.parentElement; return (getComputedStyle(p).overflow === 'hidden' ? p : img).getBoundingClientRect(); };
// Transform + crop that make the full-size photo sit exactly over the cropped thumbnail.
// The part of that box actually on screen: not scrolled off the page, not under the solid banner,
// not cut off by a scrolling row (like the gallery's edge).
function visibleRect(img){
  const f = shownRect(img), v = { left: f.left, top: f.top, right: f.right, bottom: f.bottom };
  const clipTo = b => { v.left = Math.max(v.left, b.left); v.top = Math.max(v.top, b.top); v.right = Math.min(v.right, b.right); v.bottom = Math.min(v.bottom, b.bottom); };
  clipTo({ left: 0, top: nav.classList.contains('solid') ? nav.getBoundingClientRect().bottom : 0, right: innerWidth, bottom: innerHeight });
  for(let p = img.parentElement; p && p !== document.body; p = p.parentElement){
    const cs = getComputedStyle(p);
    if(cs.overflowX !== 'visible' || cs.overflowY !== 'visible') clipTo(p.getBoundingClientRect());
  }
  return v.right > v.left && v.bottom > v.top ? v : null;
}
// Transform + crop that make the full-size photo sit exactly over the thumbnail, showing only its visible part.
function flip(from, to, vis){
  const k = Math.max(from.width / to.width, from.height / to.height);
  const fx = from.left + from.width/2, fy = from.top + from.height/2;
  const lx = x => (x - fx) / k + to.width/2, ly = y => (y - fy) / k + to.height/2;
  return {
    transform: `translate(${fx - to.left - to.width/2}px,${fy - to.top - to.height/2}px) scale(${k})`,
    clipPath: `inset(${ly(vis.top)}px ${to.width - lx(vis.right)}px ${to.height - ly(vis.bottom)}px ${lx(vis.left)}px round ${4 / k}px)`,
  };
}
const FULL = { transform: 'none', clipPath: 'inset(0px 0px round 3px)' };
function open(img){
  if(lbBusy) return;
  lbReady = false; lbSrc = img; lbFc = img.closest('figure')?.querySelector('figcaption'); lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt; lbCap.textContent = lbFc ? lbFc.textContent : img.alt;
  lbImg.style.visibility = lbCap.style.visibility = 'hidden';
  lb.style.backgroundColor = BG0; // stay see-through until the photo is ready, or phones flash the dark backdrop first
  lb.classList.add('on');
  lbImg.decode().catch(() => {}).then(() => {
    if(lbSrc !== img || lbBusy || !lb.classList.contains('on')) return; // closed before the photo finished loading (slow phones)
    lbImg.style.visibility = lbCap.style.visibility = lb.style.backgroundColor = '';
    img.style.visibility = 'hidden'; // the photo leaves its spot, rather than a copy flying out of it
    if(reduceMotion){ lbReady = true; return; }
    const ease = { duration: 800, easing: 'cubic-bezier(.2,.7,.2,1)' };
    const vis = visibleRect(img), fcr = vis && capRect(lbFc);
    if(fcr){ lbCap.animate([capAt(fcr, lbFc), { transform: 'none', color: getComputedStyle(lbCap).color }], ease); lbFc.style.color = 'transparent'; } // not visibility: iPhone Safari sometimes doesn't redraw text made visible again
    else lbCap.animate([{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1 }], ease);
    const to = lbImg.getBoundingClientRect();
    const grow = vis && to.width ? lbImg.animate([flip(shownRect(img), to, vis), FULL], ease) // no size yet (rare on phones): fade in instead
      : lbImg.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], ease);
    grow.finished.then(() => { if(lbSrc === img) lbReady = true; }, () => {});
    lb.animate([{ backgroundColor: BG0 }, { backgroundColor: BG }], ease);
  });
}
function closeLb(){
  if(!lb.classList.contains('on') || lbBusy) return;
  const zoomed = lbImg.style.transform || 'none';
  lbImg.style.transition = 'none'; lbImg.style.transform = ''; zoom = { s: 1, x: 0, y: 0 }; touch = null; lbCap.style.opacity = ''; // measure unzoomed; the shrink starts from the zoom
  const putBack = () => { lbImg.style.transition = ''; lbSrc.style.visibility = ''; if(lbFc) lbFc.style.color = ''; lb.classList.remove('on'); };
  if(reduceMotion || !lbSrc.isConnected){ putBack(); return; }
  lbBusy = true;
  const from = shownRect(lbSrc), vis = visibleRect(lbSrc), fcr = vis && capRect(lbFc), ease = { duration: 460, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' };
  const anims = [
    lb.animate([{ backgroundColor: BG }, { backgroundColor: BG0 }], ease),
    lbCap.animate(fcr ? [{ transform: 'none', color: getComputedStyle(lbCap).color }, capAt(fcr, lbFc)] : [{ opacity: 1 }, { opacity: 0, offset: .4 }, { opacity: 0 }], ease),
    lbImg.animate(vis ? [{ ...FULL, transform: zoomed }, flip(from, lbImg.getBoundingClientRect(), vis)] : [{ opacity: 1, transform: zoomed }, { opacity: 0, transform: 'scale(.94)' }], ease),
  ];
  Promise.all(anims.map(a => a.finished)).then(() => { putBack(); anims.forEach(a => a.cancel()); lbBusy = false; });
}
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') closeLb();
  else if(lb.classList.contains('on') && [' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) e.preventDefault();
});
// The page stays put while a photo is enlarged and while it shrinks back, so it lands in the right spot.
const lbNoScroll = e => { if(lb.classList.contains('on')) e.preventDefault(); };
// Zooming an enlarged photo: the scroll wheel (or trackpad pinch) zooms towards the pointer; on phones, pinch with
// two fingers, and drag with one to look around while zoomed in.
// ===== EDIT HERE: the most it can zoom in =====
const MAX_ZOOM = 4;
let zoom = { s: 1, x: 0, y: 0 };
const canZoom = () => lb.classList.contains('on') && !lbBusy && lbReady;
const clampZoom = s => Math.min(MAX_ZOOM, Math.max(1, s));
// the photo's centre on screen as if it weren't zoomed
const lbCentre = () => { const r = lbImg.getBoundingClientRect(); return [(r.left + r.right) / 2 - zoom.x, (r.top + r.bottom) / 2 - zoom.y]; };
const setZoom = (s, x, y) => {
  zoom = s <= 1 ? { s: 1, x: 0, y: 0 } : { s, x, y };
  lbImg.style.transform = `translate(${zoom.x}px,${zoom.y}px) scale(${zoom.s})`;
  lbCap.style.opacity = zoom.s > 1 ? 0 : ''; // the title would sit on top of the zoomed photo
};
addEventListener('wheel', e => {
  lbNoScroll(e);
  if(!canZoom()) return;
  const [ux, uy] = lbCentre(), cx = e.clientX - ux, cy = e.clientY - uy;
  const s = clampZoom(zoom.s * Math.exp(-e.deltaY * (e.deltaMode ? 33 : 1) * .002)), k = s / zoom.s;
  setZoom(s, cx - (cx - zoom.x) * k, cy - (cy - zoom.y) * k); // keep the spot under the pointer where it is
}, { passive: false });
addEventListener('touchmove', lbNoScroll, { passive: false });
addEventListener('gesturestart', lbNoScroll); // iPhone: don't zoom the whole page instead
// Touch: remember which spot of the photo is under the fingers (their midpoint), then keep it under them as they move.
let touch = null, lbMoved = 0;
const fingers = e => { const t = [...e.touches]; return t.length > 1
  ? { n: 2, x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2, d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) }
  : t.length ? { n: 1, x: t[0].clientX, y: t[0].clientY } : null; };
const touchStart = e => {
  const f = canZoom() && fingers(e);
  if(!f){ touch = null; lbImg.style.transition = ''; return; }
  const [ux, uy] = lbCentre();
  touch = { ...f, s: zoom.s, ux, uy, px: (f.x - ux - zoom.x) / zoom.s, py: (f.y - uy - zoom.y) / zoom.s };
  lbImg.style.transition = 'none'; // follow the fingers exactly
};
lb.addEventListener('touchstart', touchStart, { passive: true });
lb.addEventListener('touchend', touchStart, { passive: true }); // a finger lifted: carry on with the ones left
lb.addEventListener('touchcancel', touchStart, { passive: true });
lb.addEventListener('touchmove', e => {
  const f = touch && fingers(e);
  if(!f || f.n !== touch.n || (f.n === 1 && zoom.s === 1)) return; // one finger only moves a zoomed photo
  const s = f.n > 1 ? clampZoom(touch.s * f.d / touch.d) : zoom.s;
  setZoom(s, f.x - touch.ux - s * touch.px, f.y - touch.uy - s * touch.py);
  lbMoved = performance.now();
}, { passive: true });
// lifting fingers after a pinch or drag mustn't count as a tap that closes the photo
addEventListener('click', e => { if(lb.classList.contains('on') && performance.now() - lbMoved < 400){ e.stopPropagation(); e.preventDefault(); } }, true);

// Each section shows 4 of its photos (skipping its banner photo and the ones in its collage) in a staggered grid.
// ===== EDIT HERE: how often a new photo fades in (milliseconds) =====
const CYCLE_MS = 5300;
const figHTML = g => `<figure><div class="ph"><img loading="lazy" src="img/${g.src}" alt="${g.cap}"></div><div class="tick"><i></i></div><figcaption class="caps">${g.cap}</figcaption></figure>`;
document.querySelectorAll('[data-strip]').forEach((s, n) => {
  const used = [...s.closest('section').querySelectorAll('.collage img'), ...document.querySelectorAll('.hero-bg img')].map(i => i.getAttribute('src'))
    .concat([...document.querySelectorAll('.hero-bg source')].map(i => i.getAttribute('srcset'))); // phone-only banner photo too
  const pool = GALLERY.filter(g => g.cat===s.dataset.strip && !used.includes('img/'+g.src));
  const shown = pool.slice(0, 4), waiting = pool.slice(4);
  s.innerHTML = shown.map(figHTML).join('');
  s.onclick = e => e.target.tagName==='IMG' && open(e.target);
  if(reduceMotion || !waiting.length) return;

  // Every CYCLE_MS, one slot crossfades to a photo that isn't showing; the old one goes to the back of the queue.
  // The slot is picked ahead of time so its green bar can fill up while we wait.
  let slot = -1;
  const pickSlot = () => { let k; do { k = Math.floor(Math.random() * shown.length); } while(k === slot && shown.length > 1); return k; };
  const runBar = (k, ms) => {
    const bar = s.children[k].querySelector('.tick i');
    bar.style.transition = 'none'; bar.style.opacity = 1; bar.style.transform = 'scaleX(0)';
    bar.offsetWidth; // restart the animation
    bar.style.transition = `transform ${ms}ms linear, opacity .6s`; bar.style.transform = 'scaleX(1)';
  };
  const swap = k => {
    const g = waiting.shift(), fig = s.children[k], ph = fig.querySelector('.ph'), cap = fig.querySelector('figcaption');
    fig.querySelector('.tick i').style.opacity = 0;
    const img = new Image();
    img.className = 'incoming'; img.alt = g.cap; img.src = 'img/' + g.src;
    img.decode().catch(() => {}).then(() => {
      ph.append(img);
      requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add('show')));
      cap.classList.add('fade');
      setTimeout(() => { cap.textContent = g.cap; cap.classList.remove('fade'); }, 800);
      setTimeout(() => { ph.querySelector('img:not(.incoming)')?.remove(); img.classList.remove('incoming', 'show'); }, 1700);
    });
    waiting.push(shown[k]); shown[k] = g;
  };
  const next = ms => {
    slot = pickSlot();
    runBar(slot, ms);
    setTimeout(() => {
      if(document.hidden || lb.classList.contains('on')) s.children[slot].querySelector('.tick i').style.opacity = 0; else swap(slot);
      next(CYCLE_MS);
    }, ms);
  };
  // offset each section a little so they don't all change at once
  next(CYCLE_MS + n * 2300);
});
// ===== Carousels: the home gallery (2 lanes) and the "all photos" row on each inner page (1 lane) =====
// Photos are scattered along the row at uneven sizes, heights and gaps (each photo drops into whichever lane has
// room first, so the two lanes interleave instead of stacking), and they turn as they scroll, like a spinning drum.
// Clicking a photo at the side brings it to the centre; clicking a centred photo enlarges it.
// ===== EDIT HERE: layout (px on desktop; phones scale everything down) =====
// lanes: each lane's top-edge range (y) and photo-height range (h)
// gap: space between neighbours in a lane; jump: how often a gap is stretched extra wide
const LAYOUT = {
  1: { lanes: [{ y: [0, 100], h: [420, 600] }], gap: [30, 260], jump: .2 },                           // inner pages
  2: { lanes: [{ y: [0, 40], h: [420, 560] }, { y: [650, 690], h: [420, 560] }], gap: [70, 190], jump: .1 }, // home gallery
  3: { lanes: [{ y: [0, 40], h: [330, 440] }, { y: [530, 570], h: [330, 440] }, { y: [1060, 1100], h: [330, 440] }], gap: [60, 200], jump: .15 }, // gallery page
};
const ASPECTS = [3/4, 4/5, 1, 5/4, 4/3, 3/2];   // photo shapes (width / height)
function makeCarousel(root, rows){
  const car = root.querySelector('.carousel'), count = root.querySelector('.car-count');
  const scrub = root.querySelector('.scrub'), fill = scrub.querySelector('.scrub-fill'), dot = scrub.querySelector('.scrub-dot');
  let rand = 11, active = 0, lastH = 0;
  // data-fit (the gallery page): scale the photos so all the lanes fill the carousel's height
  const fit = () => { if(root.hasAttribute('data-fit') && lastH) car.style.setProperty('--s', Math.max(.2, (car.clientHeight - 30) / lastH)); };
  const rnd = () => (rand = rand * 16807 % 2147483647) / 2147483647; // same "random" layout every visit
  const between = ([lo, hi]) => Math.round(lo + rnd() * (hi - lo));
  const items = () => [...car.querySelectorAll('.item')];
  const centreOf = el => el.offsetParent.offsetLeft + el.offsetLeft + el.offsetWidth / 2;
  const goTo = (i, smooth = true) => {
    const el = items()[Math.max(0, Math.min(i, items().length - 1))];
    if(el) car.scrollTo({ left: centreOf(el) - car.clientWidth / 2, behavior: smooth && !reduceMotion ? 'smooth' : 'instant' });
  };
  function update(){
    const mid = car.scrollLeft + car.clientWidth / 2, half = car.clientWidth / 2, els = items();
    let best = 0, d = Infinity;
    els.forEach((el, i) => {
      const off = (centreOf(el) - mid) / half;            // 0 in the centre, ±1 at the screen edges
      if(Math.abs(off) < d){ d = Math.abs(off); best = i; }
      const o = Math.max(-1.7, Math.min(1.7, off)), a = Math.abs(o);
      if(!reduceMotion) el.style.transform = `perspective(1500px) translateZ(${-a * 190}px) rotateY(${o * 28}deg)`;
      el.style.opacity = 1 - Math.min(a, 1.2) * .5;
    });
    active = best;
    els.forEach((el, i) => el.classList.toggle('active', i === best));
    const max = car.scrollWidth - car.clientWidth;
    count.textContent = els.length ? `${best + 1} / ${els.length}` : '';
    const p = (max > 0 ? car.scrollLeft / max * 100 : 0) + '%';
    fill.style.width = p; dot.style.left = p;
    scrub.setAttribute('aria-valuenow', best + 1); scrub.setAttribute('aria-valuemax', els.length);
  }
  function render(photos){
    rand = 11;
    const { lanes, gap, jump } = LAYOUT[rows], x = lanes.map((_, i) => i * between([120, 380]));
    let H = 0;
    const placed = photos.map(g => {
      const li = x.indexOf(Math.min(...x)), lane = lanes[li];
      const h = between(lane.h), w = Math.round(h * ASPECTS[Math.floor(rnd() * ASPECTS.length)]), y = between(lane.y);
      const it = { g, x: x[li], y, w, h };
      x[li] += w + Math.round(between(gap) * (rnd() < jump ? 1.7 : 1));
      H = Math.max(H, y + h + 40);
      return it;
    }).sort((a, b) => a.x - b.x);
    const W = Math.max(...placed.map(p => p.x + p.w)); lastH = H;
    car.innerHTML = `<div class="track" style="--tw:${W}px;--th:${H}px">` + placed.map(p =>
      `<figure class="item" style="--x:${p.x}px;--y:${p.y}px;--w:${p.w}px;--h:${p.h}px"><div class="ph"><img loading="lazy" src="img/${p.g.src}" alt="${p.g.cap}"></div><figcaption class="caps">${p.g.cap}</figcaption></figure>`
    ).join('') + '</div>';
    fit();
    goTo(Math.min(1, photos.length - 1), false);
    update();
  }
  let ticking = false;
  car.addEventListener('scroll', () => { if(!ticking){ ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); } }, {passive:true});
  addEventListener('resize', () => { fit(); goTo(active, false); update(); });
  // Scrubber (like a video timeline): click the line to glide there, or drag the dot to move through live;
  // on release it settles on whichever photo is nearest the centre.
  const scrollAt = e => { const b = scrub.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)) * (car.scrollWidth - car.clientWidth); };
  const nearest = left => {
    const mid = left + car.clientWidth / 2; let best = 0, d = Infinity;
    items().forEach((el, i) => { const k = Math.abs(centreOf(el) - mid); if(k < d){ d = k; best = i; } });
    return best;
  };
  let drag = null;
  scrub.addEventListener('pointerdown', e => {
    e.preventDefault(); // no text-selection drag, which scrolls the page when the pointer drifts up or down
    scrub.focus({ preventScroll: true });
    scrub.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, moved: false };
    scrub.classList.add('drag');
  });
  scrub.addEventListener('pointermove', e => {
    if(!drag) return;
    if(Math.abs(e.clientX - drag.x) > 3) drag.moved = true;
    if(drag.moved) car.scrollLeft = scrollAt(e);
  });
  const release = e => {
    if(!drag) return;
    goTo(nearest(drag.moved ? car.scrollLeft : scrollAt(e)));
    drag = null; scrub.classList.remove('drag');
  };
  // the mouse wheel / trackpad over the scrubber moves the photos, not the page
  scrub.addEventListener('wheel', e => { e.preventDefault(); car.scrollLeft += e.deltaX + e.deltaY; }, { passive: false });
  scrub.addEventListener('pointerup', release);
  scrub.addEventListener('pointercancel', release);
  const keys = e => {
    if(e.key==='ArrowLeft'){ e.preventDefault(); goTo(active - 1); }
    if(e.key==='ArrowRight'){ e.preventDefault(); goTo(active + 1); }
  };
  car.onkeydown = keys; scrub.onkeydown = keys;
  car.onclick = e => {
    const it = e.target.closest('.item'); if(!it) return;
    if(it.classList.contains('active')){ if(e.target.tagName === 'IMG') open(e.target); }
    else goTo(items().indexOf(it));
  };
  return { render };
}
// home gallery, with the All / Milling / Live Edge / Tables filters
const galBlock = $('#gallery .car-block');
if(galBlock){
  const gal = makeCarousel(galBlock, 2), show = f => gal.render(GALLERY.filter(g => f==='all' || g.cat===f));
  show('all');
  $('#chips').onclick = e => {
    if(!e.target.dataset.f) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c===e.target));
    show(e.target.dataset.f);
  };
  // open the gallery with a filter from the link, e.g. index.html?f=milling#gallery
  const f = new URLSearchParams(location.search).get('f');
  if(f) $(`.chip[data-f="${f}"]`)?.click();
}
// inner pages: every photo in that page's category (banner photo included)
document.querySelectorAll('[data-carousel]').forEach(b => makeCarousel(b, 1).render(GALLERY.filter(g => g.cat===b.dataset.carousel)));

// ===== Gallery page: every photo in img/, three lanes, the mouse wheel moves it sideways =====
// A browser can't list a folder itself, so this asks the web server for img/'s file listing (nginx "autoindex on",
// Apache "Options +Indexes", or most simple servers). Photos in GALLERY keep their captions; new ones come first,
// with no caption. If the server gives no listing, it shows the GALLERY list instead.
async function allPhotos(){
  try {
    const r = await fetch('img/');
    if(!r.ok) throw 0;
    const base = new URL(r.url).pathname, doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    const files = [...new Set([...doc.querySelectorAll('a[href]')].map(a => new URL(a.getAttribute('href'), r.url).pathname)
      .filter(p => p.startsWith(base) && /^[^/]+\.(jpe?g|png|webp|avif)$/i.test(p.slice(base.length)))
      .map(p => decodeURIComponent(p.slice(base.length))))];
    if(!files.length) throw 0;
    const known = GALLERY.filter(g => files.includes(g.src));
    return [...files.filter(f => !known.some(g => g.src === f)).map(f => ({ src: encodeURIComponent(f), cap: '' })), ...known];
  } catch { return GALLERY; }
}
const fullGal = $('#all-photos');
if(fullGal){
  const car = fullGal.querySelector('.carousel');
  allPhotos().then(photos => makeCarousel(fullGal, 3).render(photos));
  // scrolling up/down glides the row left/right, easing towards where the wheel has sent it
  let target = null;
  const glide = () => {
    const d = target - car.scrollLeft;
    if(Math.abs(d) < 1){ car.scrollLeft = target; target = null; return; }
    car.scrollLeft += d * .16;
    requestAnimationFrame(glide);
  };
  addEventListener('wheel', e => {
    if(lb.classList.contains('on')) return; // the wheel zooms an enlarged photo instead
    e.preventDefault();
    const max = car.scrollWidth - car.clientWidth, start = target === null;
    target = Math.max(0, Math.min(max, (target ?? car.scrollLeft) + (e.deltaY + e.deltaX) * (e.deltaMode ? 33 : 1)));
    if(start) requestAnimationFrame(glide);
  }, { passive: false });
}

// links like "Ask what's in stock" pick the matching option in the contact form
document.querySelectorAll('[data-service]').forEach(a => a.addEventListener('click', () => { const s = $('#form select[name=service]'); if(s){ s.value = a.dataset.service; s.dispatchEvent(new Event('change')); } }));
// "I'm interested in": the browser's own dropdown list can't be styled everywhere, so this draws one in the page.
// The real <select> stays (hidden) and keeps the chosen value, so the form sends exactly what it did before.
document.querySelectorAll('#form select').forEach((sel, n) => {
  const dd = document.createElement('div'), btn = document.createElement('button'), list = document.createElement('ul');
  dd.className = 'dd'; btn.type = 'button'; btn.className = 'dd-btn'; list.className = 'dd-list'; list.tabIndex = -1;
  btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
  list.setAttribute('role', 'listbox'); list.id = `dd-list-${n}`; btn.setAttribute('aria-controls', list.id);
  const opts = [...sel.options].map((o, i) => { const li = document.createElement('li'); li.id = `${list.id}-${i}`; li.setAttribute('role', 'option'); li.textContent = o.text; list.append(li); return li; });
  sel.hidden = true; sel.tabIndex = -1; sel.after(dd); dd.append(btn, list);
  let active = 0;
  const name = sel.closest('label')?.firstChild.textContent.trim() || '';
  list.setAttribute('aria-label', name);
  const show = () => { btn.textContent = sel.options[sel.selectedIndex].text; btn.setAttribute('aria-label', `${name}: ${btn.textContent}`); opts.forEach((li, i) => li.setAttribute('aria-selected', i === sel.selectedIndex)); };
  const hover = i => { active = (i + opts.length) % opts.length; opts.forEach((li, k) => li.classList.toggle('active', k === active)); list.setAttribute('aria-activedescendant', opts[active].id); };
  const open = () => { dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); hover(sel.selectedIndex); list.focus({ preventScroll: true }); };
  const close = (refocus = true) => { if(!dd.classList.contains('open')) return; dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); if(refocus) btn.focus({ preventScroll: true }); };
  const pick = i => { sel.selectedIndex = i; sel.dispatchEvent(new Event('change')); close(); };
  sel.addEventListener('change', show); show();
  btn.addEventListener('click', e => { e.preventDefault(); dd.classList.contains('open') ? close() : open(); });
  btn.addEventListener('keydown', e => { if(['ArrowDown', 'ArrowUp'].includes(e.key)){ e.preventDefault(); open(); } });
  opts.forEach((li, i) => { li.addEventListener('pointermove', () => hover(i)); li.addEventListener('click', () => pick(i)); });
  list.addEventListener('keydown', e => {
    const k = e.key;
    if(k === 'ArrowDown' || k === 'ArrowUp'){ e.preventDefault(); hover(active + (k === 'ArrowDown' ? 1 : -1)); }
    else if(k === 'Home' || k === 'End'){ e.preventDefault(); hover(k === 'Home' ? 0 : opts.length - 1); }
    else if(k === 'Enter' || k === ' '){ e.preventDefault(); pick(active); }
    else if(k === 'Escape'){ e.preventDefault(); close(); }
    else if(k === 'Tab') close(false);
  });
  // a click anywhere else closes it
  document.addEventListener('pointerdown', e => { if(!dd.contains(e.target)) close(false); });
});
// Wood types (phones): the row shows just the names; tapping one highlights it and shows its description underneath.
const species = $('.species');
if(species){
  const info = document.createElement('div'), body = document.createElement('div');
  info.className = 'sp-info'; info.setAttribute('aria-live', 'polite'); info.append(body); species.after(info);
  const all = [...species.querySelectorAll('.sp')];
  all.forEach(sp => { sp.tabIndex = 0; sp.setAttribute('role', 'button'); sp.setAttribute('aria-expanded', 'false'); });
  const pick = sp => {
    const on = !sp.classList.contains('on');
    all.forEach(x => { x.classList.toggle('on', on && x === sp); x.setAttribute('aria-expanded', on && x === sp); });
    if(on) body.innerHTML = sp.querySelector('p').outerHTML + sp.querySelector('.caps').outerHTML; // kept when closing, so it can fold away
    info.classList.toggle('open', on);
  };
  species.onclick = e => { const sp = e.target.closest('.sp'); if(sp) pick(sp); };
  species.onkeydown = e => { const sp = e.target.closest('.sp'); if(sp && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); pick(sp); } };
}
if($('#reviews')) $('#reviews').innerHTML = REVIEWS.map(r => `<div class="rv"><div class="stars">★★★★★</div><q>${r.text}</q><cite><b>${r.name}</b> · ${r.job}</cite></div>`).join('');

// ===== EDIT HERE: paste your Formspree endpoint (formspree.io → New form), e.g. 'https://formspree.io/f/abcd1234' =====
const FORM_ENDPOINT = '';
if($('#form')) $('#form').onsubmit = async e => {
  e.preventDefault();
  const note = $('#note'), btn = e.target.querySelector('button');
  if(!FORM_ENDPOINT){ note.textContent = 'Demo only: this form isn\'t connected yet, so nothing was sent.'; return; }
  btn.disabled = true; note.textContent = 'Sending…';
  try {
    const r = await fetch(FORM_ENDPOINT, {method:'POST', body:new FormData(e.target), headers:{Accept:'application/json'}});
    if(!r.ok) throw 0;
    e.target.reset(); e.target.querySelectorAll('select').forEach(s => s.dispatchEvent(new Event('change'))); note.textContent = 'Thanks! We got your message and will be in touch soon.';
  } catch { note.textContent = 'Something went wrong. Please email us directly instead.'; }
  btn.disabled = false;
};

// Live edge dividers: a strip of "bark" laid over the seam between two sections (seam at y=50).
// Both edges are live: the top flows above the seam, the bottom stays below it, so each side
// shows the real section background underneath and no colour has to be matched.
function edgeShapes(seed){
  let s = seed; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  const W = 1440, SEAM = 50, n = 120, ph = Array.from({length: 8}, () => rnd() * 6), U = [], L = [];
  for(let i = 0; i <= n; i++){
    const x = i / n * W;
    // top edge: the long, flowing shape of the slab
    const u = 26 + 11*Math.sin(x/270 + ph[0]) + 6*Math.sin(x/95 + ph[1]) + 3*Math.sin(x/38 + ph[2]) + (rnd() - .5) * 2;
    // bottom edge: its own waves plus rough, bark-like bumps, always below the seam
    const l = SEAM + 7 + 3*Math.sin(x/150 + ph[3]) + 2*Math.sin(x/41 + ph[4]) + 1.5*Math.sin(x/19 + ph[5]) + 1*Math.sin(x/9 + ph[6]) + (rnd() - .5) * 2.5;
    U.push([x, Math.max(3, Math.min(SEAM - 5, u))]);
    L.push([x, Math.max(SEAM + 2, Math.min(69, l))]);
  }
  const curve = pts => pts.slice(0, -1).map((p1, i) => {
    const p0 = pts[i-1] || p1, p2 = pts[i+1], p3 = pts[i+2] || p2;
    return `C${p1[0]+(p2[0]-p0[0])/6},${p1[1]+(p2[1]-p0[1])/6} ${p2[0]-(p3[0]-p1[0])/6},${p2[1]-(p3[1]-p1[1])/6} ${p2[0]},${p2[1]}`;
  }).join('');
  return `M0,${U[0][1]}${curve(U)}L${W},${L[n][1]}${curve([...L].reverse())}Z`;
}
const bgOf = el => { const c = el && getComputedStyle(el).backgroundColor; return c && c !== 'rgba(0, 0, 0, 0)' ? c : getComputedStyle(document.body).backgroundColor; };
const isDark = c => { const [r,g,b] = c.match(/\d+/g).map(Number); return r*.3 + g*.59 + b*.11 < 128; };
let seed = 7;
document.querySelectorAll('[data-edge]').forEach(el => el.dataset.edge.split(' ').forEach(pos => {
  const upper = pos === 'top' ? bgOf(el.previousElementSibling) : bgOf(el);
  const lower = pos === 'top' ? bgOf(el) : bgOf(el.nextElementSibling);
  const dark = 'dark' in el.dataset && pos === 'bottom' || isDark(upper) || isDark(lower);
  el.insertAdjacentHTML('beforeend', `<svg class="edge ${pos}" viewBox="0 0 1440 72" preserveAspectRatio="none" aria-hidden="true"><path fill="${dark ? '#7a6753' : '#ddd0bc'}" d="${edgeShapes(seed++ * 7919)}"/></svg>`);
}));

// "How it works": the four steps light up one after another while the section is on screen.
// Pointing at (or tabbing to) a step lights that one and holds it; under reduced motion all stay lit.
const steps = $('.steps');
if(steps && !reduceMotion){
  // ===== EDIT HERE: how long each step stays lit (milliseconds) =====
  const STEP_MS = 3200;
  const all = [...steps.children];
  let at = 0, timer = null, held = false;
  const light = i => { at = i; all.forEach((s, k) => s.classList.toggle('on', k === i)); };
  const run = () => { clearInterval(timer); timer = setInterval(() => held || light((at + 1) % all.length), STEP_MS); };
  steps.classList.add('cycle'); light(0);
  new IntersectionObserver(([e]) => e.isIntersecting ? run() : clearInterval(timer), {threshold:.3}).observe(steps);
  all.forEach((s, k) => {
    s.tabIndex = 0;
    s.addEventListener('pointerenter', () => { held = true; light(k); });
    s.addEventListener('focus', () => { held = true; light(k); });
    s.addEventListener('pointerleave', () => { held = false; run(); });
    s.addEventListener('blur', () => { held = false; run(); });
  });
}
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 60), {passive:true});
// Quiet fade-in for section headings and photo blocks only. Added here rather than in the HTML so nothing is hidden if
// the script fails; anything already on screen when the page opens is shown straight away, no fade.
if(!reduceMotion){
  const io = new IntersectionObserver(es => es.forEach(x => { if(x.isIntersecting){ x.target.classList.add('in'); io.unobserve(x.target); } }), {threshold:.12});
  document.querySelectorAll('.intro, .services .ph, .process h2, .woods header, .slabs .ph, .gallery header, .reviews h2, .contact .grid > div, .feature .text, .collage, .stagger, .photo-band:not(.gallery):not(.contact) h2')
    .forEach(el => { if(el.getBoundingClientRect().top < innerHeight) return; el.classList.add('reveal'); io.observe(el); });
}
// Mobile menu: opening darkens the banner instantly; closing waits for the list to slide up, then fades the banner.
function toggleMenu(force){
  const open = $('#links').classList.toggle('open', force);
  $('.menu-btn').textContent = open ? '✕' : '☰';
  if(!open && nav.classList.contains('open')){ nav.classList.add('closing'); setTimeout(() => nav.classList.remove('closing'), 800); }
  nav.classList.toggle('open', open);
}
document.querySelectorAll('.links a').forEach(a => a.onclick = () => toggleMenu(false));

// Page transitions: fade the dark cover in before going to another page of the site.
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if(!a || a.target || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduceMotion) return;
  const url = new URL(a.href, location.href);
  if(url.origin !== location.origin || url.pathname === location.pathname || /^(tel|mailto):/.test(a.href)) return;
  e.preventDefault();
  const html = document.documentElement;
  html.classList.remove('gone');
  void document.body.offsetWidth; // let the (transparent) cover render again so the fade-in runs
  html.classList.add('leaving');
  setTimeout(() => location.href = url.href, 400);
});
// coming back with the Back button can restore the faded-out page from cache: show it again
addEventListener('pageshow', e => { if(e.persisted){ document.documentElement.classList.replace('leaving', 'ready'); removeCover(); } });
// Once faded out, take the cover away entirely: Safari 26 tints its floating toolbar area from fixed layers at the
// screen edge, and the invisible cover made it paint a solid brown strip above the banner.
function removeCover(){ setTimeout(() => { const h = document.documentElement; if(!h.classList.contains('leaving')) h.classList.add('gone'); }, 800); }

// Lift the cover once the page is settled (or after ~3s at most), so nothing moves or pops in during the fade:
// fonts loaded (otherwise text swaps fonts and shifts), already at the linked section, and on-screen photos drawn.
(async () => {
  // ask for each font the page uses outright (Firefox otherwise only starts loading them once text needs them)
  const fonts = document.fonts ? Promise.all(['300 40px Newsreader', '400 40px Newsreader', 'italic 300 40px Newsreader', '400 16px "Instrument Sans"', '500 16px "Instrument Sans"']
    .map(f => document.fonts.load(f).catch(() => {}))) : null;
  await Promise.race([fonts, new Promise(r => setTimeout(r, 1200))]);
  // arriving via a link like index.html#contact: jump straight there under the cover instead of smooth-scrolling in view
  const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
  if(target){ const html = document.documentElement; html.style.scrollBehavior = 'auto'; target.scrollIntoView(); html.style.scrollBehavior = ''; }
  const onScreen = [...document.images].filter(i => { const b = i.getBoundingClientRect(); return b.width > 0 && b.bottom > 0 && b.top < innerHeight; });
  const loaded = i => (i.complete ? Promise.resolve() : new Promise(r => { i.addEventListener('load', r, {once:true}); i.addEventListener('error', r, {once:true}); }))
    .then(() => i.decode ? i.decode().catch(() => {}) : 0);
  await Promise.race([Promise.all(onScreen.map(loaded)), new Promise(r => setTimeout(r, 2200))]);
  requestAnimationFrame(() => { document.documentElement.classList.add('ready'); removeCover(); });
})();
