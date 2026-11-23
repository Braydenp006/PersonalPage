// The homepage: one screen. Every word comes from about-data.js; this file only
// shows it. The 3D figure is me3d.js.
import { ME, LIVE, PLACES, EQUIPMENT, JOURNAL } from './about-data.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rows = list => list.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

// ===== ME =====
$('char-name').textContent = ME.name;
$('char-role').textContent = `${ME.role} · ${ME.school}`;
$('char-status').textContent = ME.status;
$('facts').innerHTML = rows(ME.facts);
// what I'm after, as symbols lit on the sign
$('marks').innerHTML = ME.marks.map(([label, ic]) => `<li><span class="mark"><span class="icon" style="--icon:url(assets/icons/${ic}.svg)" aria-hidden="true"></span></span>${esc(label)}</li>`).join('');
// live stats: a value, or a dash until its server script exists
$('counters').innerHTML = rows(LIVE.map(s => [s.label, s.value ?? '–']));
// the Links box: each with its logo (Simple Icons paths for GitHub and LinkedIn, CC0; an envelope for email)
const LOGOS = {
  github: 'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3',
  linkedin: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z',
  resume: 'M6 2h9l5 5v15H6zm8 1.5V8h4.5M9 12h8M9 15h8M9 18h5',
  mailto: 'M2 4h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v.5l10 6.25L22 6.5V6H2zm20 2.86-10 6.25L2 8.86V18h20V8.86z',
};
const logo = href => { const k = Object.keys(LOGOS).find(k => href.includes(k)); return k ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${LOGOS[k]}"/></svg>` : ''; };
const SITE_COLOUR = { github: '#0d1117', linkedin: '#f4f2ee', resume: '#050706' };   // what each site opens onto, for the leaving transition
$('contact').innerHTML = ME.contact.map(([label, href]) => {
  const to = Object.entries(SITE_COLOUR).find(([k]) => href.includes(k))?.[1];
  return `<li><a href="${esc(href)}"${to ? ` data-to="${to}"` : ''}>${logo(href)}${esc(label)}</a></li>`;
}).join('');

// ===== EQUIPMENT (a row of slots per group) and hobbies (one row, under Stats), sharing one readout, like an item's inspect panel =====
const icon = it => it.icon ? `<span class="icon" style="--icon:url(assets/icons/${it.icon}.svg)" aria-hidden="true"></span>`
  : `<span class="icon initials" aria-hidden="true">${esc(it.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2))}</span>`;
const things = [...EQUIPMENT, ...JOURNAL.map(j => ({ name: j.title, group: j.kind, icon: j.icon, text: j.text }))];
const slot = (it, i) => `<button type="button" class="pick" data-i="${i}" aria-label="${esc(it.name)}">${icon(it)}</button>`;
const groups = [...new Set(EQUIPMENT.map(it => it.group))];
$('slots').innerHTML = groups.map(g => `<div class="gear-row" role="group" aria-label="${esc(g)}"><span class="gear-group" aria-hidden="true">${esc(g)}</span><div class="gear-slots">${
  things.map((it, i) => i < EQUIPMENT.length && it.group === g ? slot(it, i) : '').join('')}</div></div>`).join('');
$('hobbies').innerHTML = things.map((it, i) => i >= EQUIPMENT.length ? slot(it, i) : '').join('');
const picks = [...document.querySelectorAll('.pick')], readout = $('item-card');
let shown = null;
const describe = b => {
  if(b === shown) return;
  shown = b;
  picks.forEach(x => x.setAttribute('aria-pressed', x === b));
  const it = things[b.dataset.i];
  readout.innerHTML = `<span class="readout-icon">${icon(it)}</span><span class="readout-head"><b>${esc(it.name)}</b><span>${esc(it.group)}</span></span><p>${esc(it.text)}</p>`;
  if(!reduceMotion) readout.animate({ opacity: [.35, 1], transform: ['translateY(4px)', 'none'] }, { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' });
};
for(const box of [$('slots'), $('hobbies')]) for(const ev of ['click', 'focusin', 'mouseover'])
  box.addEventListener(ev, e => { const b = e.target.closest('.pick'); if(b) describe(b); });
describe(picks[0]);
$('commits').innerHTML = '<i></i>'.repeat(7 * 40);   // an empty chart until GitHub is connected

// ===== WORK: places as a timeline (and as numbered pins on the map). Work is numbered; school isn't =====
let n = 0;
const places = PLACES.map(p => ({ ...p, label: p.kind === 'work' ? String(++n) : '' }));
const details = p => `<p class="job-when">${p.label ? `<span class="job-num">${p.label}</span>` : '<span class="job-num school"></span>'}${esc(p.dates)}</p>
  <h3>${esc(p.role)} <span>· ${esc(p.place)}</span></h3><p class="job-where">${esc(p.where)}</p>
  ${p.did.length ? `<ul>${p.did.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}`;   // `did` can be empty

const quest = (p, i) => `<button type="button" class="quest${/present/i.test(p.dates) ? ' active' : ''}" data-i="${i}"><b>${p.label ? `${p.label} · ` : ''}${esc(p.role)}</b><span>${esc(p.place)} · ${esc(p.dates)}</span></button>`;
const ongoing = p => /present/i.test(p.dates);   // still going: listed under Now
$('quests').innerHTML = `<h3 class="quest-head">Now</h3>
  <p class="quest active"><b>Find a co-op</b><span>4 months, starting May 2027</span></p>` +
  places.map((p, i) => ongoing(p) ? quest(p, i) : '').join('') +
  '<h3 class="quest-head">Before</h3>' + places.map((p, i) => ongoing(p) ? '' : quest(p, i)).join('');
$('quests').addEventListener('click', e => {
  const q = e.target.closest('button.quest');
  if(q) openPlace(places[q.dataset.i], q);
});

// the window: the pin (or timeline entry) that opened it swells into it, a circle growing into the whole window,
// and on closing it shrinks back down into that pin
const win = $('place'), winBody = $('place-body');
let from = null, closing = false;
function openPlace(p, opener){
  winBody.innerHTML = (p.photo ? `<figure class="place-photo"><img src="${esc(p.photo)}" alt="${esc(p.alt ?? '')}">${p.credit ? `<figcaption>Photo: ${esc(p.credit)}</figcaption>` : ''}</figure>` : '') +
    `<div class="place-text">${details(p)}</div>`;
  win.classList.toggle('no-photo', !p.photo);
  winBody.querySelector('img')?.addEventListener('error', () => {   // photo file not there (yet): show the details alone
    winBody.querySelector('figure').remove();
    win.classList.add('no-photo');
  });
  win.showModal();
  from = opener;
  p.pin?.classList.add('on');   // its map pin fills in while the window is open
  win.dataset.i = places.indexOf(p);
  if(reduceMotion) return;
  win.animate([pinShape(), whole()], { duration: 460, easing: 'cubic-bezier(.3,.7,.2,1)' });
  win.animate({ opacity: [0, 1] }, { duration: 460, easing: 'ease-out', pseudoElement: '::backdrop' });   // the tint fades in
}
// the window drawn as its pin: moved onto it, scaled down, cut to a pin-sized rounded square in its middle; it grows by
// the cut opening out and squaring off (a rounded rectangle all the way, so no curved edge sweeps across the window)
const S = .3;
function pinShape(){
  const r = from.getBoundingClientRect(), w = win.getBoundingClientRect(), d = Math.min(r.width, r.height) / S;
  const x = Math.max(0, (win.offsetWidth - d) / 2), y = Math.max(0, (win.offsetHeight - d) / 2);
  return { transform: `translate(${r.left + r.width / 2 - (w.left + w.width / 2)}px,${r.top + r.height / 2 - (w.top + w.height / 2)}px) scale(${S})`,
    clipPath: `inset(${y}px ${x}px round ${d / 2}px)`, opacity: .6 };
}
const whole = () => ({ transform: 'none', clipPath: 'inset(0px 0px round 0px)', opacity: 1 });
// closing (×, Escape, or a click on the dimmed backdrop): shrink back, then close
async function shut(){
  if(closing) return;
  closing = true;
  if(!reduceMotion){
    win.animate({ opacity: [1, 0] }, { duration: 460, easing: 'ease-in', fill: 'forwards', pseudoElement: '::backdrop' });   // the tint fades out
    await win.animate([whole(), pinShape()], { duration: 460, easing: 'cubic-bezier(.6,0,.6,1)', fill: 'forwards' }).finished;
  }
  win.close();
  places[win.dataset.i]?.pin?.classList.remove('on');
  document.getAnimations().forEach(a => a.effect?.target === win && a.cancel());   // drop the shrunken pose and faded tint
  closing = false;
  from.focus?.();   // keyboard users land back where they opened it
}
win.addEventListener('cancel', e => { e.preventDefault(); shut(); });   // Escape
win.addEventListener('click', e => { if(e.target === win) shut(); });  // the dimmed backdrop
win.querySelector('.place-close').addEventListener('click', e => { e.preventDefault(); shut(); });   // ×

// the map: MapLibre drawing OpenFreeMap's OpenStreetMap data in the lab style from assets/map/lab-style.json
// (made by assets/map/make-style.py; or edit one in Maputnik). Without MapLibre, the box shows the timeline instead.
function buildMap(){
  const ml = window.maplibregl, mapEl = $('work-map');
  if(!ml){ $('map-hole').remove(); return; }   // Expand still opens the timeline
  const map = new ml.Map({
    container: mapEl,
    style: 'assets/map/lab-style.json',   // the page's greys, blue and orange (assets/map/make-style.py)
    bounds: allPins = places.reduce((b, p) => b.extend([p.at[1], p.at[0]]), new ml.LngLatBounds()),   // MapLibre wants [lng, lat]
    fitBoundsOptions: { padding: 50 },
    maxBounds: [[-82.5, 41.5], [-73.5, 46.6]],   // southern Ontario, Toronto to Kingston, with room for a tall phone-width map to zoom out
    minZoom: 5.5,   // low enough that a phone-width map fits Newmarket and Kingston
    dragRotate: false, pitchWithRotate: false, touchPitch: false,   // keep it flat, like a paper map
    attributionControl: { compact: true },
  });
  map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-left');
  map.touchZoomRotate.disableRotation();
  // pins: real buttons, so Tab reaches them and Enter opens them
  for(const p of places){
    const pin = p.pin = document.createElement('button');
    pin.type = 'button';
    pin.className = `job-pin ${p.kind}`;
    pin.textContent = p.label;
    pin.dataset.name = p.place;   // shown beside the pin on hover / focus (styles.css)
    const side = () => {   // near the map's right edge, put the name on the left so it isn't cut off
      const r = pin.getBoundingClientRect(), m = mapEl.getBoundingClientRect();
      pin.classList.toggle('flip', r.right > m.right - 260);
    };
    pin.addEventListener('pointerenter', side);
    pin.addEventListener('focus', side);
    pin.addEventListener('click', e => { e.stopPropagation(); openPlace(p, pin); });
    p.marker = new ml.Marker({ element: pin }).setLngLat([p.at[1], p.at[0]]).addTo(map);
    pin.setAttribute('aria-label', `${p.kind === 'work' ? `${p.label}: ` : ''}${p.role}, ${p.place}`);   // after: Marker labels it "Map marker"
  }
  // pins closer than a pin's width (Newmarket has four) fan out in a small ring around their spot, so each can be clicked
  const spread = () => {
    const at = places.map(p => map.project([p.at[1], p.at[0]])), done = new Set();
    places.forEach((p, i) => {
      if(done.has(i)) return;
      const near = places.map((_, j) => j).filter(j => !done.has(j) && at[i].dist(at[j]) < 34);
      near.forEach(j => done.add(j));
      const r = near.length > 1 ? Math.max(18, 34 / (2 * Math.sin(Math.PI / near.length))) : 0;   // neighbours 34px apart round the ring
      near.forEach((j, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / near.length; places[j].marker.setOffset([r * Math.cos(a), r * Math.sin(a)]); });
    });
  };
  map.on('zoom', spread);
  map.once('load', () => { map.fitBounds(allPins, { padding: 40, duration: 0 }); spread(); });   // fit again once laid out: on a phone the box isn't its final size when the map is made
  mapEl.insertAdjacentHTML('beforeend', '<div class="map-legend"><span><i class="job-pin work"></i>Work</span><span><i class="job-pin school"></i>School</span></div>');
  return map;
}

let map, allPins;
map = buildMap();

// Expand: the map moves out of its card into the big panel over the page (the timeline beside it), and the panel is
// uncovered from exactly where the small map was, so it seems to grow out of it; Close, Escape or a click on the dimmed
// page reverses it. The map is resized once, before the reveal (resizing every frame was choppy). While small, the
// whole panel is slid over so its map's middle sits on the small map's middle: then the cut-out only ever shows map
// (not a strip of the panel's heading, which was the jump at the end of closing) and the small view is simply the
// big map's centre, so it lines up at both ends. The card's own frame stays put the whole time.
const big = $('map-big'), hole = $('map-hole'), spot = $('map-spot'), grow = $('map-grow'), shrink = $('map-shrink'), mapEl = $('work-map');
const dimmer = document.createElement('div');
dimmer.className = 'map-dim';
document.body.append(dimmer);
let open = false, moving = false, small;   // small: the small map's view
const mid = r => [r.left + r.width / 2, r.top + r.height / 2];
const WHOLE = { transform: 'translate(0px, 0px)', clipPath: 'inset(0px 0px 0px 0px)' };
function shrunk(r){   // the panel slid so its map centres on rectangle r, and cut down to r (measured with the panel unmoved)
  const b = big.getBoundingClientRect(), [mx, my] = mid((hole && mapEl.isConnected ? mapEl : big).getBoundingClientRect()), [hx, hy] = mid(r);
  const dx = hx - mx, dy = hy - my;
  return { transform: `translate(${dx}px, ${dy}px)`,
    clipPath: `inset(${r.top - dy - b.top}px ${b.right - (r.right - dx)}px ${b.bottom - (r.bottom - dy)}px ${r.left - dx - b.left}px)` };
}
// CSS's cubic-bezier(x1,y1,x2,y2) as a function of time, so the map's glide matches the panel's
function bezier(x1, y1, x2, y2, t){
  const f = (a, b, u) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  let lo = 0, hi = 1, u = t;
  for(let i = 0; i < 20; i++){ u = (lo + hi) / 2; if(f(x1, x2, u) < t) lo = u; else hi = u; }
  return f(y1, y2, u);
}
console.assert(Math.abs(bezier(.45, 0, .2, 1, 0)) < 1e-6 && Math.abs(bezier(.45, 0, .2, 1, 1) - 1) < 1e-3 && Math.abs(bezier(0, 0, 1, 1, .3) - .3) < 1e-3, 'bezier');
const drawn = () => new Promise(done => { map?.once('idle', done); setTimeout(done, 150); });   // shortcut: tiles get 150ms to draw, then it goes anyway
async function expand(on){
  if(moving || on === open) return;
  moving = true;
  open = on;
  grow.setAttribute('aria-expanded', on);
  document.querySelectorAll('footer, .me > :not(.map-big)').forEach(el => el.inert = on);
  document.documentElement.style.overflow = on ? 'hidden' : '';
  const r = (hole ?? grow).getBoundingClientRect(), time = reduceMotion ? 0 : 560;
  mapEl.classList.add('quiet');   // its buttons and key sit in the big map's corners, outside the cut-out: hidden while it moves
  if(on){
    if(map) small = { center: map.getCenter(), zoom: map.getZoom() };
    big.hidden = false;
    if(map){ spot.append(mapEl); map.resize(); map.jumpTo(small); }
    const from = shrunk(r);
    Object.assign(big.style, from);   // held at the small map's spot while the map draws its new edges
    if(map) await drawn();
    dimmer.classList.add('on');
    await big.animate([from, WHOLE], { duration: time, easing: 'cubic-bezier(.6,0,.2,1)' }).finished;
    big.style.transform = big.style.clipPath = '';
    mapEl.classList.remove('quiet');
    shrink.focus();
    map?.fitBounds(allPins, { padding: 120, duration: reduceMotion ? 0 : 800 });   // then frame all the pins
  } else {
    const to = shrunk(r);
    map?.easeTo({ ...small, duration: time, easing: t => bezier(.45, 0, .2, 1, t) });   // glide back to the small view, on the panel's curve
    dimmer.classList.remove('on');
    await big.animate([WHOLE, to], { duration: time, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' }).finished;
    // back in its card: draw it at once (a resized map is blank until its next frame)
    if(map){ hole.append(mapEl); map.resize(); map.jumpTo(small); map.redraw(); }
    big.hidden = true;
    big.getAnimations().forEach(a => a.cancel());
    mapEl.classList.remove('quiet');
    grow.focus({ preventScroll: true });
  }
  moving = false;
}
dimmer.addEventListener('click', () => expand(false));
grow.addEventListener('click', () => expand(true));
shrink.addEventListener('click', () => expand(false));
addEventListener('keydown', e => { if(e.key === 'Escape' && open && !win.open) expand(false); });


// Leaving for GitHub, LinkedIn or Home: a panel in the colour of where the link goes (data-to) grows out of the link to
// fill the screen, then that page loads behind it, so it opens instead of cutting straight over. (The page cards open
// like the homepage's photos instead, the real page growing out of the picture: home.js, which handles them first.) Links that open a
// new tab, email, new-tab clicks and reduced motion are left alone. Inside the homepage's window (home.js), Home is
// left to it too: it shrinks the window back into its photo.
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if(!a || reduceMotion || e.defaultPrevented || a.target || a.protocol === 'mailto:' || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  if(window !== top && /\/(index\.html)?$/.test(a.pathname) && a.origin === location.origin) return;
  e.preventDefault();
  const r = a.getBoundingClientRect(), cover = document.createElement('div');
  cover.className = 'page-cover';
  cover.style.background = a.dataset.to ?? 'var(--bg)';
  document.body.append(cover);
  cover.animate({ clipPath: [`inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`, 'inset(0)'] },
    { duration: 560, easing: 'cubic-bezier(.75,0,.2,1)', fill: 'forwards' }).finished.then(() => { top.location.href = a.href; });
});
addEventListener('pageshow', e => { if(e.persisted) document.querySelectorAll('.page-cover').forEach(c => c.remove()); });   // Back to here: lift it
