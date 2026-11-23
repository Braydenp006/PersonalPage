// The home page's teletext behaviour. Opening a page (the static, or the row-by-row draw) is home.js; this file is the rest:
// the header's page counter and clock, typing a number, the laptop's screen and its pages (the 3D laptop itself is
// laptop3d.js, the ASCII me on page 100 is head-ascii.js), the guide on the desk, the drawn Z420 and its live numbers.
import { watchStats } from './stats.js';
import { VARIANTS, GENERAL } from './resume-data.js';
import { PLACES } from './about-data.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);

// ===== The header: the page you asked for, a counter that rolls through numbers while it "searches", and the clock =====
const asked = $('asked'), count = $('count');
let shown = 100, rolling = null;
function roll(to){
  clearInterval(rolling); rolling = null;
  asked.textContent = to;
  count.classList.remove('missing');
  if(reduceMotion){ count.textContent = shown = to; return; }
  const from = shown, steps = 9;
  let i = 0;
  count.classList.add('searching');
  rolling = setInterval(() => {
    i++;
    // like a real set, it shows other pages going past on the way, not a smooth count
    const n = i >= steps ? to : Math.round(from + (to - from) * i / steps + (Math.random() - .5) * 40);
    count.textContent = Math.min(899, Math.max(100, n));
    if(i >= steps){ clearInterval(rolling); rolling = null; count.classList.remove('searching'); }
  }, 45);
  shown = to;
}
const clock = $('clock');
const tick = () => {
  const d = new Date();
  // the date sits in its own span so phones can hide it and keep the time
  clock.innerHTML = `<span class="tt-date">${d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).replace(',', '')} </span>` +
    d.toLocaleTimeString('en-GB', { hour12: false });
};
tick(); setInterval(tick, 1000);

// ===== The laptop's screen and its pages (the code still calls them channels), and the guide on the desk =====
const tv = $('tv'), screen = $('screen'), head = $('screen-head'), pic = $('screen-pic'), snow = $('screen-snow'), osd = $('osd'), num = $('ch-num');
const chans = [...document.querySelectorAll('.tt-ch')];
const byCh = new Map(chans.map(c => [c.dataset.ch, c]));
const listButtons = [...document.querySelectorAll('.tt-chlist button')];
let now = null, osdTimer = null;

// each preview is a screenshot of the page (assets/previews) redrawn in the eight teletext colours at block size
const PALETTE = [[0,0,0],[255,255,255],[255,235,26],[46,224,240],[56,224,90],[255,68,51],[255,77,242],[31,51,255]];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];   // ordered dither: in-between shades become block patterns
const mosaics = new Map();   // src -> finished ImageData, so flicking back to a channel is instant
function mosaic(src){
  if(mosaics.has(src)) return mosaics.get(src);
  const job = new Promise(done => {
    const img = new Image();
    img.onload = () => {
      const W = pic.width, H = pic.height, c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, W, H);
      const px = g.getImageData(0, 0, W, H), d = px.data;
      // stretch the contrast first, so a dark page (the resume's black room) still has shapes after rounding to 8 colours
      const lum = [];
      for(let i = 0; i < d.length; i += 4) lum.push(d[i] * .3 + d[i+1] * .59 + d[i+2] * .11);
      lum.sort((a, b) => a - b);
      const lo = lum[Math.floor(lum.length * .05)], hi = Math.max(lo + 1, lum[Math.floor(lum.length * .98)]), k = 255 / (hi - lo);
      for(let i = 0; i < d.length; i += 4){
        const p = i / 4, t = (BAYER[(p % W & 3) + (Math.floor(p / W) & 3) * 4] / 16 - .5) * 34;
        for(let ch = 0; ch < 3; ch++) d[i+ch] = Math.min(255, Math.max(0, (d[i+ch] - lo) * k + t));
        let best = 0, bd = Infinity;
        for(let q = 0; q < PALETTE.length; q++){
          const [r, gg, b] = PALETTE[q], dd = (d[i]-r)**2 * .3 + (d[i+1]-gg)**2 * .59 + (d[i+2]-b)**2 * .11;
          if(dd < bd){ bd = dd; best = q; }
        }
        [d[i], d[i+1], d[i+2]] = PALETTE[best];
      }
      done(px);
    };
    img.onerror = () => done(null);
    img.src = src;
  });
  mosaics.set(src, job);
  return job;
}

