// Other work. The landing floats the home page's laptop and the Z420 side by side; picking one swings the light onto it,
// shows its title and opens its section, and scrolling flies that model from the landing into the section:
//  - Websites: highlights from each client's site, live on the laptop's glass. Each highlight puts the laptop on one side
//    and the text on the other; between them the laptop spins across, the site scrolls to the next part, and callouts
//    draw arrows to what they're about. The backdrop fades to the colour on the screen.
//  - Custom PCs: the PC lands on the desk, the monitor turns on and grows to fill the window, then a viewer steps
//    through the builds (photos, specs, what the owner said).
// Both models live in one fixed layer over the page, placed over the .ow-slot boxes (1 world unit = 1 CSS pixel at z = 0).
// No WebGL: the buttons still open the sections, and the site shows flat.
import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { loadLaptop, onGlass, MIDDLE, ACROSS } from './laptop-model.js';
import { buildMyPc } from './my-pc.js?v=32';   // bump with other-work.js: Firefox keeps old modules

const hero = document.getElementById('ow-hero'), chosen = hero.querySelector('.ow-chosen'), hint = hero.querySelector('.ow-hint');
const goBtn = hero.querySelector('.ow-go');
const site = document.getElementById('ow-site'), pc = document.getElementById('ow-pc');
const TITLES = { site: 'Websites', pc: "Custom PC's" };
const ask = document.getElementById('ask'), askBtn = ask.querySelector('.print-btn');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// always open at the top: the picked path isn't remembered, so a restored scroll position lands somewhere meaningless
history.scrollRestoration = 'manual';
scrollTo(0, 0);
const clamp = x => Math.min(1, Math.max(0, x)), ease = t => t * t * (3 - 2 * t), mix = (a, b, k) => a + (b - a) * k;
const easeCubic = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;   // soft in, soft out
let pick = null;

// ===== picking one
const picks = [...hero.querySelectorAll('.ow-pick')];
picks.forEach(b => b.addEventListener('click', () => {
  pick = b.dataset.path;
  hero.dataset.pick = pick;
  chosen.textContent = TITLES[pick];
  hint.textContent = 'or scroll to discover ↓';
  goBtn.hidden = false;
  site.hidden = pick !== 'site';
  pc.hidden = pick !== 'pc';
  picks.forEach(x => x.setAttribute('aria-pressed', x === b));
  const word = pick === 'site' ? 'website' : 'build';   // the enquiry at the bottom matches the pick
  ask.querySelector('h2').textContent = `Ask about a ${word}`;
  askBtn.textContent = `Email me about a ${word}`;
  askBtn.href = `mailto:braydenp006@gmail.com?subject=${pick === 'site' ? 'Website' : 'Build'}%20enquiry`;
  syncSite(); syncPc();
}));
picks.forEach(b => b.setAttribute('aria-pressed', false));

// LinkedIn / GitHub on the landing: with the pointer anywhere near them (FOOT_NEAR px around the pair), or one of
// them focused, the spotlight comes down over both (the 3D loop reads spotOn). Clicking one makes that spotlight spread
// out from the links until its light fills the window, no brighter than it already is (the 3D loop reads floodAt), over
// FLOOD_SECS; then it goes there.
const social = hero.querySelector('.ow-social'), FOOT_NEAR = 90, FLOOD_SECS = 1.6;
let spotOn = null, footFocus = false, floodAt = null;
// the box around the two links themselves (their nav stretches across the footer's right column)
const footLinks = [...social.querySelectorAll('a')];
const footBox = () => { const rs = footLinks.map(a => a.getBoundingClientRect()), left = Math.min(...rs.map(r => r.left)), top = Math.min(...rs.map(r => r.top));
  return { left, top, right: Math.max(...rs.map(r => r.right)), bottom: Math.max(...rs.map(r => r.bottom)), width: Math.max(...rs.map(r => r.right)) - left, height: Math.max(...rs.map(r => r.bottom)) - top }; };
const lightFoot = on => { spotOn = on ? { getBoundingClientRect: footBox } : null; hero.classList.toggle('is-lit-foot', on); };
addEventListener('mousemove', e => {
  if(footFocus || floodAt !== null) return;
  const r = footBox();
  lightFoot(e.clientX > r.left - FOOT_NEAR && e.clientX < r.right + FOOT_NEAR && e.clientY > r.top - FOOT_NEAR && e.clientY < r.bottom + FOOT_NEAR);
}, { passive: true });
social.addEventListener('focusin', () => { footFocus = true; lightFoot(true); });
social.addEventListener('focusout', () => { footFocus = false; lightFoot(false); });
for(const a of social.querySelectorAll('a')) a.addEventListener('click', e => {
  if(e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || reduceMotion) return;   // a new tab or window: no flood
  e.preventDefault();
  if(!document.documentElement.classList.contains('ow-3d')){ location.href = a.href; return; }   // no spotlight without WebGL
  lightFoot(true);
  floodAt = performance.now();
  setTimeout(() => { location.href = a.href; }, FLOOD_SECS * 1000);
});
addEventListener('pageshow', () => { floodAt = null; lightFoot(false); });   // back from there: the light back to normal

// how far through a sticky section (0 as its stage pins, 1 as it lets go)
const through = el => clamp(-el.getBoundingClientRect().top / (el.offsetHeight - innerHeight));

// ===== websites. The client's site is a local copy (work/<client>/) so its colours and layout can be read.
// Each page the highlights use (a client's folder, data-site, plus a page in it, data-page) gets its own iframe on the
// laptop's screen, all loaded up front; only the current highlight's page is shown (swapped mid-spin, while the screen
// faces away).
const screenEl = site.querySelector('.ow-screen'), firstFrame = screenEl.querySelector('iframe');
const frames = { [firstFrame.getAttribute('src')]: firstFrame };
// first non-transparent background at or above el, as [r,g,b]
function bgOf(el, win){
  for(; el; el = el.parentElement){
    const m = win.getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    if(m && (m[3] === undefined || +m[3] > 0)) return m.slice(0, 3).map(Number);
  }
}
// the highlights: scrolling the section steps through them. Each one gets 340% of the window's height of scrolling:
// the first half holds it (h: 0 to 1, its site drifting by data-drift), the second half is the move to the next
// (e: 0 to 1), a full spin when the laptop changes side
const features = [...site.querySelectorAll('.ow-feature')], N = features.length, STEP = 3.4;
site.style.height = `${((N - .5) * STEP + 1) * 100}vh`;
const pageOf = f => (f.dataset.site || screenEl.dataset.base) + (f.dataset.page || 'index.html');
for(const f of features){
  const page = pageOf(f);
  if(frames[page]) continue;
  const fr = firstFrame.cloneNode();
  fr.src = page;
  fr.title = f.dataset.title || fr.title;
  screenEl.append(fr);
  frames[page] = fr;
}
// smoothC: the scroll position eased by the 3D loop, so wheel steps glide instead of jump (null: use the raw one)
let smoothC = null;
const rawC = () => through(site) * (N - .5);
function chapter(c = glideC ?? smoothC ?? rawC()){
  const i = Math.min(N - 1, Math.floor(c)), j = Math.min(N - 1, i + 1), f = c - i;
  const u = j === i ? 0 : clamp((f - .5) / .5), e = ease(u);   // u: linear through the move, e: eased
  return { i, j, u, e, h: clamp(f / .5), on: e > .5 ? j : i };
}
// puts highlight f's page where it should be, d (0 to 1) of the way through its drift: scrolled to its data-at element
// (just under their fixed nav), then drifted down by data-drift px, or sideways if data-drift-in names a sideways
// scroller (like the gallery's photo carousel). Returns the page's vertical scroll, for blending into the next.
function placeSite(f, d){
  const win = frames[pageOf(f)].contentWindow, doc = win?.document;
  if(!doc?.body) return 0;
  const at = doc.querySelector(f.dataset.at), drift = +f.dataset.drift || 0;
  const top = at ? Math.max(0, at.getBoundingClientRect().top + win.scrollY - 70) : 0;
  const along = f.dataset.driftIn && doc.querySelector(f.dataset.driftIn);
  if(along){
    along.dataset.owStart ??= along.scrollLeft;   // where it sat before we moved it
    const to = f.dataset.driftTo && along.querySelector(f.dataset.driftTo), it = to && (to.closest('.item') ?? to);
    const end = it ? it.offsetParent.offsetLeft + it.offsetLeft + it.offsetWidth / 2 - along.clientWidth / 2 : +along.dataset.owStart + drift;
    along.scrollLeft = mix(+along.dataset.owStart, end, d);
    return top;
  }
  return top + drift * d;
}
// the drift takes the first DRIFT_END of a highlight's hold, then it rests; its arrows draw in once it rests
// (settledAt: when that happened, null while there's no resting highlight)
const DRIFT_END = .6, drifts = f => +f.dataset.drift || f.dataset.driftTo;
let onNow = -1, lastText = -1, settledAt = null;
const shownFrame = () => frames[pageOf(features[Math.max(0, onNow)])];
function syncSite(){
  if(site.hidden) return;
  const ch = chapter(), A = features[ch.i], B = features[ch.j];
  // the text is off while the laptop crosses: the old leaves as the spin starts, the new arrives as it lands
  const textOn = site.getBoundingClientRect().top > 1 ? -1 : ch.e < .15 ? ch.i : ch.e > .85 ? ch.j : -1;   // none until the laptop has arrived
  features.forEach((f, n) => f.classList.toggle('is-on', n === textOn));
  if(textOn !== lastText) lastText = textOn;
  toTop.hidden = !(ch.on === N - 1 && site.getBoundingClientRect().top <= 1);
  const settled = textOn >= 0 && (!drifts(features[textOn]) || (textOn === ch.i && ch.h >= DRIFT_END));
  if(!settled) settledAt = null;
  else settledAt ??= performance.now();
  if(ch.on !== onNow){
    onNow = ch.on;
    arrows[0].disabled = onNow === 0;
    const last = onNow === N - 1;
    arrows[1].classList.toggle('is-down', last);
    arrows[1].setAttribute('aria-label', last ? 'Down to the enquiry' : 'Next highlight');
  }
  // which page is on the glass: a change of page swaps mid-spin (while the screen faces away), or else fades across
  const fadeIn = pageOf(A) === pageOf(B) ? 0 : (B.dataset.move === 'spin' ? +(ch.e > .5) : clamp((ch.e - .3) / .4));
  for(const [page, fr] of Object.entries(frames)){
    const o = page === pageOf(A) ? 1 - fadeIn : page === pageOf(B) ? fadeIn : 0;
    fr.style.visibility = o > 0 ? '' : 'hidden';
    fr.style.opacity = o;
  }
  const scrollTo = (f, top) => frames[pageOf(f)].contentWindow?.scrollTo({ top, behavior: 'instant' });
  const samePage = pageOf(A) === pageOf(B);
  if(!ch.e) scrollTo(A, placeSite(A, clamp(ch.h / DRIFT_END)));                                   // holding: its site drifts
  else if(samePage) scrollTo(A, mix(placeSite(A, 1), placeSite(B, 0), ch.e));  // moving on, same page: glide down to the next part
  else scrollTo(A, placeSite(A, 1));
  if(!samePage) scrollTo(B, placeSite(B, 0));                                  // the next page waits, ready for the swap
}

