// The Resume page's top buttons change the CRT's channel: static with rolling zig-zag lines (a set losing and finding
// its hold), then a picture of the page rolls in on the screen (assets/previews/<page>.webp, made by
// make-home-previews.mjs: a picture, not the live page, so it's instant and doesn't stall this page while it loads).
// Along the bottom: "Go here" zooms the whole page into the screen until that picture fills the window, then the
// browser goes to the page for real. "Back to terminal" (or Escape) changes back.
// Back from that page (browser cache) zooms out of the screen again.
// New-tab clicks and reduced motion just follow the link.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav = document.querySelector('.res-nav'), screen = document.querySelector('.crt-screen'), monitor = document.getElementById('monitor');
let view = null, busy = false, zoomed = null;   // view: the channel on the screen; zoomed: the zoom-in, kept for Back

// static: dim green noise with a few bright zig-zag lines rolling down, drawn small and blown up
function noise(ms, until = Promise.resolve()){   // runs at least ms, and until `until` settles
  const c = document.createElement('canvas');
  c.className = 'channel-static';
  c.width = 160; c.height = 120;
  screen.append(c);
  const g = c.getContext('2d'), img = g.createImageData(c.width, c.height), d = img.data, t0 = performance.now();
  let waiting = true;
  until.then(() => { waiting = false; });
  return new Promise(done => (function frame(now){
    const t = now - t0;
    for(let i = 0; i < d.length; i += 4){ const v = Math.random() * 120; d[i] = v * .45; d[i + 1] = v; d[i + 2] = v * .6; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    g.strokeStyle = '#a6ffbe';
    g.lineWidth = 1.5;
    for(let k = 0; k < 5; k++){   // each line zig-zags across, its teeth and speed its own, and wraps from the bottom to the top
      const y = (k * 31 + t * (.09 + k * .02)) % (c.height + 20) - 10, tooth = 6 + k * 3, amp = 3 + (k % 3) * 2;
      g.beginPath();
      for(let x = 0; x <= c.width; x += tooth) g.lineTo(x, y + ((x / tooth) % 2 ? amp : -amp));
      g.stroke();
    }
    if(t < ms || waiting) requestAnimationFrame(frame);
    else done(c);
  })(t0));
}
// the picture settles: the static drops away in a few jumps while the new picture rolls down into place
async function settle(c, picture){
  const steps = { duration: 380, easing: 'steps(5, end)' };
  picture?.animate({ transform: ['translateY(-35%) skewX(-8deg)', 'translateY(8%) skewX(4deg)', 'none'] }, steps);
  await c.animate({ opacity: [1, 0] }, steps).finished;
  c.remove();
}

function fit(){   // the picture at the window's size, shrunk to fit inside the screen (letterboxed), centred
  if(!view) return;
  const tv = view.querySelector('.tv'), frame = tv.firstElementChild, k = Math.min(tv.clientWidth / innerWidth, tv.clientHeight / innerHeight);
  Object.assign(frame.style, { width: `${innerWidth}px`, height: `${innerHeight}px`,
    transform: `translate(${(tv.clientWidth - innerWidth * k) / 2}px, ${(tv.clientHeight - innerHeight * k) / 2}px) scale(${k})` });
}
addEventListener('resize', fit);

async function tune(a){
  busy = true;
  view?.remove();
  view = document.createElement('div');
  view.className = 'viewer channel-view';
  const name = a.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  view.innerHTML = `<div class="tv"><img alt="${a.textContent}, as it looks"></div>
    <div class="opts result"><a href="${a.href}"><span aria-hidden="true">&gt;</span>Go here</a><button type="button"><span aria-hidden="true">&gt;</span>Back to terminal</button></div>`;
  const pic = view.querySelector('img');
  pic.src = `assets/previews/${name}.webp`;
  const ready = Promise.race([pic.decode().catch(() => {}), new Promise(r => setTimeout(r, 1200))]);   // no picture: the dark screen shows
  const loading = noise(450, ready);   // the static covers the screen at once and rolls on until the picture is ready
  screen.append(view);
  screen.classList.add('on-channel');
  monitor.classList.add('facing');   // straight on, so the page is easy to see (like an open resume)
  fit();
  view.querySelector('a').addEventListener('click', e => { if(!e.button && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey){ e.preventDefault(); go(a.href); } });
  view.querySelector('button').addEventListener('click', () => off());
  const c = await loading;
  await settle(c, view.querySelector('.tv'));
  view.querySelector('a').focus({ preventScroll: true });
  busy = false;
}
async function off(){
  if(!view || busy) return;
  busy = true;
  const c = await noise(300);
  view.remove(); view = null;
  screen.classList.remove('on-channel');
  if(!screen.querySelector('.viewer')) monitor.classList.remove('facing');   // an open resume keeps it facing
  await settle(c, document.getElementById('term'));
  busy = false;
}
// "Go here": the whole page zooms in until the screen's picture fills the window, then the browser goes there
async function go(href){
  if(busy) return;
  busy = true;
  const r = view.querySelector('.tv > img').getBoundingClientRect(), k = innerWidth / r.width;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  document.body.style.transformOrigin = `${cx + scrollX}px ${cy + scrollY}px`;
  screen.classList.add('zooming');   // scanlines, glass and rounded corners fade out on the way in
  zoomed = { transform: ['none', `translate(${innerWidth / 2 - cx}px, ${innerHeight / 2 - cy}px) scale(${k})`] };
  await document.body.animate(zoomed, { duration: 900, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).finished;
  top.location.href = href;   // top: the whole tab, never a frame
}
addEventListener('pageshow', async e => {   // Back from that page: zoom back out of the screen
  if(!e.persisted || !zoomed) return;
  const back = { transform: [...zoomed.transform].reverse() };
  zoomed = null;
  document.body.getAnimations().forEach(a => a.cancel());
  screen.classList.remove('zooming');
  await document.body.animate(back, { duration: 700, easing: 'cubic-bezier(.3,0,.2,1)' }).finished;
  busy = false;
});

nav?.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if(!a || reduceMotion || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if(!busy && view?.querySelector('a').href !== a.href) tune(a);
});
addEventListener('keydown', e => { if(e.key === 'Escape') off(); });
