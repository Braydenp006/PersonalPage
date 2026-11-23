---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["home.js","home-teletext.js","laptop3d.js","head-ascii.js"]
---

# Home (index.html)

Mode: Persuade. Audience: recruiters and technical hiring managers equally (PRODUCT.md).
Job: in five seconds, who Brayden is, what he wants (4-month co-op, May 2027), and a working way to get his resume or email him; then a laptop that previews every other page and opens any of them.
Must avoid: a corporate look. Layout is the user's: name across the top; details, buttons and coloured keys on the left; laptop beside them; Z420 + live stats + jump list on the right (as in commit d912442, plus the laptop).
User decisions (2026-11-23): laptop (CC0 While Fun Games model) instead of a TV; page 100 is the user's head as rotating ASCII from me.glb; coloured keys change the laptop's page; the jump list opens real pages directly (row-by-row draw, not static); scrolling flies the laptop (lid shut, one slow spin, cyan/magenta ghosts, counter flicker) onto an ASCII table where it lands bigger and opens, and the guide (constant size) draws in beside it; a loud flashing scroll hint. GITHUB and LINKEDIN stay in the hero: PRODUCT.md lists them as contact routes.
Undecided: real photos; real Projects and Other work pages (current ones are throwaway mocks); a lighter head model if me.glb (6 MB) is too slow.

## Direction contract

THESIS: The site as a teletext service with one real object in it: a laptop that tunes between the site's numbered pages. Refuses the student-portfolio default: a name over two buttons and a grid of project cards.

OWN-WORLD: Flat black ground, the broadcast eight only: yellow headlines, cyan live figures, white body, red for alerts and the scroll hint, green status, magenta feature, blue as the header band. Bedstead for everything; double-height rows for headers; block-mosaic graphics; hard square boxes, no radius or shadow. The laptop is the one shaded 3D object, flat-shaded with a crisp 128px texture and white edges.

STORY: The visitor sees the name, the offer and the laptop showing his face in ASCII; presses GET MY RESUME or EMAIL, flips the laptop through pages with the coloured keys and opens one, or scrolls to watch the laptop fly onto the desk and read the guide.

FIRST VIEWPORT: Blue double-height header (P100 · BPTEXT · counter · clock). BRAYDEN PATERSON in one double-height row. Left: lede, cyan offer rows, yellow GET MY RESUME 200 beside EMAIL ME, then "CLICK HERE TO SEE OTHER SITE PREVIEWS" over the coloured keys. Centre: the laptop with the ASCII head and "CLICK THE SCREEN TO GO TO THE FULL PAGE". Right: block-drawn Z420, live stats, "JUMP STRAIGHT TO THE REAL PAGE". Flashing "▼ SCROLL DOWN ▼" bottom-right.

FORM: Teletext service (catalog challenger, chosen by the user over the assigned Channel Lineup), extended by the user with the laptop. seed:47ebb320e44c1b54. Signature interaction: the scroll flight (lid shuts, pops out, one full spin trailed by cyan/magenta ghosts while the header counter searches, hovers while the ASCII table rises to meet it, opens) and page changes on the laptop screen (static burst, block-mosaic preview). Motion grammar: stepped (row-by-row draws, counter roll, blink), except the user-approved flight and the static opening that breaks up into the page's focus; all held still under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
