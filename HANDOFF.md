# Handoff: the Other work page (2026-11-24, fourth session)

The Other work page (`other-work.html`) works end to end, and **every animation on it is approved by the owner**.
**Websites** is done (Bike & Hammer's copy was refreshed this session). **Custom PCs** shows a model of the owner's own
PC built in code: it flies down from the landing, opens into labelled parts you can click, closes, drops into its
photo, and the gallery of other builds rises in.

**Next goal: rethink the PC gallery so it looks a lot cleaner.** It is **blocked on photos**: the owner is waiting to
get photos of the last 3 builds before planning the layout, so don't redesign it until they say they have them. See
"Next work".

Committed up to `fa81cdc`. **Not committed yet:** Connor's PC in `other-work.html`, the pygame-web line added to
`privacy.html`, the new `arcade/` folder and `assets/Pictures/PCs/connor/`. (`HANDOFF.md` and
`CONTEXT.md` are git-ignored.)

## State of the gallery (the thing to redesign)

Six cards in `.ow-gallery` (`other-work.html`, after `<h2>Builds for other people</h2>`); 3 are real, 3 are placeholders:

| Card | Photos (`assets/Pictures/PCs/<name>/`, 1600x1200 webp) | Specs | Still `[TODO]` |
|---|---|---|---|
| Thomas's PC | `thomas-1..3` (card + 2 in the dialog) | Ryzen 5 5600X, RTX 3090, 32GB DDR4-3200, 1.5TB NVMe | month, "one thing I learnt" |
| Jack's PC | `jack-1..3` (card + 2) | Ryzen 5 5600, RX 7600, 16GB DDR4-3600 CL18, 1TB NV2, B550M, AXP90, A550BN, Pano M100R | month, "one thing I learnt" |
| Connor's PC | `connor-1`, `connor-2` (only 2 photos: the card photo repeats in the dialog) | i5-9400, RTX 3060, 16GB DDR4-2400, 512GB SATA SSD | month, "one thing I learnt" |
| builds 5, 6, 7 | none (`[PHOTO]` boxes) | all `[TODO]` | everything |

- The owner said "my other 3 builds": those are the three placeholder cards (5-7).
- Unknown specs are **removed**, not left `[TODO]` (Thomas's and Connor's cards have no Cooling/Case rows). Jack's has
  extra Motherboard and Power rows. The spec list is a free-form `<dl class="ow-specs">`, so a redesign should keep rows
  optional.
- Connor's card photo is a tall phone shot, padded to 4:3 with dark bars rather than cropped (cropping cut the case in
  half). The other photos are centre-cropped to 4:3. The card and dialog both use `object-fit: cover` at 4:3
  (`.ow-card-shot`, `.ow-detail-shots` in `css/styles.css` around lines 935-966), so mixed portrait/landscape photos are
  the main thing a cleaner design has to handle.
- Photos arrive from the owner as zips in `~/Downloads` with HEIC files (ImageMagick here has no HEIC decoder): decode
  with `ffmpeg -i x.heic -frames:v 1 x.png`, then `magick ... -resize 1600x1200 -strip -quality 80 x.webp`.

## Owner's verdict

- **Perfect, do not change:** every PC animation: the flight down from the landing ("Check it out" or scrolling),
  opening up and closing, clicking into parts, Go to gallery, See other builds, Back to top. The Websites side too.
- Liked: the reflective chrome background, the binary-decode labels, the detail on the PSU, GPU and CPU.
- Rules the owner set for motion (keep them for anything new):
  - The page must **never** scroll before the model moves: the model follows the scroll 1:1 and the scroll glide
    carries the one ease in and out. Never ease the glide and the pose both (surges), and never glide the scroll
    steadily while the pose eases (the page moves first).
  - Paths are smooth rounded curves, kept in from the window's edges (a sharp turn near the edge read as "bouncing
    off the wall").

## Files

| Where | What |
|---|---|
| `js/my-pc.js` | The owner's PC built from shapes (Jonsbo D32 Pro, ASRock B550M Pro4, Ryzen 5 3600X, Cooler Master 240L Core, Corsair Vengeance RGB Pro, Gigabyte RTX 3080 Ti Gaming OC, EVGA SuperNOVA 850 GT, Samsung 870 Evo, Kingston NV3). Every part is a named group with its explode direction (`userData.out`), order (`order`), label (`LABELS` at the top). |
| `js/other-work.js` | Everything that moves. The PC path is `pcPose()`; timings are constants (`FLY_SECS`, `OPEN_SECS`, `FOCUS_SECS`...) and the path windows (`HOLD`, `OPEN0/1`, `CLOSE0`, `PC_TRAVEL`, `PC_MERGE`). `along()` walks a curve by distance (Catmull-Rom through points, or a cubic Bezier). |
| `other-work.html` | Markup; `?v=` on the script/stylesheet tags. `my-pc.js` is imported with its own `?v=` inside `other-work.js`: **bump both** after edits (Firefox caches modules hard). Now `other-work.js?v=43`, `my-pc.js?v=32`, `styles.css?v=30` (check the tags: they may have moved). |
| `css/styles.css` | `.ow-*` styles; gallery is `.ow-gallery` / `.ow-card*`; part tags `.ow-tag*`; chrome `.ow-chrome`. |

## How the PC section works

One progress value `P` (`rawPcP`, smoothed into `smoothPcP`):