// the three main colours on the laptop's screen right now, for the backdrop: the photos in view (each shrunk to 24 x 24
// and read pixel by pixel) and the background colours on a grid across the page, weighted by how much of the screen
// they cover, grouped into buckets, and three distinct ones kept, favouring colourful ones.
// Returns [base, A, B, C]: a near-black tint for the backdrop, then the three, darkest first, lifted to glow on dark.
const sampler = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
sampler.canvas.width = sampler.canvas.height = 24;
function screenColours(){
  const win = shownFrame().contentWindow, doc = win?.document;
  if(!doc?.body) return null;
  const W = win.innerWidth, H = win.innerHeight, buckets = new Map();
  const add = (r, g, b, w) => {
    const key = (r >> 5) << 6 | (g >> 5) << 3 | b >> 5, e = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 };
    e.r += r * w; e.g += g * w; e.b += b * w; e.w += w;
    buckets.set(key, e);
  };
  for(const img of doc.images){
    const r = img.getBoundingClientRect(), seen = Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
    if(!seen || !img.complete || !img.naturalWidth) continue;
    try {
      sampler.drawImage(img, 0, 0, 24, 24);
      const px = sampler.getImageData(0, 0, 24, 24).data;
      for(let i = 0; i < px.length; i += 4) add(px[i], px[i + 1], px[i + 2], seen / 576);
    } catch { /* an image from another site can't be read: skip it */ }
  }
  for(let gy = 0; gy < 5; gy++) for(let gx = 0; gx < 8; gx++){
    const rgb = bgOf(doc.elementFromPoint((gx + .5) * W / 8, (gy + .5) * H / 5), win);
    if(rgb) add(...rgb, W * H / 40 * .6);
  }
  // area counts, but with diminishing returns (a square root), and colourfulness counts a lot, so a small orange
  // button can beat a big white page; the three must differ in hue (or be far apart in how colourful they are)
  const all = [...buckets.values()].map(e => {
    const c = new THREE.Color(e.r / e.w / 255, e.g / e.w / 255, e.b / e.w / 255), hsl = c.getHSL({});
    const usable = hsl.l > .08 && hsl.l < .95 ? 1 : .25;
    return { c, hsl, score: Math.sqrt(e.w) * (.12 + hsl.s) ** 2 * usable };
  }).sort((a, b) => b.score - a.score);
  const hueGap = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 1 - d); };
  const picked = [];
  for(const x of all){
    if(picked.every(p => hueGap(p.hsl.h, x.hsl.h) > .07 || Math.abs(p.hsl.s - x.hsl.s) > .35)) picked.push(x);
    if(picked.length === 3) break;
  }
  while(picked.length < 3) picked.push(picked[picked.length - 1] ?? { c: new THREE.Color(.4, .3, .2), hsl: { h: .08, s: .3, l: .3 } });
  const base = new THREE.Color().setHSL(picked[0].hsl.h, picked[0].hsl.s * .6, .035);
  const lit = picked.map(p => new THREE.Color().setHSL(p.hsl.h, Math.min(1, p.hsl.s * 1.35 + .1), Math.min(.62, Math.max(.32, p.hsl.l * 1.2))))
    .sort((a, b) => a.getHSL({}).l - b.getHSL({}).l);
  return [base, ...lit];
}
// glides at a set pace, so the moves always play at the same speed. Any scroll of your own takes over.
//  - "Check it out" on the landing: flies the picked model down into its section (FLY_SECS)
//  - the arrows on each side of the websites: on to the next highlight or back. A step is the laptop moving
//    across (MOVE_SECS), then that highlight's site drifting (DRIFT_SECS), and it stops there
//  - on the last highlight the next arrow turns down, to the enquiry at the bottom (DOWN_SECS), and "Back to top"
//    flies the laptop back up to the landing (FLY_SECS), skipping the highlights on the way
const FLY_SECS = 2.6, CLOSE_SECS = 2.6, MERGE_SECS = 2.6, OPEN_SECS = 3, SOAK_SECS = 1.4, FOCUS_SECS = 1.6, MOVE_SECS = 3.2, DRIFT_SECS = 2.6, LEAVE_SECS = .35, DOWN_SECS = 1.3;
let glide = 0, glideC = null;   // glideC: the chapter a glide is driving (null: none, follow the scroll)
const stopGlide = () => {
  cancelAnimationFrame(glide);
  if(glideC !== null) smoothC = rawC();   // a cut-short glide picks up from wherever the page is
  glideC = null;
  pcSkip = pcJump = pcUp = false;
};
['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, stopGlide, { passive: true }));
const absTop = el => el.getBoundingClientRect().top + scrollY;
const scrollOfC = c => absTop(site) + c / (N - .5) * (site.offsetHeight - innerHeight);
// scrolls the page to `to` over `secs`, soft in and out, then calls done
// easeSine: soft in and out like easeCubic, but it gets going straight away, so a click feels instant
const easeSine = k => (1 - Math.cos(Math.PI * k)) / 2;
function scrollGlide(to, secs, done, curve = easeCubic){
  const from = scrollY, t0 = performance.now();
  const tick = now => {
    const k = reduceMotion ? 1 : clamp((now - t0) / 1000 / secs);
    scrollTo({ top: mix(from, to, curve(k)), behavior: 'instant' });
    if(k < 1) glide = requestAnimationFrame(tick);
    else done?.();
  };
  glide = requestAnimationFrame(tick);
}
// for the PC: the flight down to where it rests whole in the middle
goBtn.addEventListener('click', () => {
  stopGlide();
  if(pick === 'site') scrollGlide(absTop(site), FLY_SECS);
  else scrollGlide(scrollOfP(0), FLY_SECS);   // to where it rests whole; eased in and out by the glide (the flight follows the scroll as is)
});
// back to the top: the laptop holds its pose (glideC) while the page slides back to where the last highlight pins,
// jumps to where the first one pins (the stage looks the same at both, so it doesn't show), then flies up to the landing
const toTop = document.createElement('button');
toTop.type = 'button'; toTop.className = 'ow-top'; toTop.hidden = true;
toTop.innerHTML = 'Back to top <span aria-hidden="true">↑</span>';
document.body.append(toTop);
toTop.addEventListener('click', () => {
  const c = glideC ?? smoothC ?? rawC();
  stopGlide();
  glideC = c;
  const fly = () => { scrollTo({ top: absTop(site), behavior: 'instant' }); scrollGlide(0, FLY_SECS, () => { glideC = null; smoothC = rawC(); }); };
  if(scrollY > scrollOfC(N - .5) + 1) scrollGlide(scrollOfC(N - .5), DOWN_SECS * .6, fly);
  else fly();
});
// time along the chapters: each one's first half (the drift) takes DRIFT_SECS and its second (the move) MOVE_SECS;
// the chapter itself eases the move, so a glide runs through this at an even pace
const secsOf = c => { const i = Math.floor(c), f = c - i; return i * (DRIFT_SECS + MOVE_SECS) + (f < .5 ? f * 2 * DRIFT_SECS : DRIFT_SECS + (f - .5) * 2 * MOVE_SECS); };
const cOf = s => { const per = DRIFT_SECS + MOVE_SECS, i = Math.floor(s / per), r = s - i * per; return i + (r < DRIFT_SECS ? r / DRIFT_SECS / 2 : .5 + (r - DRIFT_SECS) / MOVE_SECS / 2); };
function stepTo(dir){
  const c = glideC ?? smoothC ?? rawC();
  const here = glideC === null ? chapter(c).on : Math.round(c - .5);   // mid-glide: from where it's headed
  const to = Math.min(N - 1, Math.max(0, here + dir)) + .5;           // stops with its drift done, text up
  stopGlide();
  if(reduceMotion){ scrollTo({ top: scrollOfC(to), behavior: 'instant' }); return; }
  // the rest of the highlight it's leaving goes by quickly (LEAVE_SECS for a whole one), so the move starts at once
  const b = dir > 0 ? Math.max(c, here + .5) : Math.min(c, here), q = Math.abs(b - c) * 2 * LEAVE_SECS;
  const s0 = secsOf(b), s1 = secsOf(to), total = q + Math.abs(s1 - s0), t0 = performance.now();
  const tick = now => {
    const t = (now - t0) / 1000, k = clamp(t / Math.max(.01, total));
    glideC = t < q ? mix(c, b, t / q) : cOf(mix(s0, s1, clamp((t - q) / Math.max(.01, total - q))));
    scrollTo({ top: scrollOfC(glideC), behavior: 'instant' });
    if(k < 1) glide = requestAnimationFrame(tick);
    else { smoothC = glideC; glideC = null; }
  };
  glide = requestAnimationFrame(tick);
}
const arrows = ['prev', 'next'].map((dir, n) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `ow-arrow ow-arrow-${dir}`;
  b.setAttribute('aria-label', n ? 'Next highlight' : 'Previous highlight');
  b.innerHTML = '<svg viewBox="0 0 16 64" aria-hidden="true"><polyline points="2,2 14,32 2,62"/></svg>';
  b.addEventListener('click', () => {
    if(n && onNow === N - 1){ stopGlide(); scrollGlide(Math.min(absTop(ask), document.documentElement.scrollHeight - innerHeight), DOWN_SECS, null, easeSine); }   // the last one: on down to the enquiry (it sits at the very bottom)
    else stepTo(n ? 1 : -1);
  });
  site.querySelector('.ow-stage').append(b);
  return b;
});
Object.values(frames).forEach(fr => fr.addEventListener('load', () => { syncSite(); setTimeout(syncSite, 900); }));   // again once the site's own load cover lifts

