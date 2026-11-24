// The resume terminal: types out the questions, collects answers as button presses, scores them, and hands over a PDF.
// Content and scoring live in resume-data.js; this file only runs the conversation.
import { VARIANTS, GENERAL, QUESTIONS } from '../data/resume-data.js';   // GENERAL breaks ties

const screen = document.querySelector('.crt-screen');
const out = document.getElementById('term');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Typing speed. Clicking the screen (or pressing Escape) finishes the current line at once.
const CHAR_MS = 14;
let hurry = false;
screen.addEventListener('click', e => { if(!e.target.closest('button, a')) hurry = true; });
addEventListener('keydown', e => { if(e.key === 'Escape') hurry = true; });

// Move focus into the terminal only if the visitor isn't busy elsewhere (e.g. in the skip menu).
const offerFocus = el => { const a = document.activeElement; if(!a || a === document.body || a.closest('.term')) el.focus({ preventScroll: true }); };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const scrollDown = () => { out.scrollTop = out.scrollHeight; };

// Print one line, typed out letter by letter (or all at once with reduced motion / after a click).
async function print(text, cls = ''){
  const line = document.createElement('p');
  if(cls) line.className = cls;
  out.append(line);
  hurry = false;
  if(reduceMotion){ line.textContent = text; scrollDown(); return; }
  for(let i = 1; i <= text.length; i++){
    if(hurry){ line.textContent = text; break; }
    line.textContent = text.slice(0, i);
    scrollDown();
    await sleep(CHAR_MS);
  }
  scrollDown();
  await sleep(reduceMotion || hurry ? 0 : 160);
}

// A boot line: the label types out, then its status appears at the right, like an old BIOS check.
async function status(label, result = 'OK'){
  await print(label, 'row');
  const line = out.lastElementChild, b = document.createElement('b');
  await sleep(reduceMotion || hurry ? 0 : 220);
  b.textContent = `[ ${result} ]`;
  line.append(b);
}
// The banner prints a line at a time (it's art, not text to type).
const BANNER = [
  '████   █████   ████  █   █  █   █  █████',
  '█   █  █      █      █   █  ██ ██  █    ',
  '████   ████    ███   █   █  █ █ █  ████ ',
  '█  █   █          █  █   █  █   █  █    ',
  '█   █  █████  ████    ███   █   █  █████',
];
async function banner(){
  const pre = document.createElement('pre');
  pre.className = 'ascii';
  pre.setAttribute('aria-label', 'RESUME');
  out.append(pre);
  for(const row of BANNER){ pre.textContent += row + '\n'; await sleep(reduceMotion || hurry ? 0 : 70); }
}

