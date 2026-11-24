// "How this site runs": shows the stats from stats.js in the ticker along the bottom and in the chart. The data comes from there; this file only presents it.
import { watchStats } from './stats.js';

const feed = document.getElementById('feed'), ticker = document.getElementById('ticker');

// the clock in the top bar, like a terminal's
const clock = document.getElementById('clock');
const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour12: false }); };
tick();
setInterval(tick, 1000);
// a second copy right after the first, so the scroll loops without a gap (screen readers skip it)
const copy = ticker.firstElementChild.cloneNode(true);
copy.setAttribute('aria-hidden', 'true');
ticker.append(copy);

// how each number is written
const gb = mb => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
function uptime(s){
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? `${d} d ${h} h` : `${h} h ${m} min`;
}
const FORMAT = {
  visitors_today: n => n.toLocaleString(),
  requests_per_min: n => n.toLocaleString(),
  bandwidth_today_mb: gb,
  uptime_s: uptime,
  cpu_load_pct: n => `${n}%`,
  mem_used_pct: n => `${n}%`,
  disk_free_pct: n => `${n}%`,
  cpu_temp_c: n => `${n} °C`,
};

const LABEL = {
  sample: 'Sample numbers',
  live: 'Live',
  stale: 'Out of date',
  offline: 'Server unreachable',
};

// ===== the chart: one stat over time, picked with the buttons above it =====
// stats.js only gives the latest reading, so the history is what this page has seen since it opened.
const KEEP = 120;   // readings kept: 10 minutes at one every 5 s
const history = [];
const chart = document.getElementById('chart'), tabs = document.getElementById('chart-tabs');
const chartTip = document.getElementById('chart-tip'), chartSum = document.getElementById('chart-sum');
const PERCENT = new Set(['cpu_load_pct', 'mem_used_pct', 'disk_free_pct']);   // these always run 0-100
const label = {};
let shown = 'cpu_temp_c', scale = null;
const NOT_CHARTED = new Set(['uptime_s', 'disk_free_pct', 'visitors_today']);   // only ever climb or barely move: flat, pointless lines
for(const dd of ticker.firstElementChild.querySelectorAll('[data-stat]')){   // one button per ticker stat, named the same
  const key = dd.dataset.stat, b = document.createElement('button');
  if(NOT_CHARTED.has(key)) continue;
  label[key] = dd.previousElementSibling.textContent;
  b.type = 'button';
  b.textContent = label[key];
  b.setAttribute('aria-pressed', key === shown);
  b.addEventListener('click', () => {
    shown = key;
    for(const x of tabs.children) x.setAttribute('aria-pressed', x === b);
    draw();
  });
  tabs.append(b);
}
const clockTime = t => new Date(t).toLocaleTimeString([], { hour12: false });

function draw(){
  const W = chart.clientWidth, H = chart.clientHeight, P = { l: 78, r: 14, t: 12, b: 24 };
  chart.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const pts = history.filter(h => typeof h.d[shown] === 'number'), fmt = FORMAT[shown];
  if(pts.length < 2){
    scale = null;
    chart.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="c-empty">Collecting readings…</text>`;
    chartSum.textContent = 'Collecting readings…';
    return;
  }
  const vs = pts.map(p => p.d[shown]);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if(PERCENT.has(shown)){ lo = 0; hi = 100; }
  else {
    const m = Math.max((hi - lo) * .2, Math.abs(hi) * .01, 1);   // a little headroom, so a flat line isn't pinned to an edge
    lo = Math.max(0, lo - m); hi += m;
  }
  const t0 = pts[0].t, t1 = Math.max(pts.at(-1).t, t0 + 60000);   // at least a minute wide, so the first readings don't fill it
  const x = t => P.l + (t - t0) / (t1 - t0) * (W - P.l - P.r), y = v => P.t + (hi - v) / (hi - lo) * (H - P.t - P.b);
  scale = { pts, x, y, fmt };
  const grid = [lo, (lo + hi) / 2, hi].map(v =>
    `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="c-grid"/><text x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(Math.round(v))}</text>`).join('');   // whole numbers on the axis
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.d[shown]).toFixed(1)}`).join('');
  const last = pts.at(-1);
  chart.innerHTML = grid +
    `<path d="${line}L${x(last.t)},${H - P.b}L${P.l},${H - P.b}Z" class="c-area"/><path d="${line}" class="c-line"/>` +
    `<text x="${P.l}" y="${H - 6}">${clockTime(t0)}</text><text x="${W - P.r}" y="${H - 6}" text-anchor="end">now</text>` +
    `<line id="c-cross" y1="${P.t}" y2="${H - P.b}" class="c-cross" visibility="hidden"/><circle id="c-hover" r="5" class="c-dot" visibility="hidden"/>`;
  chartSum.textContent = `${label[shown]}: now ${fmt(last.d[shown])}, low ${fmt(Math.min(...vs))}, high ${fmt(Math.max(...vs))}.`;
}
new ResizeObserver(draw).observe(chart);

// hovering: a crosshair on the nearest reading, with its time and value
chart.addEventListener('pointermove', e => {
  if(!scale) return;
  const r = chart.getBoundingClientRect(), px = e.clientX - r.left;
  const p = scale.pts.reduce((a, b) => Math.abs(scale.x(b.t) - px) < Math.abs(scale.x(a.t) - px) ? b : a);
  const cx = scale.x(p.t), cy = scale.y(p.d[shown]);
  chart.querySelector('#c-cross').setAttribute('x1', cx);
  chart.querySelector('#c-cross').setAttribute('x2', cx);
  chart.querySelector('#c-cross').setAttribute('visibility', 'visible');
  Object.entries({ cx, cy, visibility: 'visible' }).forEach(([k, v]) => chart.querySelector('#c-hover').setAttribute(k, v));
  chartTip.innerHTML = `<b>${scale.fmt(p.d[shown])}</b>${clockTime(p.t)}`;
  chartTip.style.left = `${cx + 14}px`;   // the svg sits 14px in from .chart-box's left edge
  chartTip.style.top = `${cy + 10}px`;   // ...and its 10px top offset
  chartTip.hidden = false;
});
chart.addEventListener('pointerleave', () => {
  chartTip.hidden = true;
  chart.querySelector('#c-cross')?.setAttribute('visibility', 'hidden');
  chart.querySelector('#c-hover')?.setAttribute('visibility', 'hidden');
});

const prev = {};   // last value of each stat, for the up/down arrow
watchStats(({ data, state }) => {
  feed.dataset.state = state;
  feed.querySelector('span').textContent = LABEL[state];
  ticker.classList.toggle('dim', state === 'stale' || state === 'offline');
  if(!data) return;
  if(data.ts !== history.at(-1)?.d.ts){   // a new reading (offline repeats the last one)
    history.push({ t: Date.now(), d: data });
    if(history.length > KEEP) history.shift();
    draw();
  }
  for(const [key, format] of Object.entries(FORMAT)){
    const v = data[key];
    if(typeof v !== 'number') continue;   // a missing number keeps its dash
    const dir = v > prev[key] ? 'up' : v < prev[key] ? 'down' : null;   // unchanged keeps its last arrow
    prev[key] = v;
    for(const dd of ticker.querySelectorAll(`[data-stat="${key}"]`)){
      dd.textContent = format(v);
      if(dir) dd.dataset.dir = dir;
    }
  }
});