// ===== PC builds: the model of my build follows the path in pcPose (the 3D loop): out of the landing and round to its
// glass, across the stage opening up into its parts and closing again, then down into the frame of its photo; then the
// photo soaks in over it (--seep) and the gallery of other builds rises in (--show).
// pcP: where it is on that path, one number: -1 to 0 for the flight from the landing (the stage pins at 0), then windows
// of scrolling since the stage pinned: across until PC_TRAVEL, into the photo by PC_MERGE, the photo and the gallery after.
// On the way across it opens (OPEN0 to OPEN1, starting as the flight ends) and stays open, every part tagged, until
// CLOSE0; meanwhile clicking a part (or its tag) zooms in on it with what it does (pcFocus; LABELS in my-pc.js).
// Before that it rests whole in the middle (to HOLD) with Open it up / See other builds under it (.ow-pc-intro).
const HOLD = .5, OPEN0 = HOLD + .2, OPEN1 = OPEN0 + 1, CLOSE0 = OPEN1 + 1.6;
const shot = pc.querySelector('.ow-hero-shot'), PC_TRAVEL = CLOSE0 + .6, PC_MERGE = PC_TRAVEL + .5, PC_SPAN = PC_MERGE + 1.1;
pc.style.height = `${(PC_SPAN + 1) * 100}vh`;
pc.querySelectorAll('.ow-gallery > li').forEach((li, n) => li.style.setProperty('--i', n));   // staggers their entrance
const rawPcP = () => { const top = pc.getBoundingClientRect().top; return top > 0 ? clamp(scrollY / Math.max(1, scrollY + top)) - 1 : through(pc) * PC_SPAN; };
let pcSeep = 0, smoothPcP = null;
// pcSkip: on its way back to the top the PC flies from the photo to the landing, following the glides (pcPose reads it);
// pcUp for the whole way (no buttons show on the way past)
let pcSkip = false, pcUp = false, pcJump = false, jumpFrom = 0, topFrom = 1;   // pcJump: See other builds, straight past the opening up
const scrollOfP = P => { const top = absTop(pc); return P < 0 ? (P + 1) * top : top + P / PC_SPAN * (pc.offsetHeight - innerHeight); };
// under the photo: on down to the enquiry, or back to the top in two eased glides (pcSkip)
pc.querySelector('.ow-pc-ask').addEventListener('click', () => { stopGlide(); scrollGlide(document.documentElement.scrollHeight - innerHeight, DOWN_SECS, null, easeSine); });
pc.querySelector('.ow-pc-nav .ow-pc-top').addEventListener('click', () => {
  stopGlide();
  pcSkip = pcUp = true; topFrom = scrollY;
  scrollGlide(scrollOfP(0), FLY_SECS, () => {   // the spin (the stage stays pinned, so only the PC shows it)
    pcSkip = false; smoothPcP = 0;   // rests in the middle: the same pose as the end of the spin (+ a full turn)
    scrollGlide(0, FLY_SECS, () => { pcUp = false; });   // then the flight down, backwards, following the scroll (as the laptop does)
  }, easeSine);
});
// under it while it rests whole: open it up, or skip on to the photo and the other builds (it stays shut on the way)
pc.querySelector('.ow-pc-open').addEventListener('click', () => {
  stopGlide();
  if(rawPcP() < OPEN0) scrollTo({ top: scrollOfP(OPEN0), behavior: 'instant' });   // nothing moves while it rests, so start right where it opens
  scrollGlide(scrollOfP(OPEN1), OPEN_SECS, null, k => k);   // the parts ease themselves; the glide ends as the last one lands
});
pc.querySelector('.ow-pc-skip').addEventListener('click', () => {
  stopGlide();
  pcJump = true;
  jumpFrom = Math.max(0, smoothPcP ?? rawPcP());
  // into the photo, easing in and out over exactly that move, then the photo soaks in
  scrollGlide(scrollOfP(PC_MERGE), FLY_SECS * 1.1, () => scrollGlide(scrollOfP(PC_MERGE + .5), SOAK_SECS, null, easeSine), easeSine);
});
// while it's open: close it up where it is, then on into the photo (each part of the path eases itself, so steady glides)
pc.querySelector('.ow-pc-gallery').addEventListener('click', () => {
  stopGlide();
  if(rawPcP() < CLOSE0) scrollTo({ top: scrollOfP(CLOSE0), behavior: 'instant' });   // it sits still until then
  scrollGlide(scrollOfP(PC_TRAVEL), CLOSE_SECS, () => scrollGlide(scrollOfP(PC_MERGE), MERGE_SECS, () => scrollGlide(scrollOfP(PC_MERGE + .5), SOAK_SECS, null, easeSine), k => k), k => k);
});
function syncPc(){
  if(pc.hidden) return;
  const u = Math.max(0, smoothPcP ?? rawPcP()), show = easeCubic(clamp((u - PC_MERGE - .5) / .5));
  pcSeep = easeCubic(clamp((u - PC_MERGE + .05) / .55));
  pc.style.setProperty('--seep', pcSeep);
  pc.style.setProperty('--show', show);
  pc.classList.toggle('is-shown', show > .4);
  pc.classList.toggle('is-seeped', pcSeep > .6);
  pc.classList.toggle('is-resting', !pcUp && u > -.05 && u < OPEN0 + .05);
  pc.classList.toggle('is-open', !pcUp && u > OPEN1 - .05 && u < CLOSE0);
}
// a build's details open in a dialog: a copy of the hidden .ow-detail beside its card (or beside the featured photo)
const dialog = pc.querySelector('.ow-dialog'), dialogBody = dialog.querySelector('.ow-dialog-body');
pc.querySelectorAll('.ow-card, .ow-hero-shot').forEach(btn => btn.addEventListener('click', () => {
  if(btn === shot && !pc.classList.contains('is-seeped')) return;   // the photo's frame is there all along, empty until it soaks in
  const detail = (btn.closest('li') ?? btn.parentElement).querySelector('.ow-detail').cloneNode(true);
  detail.hidden = false;
  dialogBody.replaceChildren(detail);
  dialog.showModal();
}));
dialog.querySelector('.ow-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if(e.target === dialog) dialog.close(); });   // a click on the backdrop
addEventListener('scroll', () => requestAnimationFrame(() => { syncSite(); syncPc(); }), { passive: true });
addEventListener('resize', syncPc);

// ===== the two models, in 3D
let gl;
try { gl = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { /* no WebGL: no models */ }
if(gl) loadLaptop().then(({ base, lid }) => {
  const scene = new THREE.Scene();
  const glassObj = onGlass(lid, screenEl, 1280);
  const model = new THREE.Group(), facing = new THREE.Group(), laptop = new THREE.Group();
  model.add(base, lid);
  model.position.copy(MIDDLE).negate();
  facing.rotation.y = -Math.PI / 2;   // its screen towards the camera (+z)
  facing.add(model);
  laptop.add(facing);
  // the featured build's PC (my own, built in my-pc.js): centred, and scaled to stand .445 tall
  const tower = new THREE.Group(), pcScene = buildMyPc(gl), size = new THREE.Box3().setFromObject(pcScene).getSize(new THREE.Vector3());
  pcScene.position.sub(new THREE.Box3().setFromObject(pcScene).getCenter(new THREE.Vector3()));
  const pcFit = new THREE.Group();
  pcFit.add(pcScene);
  pcFit.scale.setScalar(.445 / size.y);
  tower.add(pcFit);
  const rgb = [], pcMats = new Set(), pcGlow = [];   // rgb: what lights up; pcMats: everything, to fade it out; pcGlow: the lights inside
  pcScene.traverse(o => {
    if(o.isPointLight){ o.userData.k = o.intensity; pcGlow.push(o); }
    if(!o.isMesh) return;
    const m = o.material;
    if(pcMats.has(m)) return;
    m.userData.opacity = m.opacity;
    m.userData.transparent = m.transparent;
    if(m.transparent) m.depthWrite = false;   // the glass side panel: don't hide what's behind it
    if(m.userData.glow) rgb.push(m);
    pcMats.add(m);
  });
  // opening it up: each part moves its own way (userData.out, set in my-pc.js), away from the motherboard and the case
  const pcParts = pcScene.children.filter(o => o.userData.out);
  // one after another (userData.order), each easing out on its own; userData.k: how far out it is
  // each takes PART of the opening, the next starting STAG later: glass, PSU cover, PSU, drives, graphics card, fans,
  // memory, cooler, rear fan, motherboard last; each eases out and settles with a slight overshoot (outBack)
  const LAST = Math.max(...pcParts.map(o => o.userData.order)), PART = .3, STAG = (1 - PART) / LAST;
  const outBack = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
  const topOf = o => { while(o.parent !== pcScene) o = o.parent; return o; };
  const explodePc = e => pcParts.forEach(o => {
    o.userData.k = outBack((e - o.userData.order * STAG) / PART);
    o.position.copy(o.userData.out).multiplyScalar(o.userData.k);
    if(o.userData.turn) o.userData.pivot.rotation.set(...o.userData.turn.map(r => r * o.userData.k));   // turning to show its best side
  });

  // the tags on the parts while it's open: a name that decodes out of binary on a white line to the part; on the tour
  // the camera's part also gets its spec and what it does
  const SVGNS = 'http://www.w3.org/2000/svg', tagLines = document.createElementNS(SVGNS, 'svg');
  tagLines.setAttribute('class', 'ow-arrows ow-tag-lines');
  const labelled = [];
  pcScene.traverse(o => { if(o.userData.anchors) labelled.push(o); });
  const tags = labelled.map(o => {
    const el = document.createElement('div'), line = document.createElementNS(SVGNS, 'path');
    const dots = o.userData.anchors.map(() => document.createElementNS(SVGNS, 'circle'));
    el.className = 'ow-tag';
    el.innerHTML = '<div class="ow-tag-name"></div><div class="ow-tag-body"><div class="ow-tag-spec"></div><p class="ow-tag-what"></p></div>';
    el.addEventListener('click', () => focusOn(o.name === pcFocus.b ? null : o.name));
    line.setAttribute('pathLength', 1); line.style.strokeDasharray = 1;
    dots.forEach(d => d.setAttribute('r', 3));
    tagLines.append(line, ...dots);
    return { name: o.name, L: o.userData.label, part: o, top: topOf(o), el, line, dots, on: null, deep: null, w: 0,
      nameEl: el.querySelector('.ow-tag-name'), specEl: el.querySelector('.ow-tag-spec'), whatEl: el.querySelector('.ow-tag-what') };
  });
  const tagOf = Object.fromEntries(tags.map(g => [g.name, g]));
  document.fonts?.ready.then(() => tags.forEach(g => { g.w = 0; }));   // measured again in the real font
  const sp = new THREE.Vector3();
  const onScreen = o => { o.getWorldPosition(sp).project(camera); return { x: (sp.x + 1) / 2 * W, y: (1 - sp.y) / 2 * H }; };
  // the binary decode: each character flickers 0 / 1 for `dur` ms, starting `per` ms after the one before, then settles
  const decode = (s, t, per, dur) => reduceMotion ? s : [...s].map((c, i) => c === ' ' || t >= i * per + dur ? c : t < i * per ? ' ' : Math.random() < .5 ? '0' : '1').join('');
  function drawTags(now, live, fa, wa, fb, wb){
    const tick = Math.floor(now / 45);   // the flicker steps at about 22 a second, like a terminal
    tags.forEach(g => {
      const w = (g.name === fa ? wa : 0) + (g.name === fb ? wb : 0), deep = live && w > .6;
      const show = deep || (live && !g.L.hidden && wa + wb < .3 && g.top.userData.k > .92);
      g.on = show ? g.on ?? now : null;
      g.deep = deep ? g.deep ?? now : null;
      g.el.classList.toggle('is-on', show);
      if(!show){ g.line.style.opacity = 0; g.dots.forEach(d => { d.style.opacity = 0; }); return; }
      if(!g.w){ g.nameEl.textContent = g.L.name; g.w = g.nameEl.offsetWidth; }
      const As = g.part.userData.anchors.map(onScreen), A = As[0], side = deep ? 1 : g.L.side;
      const at = deep ? { x: W * (g.L.deepAt?.[0] ?? .6), y: H * (g.L.deepAt?.[1] ?? .34) } : { x: A.x + side * (g.L.reach ?? 70), y: A.y - g.L.lift }, len = deep ? Math.max(g.w, Math.min(420, W * .32)) : g.w;
      const drawn = reduceMotion ? 1 : clamp((now - g.on) / 450);
      // a line from each group of points (one point for most tags; the fans have three groups) to the name: most go at
      // 45 degrees until level with the name, then straight in; grouped ones (which come from across the model) go along
      // first and bend in at 45 degrees at the end, and tie the group's points together. While zoomed in, grouped lines
      // meet the far end of the underline, so they come in beside the text instead of across it.
      const end = { x: at.x + side * len, y: at.y }, join = deep && g.L.groups ? end : at;
      let path = '';
      for(const grp of g.L.groups ?? [[0]]){
        const ps = grp.map(i => As[i]).sort((p, q) => p.x - q.x), j = ps[Math.floor(ps.length / 2)];
        const dx = join.x - j.x, dy = join.y - j.y, ady = Math.abs(dy), sx = Math.sign(dx);
        if(ps.length > 1) path += `M${ps.map(p => `${p.x},${p.y}`).join(' L')} `;
        path += Math.abs(dx) <= ady ? `M${j.x},${j.y} L${join.x},${join.y} `
          : g.L.groups ? `M${j.x},${j.y} L${join.x - sx * ady},${j.y} L${join.x},${join.y} `
          : `M${j.x},${j.y} L${j.x + sx * ady},${join.y} L${join.x},${join.y} `;
      }
      g.line.setAttribute('d', path + `M${at.x},${at.y} L${end.x},${end.y}`);
      g.line.style.strokeDashoffset = 1 - drawn;
      g.line.style.opacity = 1;
      g.dots.forEach((d, i) => { d.setAttribute('cx', As[i].x); d.setAttribute('cy', As[i].y); d.style.opacity = 1; });
      g.el.style.transform = `translate(${side > 0 ? at.x : at.x - len}px, ${at.y}px)`;
      g.el.style.width = `${len}px`;
      g.el.classList.toggle('is-left', side < 0);
      if(tick === g.tick) return;
      g.tick = tick;
      g.nameEl.textContent = decode(g.L.name, now - g.on - 300, 40, 300);
      g.specEl.textContent = deep ? decode(g.L.spec, now - g.deep - 350, 14, 240) : '';
      g.whatEl.textContent = deep ? decode(g.L.what, now - g.deep - 700, 7, 220) : '';
    });
  }
  // clicking a part (or its tag) while it's open: the camera glides in on it (pcFocus: from a to b, from t0) and its tag
  // adds what it does; clicking it again, anywhere else or Esc steps back. A part without a section leads to one (SECTION).
  let pcFocus = { a: null, b: null, t0: 0 }, pcHold = false;
  const focusT = () => reduceMotion ? 1 : easeCubic(clamp((performance.now() - pcFocus.t0) / 1000 / FOCUS_SECS));
  function focusOn(name){
    if(name === pcFocus.b) return;
    pcFocus = { a: focusT() < .5 ? pcFocus.a : pcFocus.b, b: name, t0: performance.now() };
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function partAt(e){   // the section under the pointer: the first part hit, looking through the case and its panels
    ndc.set(e.clientX / W * 2 - 1, 1 - e.clientY / H * 2);
    ray.setFromCamera(ndc, camera);
    for(const hit of ray.intersectObjects(pcParts, true)){
      let o = hit.object;
      for(; o !== pcScene; o = o.parent) if(o.userData.label && tagOf[o.name]) return o.name;   // the most specific: a fan before the cooler it's on
    }
    return null;
  }
  addEventListener('click', e => {
    if(!pcHold || e.target.closest('a, button, .ow-tag, dialog')) return;
    const name = partAt(e);
    if(name){ e.stopPropagation(); e.preventDefault(); focusOn(name === pcFocus.b ? null : name); }
    else if(pcFocus.b && !e.target.closest('button')){ focusOn(null); }
  }, true);   // capture: a part over a button (the photo's frame) is what was meant
  addEventListener('pointermove', e => { document.documentElement.classList.toggle('ow-pointing', pcHold && !!partAt(e)); }, { passive: true });
  addEventListener('keydown', e => { if(e.key === 'Escape' && pcFocus.b) focusOn(null); });
  const hint = document.createElement('div');
  hint.className = 'ow-pc-hint';

  // the PC section's backdrop: a slow-flowing sheet of liquid chrome, drawn on the graphics card (its own small canvas,
  // one pixel per 6 px block, scaled up with hard edges). The surface is a few soft waves and one big S-shaped swell;
  // each block mirrors a studio (bright overhead, a hard horizon, dark floor) at the angle its surface faces, a warm
  // glint where it would reflect the PC (model, turned by its yaw), and glints of the PC's own lights (the fans, the
  // RAM, the GPU's logo, the PSU's teal: GLOWS), so what it reflects follows the real parts as they move. Below the PC
  // the chrome is a floor that mirrors the PC itself (this frame's render, copied small on the graphics card: mini),
  // bent by the ripples and fading with distance.
  let chromeArgs = null;
  const chrome = document.createElement('canvas');
  chrome.className = 'ow-chrome';
  chrome.setAttribute('aria-hidden', 'true');
  pc.querySelector('.ow-stage').prepend(chrome);
  const fansAt = tagOf['floor-fans'].part.userData.anchors, at0 = n => tagOf[n].part.userData.anchor;
  const GLOWS = [...fansAt.map(a => [a, [1, .81, .6]]), [at0('ram'), [1, .38, .08]], [at0('gpu'), [1, .62, .32]], [at0('psu'), [.12, .55, .5]]];
  const mini = document.createElement('canvas'), miniInk = mini.getContext('2d'), sceneTex = new THREE.CanvasTexture(mini);
  const chromeU = {
    open: { value: 0 },
    scene: { value: sceneTex }, floorY: { value: 1 },
    t: { value: 0 }, res: { value: new THREE.Vector2() }, model: { value: new THREE.Vector2() }, turn: { value: 0 },
    lp: { value: Array.from({ length: 10 }, () => new THREE.Vector3()) }, lc: { value: Array.from({ length: 10 }, (_, i) => new THREE.Vector3(...(GLOWS[i]?.[1] ?? [0, 0, 0]))) },
  };
  const chromeGl = new THREE.WebGLRenderer({ canvas: chrome, antialias: false }), chromeScene = new THREE.Scene(), chromeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  chromeGl.setPixelRatio(1);
  chromeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: chromeU,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform float t, turn, floorY, open; uniform vec2 res, model; uniform vec3 lp[10], lc[10]; uniform sampler2D scene; varying vec2 vUv;
      float swell(vec2 p){ return .5 * sin(3. * p.x + 2.2 * p.y + .3 * t) + .35 * sin(5.1 * p.y - 1.7 * p.x - .2 * t + 1.)
        + .4 * exp(-pow((p.y - .72 + .3 * sin(3.1 * p.x + .6 + .1 * t)) / .2, 2.)); }
      void main(){
        vec2 uv = vec2(vUv.x, 1. - vUv.y), e = vec2(1. / res.x, 0.);   // y down, like the page
        vec2 g = vec2(swell(uv + e) - swell(uv - e), swell(uv + e.yx) - swell(uv - e.yx)) / (2. * e.x);
        vec3 n = normalize(vec3(-g * .33, 1.));
        vec3 r = vec3(2. * n.z * n.x, -2. * n.z * n.y, 2. * n.z * n.z - 1.);   // the view reflected off it (y up)
        float env = (r.y > 0. ? .3 + .5 * pow(r.y, .8) : .14) + .35 * exp(-pow(r.y / .07, 2.));   // sky, a soft horizon, a dim floor (never black)
        // where there's something to reflect: round the PC; out at the corners and edges it falls away to black
        float fall = exp(-(pow((uv.x - model.x) / .42, 2.) + pow((uv.y - model.y) / .5, 2.)));
        float glint = pow(max(dot(r, normalize(vec3(model.x - uv.x + turn, uv.y - model.y, .7))), 0.), 60.);
        vec3 col = floor(env * fall * .75 * 24. + .5) / 24. * vec3(.91, .925, .96) + floor(glint * fall * .6 * 12. + .5) / 12. * vec3(1., .78, .59);
        for(int i = 0; i < 10; i++) col += lc[i] * lp[i].z * .5 * fall * pow(max(dot(r, normalize(vec3(lp[i].x - uv.x, uv.y - lp[i].y, .35))), 0.), 24.);
        // while it's open the parts are up off the floor, so the wall shows them too: the PC mirrored about its middle,
        // bent by the ripples, so ghosts of the parts swim in the chrome round the real ones
        vec2 qw = vec2(2. * model.x - uv.x + n.x * .07, 1. - uv.y - n.y * .05);
        vec4 mw = (texture2D(scene, qw) + texture2D(scene, qw + vec2(.005, 0.)) + texture2D(scene, qw + vec2(0., .007))) / 3.;
        col = mix(col, col * .6 + mw.rgb * .9, mw.a * open * .8 * smoothstep(.0, .3, fall));
        float below = uv.y - floorY;
        if(below > 0.){   // under the PC: the PC mirrored in the chrome, swimming with the ripples; no edge, it fades in
          float k = smoothstep(0., .05, below) * exp(-below * 3.) * smoothstep(.6, 0., abs(uv.x - model.x));
          vec2 q = vec2(uv.x + n.x * .04, 1. - (floorY - below * 1.15 + n.y * .025));
          vec4 m = (texture2D(scene, q) + texture2D(scene, q + vec2(.004, 0.)) + texture2D(scene, q + vec2(0., .006))) / 3.;
          col = mix(col, col * .55 + m.rgb * .8, m.a * k);
        }
        col = 1. - exp(-col * 1.6);   // soft highlights: bright, never blown out
        gl_FragColor = vec4(col, 1.);
      }` })));
  function drawChrome(now, lx, ly, yaw, alpha, edge){
    chrome.style.opacity = alpha;
    // on the way down from the landing it sits fixed behind the PC the whole flight (the stage is still pages below),
    // rising out of the black just under the landing as that scrolls away (edge: the landing's bottom on screen)
    chrome.style.position = rawPcP() < 0 ? 'fixed' : '';
    chrome.style.maskImage = chrome.style.webkitMaskImage = edge > 0 ? `linear-gradient(transparent ${edge}px, #000 ${edge + H * .35}px)` : '';
    chromeU.open.value = pcOpen * (1 - pcZoom);   // the wall's mirror image only from the whole view: zoomed in it's just a smear
    if(alpha <= 0) return;
    const w = Math.ceil(W / 6), h = Math.ceil(H / 6);
    if(chrome.width !== w || chrome.height !== h) chromeGl.setSize(w, h, false);
    chromeU.res.value.set(w, h);
    chromeU.t.value = reduceMotion ? 0 : now / 1000 * .25;
    chromeU.model.value.set(lx / W, ly / H);
    chromeU.turn.value = Math.sin(yaw) * .5;
    let low = 0;
    GLOWS.forEach(([a], i) => { const p = onScreen(a); chromeU.lp.value[i].set(p.x / W, p.y / H, 1.6); low = Math.max(low, p.y); });
    chromeU.floorY.value = low / H + .05;   // just under the lowest part (the floor fans), so nothing stands in its own reflection
    if(mini.width !== Math.ceil(W / 4)){ mini.width = Math.ceil(W / 4); mini.height = Math.ceil(H / 4); }
    miniInk.clearRect(0, 0, mini.width, mini.height);
    miniInk.drawImage(gl.domElement, 0, 0, mini.width, mini.height);   // stays on the graphics card: nothing is read back
    sceneTex.needsUpdate = true;
    chromeGl.render(chromeScene, chromeCam);
  }
  let pcFaded = false;
  function fadePc(f){   // 0: solid, 1: gone; while fading every part is drawn see-through
    const fading = f > 0;
    pcMats.forEach(m => {
      if(fading !== pcFaded){ m.transparent = fading || m.userData.transparent; m.needsUpdate = true; }
      m.opacity = m.userData.opacity * (1 - f);
    });
    pcFaded = fading;
  }
  const pcScale = new THREE.Vector3();
  let pcOpen = 0, pcZoom = 0;
  scene.add(laptop, tower, new THREE.HemisphereLight(0xffffff, 0x202030, .35));

  // one spotlight per model, from in front and a little above: the picked one brightens, the other dims
  const spot = target => {
    const s = new THREE.SpotLight(0xffc98a, 3, 0, .3, .4, 0);   // narrow, so it lights one model, not both
    s.target = target;
    scene.add(s);
    return s;
  };
  const lights = { site: spot(laptop), pc: spot(tower) };

  const layer = document.createElement('div'), css = new CSS3DRenderer();
  layer.className = 'ow-3d-layer';
  gl.domElement.setAttribute('aria-hidden', 'true');
  layer.append(gl.domElement, css.domElement, tagLines, ...tags.map(g => g.el), hint);
  document.body.append(layer);
  document.documentElement.classList.add('ow-3d');
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 20000);

  const slot = (root, cls) => root.querySelector(cls);
  const heroSlot = { site: slot(hero, '.ow-slot-laptop'), pc: slot(hero, '.ow-slot-pc') };
  const box = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };

  // the landing's spotlight: drifts slowly around while nothing is picked, then glides onto the picked one
  const spotAt = { x: innerWidth / 2 };
  // the light on the room, drawn at 1/16 size and scaled up with hard pixels: a pool on the back wall behind the lit
  // model and an oval on the floor in front of it
  const room = hero.querySelector('.ow-light'), ink = room.getContext('2d'), PX = 16;
  function drawLight(hr, slots){
    const w = Math.ceil(hr.width / PX), h = Math.ceil(hr.height / PX);
    if(room.width !== w || room.height !== h){ room.width = w; room.height = h; }
    const x = (spotAt.x - hr.left) / PX, r = spotAt.r / PX;
    const mid = (Math.min(...slots.map(s => s.top)) + Math.max(...slots.map(s => s.bottom))) / 2 - hr.top, floor = Math.max(...slots.map(s => s.bottom)) - hr.top;
    ink.clearRect(0, 0, w, h);
    const glow = (cy, rx, ry, a) => {
      ink.save();
      ink.translate(x, cy / PX); ink.scale(1, ry / rx);
      const g = ink.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(255,176,96,${a})`); g.addColorStop(.55, `rgba(232,128,64,${a * .45})`); g.addColorStop(1, 'rgba(160,70,30,0)');
      ink.fillStyle = g; ink.fillRect(-rx, -rx, rx * 2, rx * 2);
      ink.restore();
    };
    glow(spotAt.y ?? mid, r * 1.6, r * 1.4, .32);       // on the wall behind
    if(spotAt.flood > 0){   // the flood: drawn block by block in 2 x 2 groups (32px), inside solid, a ring of dimmer steps at the edge
      const B = 2, R = spotAt.flood / PX, cy = (spotAt.y ?? mid) / PX;
      const STEPS = ['rgba(255,176,96,.3)', 'rgba(232,128,64,.2)', 'rgba(232,128,64,.1)'];
      for(let by = 0; by < h; by += B) for(let bx = 0; bx < w; bx += B){
        const ring = Math.floor((Math.hypot(bx + B / 2 - x, by + B / 2 - cy) - R) / B) + 1;   // 0 or less: inside; 1, 2: the steps
        if(ring < STEPS.length){ ink.fillStyle = STEPS[Math.max(0, ring)]; ink.fillRect(bx, by, B, B); }
      }
    }
    if(spotAt.foot < .99) glow(floor, r * 1.5, r * .35, .45 * (1 - (spotAt.foot ?? 0)));     // on the floor (not while it's down on the links)
  }

  // the PC's path (Brayden's drawing): from the landing it swings out right and down, a quarter turn to its solid side
  // and on round to its glass (YAW_*, always turning the same way); then, pinned, it crosses to the left, opening up into
  // its parts and closing again (explode 0 to 1 to 0), and drops into the frame of its photo, turning to the photo's
  // angle (data-yaw / data-pitch on .ow-hero-shot). Soft in and out throughout; the drops overshoot a touch and settle.
  // the point `go` of the way along a cubic Bezier by distance (so a steady go is a steady speed)
  // the point `go` of the way along a smooth curve through the points c (Catmull-Rom), by distance, so a steady go is a
  // steady speed; with 4 points and bez, c is a cubic Bezier instead (end points plus two pulls)
  function along(c, go, bez){
    const n = c.length - 1, at = u => {
      if(bez){ const v = 1 - u; return [0, 1].map(d => v ** 3 * c[0][d] + 3 * v * v * u * c[1][d] + 3 * v * u * u * c[2][d] + u ** 3 * c[3][d]); }
      const s = Math.min(n - 1, Math.floor(u * n)), t = u * n - s, p0 = c[Math.max(0, s - 1)], p1 = c[s], p2 = c[s + 1], p3 = c[Math.min(n, s + 2)];
      return [0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t * t + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t ** 3));
    };
    const N = 96, len = [0];
    for(let i = 1, q = at(0); i <= N; i++){ const r = at(i / N); len.push(len[i - 1] + Math.hypot(r[0] - q[0], r[1] - q[1])); q = r; }
    const want = go * len[N];
    let i = 1;
    while(i < N && len[i] < want) i++;
    return at((i - 1 + (want - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1])) / N);
  }
  const YAW_GLASS = -1.5 * Math.PI + .45, TURN_ACROSS = -.5;
  function pcPose(a, P, sway){
    const fb = box(shot), across = H * .5, E = { x: W * .5, y: H * .45 }, L = { x: fb.x, y: H * .4 };   // E: where it rests, whole, in the middle (a touch high, for its buttons)
    if(pcSkip){   // back to the top, first leg: out of the photo, spinning along the floor, up to where it rests in the middle
      // (then the flight down plays back as the page scrolls up, like the laptop's)
      pcSkip = false; const B = pcPose(a, PC_MERGE, sway), Z = pcPose(a, 0, sway); pcSkip = true;
      const k = clamp((topFrom - scrollY) / Math.max(1, topFrom - absTop(pc)));   // the glide's own eased progress
      const [x, y] = along([[B.x, B.y], [B.x + W * .15, B.y + H * .3], [Z.x + W * .1, Z.y + H * .3], [Z.x, Z.y]], k, true);
      return { x, y, h: mix(B.h, Z.h, k), yaw: mix(B.yaw, Z.yaw + 2 * Math.PI, k), pitch: mix(B.pitch, Z.pitch, k), explode: 0 };
    }
    if(pcJump && P >= PC_MERGE) pcJump = false;   // arrived (the PC trails the scroll a little, so not when the glide ends)
    if(pcJump && P > jumpFrom && P < PC_MERGE){   // See other builds: one smooth move from where it rested straight into the photo
      pcJump = false;
      const A = pcPose(a, jumpFrom, sway), B = pcPose(a, PC_MERGE, sway), m = clamp((P - jumpFrom) / (PC_MERGE - jumpFrom));
      pcJump = true;
      return { x: mix(A.x, B.x, m), y: mix(A.y, B.y, m), h: mix(A.h, B.h, m), yaw: mix(A.yaw, B.yaw, m), pitch: mix(A.pitch, B.pitch, m), explode: 0 };
    }
    if(P < 0){   // the flight from the landing
      const go = P + 1, yaw = mix(.55 + sway, YAW_GLASS, go);   // one turn: solid side out on the right, glass by the bottom
      // go follows the scroll 1:1 (no easing of its own), so the PC moves the moment the page does; the glide is the ease
      const a0y = pick === 'pc' ? a.y + scrollY : a.y;   // where its slot sat before the page moved (the slot scrolls away under it); not picked, it stays in its slot
      // Brayden's note: out to the right, round in a wide loop below where it rests, then up into the middle; one curve,
      // travelled by distance, so the PC moves at the pace the page scrolls
      const [fx, fy] = along([[a.x, a0y], [W * .74, H * .6], [W * .775, H * .69], [W * .71, H * .79], [W * .6, H * .7], [E.x, E.y]], go);   // kept in from the right edge: the PC is wide there
      return { x: fx, y: fy, h: mix(a.h * .78, across, go), yaw, pitch: mix(.12, .1, go), explode: 0 };
    }
    if(P < PC_TRAVEL){   // across: open (a little smaller while open, so its parts fit) in the middle, then closing on its way left
      // explode runs steadily (the parts ease themselves); the move left and the shrink ease as a whole
      const explode = clamp((P - OPEN0) / (OPEN1 - OPEN0)) * (1 - clamp((P - CLOSE0) / (PC_TRAVEL - CLOSE0 - .1)));
      const open = easeCubic(explode), left = easeCubic(clamp((P - CLOSE0) / (PC_TRAVEL - CLOSE0)));
      // resting in the middle, then a little left as it opens
      const cx = mix(E.x, W * .4, open), cy = mix(E.y, H * .5, open);
      return { x: mix(cx, L.x, left), y: mix(cy, L.y, left), h: across * (1 - .38 * open),
        yaw: YAW_GLASS + TURN_ACROSS * easeCubic(P / PC_TRAVEL), pitch: .1, explode };
    }
    const m = clamp((P - PC_TRAVEL) / (PC_MERGE - PC_TRAVEL)), e = easeCubic(m), fill = +shot.dataset.fill || .7;   // down into the photo
    return { x: mix(L.x, fb.x, e), y: mix(L.y, fb.y, easeBack(m, .45)), h: mix(across, fb.h * fill, e),
      yaw: mix(YAW_GLASS + TURN_ACROSS, (+shot.dataset.yaw || 0) - 2 * Math.PI, e), pitch: mix(.1, +shot.dataset.pitch || 0, e), explode: 0 };
  }

  // a highlight's laptop: 40% of the window wide, a little in from its side, turned towards the text
  const stage = site.querySelector('.ow-stage');
  function featurePose(f){
    const left = f.dataset.side === 'left';
    return { x: W * (left ? .28 : .72), y: H * (.5 + (+f.dataset.y || 0)), w: W * .47, yaw: left ? .3 : -.3, left };   // .47: the model spans about 40% once turned
  }

  // the callouts' arrows: from beside each line of text to the part of the client's site it's about, drawn in once
  // the text has arrived. Points on the site are found by selector and carried through the glass's transform.
  const NS = 'http://www.w3.org/2000/svg', arrows = document.createElementNS(NS, 'svg');
  arrows.classList.add('ow-arrows');
  layer.append(arrows);
  const marks = new Map();   // callout li -> { path, dot }
  for(const li of site.querySelectorAll('.ow-callouts li')){
    const path = document.createElementNS(NS, 'path'), dot = document.createElementNS(NS, 'circle');
    path.setAttribute('pathLength', 1); path.style.strokeDasharray = 1;
    dot.setAttribute('r', 4);
    arrows.append(path, dot);
    marks.set(li, { path, dot });
  }
  const pt = new THREE.Vector3();
  function drawArrows(now, show){
    const doc = shownFrame().contentDocument;
    marks.forEach(m => { m.path.style.opacity = m.dot.style.opacity = 0; });
    if(!show || !doc || onNow < 0) return;
    const f = features[onNow], left = f.dataset.side === 'left';
    scene.updateMatrixWorld(); camera.updateMatrixWorld();
    [...f.querySelectorAll('.ow-callouts li')].forEach((li, n) => {
      const el = doc.querySelector(li.dataset.point), m = marks.get(li);
      if(!el) return;
      const r = el.getBoundingClientRect();   // in the site's own window (1280 x 890), as it sits on the glass
      pt.set(r.left + r.width / 2 - 640, 445 - (r.top + r.height / 2), 0).applyMatrix4(glassObj.matrixWorld).project(camera);
      const tx = (pt.x + 1) / 2 * W, ty = (1 - pt.y) / 2 * H;
      const lr = li.getBoundingClientRect(), sx = left ? lr.left - 16 : lr.right + 16, sy = lr.top + 11;
      const drawn = settledAt === null ? 0 : clamp((now - settledAt - 650 - n * 280) / 700) * show;
      m.path.setAttribute('d', `M${sx},${sy} C${(sx + tx) / 2},${sy} ${(sx + tx) / 2},${ty} ${tx},${ty}`);
      m.path.style.strokeDashoffset = 1 - drawn;
      m.path.style.opacity = drawn > 0 ? 1 : 0;
      m.dot.setAttribute('cx', tx); m.dot.setAttribute('cy', ty);
      m.dot.style.opacity = clamp(drawn * 4 - 3);   // the dot lands as the line arrives
    });
  }

  // the photo a callout with data-enlarge points at: once its highlight rests, clicking it on the laptop's screen (or
  // clicking its callout) lifts it out of the glass to fill the window, like the client's own lightbox does. A click,
  // Esc, the wheel or moving on puts it back.
  const lb = document.createElement('div');
  lb.className = 'ow-lb'; lb.hidden = true;
  lb.innerHTML = '<img alt=""><p></p>';
  document.body.append(lb);
  const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('p'), BG = 'rgba(9,9,11,.92)', BG0 = 'rgba(9,9,11,0)';
  let lbFrom = null, lbBusy = false;
  const cropBox = el => el.closest('.ph') ?? el;   // the photo's visible frame on their site (photos are cropped to fit)
  function glassRect(el){   // el's box on their site, carried through the glass to the window (the box around its corners)
    scene.updateMatrixWorld(); camera.updateMatrixWorld();
    const r = el.getBoundingClientRect(), xs = [], ys = [];
    for(const [x, y] of [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]]){
      pt.set(x - 640, 445 - y, 0).applyMatrix4(glassObj.matrixWorld).project(camera);
      xs.push((pt.x + 1) / 2 * W); ys.push((1 - pt.y) / 2 * H);
    }
    const left = Math.min(...xs), top = Math.min(...ys);
    return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
  }
  // the transform + crop that sit the full photo exactly over the cropped one on the glass (as on their site)
  function flip(from, to){
    const k = Math.max(from.width / to.width, from.height / to.height), fx = from.left + from.width / 2, fy = from.top + from.height / 2;
    const ix = (to.width - from.width / k) / 2, iy = (to.height - from.height / k) / 2;
    return { transform: `translate(${fx - to.left - to.width / 2}px,${fy - to.top - to.height / 2}px) scale(${k})`, clipPath: `inset(${iy}px ${ix}px round ${4 / k}px)` };
  }
  const FULL = { transform: 'none', clipPath: 'inset(0px 0px round 3px)' };
  function enlargeable(){
    if(settledAt === null || onNow < 0 || pick !== 'site') return null;
    const li = features[onNow].querySelector('.ow-callouts li[data-enlarge]'), el = li && shownFrame().contentDocument?.querySelector(li.dataset.point);
    return el ? { li, el } : null;
  }
  function openLb(el){
    if(lbBusy || !lb.hidden) return;
    const from = glassRect(cropBox(el));
    lbImg.src = el.currentSrc || el.src;
    lbCap.textContent = el.closest('figure')?.querySelector('figcaption')?.textContent ?? el.alt;
    lbFrom = el;
    lbImg.decode().catch(() => {}).then(() => {
      lb.hidden = false;
      el.style.visibility = 'hidden';   // the photo leaves the screen, rather than a copy flying out of it
      if(reduceMotion) return;
      const ease = { duration: 800, easing: 'cubic-bezier(.2,.7,.2,1)' };
      lbImg.animate([flip(from, lbImg.getBoundingClientRect()), FULL], ease);
      lb.animate([{ backgroundColor: BG0 }, { backgroundColor: BG }], ease);
      lbCap.animate([{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1 }], ease);
    });
  }
  function closeLb(){
    if(lb.hidden || lbBusy) return;
    const el = lbFrom, done = () => { lb.hidden = true; el.style.visibility = ''; lbBusy = false; };
    if(reduceMotion){ done(); return; }
    lbBusy = true;
    const ease = { duration: 460, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' };
    const anims = [
      lbImg.animate([FULL, flip(glassRect(cropBox(el)), lbImg.getBoundingClientRect())], ease),
      lb.animate([{ backgroundColor: BG }, { backgroundColor: BG0 }], ease),
      lbCap.animate([{ opacity: 1 }, { opacity: 0 }], { ...ease, duration: 200 }),
    ];
    Promise.all(anims.map(a => a.finished)).then(() => { anims.forEach(a => a.cancel()); done(); });
  }
  const overPhoto = e => {
    const t = enlargeable();
    if(!t) return null;
    if(e.target.closest?.('li[data-enlarge]') === t.li) return t;
    const r = glassRect(cropBox(t.el));
    return e.clientX >= r.left && e.clientX <= r.left + r.width && e.clientY >= r.top && e.clientY <= r.top + r.height ? t : null;
  };
  addEventListener('click', e => {
    if(!lb.hidden) closeLb();
    else { const t = overPhoto(e); if(t) openLb(t.el); }
  });
  addEventListener('mousemove', e => { document.documentElement.style.cursor = lb.hidden && overPhoto(e) ? 'zoom-in' : ''; }, { passive: true });
  addEventListener('wheel', closeLb, { passive: true });
  addEventListener('keydown', e => {
    if(e.key === 'Escape') closeLb();
    const t = (e.key === 'Enter' || e.key === ' ') && e.target.matches?.('li[data-enlarge]') && enlargeable();
    if(t && e.target === t.li){ e.preventDefault(); openLb(t.el); }
  });
  site.querySelectorAll('.ow-callouts li[data-enlarge]').forEach(li => { li.tabIndex = 0; li.setAttribute('role', 'button'); });

  // ===== the websites backdrop: a drifting band of light in the three main colours on the laptop's screen, drawn at
  // 1/16 size and scaled up in chunky pixels like the landing's light, with CRT scan lines over it (.ow-scan, in CSS). Each highlight gets its own band (angle, curve, position), picked at random but the
  // same every visit, and the band glides from one to the next as the laptop moves.
  const backdrop = site.querySelector('.ow-backdrop'), backdropWrap = backdrop.parentElement, BG_PX = 16, bgGl = new THREE.WebGLRenderer({ canvas: backdrop });
  const bgScene = new THREE.Scene(), bgCam = new THREE.Camera(), shade = { value: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()] };
  const bgMat = new THREE.ShaderMaterial({
    uniforms: { uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uCol: shade, uBand: { value: new THREE.Vector4() }, uSeed: { value: 0 } },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      uniform vec2 uRes; uniform float uTime, uSeed; uniform vec3 uCol[4]; uniform vec4 uBand;   // band: angle, offset, curve, width
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for(int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= .5; } return v; }
      void main(){
        vec2 px = gl_FragCoord.xy, p = (px - .5 * uRes) / uRes.y;   // centred; the window's height is 1
        float ca = cos(uBand.x), sa = sin(uBand.x);
        vec2 q = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);
        q += (vec2(fbm(q * 1.3 + uTime * .035 + uSeed), fbm(q * 1.3 - uTime * .03 + uSeed + 7.)) - .5) * .4;   // slow drifting warp
        float d = (q.y - (uBand.y + uBand.z * q.x * q.x)) / uBand.w;   // across the band
        float glow = d > 0. ? exp(-d * d * 2.5) : exp(d * .8);          // a crisp bright edge, a long soft glow behind it
        float core = exp(-d * d * 10.);
        float along = clamp(.5 + q.x * .5 + (fbm(q * 2. + uSeed) - .5) * .5, 0., 1.);
        vec3 col = mix(mix(uCol[1], uCol[2], along), uCol[3], core * .35);
        vec3 c = col * glow * (.45 + .2 * fbm(q * 3. + uTime * .04));   // kept dim: a glow in a dark room, not a light show
        gl_FragColor = vec4(uCol[0] + c, 1.);
      }`,
    depthTest: false,
  });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  // each highlight's band, from a little seeded random: neighbours lean opposite ways and sit on opposite sides
  const bands = features.map((f, n) => {
    let r = (n + 1) * 9301 % 233280;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const side = n % 2 ? 1 : -1;
    return new THREE.Vector4(side * (.35 + rnd() * .7), side * (.08 + rnd() * .22), (rnd() < .5 ? -1 : 1) * (.35 + rnd() * .8), .16 + rnd() * .14);
  });
  let colourGoal = null, sampledAt = -1e9;
  function drawBackdrop(now, dt){
    const r = site.getBoundingClientRect();
    if(r.bottom < 0 || r.top > innerHeight) return;
    const w = Math.ceil(backdrop.clientWidth / BG_PX), h = Math.ceil(backdrop.clientHeight / BG_PX);
    if(backdrop.width !== w || backdrop.height !== h){ bgGl.setSize(w, h, false); bgMat.uniforms.uRes.value.set(w, h); }
    // fades in as the section comes up, so it never arrives as a hard edge under the landing
    const entry = easeCubic(clamp(1 - r.top / innerHeight));
    backdropWrap.style.opacity = entry;
    backdropWrap.style.setProperty('--edge', `${(1 - entry) * 45}vh`);   // and its top edge melts away until it's in
    if(now - sampledAt > 500){ colourGoal = screenColours() ?? colourGoal; sampledAt = now; }   // what's on screen now
    if(colourGoal) shade.value.forEach((c, n) => c.lerp(colourGoal[n], reduceMotion ? 1 : 1 - Math.exp(-dt / .7)));   // eases across
    const ch = chapter();
    bgMat.uniforms.uBand.value.lerpVectors(bands[ch.i], bands[ch.j], easeCubic(ch.u));
    bgMat.uniforms.uSeed.value = mix(ch.i, ch.j, easeCubic(ch.u)) * 3.7;
    bgMat.uniforms.uTime.value = reduceMotion ? 0 : now / 1000;
    bgGl.render(bgScene, bgCam);
  }

  // the ways the laptop gets from one highlight to the next (a highlight's data-move): how high it arcs, how much it
  // swells towards you, how far it banks into the move, and what extra turn it makes (k: 0 to 1 through the turn)
  const MOVES = {
    spin:    { rise: .05, swell: .12, bank: .06, turn: k => Math.PI * 2 * k },          // a full 360
    quarter: { rise: .07, swell: .06, bank: .1,  turn: k => Math.PI / 2 * Math.sin(Math.PI * k) },   // turns a quarter away and back
    slide:   { rise: .09, swell: .04, bank: .14, turn: () => 0 },                        // just glides across, in an arc
  };
  const easeBack = (t, c = .9) => {   // in-out with a small pull-back at the start and overshoot at the end (c: how much)
    const d = c * 1.525;
    return t < .5 ? (2 * t) ** 2 * ((d + 1) * 2 * t - d) / 2 : ((2 * t - 2) ** 2 * ((d + 1) * (t * 2 - 2) + d) + 2) / 2;
  };

  let W = 0, H = 0, lastNow = 0, glideSite = null;
  function frameLoop(now){
    requestAnimationFrame(frameLoop);
    const t = reduceMotion ? 0 : now / 1000, dt = Math.min(.1, (now - lastNow) / 1000 || 0);
    lastNow = now;
    // follow the scroll with a short lag, so it glides (reduced motion: straight to it)
    const follow = (now, goal) => now === null || reduceMotion ? goal : now + (goal - now) * (1 - Math.exp(-dt / .14));
    if(pick === 'site'){
      if(glideC === null) smoothC = follow(smoothC, rawC());
      glideSite = follow(glideSite, clamp(scrollY / Math.max(1, scrollY + site.getBoundingClientRect().top)));
      syncSite(); drawBackdrop(now, dt);
    }
    if(pick === 'pc'){
      smoothPcP = follow(smoothPcP, rawPcP());
      syncPc();
    }
    if(innerWidth !== W || innerHeight !== H){
      W = innerWidth; H = innerHeight;
      gl.setPixelRatio(Math.min(devicePixelRatio, 2));
      gl.setSize(W, H); css.setSize(W, H);
      camera.aspect = W / H;
      camera.position.set(0, 0, H / 2 / Math.tan(THREE.MathUtils.degToRad(15)));
      camera.updateProjectionMatrix();
    }
    for(const [key, rig, phase] of [['site', laptop, 0], ['pc', tower, 2]]){
      const sec = key === 'site' ? site : pc, a = box(heroSlot[key]);
      // k: 0 on the landing, 1 once its section's stage pins (the picked one flies across; the other stays behind)
      const top = sec.getBoundingClientRect().top;
      const k = pick === key ? (reduceMotion ? +(top <= 0) : ease(key === 'site' ? glideSite ?? 0 : clamp(scrollY / Math.max(1, scrollY + top)))) : 0;   // smoothed, so wheel steps don't judder
      let b = a, yaw = 0, bump = 0, tilt = 0, bank = 0;
      if(key === 'site' && k > 0){
        // the highlight it's on, or partway between two, moving the way the next one's data-move says
        const ch = chapter(), A = featurePose(features[ch.i]), B = featurePose(features[ch.j]);
        const move = MOVES[features[ch.j].dataset.move] ?? MOVES.slide;
        const lift = Math.min(0, stage.getBoundingClientRect().top);   // past the end, it rides the stage up the page
        // soft in, soft out, with a little overshoot that settles; the turn starts a beat after the move (overlap)
        const go = easeBack(ch.u), turn = easeCubic(clamp((ch.u - .1) / .9)), arc = Math.sin(Math.PI * ch.u);
        b = { x: mix(A.x, B.x, go), y: mix(A.y, B.y, go) - arc * H * move.rise + lift, w: mix(A.w, B.w, go) };
        yaw = mix(A.yaw, B.yaw, turn) + move.turn(turn);
        bump = arc * move.swell;
        tilt = arc * .1;
        bank = -Math.sign(B.x - A.x) * arc * move.bank;   // leans into the way it's going
      } else if(k > 0) b = box(shot);
      const pop = Math.sin(Math.PI * k);
      const x = mix(a.x, b.x, k), y = mix(a.y, b.y, k) + Math.sin(t * 1.3 + phase) * 8 * (1 - k);   // floats on the landing
      const sway = Math.sin(t * .6 + phase) * .1 * (1 - k);
      rig.position.set(x - W / 2, H / 2 - y, 0);
      if(key === 'site'){
        rig.scale.setScalar(mix(a.w, b.w, k) / ACROSS * (1 + .2 * pop + .12 * bump));   // swells a little mid-spin, like it's coming at you
        rig.rotation.set(.22 + .25 * pop + tilt, mix(-.38 + sway, yaw, k), -.08 * pop + bank);   // tips up as it pops out
        drawArrows(now, pick === 'site' && k > .995 ? clamp(1 - chapter().e * 7) : 0);   // not k === 1: the smoothed fly-in takes seconds to reach exactly 1
        if(!lb.hidden && !enlargeable()) closeLb();
      } else {
        const P = pick === 'pc' ? smoothPcP ?? -1 : -1, p = pcPose(a, P, sway), go = clamp(P + 1);
        // on a clicked part: bigger, and shifted so the part sits left of its tag (blended while moving between two)
        pcHold = pick === 'pc' && !pcSkip && P > OPEN1 - .05 && P < CLOSE0;
        if(!pcHold && pcFocus.b) focusOn(null);
        const ft = focusT(), fa = pcFocus.a, fb = pcFocus.b, wa = fa ? 1 - ft : 0, wb = fb ? ft : 0;
        pcZoom = clamp(wa + wb);
        hint.classList.toggle('is-on', pcHold);
        const say = fb ? 'click anywhere to step back' : 'click a part to look closer';
        if(hint.textContent !== say) hint.textContent = say;
        const zoom = 1 + wa * ((tagOf[fa]?.L.zoom ?? 1) - 1) + wb * ((tagOf[fb]?.L.zoom ?? 1) - 1);
        const pull = n => tagOf[n]?.L.stay ? 0 : 1;   // how much the camera moves onto it
        rig.position.set(p.x - W / 2, H / 2 - (p.y + Math.sin(t * 1.3 + phase) * 8 * (1 - go)), 0);
        rig.scale.setScalar(p.h / .445 * zoom);   // .445: the model's height
        rig.rotation.set(p.pitch, p.yaw, 0);
        explodePc(p.explode);
        pcOpen = p.explode;
        camera.updateMatrixWorld();
        if(wa * pull(fa) + wb * pull(fb) > 0){   // exact: the point under FOCUS at the part's own depth, and the model moved across by the difference
          rig.updateMatrixWorld(true);
          let dx = 0, dy = 0;
          for(const [n, w] of [[fa, wa * pull(fa)], [fb, wb * pull(fb)]]) if(w){
            const A = tagOf[n].part.userData.anchor.getWorldPosition(new THREE.Vector3()), z = A.clone().project(camera).z;
            const goal = new THREE.Vector3(.34 * 2 - 1, 1 - .52 * 2, z).unproject(camera);
            dx += w * (goal.x - A.x); dy += w * (goal.y - A.y);
          }
          rig.position.x += dx; rig.position.y += dy;
        }
        rig.updateMatrixWorld(true);
        drawTags(now, pick === 'pc' && !pcSkip && p.explode > 0, fa, wa, fb, wb);
        chromeArgs = [now, rig.position.x + W / 2, H / 2 - rig.position.y, rig.rotation.y, pick === 'pc' && !pc.hidden ? clamp((P + 1) / .1) * (1 - .8 * pcSeep) : 0, Math.max(0, hero.getBoundingClientRect().bottom)];
        fadePc(pick === 'pc' ? clamp(pcSeep * 1.6 - .3) : 0);   // gone a little before the photo has fully soaked in
        pcMats.forEach(m => { if(m.userData.transparent) m.opacity *= 1 - .85 * p.explode; });   // the glass clears while it's open, so it doesn't hide the parts
        rgb.forEach(m => { m.emissiveIntensity = m.userData.glow * (.6 + .4 * go); });
        const fade = 1 - (pick === 'pc' ? clamp(pcSeep * 1.6 - .3) : 0), px = pcFit.getWorldScale(pcScale).x;   // the RGB's light reaches as far on screen as it would in the case
        pcGlow.forEach(l => { l.distance = l.userData.range * px; l.intensity = l.userData.k * fade; });
      }
      const l = lights[key];
      l.position.set(rig.position.x, rig.position.y + 200, 1600);
      const near = Math.exp(-(((spotAt.x - a.x) / Math.max(100, (spotAt.r ?? 200) * .5)) ** 2));   // how close the landing's spotlight is
      l.intensity = (k > 0 ? 6 : .3 + (pick === key ? 7 : 4) * near) * (key === 'pc' ? 1 - .45 * pcOpen : 1);   // softer on the PC while it's open: the black parts read as black
      if(key === 'site') screenEl.style.filter = `brightness(${k > 0 ? 1 : .35 + .65 * Math.min(1, l.intensity / 4)})`;   // the HTML screen isn't lit by WebGL
    }
    const hr = hero.getBoundingClientRect();
    // the front light: drifts between the thirds while nothing is picked, then settles on the picked one
    // (over LinkedIn / GitHub while one is hovered: the pool on the wall comes down onto it)
    const slots = Object.values(heroSlot).map(el => el.getBoundingClientRect()), lit = spotOn?.getBoundingClientRect();
    const mid = (Math.min(...slots.map(s => s.top)) + Math.max(...slots.map(s => s.bottom))) / 2 - hr.top;
    const want = lit ? { x: lit.left + lit.width / 2, r: Math.max(140, lit.width * .75), y: lit.top + lit.height / 2 - hr.top }
      : pick ? { x: box(heroSlot[pick]).x, r: box(heroSlot.site).w * .6, y: mid }   /* the same size of light on either: the laptop's slot is the wider one */ : { x: hr.left + hr.width * (.5 + .2 * Math.sin(t * .35)), r: hr.width * .16, y: mid };
    const glideBy = lit ? .1 : .04;   // quicker onto a link, so it follows the pointer
    spotAt.x += (want.x - spotAt.x) * glideBy; spotAt.r = (spotAt.r ?? want.r) + (want.r - (spotAt.r ?? want.r)) * glideBy;
    // spreading out from the links over the whole window (soft in and out): a disc of the spotlight's own light whose
    // edge stays a few blocks wide, so it shows the same chunky pixels as it grows
    spotAt.flood = floodAt === null ? 0 : (1 - Math.cos(Math.PI * clamp((now - floodAt) / 1000 / FLOOD_SECS))) / 2 * Math.hypot(W, H) * 1.05;
    spotAt.y = (spotAt.y ?? want.y) + (want.y - (spotAt.y ?? want.y)) * glideBy;
    spotAt.foot = (spotAt.foot ?? 0) + (+!!lit - (spotAt.foot ?? 0)) * glideBy;   // 1 while it's down on the links: the floor pool goes
    if(hr.bottom > 0) drawLight(hr, slots);
    gl.render(scene, camera);
    if(chromeArgs) drawChrome(...chromeArgs);   // after the render: its floor mirrors this frame's PC
    css.render(scene, camera);
  }
  requestAnimationFrame(frameLoop);
}).catch(() => { /* the model didn't load: the buttons and sections still work */ });
