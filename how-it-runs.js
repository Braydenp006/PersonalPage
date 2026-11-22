// "How this site runs": shows the stats from stats.js in the ticker along the bottom. The data comes from there; this file only presents it.
import { watchStats } from './stats.js';

const feed = document.getElementById('feed'), ticker = document.getElementById('ticker');
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

const prev = {};   // last value of each stat, for the up/down arrow
watchStats(({ data, state }) => {
  feed.dataset.state = state;
  feed.querySelector('span').textContent = LABEL[state];
  ticker.classList.toggle('dim', state === 'stale' || state === 'offline');
  if(!data) return;
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
