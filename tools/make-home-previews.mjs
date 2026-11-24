// Remakes the home page's preview pictures (assets/previews/*.webp) from the real pages.
// Run it while the site is being served on port 3000:  python3 tools/serve.py   then:  node tools/make-home-previews.mjs
// Needs Playwright (with its Chromium) and ImageMagick (`magick`).
import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';

process.chdir(new URL('..', import.meta.url).pathname);   // the repo root, so assets/previews/ is found from anywhere

const PAGES = process.argv.length > 2 ? process.argv.slice(2) : ['index', 'resume', 'how-it-runs', 'about', 'projects', 'other-work'];   // the home page's previews, plus index for the Resume page's CRT (crt-channel.js); or name pages: node tools/make-home-previews.mjs other-work
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });   // so the 3D models draw
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const name of PAGES) {
  await page.goto(`http://localhost:3000/${name}.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);   // let the 3D models, the map and the boot-up text finish
  const png = `assets/previews/${name}.png`;
  await page.screenshot({ path: png });
  execFileSync('magick', [png, '-resize', '960x', '-quality', '78', `assets/previews/${name}.webp`]);
  execFileSync('rm', [png]);
  console.log('made', `assets/previews/${name}.webp`);
}
await browser.close();
