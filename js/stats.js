// The live stats feed for "How this site runs". Only fetching lives here; how-it-runs.js decides how it looks.
//
// ===== EDIT HERE once the stats collector runs on the server =====
// 'mock' shows made-up sample numbers (the page labels them as samples, so nobody mistakes them for real ones).
// Set it to the endpoint, e.g. '/api/stats', to show the real thing.
export const SOURCE = 'mock';
const EVERY_MS = 5000;   // how often to ask
const STALE_S = 30;      // older than this and the numbers are shown as out of date
//
// What the endpoint returns (numbers only: never hostnames, IPs, paths or per-visitor data):
// { "visitors_today": 152, "requests_per_min": 34, "bandwidth_today_mb": 690,
//   "cpu_load_pct": 38, "mem_used_pct": 44, "cpu_temp_c": 52, "disk_free_pct": 71, "uptime_s": 3690000,
//   "ts": 1792463139 }      <- ts: when it was measured, in Unix seconds

// Calls onUpdate({ data, state }) now and every EVERY_MS. state is 'sample', 'live', 'stale' or 'offline'.
// On 'offline' data is the last good reading (or null), so the page can keep showing it, dimmed.
export function watchStats(onUpdate){
  let last = null;
  async function tick(){
    if(SOURCE === 'mock'){ onUpdate({ data: sample(), state: 'sample' }); return; }
    try {
      const res = await fetch(SOURCE, { cache: 'no-store' });
      if(!res.ok) throw new Error(res.status);
      last = await res.json();
      onUpdate({ data: last, state: Date.now() / 1000 - last.ts > STALE_S ? 'stale' : 'live' });
    } catch {
      onUpdate({ data: last, state: 'offline' });
    }
  }
  tick();
  setInterval(tick, EVERY_MS);
}

// Sample numbers that drift a little each time, so the page looks alive before the real feed exists.
let s = { visitors_today: 140, requests_per_min: 30, bandwidth_today_mb: 640, cpu_load_pct: 22, mem_used_pct: 46,
  cpu_temp_c: 48, disk_free_pct: 71, uptime_s: 3690000 };
const drift = (v, by, lo, hi) => Math.min(hi, Math.max(lo, v + (Math.random() - .5) * by));
function sample(){
  s = { ...s,
    visitors_today: s.visitors_today + (Math.random() < .4 ? 1 : 0),
    requests_per_min: Math.round(drift(s.requests_per_min, 10, 8, 80)),
    bandwidth_today_mb: s.bandwidth_today_mb + Math.random() * 3,
    cpu_load_pct: Math.round(drift(s.cpu_load_pct, 8, 4, 70)),
    mem_used_pct: Math.round(drift(s.mem_used_pct, 2, 30, 70)),
    cpu_temp_c: Math.round(drift(s.cpu_temp_c, 2, 38, 70)),
    uptime_s: s.uptime_s + EVERY_MS / 1000 };
  return { ...s, ts: Math.round(Date.now() / 1000) };
}
