# Context: Brayden Paterson's Personal Website

Handoff for a coding agent. Read it all before writing code. This replaces any earlier brief. The old car / dashboard theme is **scrapped**; build nothing car-themed.

## 1. What this site is
- My resume, a home for all my projects, and a demo of my skills.
- It's also my **technical sales pitch**: the site sells me. A non-technical recruiter should get the point in under a minute; a technical visitor should find real depth.
- About me: Brayden Paterson, third-year Computing student at Queen's University (Cybersecurity Specialization, Math minor), ~2 years IT service desk experience. Seeking a **4-month co-op from May 2027** in **Technical Sales / Pre-Sales** or **Server / Infrastructure**, in Toronto/York Region or Kingston.

## 2. Visual direction
- **Each page has its own look** (see section 11). The home page is now a **teletext service** (black, the eight broadcast colours, the Bedstead font), chosen 2026-11-23; the cream/pastel notes below were the original direction and now apply only where a page hasn't picked its own world.
- **Background:** white, maybe very slightly cream.
- **Accents:** space grey and dark pastel colours.
- **Feel:** **not minimal.** Rich, playful and full of personality while still polished and premium: strong typography, real photos and 3D objects doing the visual work, interactive moments that reward exploring. (The home page so far is a starting point, not the final level of detail.)
- **Mood board:** I'm making a mood board of style references. Once it exists, follow it for styling decisions over anything generic. `[TODO: add mood board location]`
- **Quality bar:** a quick first prototype of this direction looked bad: generic, template-y, flat placeholder blocks. Design with intent: considered type scale and pairing, careful spacing, restrained pastel use (accents, not big flat blocks of colour), subtle depth and motion. It should look like a designer made it.
- Avoid generic AI-template tropes: no purple gradients, no left-border accent cards, no emoji.
- Keep all colours/fonts in CSS custom properties so the theme is easy to tweak.

## 3. Structure

**Home page** (rebuilt 2026-11-23; see section 11 for how it works)
- A teletext service: every page has a three-digit number (100 me, 200 Resume, 300 How this site runs, 400 About, 500 Projects, 600 Other work).
- First screen: my name, who I am / what I'm looking for, the buttons, and a **3D laptop** beside them showing me as rotating ASCII (page 100). Coloured keys under my details switch the laptop's screen to each page's preview; clicking the screen opens the real page.
- Scrolling down: the laptop shuts, spins once and lands on an ASCII table, opens, and a guide to the page on its screen draws in beside it.