1. **Flight** (`P` -1..0): the PC section starts 2.5 pages down (`.ow-pc{margin-top:150vh}`), so the flight runs
   over 2.5 pages of scroll. Path (owner's sketch): out right, round a wide loop below where it rests, up into the
   middle (`E`), one turn from its solid side to its glass. Position on the path = `P + 1` exactly. "Check it out" is
   an eased glide to `scrollOfP(0)`. While flying, the chrome background is `position: fixed` behind the PC, feathered
   in just under the landing's bottom edge. When the laptop is picked the PC stays in its landing slot.
2. **Rest** (0..`OPEN0`): **Open it up** / **See other builds** under it (`.is-resting`).
3. **Open** (`OPEN0`..`OPEN1`), **clickable** (`OPEN1`..`CLOSE0`): parts and labels, zoom in on click, Go to gallery.
4. **Close, move left, into the photo** (..`PC_MERGE`), photo soaks in, gallery rises (`--show`, `.is-shown`).
   See other builds jumps from the rest straight into the photo (`pcJump`, `FLY_SECS * 1.1`).
5. **Back to top**: two glides. First (`pcSkip`) the PC spins out of the photo along the floor up to the rest pose in
   the middle while the page glides back to `scrollOfP(0)`; then the page glides to the top and the flight down plays
   backwards, following the scroll (the laptop's Back to top works the same way). `pcUp` hides the buttons throughout.

## Next work

1. **Rethink the PC gallery to look a lot cleaner** (the main goal). It is a plain 3-column grid of cards
   (`.ow-gallery`, `.ow-card`, opening `.ow-dialog` with the `.ow-detail` for that build). **Wait for the owner's
   photos of builds 5-7 first**, then ask what look they want before building (they said it's hard to plan until they
   have them). Leave the animations that lead into it alone: the gallery rises in with the page's `--show` variable
   and `.is-shown`, staggered by `--i` (set in `js/other-work.js` around line 315), and the click handler that opens the
   dialog is around line 364. Open questions to put to the owner: what to do with mixed portrait/landscape photos,
   whether every build needs a dialog, and whether a build with only 2 photos should look different from one with 3.
2. Zoom into a part slightly quicker (`FOCUS_SECS`, 1.6 s). Not done: an edit was blocked; confirm with the owner.
3. Featured photo is still a placeholder: when the owner takes clean photos, line the closed model up with it
   (`data-fill/yaw/pitch` on `.ow-hero-shot`) and tune the warm spotlight.

## How to check it

`python3 tools/serve.py 3100 &` then Playwright from `~/node_modules/playwright` with
`executablePath: ~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`. Pick with
`page.evaluate(() => document.querySelector('.ow-pick[data-path=pc]').click())`, then `.ow-go`, `.ow-pc-open`,
`.ow-pc-skip`, `.ow-pc-gallery`, `.ow-pc-nav .ow-pc-top`. Headless Chromium renders in software (about 4 fps):
judge motion by logging the pose per frame (temporarily push `p` from the render loop to `window.__log`, remove after),
not by screenshots; the owner judges feel in a real browser. Known, not ours: the Bandits site's `site.js` throws
`offsetLeft` of null; `favicon.ico` 404.

## Other open items

`CONTEXT.md` section 10 (to do) and section 12 (before launch). The Projects page is still a mock. Placeholder text is
`[TODO]`. Desktop only (phone widths not checked).

## Site review: worth doing and minor (2026-11-25)

Found in an audit against common AI-site mistakes. Not done yet unless marked.

**Worth doing**
1. Resume PDFs have empty metadata (Author "Un-named", no Title). Set title and author in LibreOffice (File > Properties) before exporting: `assets/Resumes/*.pdf`.
2. No structured data. Add a JSON-LD `Person` block on the home page with name, job, GitHub and LinkedIn links.
3. Copyright year is typed in as "© 2026" on six pages. Update it or generate it at launch.
4. No `security.txt`. Add `/.well-known/security.txt` saying how to report a security problem.

**Minor**
5. No skip-to-content link for keyboard users (Home has many buttons before `<main>`).
6. No print styles. Low priority, since the resume is printed from its PDFs.

**Checked and fine:** external links (LinkedIn returns its usual bot block), all three resume PDFs exist, no GPS or camera data in photos, focus outlines styled, every page has `<main>` and a theme colour.

**Not checked:** colour contrast, keyboard-only use of the 3D and scroll sections, screen-reader behaviour.

## Also done this session (for context)

- **Privacy page** `privacy.html` (footer link on every page). Placeholders left: the owner's email (a hook blocked
  writing it), log retention days (`[TODO: 14]`), the "Last updated" date. Launch checklist item is in `CONTEXT.md` section 12.
- **Site previews** (`assets/previews/*.webp`) remade; `tools/make-home-previews.mjs` now takes page names:
  `node tools/make-home-previews.mjs other-work` (with `python3 tools/serve.py` running on 3000).
- **Bike & Hammer** copy in `work/bike-and-hammer/` refreshed from `~/Projects/bike&hammer` (build with
  `npx @11ty/eleventy --output=<scratch>`, copy only the home page, `css/style.css` and the images it uses, and rewrite
  `/...` paths to `/work/bike-and-hammer/...`). The source repo had an uncommitted `src/css/style.css` change when copied.
- **Arcade demos** (the arcade machine itself isn't built; the Projects page is still a mock): `arcade/tictacminmax/`
  (the owner's real Python via pygbag), `arcade/meteor-shower/` (AstroidClone via pygbag), `arcade/floodfill.html` (a
  JS port, since it's Java). Rebuild steps and caveats are in `CONTEXT.md` section 7. Not tested: Meteor Shower's death /
  restart / countdown path.
- **styli** was added to the projects list in `CONTEXT.md` section 7.