// Arrow keys move between the options in a list (wrapping around); Enter / Space presses the focused one.
function arrows(e){
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
  if(!step) return;
  e.preventDefault();
  const items = [...e.currentTarget.querySelectorAll('button, a')];
  items[(items.indexOf(document.activeElement) + step + items.length) % items.length].focus();
}
// An arrow key pressed anywhere else (while the screen is in view) jumps into the current options.
addEventListener('keydown', e => {
  if(!e.key.startsWith('Arrow') || document.activeElement.closest('.opts') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const r = screen.getBoundingClientRect(), list = out.querySelector('.opts:last-child');
  if(!list || r.bottom < 0 || r.top > innerHeight) return;
  e.preventDefault();
  list.querySelector('button, a').focus({ preventScroll: true });
});

// Show the options as numbered buttons; resolves with the one picked (click, Enter, or its number key).
function ask(options){
  return new Promise(resolve => {
    const list = document.createElement('div');
    list.className = 'opts';
    list.setAttribute('role', 'group');
    const pick = o => { removeEventListener('keydown', byNumber); list.remove(); resolve(o); };
    const byNumber = e => { const o = options[Number(e.key) - 1]; if(o && !e.ctrlKey && !e.metaKey && !e.altKey){ e.preventDefault(); pick(o); } };
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span aria-hidden="true">${i + 1}</span>`;
      b.append(o.label);
      b.onclick = () => pick(o);
      list.append(b);
    });
    list.addEventListener('keydown', arrows);
    out.append(list);
    addEventListener('keydown', byNumber);
    scrollDown();
    offerFocus(list.querySelector('button'));
  });
}

async function run(){
  out.textContent = '';
  const score = Object.fromEntries(Object.keys(VARIANTS).map(k => [k, 0]));

  // boot sequence: only true things from my resumes
  await print('BP-OS v2027.05 · booting', 'dim');
  await banner();
  await status('Loading service desk experience (2 roles)');
  await status('Loading home server: HP Z420 on FreeBSD');
  await status('Loading phishing simulation (200+ employees)');
  await status('Loading local voice assistant');
  await status('Mounting resumes', `${Object.keys(VARIANTS).length} FOUND`);
  await print('Boot complete. Access granted: [RECRUITER]');
  await print('brayden@z420:~$ ./find-resume', 'cmd');
  await print(`${QUESTIONS.length} quick questions, then I'll hand you the version of my resume that fits your role best.`);

  for(const [i, q] of QUESTIONS.entries()){
    await print(`[${i + 1}/${QUESTIONS.length}] ${q.text}`, 'q');
    const choice = await ask(q.options);
    await print(`> ${choice.label}`, 'ans');
    for(const [k, n] of Object.entries(choice.points)) score[k] += n;
  }

  // highest score wins; on a tie the general version comes first
  const best = Object.keys(score).sort((a, b) => score[b] - score[a] || (b === GENERAL) - (a === GENERAL))[0];
  const v = VARIANTS[best];
  await print('Matching...', 'dim');
  await print(`Best fit: the ${v.name} resume.`, 'q');
  await print(v.why);

  const actions = document.createElement('div');
  actions.className = 'opts result';
  actions.innerHTML = `
    <button type="button" class="view"><span aria-hidden="true">&gt;</span>View it</button>
    <a href="${v.file}" download><span aria-hidden="true">&gt;</span>Download PDF</a>
    <button type="button"><span aria-hidden="true">&gt;</span>Start over</button>`;
  actions.querySelector('.view').onclick = () => viewPdf(v);
  actions.querySelector('button:not(.view)').onclick = run;
  actions.addEventListener('keydown', arrows);
  out.append(actions);
  scrollDown();
  offerFocus(actions.querySelector('button'));
}

// "Just give me a damn resume" drops down a menu listing every resume version; each one downloads.
const quick = document.getElementById('quick'), menu = document.getElementById('quick-menu');
document.getElementById('quick-list').innerHTML = Object.values(VARIANTS)
  .map(v => `<li><a href="${v.file}" download>${v.name}<span>PDF</span></a></li>`).join('');
const setMenu = open => { menu.hidden = !open; quick.setAttribute('aria-expanded', open); };
quick.onclick = () => { setMenu(menu.hidden); if(!menu.hidden) menu.querySelector('a').focus(); };
addEventListener('click', e => { if(!menu.hidden && !e.target.closest('.quick-wrap')) setMenu(false); });
addEventListener('keydown', e => { if(e.key === 'Escape' && !menu.hidden){ setMenu(false); quick.focus(); } });
menu.addEventListener('keydown', e => {   // arrow keys move through the list here too
  const items = [...menu.querySelectorAll('a')], step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
  if(!step) return;
  e.preventDefault(); e.stopPropagation();
  items[(items.indexOf(document.activeElement) + step + items.length) % items.length].focus();
});

// "View it": the resume opens on the CRT itself, with "View in new tab" and "Go back" along the bottom.
// It shows page images made by make-previews.sh (assets/Resumes/previews/<name>-1.webp, -2.webp, ...), so it looks the same in
// every browser; if there are none it falls back to the browser's own PDF viewer.
// The monitor turns to face the viewer straight on while a resume is open, so it's easy to read.
let viewer = null;
function viewPdf(v){
  closePdf();
  viewer = document.createElement('div');
  viewer.className = 'viewer';
  viewer.innerHTML = `
    <div class="pages" tabindex="0" aria-label="${v.name} resume"></div>
    <div class="opts result">
      <a href="${v.file}" target="_blank" rel="noopener"><span aria-hidden="true">&gt;</span>View in new tab</a>
      <button type="button"><span aria-hidden="true">&gt;</span>Go back</button>
    </div>`;
  viewer.querySelector('button').onclick = closePdf;
  viewer.querySelector('.opts').addEventListener('keydown', arrows);
  out.hidden = true;
  screen.append(viewer);
  monitor.classList.add('facing');
  viewer.querySelector('a').focus({ preventScroll: true });
  showPages(v, viewer.querySelector('.pages'));
}
async function showPages(v, box){
  const base = v.file.replace('Resumes/', 'Resumes/previews/').replace(/\.pdf$/i, '');
  for(let n = 1; ; n++){
    const img = new Image();
    img.src = `${base}-${n}.webp`;
    img.alt = `${v.name} resume, page ${n}. Use "View in new tab" for the PDF with selectable text.`;
    try { await img.decode(); } catch { break; }   // no more pages
    if(!box.isConnected) return;                    // closed while loading
    box.append(img);
  }
  if(!box.children.length) box.outerHTML = `<iframe src="${v.file}#toolbar=0&navpanes=0&view=FitH" title="${v.name} resume"></iframe>`;
}
function closePdf(){
  if(!viewer) return;
  viewer.remove(); viewer = null;
  out.hidden = false;
  monitor.classList.remove('facing');
  out.querySelector('.view')?.focus({ preventScroll: true });
}
addEventListener('keydown', e => { if(e.key === 'Escape' && viewer) closePdf(); });

// The monitor leans a little towards the mouse (mouse / trackpad only, and not with reduced motion).
const monitor = document.getElementById('monitor');
if(!reduceMotion && matchMedia('(pointer: fine)').matches){
  addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    const rest = parseFloat(getComputedStyle(monitor).getPropertyValue('--ry-rest'));   // the resting turn, set per layout in styles.css
    monitor.style.setProperty('--ry', `${(rest + x * 12).toFixed(2)}deg`);
    monitor.style.setProperty('--rx', `${(4 - y * 6).toFixed(2)}deg`);
  }, { passive: true });
}

new IntersectionObserver((es, io) => { if(es[0].isIntersecting){ io.disconnect(); run(); } }, { threshold: .35 }).observe(screen);