**Projects page**
- A big ongoing job that I'll build out as I go. For now: a solid, extendable structure driven by a data file (`projects.json`: title, summary, tags, category, images, links, status done / in progress) and a detail view per project.
- **Shelves of 3D objects:** the page is a set of shelves, each project shown as a **3D model sitting on a shelf** with a small title card underneath. Clicking one opens that project's detail view.
  - willbot: a **floating willbot head**.
  - Arcade (AstroidClone and other games): a **3D arcade machine**; the game plays on its screen / opens when started.
  - Home server: a **3D model of my server** (I'll make it).
  - Every other project gets its own model; some will need creative stand-ins.
  - Pure-software projects can live **inside the arcade machine**, or on a **3D old laptop / retro computer** whose screen displays them.
  - Models come from me (Blender etc.); the model file, title and card text for each project should be set in `projects.json`.

**Resume page**
- Asks the recruiter a short **string of questions** (e.g. what role they're hiring for, what matters most, placement length) and then serves the **best-fitting version of my resume** (several PDF variants; view online + download).
- A clearly visible button: **"Just give me a damn resume"** for recruiters short on time. It skips the questions and downloads the general resume.
- Questions, answers and the resume variants should be defined in one easy-to-edit data structure.
- **Retro terminal on a CRT:** the questions are typed out on a **retro-looking terminal** shown on a screen that looks **curved like a CRT TV** (scanlines, glow, slight curvature). The recruiter answers inside the terminal.
- **Simple rules pick the resume (decided: no AI for now).** Each answer adds points to one or more resume variants; the variant with the most points is served, ties go to the general resume. The points live in the same data structure as the questions, so tuning it is just editing numbers. (An AI-written "why this version" line could be added later, but isn't planned.)

**How this site runs page**
- Talks about my home server (HP Z420, FreeBSD, self-hosted) and how the site is served.
- Shows live stats: **site visitors, traffic** (requests, bandwidth), **server load** (CPU, memory, temperature, disk), and uptime. What else runs on the server is a short paragraph, not a status list.
- **Display is not decided.** A dashboard-style layout is fine for now but may change, so keep the data layer separate from the presentation.

**Other work page** (the 5th tile)
- Shows the two things I mostly sell: **websites** and **PCs** (nothing else for now), plus a **contact form** for people interested in my services. Full plan in section 9.

**About me page** (built; see section 11)
- A game-style character / equipment screen, done as a **test chamber** (chosen 2026-11-23) (looks only: **plain wording, no "Level", "XP", "Quests"** — that read as corny). One screen, no tabs: me as a 3D model, a "Where I've worked" map, my details, live stats, equipment and hobbies, links, and cards to the other pages.

**Footer (all pages):** "Served from an HP Z420 running FreeBSD." and copyright.

## 4. Hard constraints
- **Simple stack I can maintain:** I know HTML/CSS/JS but I'm not strong. Plain HTML + CSS + vanilla JS (ES modules), no framework. A build step only if it clearly earns its place. Comment non-obvious code and include a short README.
- **Easy to update:** projects, resume questions/variants, and About content all edited in data files or one clearly marked block each.
- **Fast and mobile-friendly:** good Lighthouse scores, lazy-loaded images, heavy demos load only when opened.
- **Accessible:** real links and buttons, keyboard navigable, visible focus states, alt text, WCAG AA contrast (watch pastel-on-white text), and all motion respects `prefers-reduced-motion`.
- **Security:** self-hosted on my FreeBSD server behind a reverse proxy or tunnel with HTTPS. Never expose my home IP or internal services.
  - **TODO before this site goes live:** put it behind a **Cloudflare proxy (orange cloud) or a Cloudflare Tunnel**. Right now the router port-forwards to nginx and DuckDNS / Cloudflare DNS publish the home IP, which breaks the rule above. With the proxy, the dynamic DNS updater must update the Cloudflare record instead of DuckDNS; a tunnel needs no port forward at all. Mail and game server records can't go through Cloudflare's free proxy, so they still reveal the IP. Decide what to do about those. When this changes, update the "How your visit got here" steps on `how-it-runs.html`.

## 5. Live stats endpoint
- A light script on the server collects stats (`sysctl`, `df`, web server access logs for visitors/traffic) and serves **read-only JSON** at e.g. `/api/stats`.
- **Numbers only.** No hostnames, IPs, usernames, paths, process lists, or individual visitor data. Visitor counts are aggregate only.
- Suggested shape:
  ```json
  {
    "visitors_today": 152,
    "requests_per_min": 34,
    "bandwidth_today_mb": 690,
    "cpu_load_pct": 38,
    "mem_used_pct": 44,
    "cpu_temp_c": 52,
    "disk_free_pct": 71,
    "uptime_s": 3690000,
    "ts": 1792463139
  }
  ```
- Frontend polls every ~5 s; shows a graceful offline state if the endpoint fails or data is stale.
- Include a **mock mode** so the site works without the server.
- Collector runs as an unprivileged user; rate-limit the endpoint at the proxy.

## 6. these will all be in projects - slightly larger ideas then simple projects gallery
These live on the Projects shelves (see section 3). Don't build yet unless asked.
- **Arcade:** AstroidClone (Pygame) compiled to WebAssembly with pygbag, playable in the browser; loads only when the user presses start. The main loop needs `await asyncio.sleep(0)` once per frame for pygbag. **VrankFighters is NOT in the arcade** (no permission to use the faces in it).
  - **Meteor Shower (AstroidClone) is built too** (`arcade/meteor-shower/`, pygbag, 1.4 MB, source `~/Projects/AstroidGame`): the same real code as the repo, with the body wrapped in `async def main()` (`global` list generated from the assigned names), `await asyncio.sleep(0)` after each frame and inside both start-screen loops, `pygame.time.delay(10)` as `await asyncio.sleep(0.01)`, and every sound as `.ogg` (pygbag converts the wavs and the mp3 to ogg). The high score lives in the browser's temporary file system, so it resets on reload. Rebuild the same way as TicTacMinMax (folder named `ms`). Not checked: the death / restart / countdown path (`CountDown` relies on `clock.tick(3)` actually sleeping).
  - **Also in the arcade (added 2026-11-24):** TicTacMinMax and FloodFill (public repos, cloned in `~/Projects/tictacminmax` and `~/Projects/floodfill`). **TicTacMinMax runs my real Python** through pygbag: built from a copy of `runner.py` (now `main.py`, the loop wrapped in `async def main()` with `await asyncio.sleep(0)` per frame, `time.sleep` replaced by `await asyncio.sleep`) plus `tictactoe.py` (debug `print`s removed) and the font, into `arcade/tictacminmax/` (`index.html`, `ttt.apk`, `ttt.tar.gz`, `favicon.png`). Rebuild: copy those files to a scratch folder named `ttt`, `pip install pygbag pygame` in a venv, `pygbag --build .`, copy `build/web/*` back. The pygbag page loads its runtime from `pygame-web.github.io` (third party: it's in privacy.html and the CSP must allow it) and shows a start overlay that needs one click or key press before the game runs. **FloodFill** is Java, so pygbag can't: `arcade/floodfill.html` is a JS port. Both are standalone pages the arcade machine's screen can load on "start".
- **willbot demo:** a scripted demo of my local voice assistant using a **generic 3D head and fake voice** (it's based on my friend Will, so no real likeness or voice). 3–4 preset questions with pre-generated audio; three.js head lip-syncs. Small architecture diagram: mic → faster-whisper → Qwen → Chatterbox TTS → three.js head, over Tailscale.
- **Hardware build logs:** photo-first cards with before/after photos and a "what went wrong and how I fixed it" note.
- A little williammod character walking around (A minecraft mod I created) just have the model walk around a little bit in a part of the page

## 7. Content (use clearly marked placeholders where I haven't supplied text/photos)
- About me and what I'm looking for
- Work experience: two IT service desk roles (`[TODO: employer, dates, highlights]`)
- Resume variants (PDF): `[TODO]`
- Projects for `projects.json`:
  - Personal Home Server (FreeBSD, previously Debian + Docker): infrastructure
  - willbot: local voice assistant (faster-whisper, Qwen, Chatterbox TTS, three.js head, Tailscale)
  - Phishing simulation + results dashboard (sanitized data only): security
  - Light Following Car (Arduino, C++, SolidWorks): hardware
  - William Minecraft Mod (Java)
  - 11-bit binary encoder in Minecraft (redstone logic gates): fun / side project, show last. `[TODO: screenshot or GIF, gate count, what was hard]`
  - Bluetooth tube radio mod (in progress): hardware
  - Linux customization (Arch/CachyOS, niri, Quickshell; dotfiles on GitHub)
  - PC Building business (builds, photos): hardware
  - AstroidClone (Pygame): playable
  - styli (added 2026-11-24, in progress, source in `~/Projects/styli`): self-hosted notes app. Handwrite on a tablet or type anywhere, sync between my own devices, a local AI turns handwriting into plain Markdown; notes are ordinary `.md` files. Go core + hub server with a JSON API (web UI not built yet) and an Android app. Design in its `docs/DESIGN.md`. `[TODO: screenshots, category, public repo link or private]`
  - VrankFighters (Pygame): project card only for now, no faces/screenshots until permission is sorted
- Contact: GitHub, LinkedIn, email
- **Never invent stats, testimonials or experience.** Use placeholders like `[PHOTO: Z420 server]` or `[TODO: summary]`.

**Found on my GitHub (github.com/Braydenp006, scanned 2026-11-20).** Use these as the source for project write-ups; descriptions below only say what the repos show. Some repos are private, so link only the public ones.
- **willbot** (public, Python): talking-head assistant in the browser. Browser mic → faster-whisper (speech to text) → Ollama character LLM → Chatterbox voice clone → three.js head that lip-syncs (`jawOpen` morph target). Reached from my phone over Tailscale. Personal files (voice, head model) deliberately kept out of the repo.
- **piListener** (private, Python): "next step in the personal home assistant". Always-listening wake word ("will bot") with Vosk speech recognition; wakes my PC with wake-on-LAN and starts willbot over SSH; fuzzy phrase matching with a confidence threshold. (Likely runs on a Raspberry Pi.) Belongs with willbot.
- **williammod** (public, Java): Minecraft Forge mod adding a custom mob "William", with its own model, animations, sounds, items, and AI goals (follows / tamable follow-owner).
- **Phisher** (public, Python + HTML): phishing-awareness simulation. Sends templated emails (SendGrid SMTP) with per-recipient tracking links to a landing page server (deployed on Render) and renders a results report. Repo only holds sample data.
- **CISC327-227** (public, Python): QA / software-engineering course project with a partner: requirements elicitation paper, plus an Equipment Rental Management Flask REST API with a web UI and automated tests running in GitHub Actions CI.
- **LightControlledCar** (public, C++ / Arduino): RC car steered with a flashlight via four light-dependent resistors, with an ultrasonic distance sensor and two-motor driver (Dec 2023).
- **AstroidClone** (public, Python / Pygame): "Meteor Shower" arcade game with ship sprites, power-ups (health / damage pellets), explosions, sound effects, music and a saved high score.
- **VrankFighters** (public, Python / Pygame): my first game, made to learn Python. Project card only. **Note: the public repo currently contains photos of friends' faces; consider making it private until permission is sorted.**
- **TicTacMinMax** (public, Python): unbeatable tic-tac-toe AI using the minimax algorithm.
- **FloodFill** (public, Java): flood-fill algorithm on image grids (course work).
- **Linux setup:** `dots` (private): Hyprland, eww, waybar, dunst, kitty, starship, matugen theming across several machines; `nixos-config` (private): NixOS flake with home-manager, stylix and niri. Together with the CachyOS/niri/Quickshell setup this is the "Linux customization" project.
- **Client websites (for the Other work page):** `bandits-custom-tables` (private): full site for a local woodworking business (galleries, 3D carousel, lightbox with zoom, contact form); `demos-homepage` (private): Windows 95-style page listing client site previews, hosted on my server.
- Course repos (CISC121, CISC220, CISC235, gradeCalculator) and `mirror-test` are coursework/tests: leave off the site unless I say otherwise.

## 8. Suggested build order
1. Home page: name title card + staggered 5-photo group, with the visual direction nailed first.
2. Resume page with the question flow and the "Just give me a damn resume" button.
3. About me page.
4. How this site runs page with mock data.
5. Projects page structure + `projects.json`.
6. Stats collector on FreeBSD + wiring to the real endpoint.
7. README: run locally, add a project, edit resume questions, deploy.

## 9. Implementation decisions (agreed 2026-11-20)
**Projects shelves (3D)**
- **three.js**, loaded only on the Projects page. **One shared WebGL canvas** laid over the page draws every model into its shelf slot (three.js "multiple elements" technique). Never one canvas per model: browsers cap WebGL contexts at ~16.
- Shelves, title cards and links are **plain HTML/CSS** (accessible, responsive, easy to edit); the canvas only draws the models.
- Models: made in Blender, exported as **`.glb`**, compressed with `gltf-transform` (a one-off command on the model files, not a site build step), aim for **under ~1–2 MB each**. Each model loads when its shelf scrolls near the screen.
- Each model also has a **still image rendered from Blender**: shown while loading, on devices without WebGL, and with reduced motion; also gives the alt text something to describe.
- **Hover: the model spins a little** (eases into a gentle turn while hovered, eases back when the pointer leaves); keyboard focus on the card does the same. No spin with `prefers-reduced-motion`. Click / Enter opens the project detail view.
- willbot head: floats with a gentle idle bob. Arcade machine: screen shows a still until "start", then loads the pygbag game (its own page / iframe) on demand. Old laptop / retro computer: one reusable model whose screen shows a screenshot of the software project.

**Resume page**
- CRT look done in **CSS** (rounded screen, edge vignette, faint scanlines, slight text glow, light flicker); a WebGL barrel-distortion shader only if the CSS version isn't enough.
- Answers are real buttons styled as terminal text; output announced via an `aria-live` region; typing animation skippable and off with reduced motion. "Just give me a damn resume" sits outside the terminal, always visible.
- Rules choose the resume (see section 3).

**Other work page** (plan from 2026-11-23; replaces the earlier "not 3D, screenshots + turntable photos" plan)
- **Only websites and PCs for now**, since that's mostly what I sell.
- **Landing:** two floating items, a **laptop showing a web page** and a **PC**. Clicking one shifts the light so it's lit up more than the other.
- **Then scrolling** makes the chosen item pop out and do an animation, with text appearing at the side describing what I do.
- **Laptop path:** after scrolling, the web page fills the laptop's screen and goes a little way through the client's website, with text appearing around it about the client and what I did; it ends with a **contact form** for people interested in my services (Formspree or a small mail script on my server, hidden honeypot field against spam).
- **PC path:** the PC lands on a desk and turns on a monitor, which then fills the whole screen and shows **photos of all my other builds**.
- Not built yet: `other-work.html` is still a throwaway placeholder.

## 10. To do
- **NEXT: not picked yet.** The home page is done for now; the About page was restyled on 2026-11-23 (see section 11). Candidates: the Other work page (plan in section 9) or the Projects page (build order, section 8).
- **Cache headers on the real server (nginx):** locally `serve.py` sends `Cache-Control: no-cache`; the live server needs the same for HTML (or keep bumping `?v=N`), or browsers run stale pages after deploys. (added 2026-11-23)
- **Remake the previews after changing a page** (`node make-home-previews.mjs` while serving on port 3000): the home laptop and the Resume CRT channels both show these pictures. (added 2026-11-23)
- **OmniRoute** (installed, running on localhost:20128): to let Claude hand bulk jobs to free models, run `omniroute mcp enable --transport streamable-http`, then `claude mcp add -s user --transport http omniroute http://localhost:20128/api/mcp/stream --header "Authorization: Bearer <key from the OmniRoute dashboard>"`, restart Claude Code, and have it check which tool sends a prompt before relying on it. Use it only for big self-contained jobs; never send private details.
- **Untrack tool files** from git (rules already in `.gitignore`): `git rm -r --cached .claude/settings.local.json .claude/skills/impeccable .claude/agents .opencode .impeccable/reference`.
- **A lighter head model** for the home page if `me.glb` (6 MB) loads too slowly from the server.
- **Data placeholders on the About page** (`about-data.js`): certifications, Denison years, degree details, Equipment `[TODO]` texts, hobby ("Off the clock") texts, more detail for the non-tech jobs (older resumes may help). Stats sources: climbing count, chess.com or Lichess, music hours (Spotify or Last.fm; this year or all time).
- **Live stats scripts** for the About page Stats box (Clash Royale trophies, Hevy workouts, climbing, chess rating, music hours) and the **GitHub commit chart** (currently an empty grid). More stats will be added over time.
- **Hand-drawn icons** (About page, 2026-11-23): the hobby and no-logo equipment icons in `assets/icons/` are simple stand-ins drawn by Claude; swap in better ones if wanted.
- **Rig the Meshy model** (Blender / Meshy rigging) so it can idle and nod; the code in `me3d.js` takes animation names in `IDLE` / `GESTURES`.
- **Projects page:** `projects.html` is still a throwaway mock placeholder (so the laptop has something to show); its look is NOT a direction. **Other work** (`other-work.html`, `other-work.js`) is being built for real since 2026-11-23: landing with the floating laptop and PC, the Websites showcase (client sites live on the laptop, alternating Bandits / Bike & Hammer), the PC builds section (model glides into a photo, gallery, details dialog). Its text and photos are mostly `[TODO]`; its old "MOCK PAGE" comment at the top is stale.
- **Decide what to do with `ME.numbers`** in `about-data.js` (the record of figures: not shown anywhere since the one-page layout; kept for the resume/projects pages).
- **Rethink basically all the designs for mobile.** The pages so far are designed for desktop (home grid, resume CRT, how-this-site-runs terminal); phone layouts are only collapsed fallbacks. (added 2026-11-22)
- **Write the text for the "How this site runs" page.** Styling is done; the "About the server" paragraph still has `[TODO: why you host what you do]`, and the route table and hover labels may need a pass. (added 2026-11-22)
- **Replace the temporary About-map photos** (`assets/Pictures/work/temp-*`: New Leaf, Unionville, 1065 Davis Dr, Denison) with my own photos before going live; they are git-ignored so they cannot be committed. The Mary Brown's photo is a free stand-in of the Richmond Hill location. (added 2026-11-22)

## 11. Current state (updated 2026-11-23, evening)
Committed up to `22b6b29` (2026-11-23, GitHub/LinkedIn open animations); the About restyle, real-navigation transitions, the Resume CRT channels and `serve.py` are not committed yet (I commit myself). Pages are plain HTML/CSS/vanilla ES modules; dev server is **`python3 serve.py`** (port 3000; like `http.server` but sends `Cache-Control: no-cache`, because Firefox kept running stale pages). Scripts are still cache-busted with `?v=N` in the HTML (bump after editing).

**Page transitions (all pages, 2026-11-23):** every transition plays over a preloaded copy of the next page (a hidden iframe, or a preview picture), then **navigates the whole tab for real** (`top.location.href`), so the address bar is always right and links like the name → Home work normally. Back is the browser's real Back; when the page comes back from the back/forward cache, the closing animation plays in reverse (`pageshow`). `@view-transition{navigation:auto}` smooths the swap where supported. Fonts on About / Resume / How this site runs use `display=block` so the swap doesn't flash a fallback font. Checks are done with Playwright (Node, `/usr/lib/node_modules/playwright/index.mjs`, Chromium handles WebGL screenshots).

**Working preferences (from feedback):** one step at a time; only change the page being worked on (never touch the others) and check the committed layout before restructuring a page; keep token use down (skip reviews/docs unless asked); every page keeps its own unique look (**no shared header/footer pieces across pages**); avoid gradient-heavy or bland/flat looks; never invent stats (use `[TODO]`); don't copy real game assets/fonts; my email is fine on my own site (homepage mailto, About links) but otherwise private.

**Home (`index.html`, `styles.css` `.tt` section, `home.js`, `home-teletext.js`, `laptop3d.js`, `head-ascii.js`)** — teletext service, built with the Impeccable skill (product notes in `PRODUCT.md`, design system in `DESIGN.md`, the page's brief in `.impeccable/surfaces/index-html.md`). Font: Bedstead (public domain, `assets/fonts/bedstead.woff2`).
- **First screen:** blue double-height header (P100 · BPTEXT · page counter · clock); my name in one double-height row; left: who I am, the offer, GET MY RESUME / EMAIL ME / GitHub / LinkedIn; middle: the laptop; right: the block-drawn Z420, live stats (`stats.js`, sample numbers for now) and "JUMP STRAIGHT TO THE REAL PAGE" (links that open the real pages, 200–600). Along the bottom of the first screen (not fixed): "CLICK HERE TO SEE OTHER SITE PREVIEWS · CLICK THE SCREEN TO GO TO THE FULL PAGE", the coloured keys (ME, RESUME, SERVER, ABOUT, PROJECTS, OTHER WORK; the one on the laptop is underlined) and a P___ box (typing a number works anywhere). A flashing red/yellow "▼ CLICK ME OR SCROLL DOWN ▼" button sits bottom-right until you scroll; clicking it scrolls down for you over 3.5 s (`MS` in `home-teletext.js`).
- **Page 100 (me) leads nowhere:** on 100 the screen isn't a link and the guide's GO TO FULL PAGE is hidden.
- **The laptop** (`laptop3d.js`, model `assets/models/laptop/`, CC0 by While Fun Games): three.js, fixed layer over the page; its lid is split off the mesh and hinged in code; the real `#screen` link is laid on the glass with CSS3DRenderer. Page 100 = me as rotating ASCII (`head-ascii.js`, `me.glb` framed on the head, shaded plain white, Bedstead glyphs in white/cyan/green); other pages = their screenshot redrawn in the 8 teletext colours (`assets/previews/*.webp`, remake with `node make-home-previews.mjs` while serving on port 3000).
- **Scroll flight** (desktop only): the laptop lifts off at the page's speed, shuts, pops out, does one slow full spin (cyan/magenta ghost copies trail it; the header counter flicks through numbers), slows into its landing spot and hovers while the ASCII table rises to meet it, then opens and the guide draws in. 150vh of empty scroll gives it room. Phones: no flight, the laptop sits in the page. Reduced motion: it just swaps places halfway.
- **Desk section:** guide on the left (P-/P+, the page's name band and details, GO TO FULL PAGE, the page list); all pages' text is stacked in one spot so the guide never resizes. Table + laptop on the right, bigger than at the top.
- **Opening pages:** clicking the laptop screen flies the camera into the screen (`lt.zoom` in `laptop3d.js`) with TV static clipped to the glass (`lt.poly`), then the static breaks up as the page comes into focus; Back flies out again. GitHub / LinkedIn (top left) do the same flight with no static: the screen shows that site's colours, logo and address, then the real site loads (they can't be shown live: both refuse embedding); GET MY RESUME and the "jump straight" links open with a teletext row-by-row draw (all in `home.js`). All of them then navigate for real (see Page transitions above).
- `--to` on each link/page = that page's background colour.

**Resume (`resume.html`, `resume.js`, `crt3d.js`, `crt-channel.js`)** — CRT terminal; fits one screen. The top bar's page links **change the CRT's channel** (`crt-channel.js`): green static with rolling zig-zag lines, then a **picture of that page** (`assets/previews/<page>.webp`, letterboxed to the window's shape) rolls in on the screen, with "> Go here" and "> Back to terminal" (or Escape). **Go here** zooms the whole page into the screen until the picture fills the window, then navigates; Back zooms out again. Pictures, not live iframes: a live page loading in a same-origin iframe froze this page for seconds.

**How this site runs (`how-it-runs.html`, `how-it-runs.js`, `server3d.js`)** — fills exactly one screen with no scrolling on windows at least 1101px wide and 950px tall (text above the chart scales with height; shorter windows scroll as before). C64-blue terminal style, LED stats ticker, stats chart, GPU-ASCII 3D HP Z420 (hover labels, side panel falls off, scroll zoom, right-drag pan). New: a **Reset** button (top right of the 3D view: camera glides back, panel goes back on); the top bar's function keys are now **links (Home, About me, Resume, Projects, Other work)** that open with **`slide.js`**: the next page (preloaded in a hidden iframe on hover) slides down from the top pushing this page down, then the tab navigates to it; Back slides it back. Text still needs writing (section 10).

**About (`about.html`, `about.js`, `about-data.js`, `me3d.js`)** — all words live in `about-data.js` (`PLACES`, `ME` incl. `marks` and `contact`, `LIVE`, `EQUIPMENT`, `JOURNAL`).
- **Theme: retro "test chamber"** (restyled 2026-11-23; before that a grey test chamber, and before that the "lab" look picked after trying khaki, navy, myspace, winamp, pastel/cream, 90s teal, Destiny-like, Deep Rock, Cyberpunk): a **dithered pixel backdrop** (mostly white with blue and orange glows in the corners, drawn by `pixelBackdrop()` in `about.js`, 420 px across, ordered/Bayer dither); **see-through frosted panels** (white glass + backdrop blur, no gradients or shadows); **no black anywhere** (text is deep navy `#16304a`, solid bits blue `#1f6fa8` or orange); headings are blue caps over an orange rule. Blue (`--blue #2f8fd0`, `--blue-ink #0a5a8e` for text) = picked / work, orange (`#f7931e`) = pointed at / school. Fonts: Barlow + Barlow Condensed. Tokens on `.about-page` in `styles.css`. Layout uses the full window width.
- **Layout (one screen at 1600×1000 and 2000×1035; Resume/Contact still in view at 1366×768):** left: the **chamber sign** (glass): ◂ Home, name, role, orange rule, four symbols (blue/orange checkered: Servers & infrastructure, Technical sales, Cybersecurity, Mathematics), my details in blue, then "Open to a co-op from May 2027" and Resume (orange) / Contact me / GitHub / LinkedIn. Middle: 3D me, big, on a plate (blue ring, orange glow) inside blue corner brackets. Right: the map in a blue frame; below it Equipment (one row per group: Systems, Languages, Tools, Network, Hardware) with a big readout for the picked item, and Stats (5 live stats, still dashes; GitHub chart, still empty) with Off the clock (hobbies) under it. Bottom: cards for Projects, Resume, How this site runs, Other work. Arriving from another page of the site skips the panels' pop-out (`html.arrived`).
- **Icons:** every equipment item and hobby now has one; the ones Simple Icons doesn't have were drawn by hand (`assets/icons/`: window, disc-copy, cube, pc-tower, belt, carabiner, mountain, dumbbell, tube, mark-*).
- **3D me:** `assets/models/me.glb` (made with Meshy AI from my photo; no skeleton/animations), rendered slightly low-res and pixelated; scripted breathing + slow sway; renders only while visible. **Drag it (or focus it and use ←/→) to spin it round.**
- **Map:** MapLibre 4.7.1 + OpenFreeMap tiles (zoom buttons only on the expanded map; pins that overlap fan out in a ring; each pin has its real name for screen readers), drawn at half resolution (`pixelRatio: .5`) and blown up blocky, water and parks filled with **dither patterns** (added as map images in `about.js`; an SVG dither filter was tried first but made panning choppy), style `assets/map/lab-style.json` in the page's colours (white land, light blue water, orange roads, navy labels; generated by `assets/map/make-style.py`, which also keeps the old parchment `rdr-style.json`; custom IM Fell glyphs in `assets/map/fonts/` are only used by the parchment one). Pins are real buttons with name labels on hover/focus. **Expand** moves the map into a big panel with the timeline beside it; the panel is revealed from the small map's spot and slid so the map stays centred (no jump), Close/Escape/dim click reverses it. A pin or timeline entry opens a **see-through glass details window** (photo + role, dates, place, what I did) that grows out of the pin as a rounded shape and shrinks back into it.
- **Leaving transitions: a pixel wipe** (`pixel-wipe.js`): big blue pixels spread out from what was clicked in dither order with an orange front, cover the screen, then clear the same way. Page cards (via `home.js`) clear to reveal the next page, then navigate; Home / GitHub / LinkedIn navigate once covered. Back clears the pixels again.
- **Photos:** Wikimedia photos for York Region, Mary Brown's (stand-in), Queen's (credits in data); temp git-ignored photos for the rest (see section 10).

## 12. Before launch (added 2026-11-23)
The frontend look is only part of it. Nothing below is done yet; tick items off here as they are.

**Contact and email**
- **Make the email links work for everyone.** Every "email me" is a plain `mailto:` link (home EMAIL ME and the guide's "Ask about a build", About "Contact me", the Other work enquiry button). On a computer with no mail app set up, clicking one does nothing or opens a setup wizard. Options: a real contact form that posts to my own server and emails me (I already run mail on the Z420), or keep `mailto:` but add a "copy address" fallback beside it. A form needs spam protection (a honeypot field or rate limit) and must not expose the server.
- **Test that mail actually arrives** from the form/links, including the subject lines (`Build enquiry`, `Website enquiry`).

**Files** (cleared out 2026-11-23: `placeholder-me.glb`, the parchment map look (`rdr-style.json`, `assets/map/fonts/`, `make-fonts.py`, and its part of `make-style.py`), and every client page/image the Other work laptop doesn't show)
- Keep: `assets/models/WillHead.glb` (not used yet, will be), `assets/Pictures/Funnyres.pdf` (source of `funnyres.webp`, the About page's Resume card), `assets/map/positron-original.json` (the input `make-style.py` builds `lab-style.json` from).
- `unused/` (111 MB of raw videos/HEIC photos/GLB.rar; git-ignored): kept for the Projects page. Never deploy it.
- `work/` now holds only what the laptop shows: Bandits `index.html` + `gallery.html` (the gallery lists every photo in `work/bandits/img/` through the server's folder listing, so nginx needs `autoindex on` for that folder, or it falls back to the photo list in `site.js`), and Bike & Hammer `index.html` with only its images. Re-copying/rebuilding a client site brings back all its pages: delete the unused ones again (Bike & Hammer rebuild: `npx @11ty/eleventy --output=<this repo>/work/bike-and-hammer`, then point its `/...` links at `/work/bike-and-hammer/`).
- Dev-only files that shouldn't be served: `serve.py`, `make-home-previews.mjs`, `make-previews.sh`, `assets/map/make-style.py`, `CONTEXT.md`, `HANDOFF.md`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/`, `.claude/`, `.opencode/`, `README.md` (decide), `.git/`. Deploy with `tools/deploy.sh user@host:/path [go]`: it copies only committed files, minus those dev files (dry run unless `go`).

**Content still missing** (`[TODO]` / placeholder counts as of 2026-11-23: Other work 81, About data 17, Projects 3, About 2, How it runs 2)
- Other work: every highlight's "why", callouts, "What I did"; the Bandits live address (its "Visit the site" link is `#`); check bikeandhammer.com is the new site once live; my own PC's 3D model (`.glb`) and photo, lined up via `data-fill` / `data-yaw` / `data-pitch`; the other builds' photos, specs and "one thing I learnt"; the Custom PCs intro line.
- Projects page: build the real page (still a mock).
- About: the data placeholders and live stats (section 10). How it runs: its text (section 10).
- Replace the git-ignored temp About-map photos with my own (section 10).

**Server and security**
- Put the site behind Cloudflare proxy/Tunnel so the home IP isn't public (section 4).
- HTTPS everywhere, and sensible security headers in nginx (Content-Security-Policy that allows the CDNs used: jsdelivr for three.js, unpkg/maplibre, OpenFreeMap tiles, Fontshare/Google fonts if any remain; plus X-Content-Type-Options, Referrer-Policy).
- Cache headers (section 10): HTML no-cache or keep bumping `?v=N`; long cache for fonts/models/images.
- Gzip/brotli for HTML/CSS/JS/JSON/.glb.
- Shrink the 3D models (`assets/models/`: `me.glb` 6 MB, `CRT.glb` 5.8 MB, `WillHead.glb` 2.7 MB; most pages are 9-14 MB because of them). Run `npx @gltf-transform/cli optimize` (smaller textures, meshopt geometry); meshopt needs `MeshoptDecoder` set on each `GLTFLoader`. Check the models still look right after.
- Turn on Cloudflare's Email Address Obfuscation (Scrape Shield) once the site is proxied: it hides the `mailto:` address from spam scrapers with no code change.
- 404 page: `404.html` is built; add `error_page 404 /404.html;` to nginx.
- **Privacy page** (`privacy.html`, drafted 2026-11-24): set nginx log rotation and put that retention in the page (it says `[TODO: 14]` days), fill in the date, link it from each page's footer, and update its third-party list if any change (Cloudflare, Google Fonts, jsDelivr, OpenFreeMap). Self-hosting the Google Fonts would remove one.
- Live stats endpoint (section 5) and the home page's "sample numbers" replaced with real ones (or the label kept honest).

**Quality checks**
- Every link and button works (internal pages, GitHub, LinkedIn, client sites, resume PDFs).
- Cross-browser: Firefox (my main), Chrome, Safari (WebKit has the most quirks with CSS3D, `@starting-style`, masks, `image-rendering`).
- Performance: page weight and load time over a normal connection; the 3D models (`me.glb` 6 MB) and the Other work iframes are the heavy parts. Lighthouse pass.
- Accessibility: keyboard through every page, focus visible, alt text, contrast, `prefers-reduced-motion` on every animation, and every WebGL page still usable with WebGL off.
- Credits/licences shown where required (CC-BY gaming PC model is credited in the Other work footer; check the map, photos and any other CC-BY items).
- Page titles, meta descriptions, a social share image (Open Graph), favicon.
- Mobile layouts (deliberately later: desktop first, see section 10).