// a quick burst of static between channels, like turning the dial
function burst(ms){
  if(reduceMotion) return Promise.resolve();
  const g = snow.getContext('2d'), img = g.createImageData(snow.width, snow.height), d = img.data, t0 = performance.now();
  snow.style.opacity = 1;
  return new Promise(done => (function frame(t){
    for(let i = 0; i < d.length; i += 4){ d[i] = d[i+1] = d[i+2] = Math.random() * 255; d[i+3] = 255; }
    g.putImageData(img, 0, 0);
    if(t - t0 < ms) requestAnimationFrame(frame);
    else { snow.style.opacity = 0; done(); }
  })(t0));
}

async function tune(n, { quiet = false } = {}){
  const c = byCh.get(String(n));
  if(!c || c === now) return;
  now = c;
  chans.forEach(x => x.classList.toggle('on', x === c));
  listButtons.forEach(b => b.setAttribute('aria-pressed', b.dataset.ch === c.dataset.ch));
  document.querySelectorAll('.tt-fast a[data-ch]').forEach(a => a.setAttribute('aria-current', a.dataset.ch === c.dataset.ch));
  tv.style.setProperty('--band', c.dataset.band);
  c.dataset.bandInk ? tv.style.setProperty('--band-ink', c.dataset.bandInk) : tv.style.removeProperty('--band-ink');
  // the screen opens whatever channel is on: home.js reads its href and --to when it's clicked
  // page 100 (me) has no page of its own: the screen isn't a link then, and "go to full page" hides (keeps its room)
  const to = c.dataset.href;
  if(to){ screen.href = to; screen.setAttribute('aria-label', `Open ${c.querySelector('h2').textContent.toLowerCase()} (page ${c.dataset.ch})`); }
  else { screen.removeAttribute('href'); screen.removeAttribute('aria-label'); }
  screen.style.setProperty('--to', c.dataset.to);
  $('open-full').parentElement.style.visibility = to ? '' : 'hidden';
  num.textContent = c.dataset.ch;
  osd.textContent = `P${c.dataset.ch}`;
  // page 100 is me in ASCII (head-ascii.js listens for this); the others are previews
  const isMe = !c.dataset.src;
  head.hidden = !isMe; pic.hidden = isMe;
  dispatchEvent(new CustomEvent('tt-page', { detail: c.dataset.ch }));
  osd.classList.add('on');
  clearTimeout(osdTimer); osdTimer = setTimeout(() => osd.classList.remove('on'), 2500);
  if(!quiet) roll(+c.dataset.ch);
  const [px] = await Promise.all([isMe ? null : mosaic(c.dataset.src), quiet ? null : burst(260)]);
  if(isMe) return;
  if(now !== c) return;   // flicked on again while this one was loading
  const g = pic.getContext('2d');
  px ? g.putImageData(px, 0, 0) : g.clearRect(0, 0, pic.width, pic.height);
}
const step = by => tune(chans[(chans.indexOf(now) + by + chans.length) % chans.length].dataset.ch);
$('ch-prev').addEventListener('click', () => step(-1));
$('ch-next').addEventListener('click', () => step(1));
listButtons.forEach(b => b.addEventListener('click', () => tune(b.dataset.ch)));
// left / right change page while you're on the screen, the keys or the guide (Enter on the screen opens it, as a link does)
addEventListener('keydown', e => {
  if((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.closest?.('#screen, .tt-fast, .tt-contents, .tt-guide')){
    e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1);
  }
});
// the page list and the coloured keys along the bottom change the laptop's page
document.addEventListener('click', e => {
  const a = e.target.closest('a[href="#tv"][data-ch]');
  if(!a) return;
  e.preventDefault();
  tune(a.dataset.ch);
});
// "go to full page" in the guide: the same as clicking the laptop's screen (home.js opens it from there)
$('open-full').addEventListener('click', () => screen.click());
tune(100, { quiet: true });
// start drawing every channel's blocks early, so changing channel never waits
setTimeout(() => chans.forEach(c => c.dataset.src && mosaic(c.dataset.src)), 1500);

// ===== Typing a number: the P___ box, or digits typed anywhere on the page =====
const key = $('key'), status = $('key-status');
function go(n){
  if(!byCh.has(n)){
    clearInterval(rolling); rolling = null;
    asked.textContent = count.textContent = n; count.classList.add('missing');
    status.textContent = `There's no page ${n}. Pages go from 100 to 600.`;
    return false;
  }
  status.textContent = `Page ${n}`;
  tune(n);
  return true;
}
key.addEventListener('input', () => {
  key.value = key.value.replace(/\D/g, '').slice(0, 3);
  if(key.value.length === 3){ const ok = go(key.value); setTimeout(() => { key.value = ''; if(ok) screen.focus({ preventScroll: true }); }, ok ? 400 : 1200); }
});
addEventListener('keydown', e => {
  if(!/^[0-9]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  e.preventDefault();
  key.focus();
  key.value = (key.value + e.key).slice(-3);
  key.dispatchEvent(new Event('input'));
});

// ===== The Z420, drawn in blocks. Edit the picture here: W white, C cyan, Y yellow, G the blinking power light, . empty =====
const Z420 = [
  '....WWWWWWWWWWWWWWWW....',
  '....W..............W....',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'W......................W',
  'W.CCCCCCCCCCCCCCCCCCCC.W',
  'W.C..................C.W',
  'W.C..WWWWWWWWWWWWWW..C.W',
  'W.C..................C.W',
  'W.CCCCCCCCCCCCCCCCCCCC.W',
  'W.CCCCCCCCCCCCCCCCCCCC.W',
  'W.C..................C.W',
  'W.C..................C.W',
  'W.CCCCCCCCCCCCCCCCCCCC.W',
  'W......................W',
  'W..WW.WW..........WWW..W',
  'W..WW.WW.........W.G.W.W',
  'W.................WWW..W',
  'W......................W',
  ...Array.from({ length: 22 }, (_, i) => i % 2 ? 'W..C.C.C.C.C.C.C.C.C.C.W' : 'W.C.C.C.C.C.C.C.C.C.C..W'),   // the front grille
  'W......................W',
  'W.........YYYY.........W',
  'W......................W',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  '.WWW................WWW.',
];
const FILL = { W: '#fff', C: '#2ee0f0', Y: '#ffeb1a', G: '#38e05a' };
const svg = $('z420'), ns = 'http://www.w3.org/2000/svg';
svg.setAttribute('viewBox', `0 0 ${Z420[0].length} ${Z420.length}`);
svg.setAttribute('width', Z420[0].length * 5); svg.setAttribute('height', Z420.length * 5);
const led = document.createElementNS(ns, 'g');
led.setAttribute('class', 'led');
Z420.forEach((row, y) => [...row].forEach((c, x) => {
  if(!FILL[c]) return;
  const r = document.createElementNS(ns, 'rect');
  Object.entries({ x, y, width: 1, height: 1, fill: FILL[c] }).forEach(([k, v]) => r.setAttribute(k, v));
  (c === 'G' ? led : svg).append(r);
}));
svg.append(led);

// ===== Live numbers from the server (stats.js; sample numbers until the real feed is switched on) =====
const live = $('live'), liveState = $('live-state');
const LABEL = { sample: 'SAMPLE NUMBERS UNTIL THE LIVE FEED IS ON', live: 'LIVE', stale: 'OUT OF DATE', offline: 'FEED OFFLINE' };
watchStats(({ data, state }) => {
  liveState.textContent = LABEL[state];
  liveState.className = 'tt-state' + (state === 'offline' || state === 'stale' ? ' offline' : state === 'live' ? ' tt-g' : '');
  if(!data) return;
  const d = Math.floor(data.uptime_s / 86400), h = Math.floor(data.uptime_s % 86400 / 3600);
  live.querySelector('[data-k=uptime]').textContent = `${d}d ${h}h`;
  live.querySelector('[data-k=visitors]').textContent = data.visitors_today;
  live.querySelector('[data-k=temp]').textContent = `${data.cpu_temp_c}°C`;
});

// ===== The Resume channel's quick download: whichever resume is the general one in resume-data.js =====
$('quick-pdf').href = VARIANTS[GENERAL].file;

// ===== The Resume channel's list of versions, and the About channel's work table, from the same data the pages use =====
$('variants').append(...Object.values(VARIANTS).map(v => {
  const div = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
  dt.textContent = v.name.toUpperCase(); dd.textContent = v.why.split(':')[0];   // just the "Leads with ..." part
  div.append(dt, dd);
  return div;
}));
$('work').append(...PLACES.filter(p => p.kind === 'work').map(p => {
  const tr = document.createElement('tr');
  for(const t of [p.dates.replace(/ – /, '–'), p.role, p.place]){ const td = document.createElement('td'); td.textContent = t; tr.append(td); }
  return tr;
}));

// the scroll hint scrolls down for you, to where the laptop lands on the table
// (by hand, not smooth scrolling: the browser's is too quick to watch the laptop's flight)
$('scroll-hint').addEventListener('click', () => {
  const r = $('desk-slot').getBoundingClientRect(), from = scrollY, to = from + r.top + r.height / 2 - innerHeight / 2;
  if(reduceMotion){ scrollTo(0, to); return; }
  const t0 = performance.now(), MS = 3500;
  (function step(t){
    const k = Math.min(1, (t - t0) / MS);
    scrollTo(0, from + (to - from) * (k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));   // slow, quick, slow
    if(k < 1) requestAnimationFrame(step);
  })(t0);
});

// GitHub / LinkedIn: the laptop's screen shows where you're going, the laptop flies up until the screen fills the window
// (no static, unlike the site's own pages), then the real site loads. They can't be shown live on the screen: both
// refuse to load inside another page. New-tab clicks and reduced motion just follow the link.
const EXT = {   // [background, logo colour, logo path (Simple Icons, CC0)]
  github: ['#0d1117', '#fff', 'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3'],
  linkedin: ['#f4f2ee', '#0a66c2', 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z'],
};
let leaving = false;
document.querySelector('.tt-actions').addEventListener('click', async e => {
  const a = e.target.closest('a[href^="https://"]'), site = a && Object.keys(EXT).find(k => a.hostname.includes(k));
  if(!site || !window.lt || reduceMotion || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if(leaving) return;
  leaving = true;
  const [bg, ink, d] = EXT[site], ext = $('screen-ext');
  ext.style.setProperty('--ext-bg', bg);
  ext.style.setProperty('--ext-ink', ink);
  ext.querySelector('path').setAttribute('d', d);
  $('screen-ext-url').textContent = (a.hostname.replace(/^www\./, '') + a.pathname).replace(/\/$/, '');
  ext.hidden = false;
  await lt.zoom(1, 900);
  const cover = document.createElement('div');   // over the header too, while the site loads
  cover.className = 'ext-cover';
  cover.style.background = bg;
  document.body.append(cover);
  top.location.href = a.href;
});
// Back from the site: put the laptop back as it was
addEventListener('pageshow', e => {
  if(!e.persisted || !leaving) return;   // only after leaving for GitHub / LinkedIn (home.js handles coming back from a page)
  document.querySelectorAll('.ext-cover').forEach(c => c.remove());
  $('screen-ext').hidden = true;
  window.lt?.zoom(0, 1);
  leaving = false;
});
