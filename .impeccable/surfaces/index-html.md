---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["home.js","home-teletext.js"]
---

# Home (index.html)

Mode: Persuade. Audience: recruiters and technical hiring managers equally (PRODUCT.md).
Job: in five seconds, who Brayden is, what he wants (4-month co-op, May 2027), a working way to get his resume or email him; then a scroll through live previews of every other page, each expandable with the window animation (home.js, kept).
Must keep: the window animation that grows a page out of its preview. Must avoid: a corporate look.
User changes after the first build (2026-11-23): Projects and Other work sit side by side on wide screens; previews finer (160x100 blocks) for readability; on the home page a preview opens as TV static that zooms to full screen and clears while the page comes into focus (About keeps the plain window); the PAGES list on P100 opens the real pages (Projects and Other work stay in-page until those pages exist). GITHUB and LINKEDIN stay in the hero: PRODUCT.md lists them as contact routes and technical visitors want the source.
Undecided: real photos (Brayden will shoot them); Projects and Other work pages do not exist yet.

## Direction contract

THESIS: The site as a teletext service. Every page has a three-digit number, the visitor keys or scrolls between them, and each page's preview arrives as block mosaic before resolving into the real screen. Refuses the student-portfolio default: a name over two buttons and a grid of project cards.

OWN-WORLD: Flat black ground, the broadcast eight only: yellow headlines, cyan live figures, white body, red for REVEAL and alerts, green status, magenta feature, blue as the navigation band. Bedstead (public-domain SAA5050 face) for everything; double-height rows for headers; sextant block-mosaic graphics; hard cell-aligned boxes, no radius, no gradients, no shadows.

STORY: The visitor sees the name, the offer and the server it runs on, presses GET MY RESUME or EMAIL, or scrolls: P200 Resume, P300 How this site runs, P400 About me, P500 Projects, P600 Other work. Each page shows what is on it and opens with Watch.

FIRST VIEWPORT: Header row across the top (P100 · BPTEXT · page counter · live clock). Left two-thirds: BRAYDEN PATERSON in double-height yellow/white display filling the width, one white line on who he is, a cyan offer row, then the primary action, a yellow-boxed GET MY RESUME P200, beside EMAIL ME. Right third: a block-mosaic HP Z420 tower with a blinking green LED, cyan live stats under it, then the page index 200–600. Fastext bar (red, green, yellow, cyan) fixed along the bottom with a page-number entry.

FORM: Teletext service (catalog challenger, chosen by the user over the assigned Channel Lineup). seed:47ebb320e44c1b54. Signature interaction: keying three digits (or scrolling) counts the header's page number up to the target like a teletext search, then the page draws row by row; a preview opens through TV static that clears into focus; previews render as 8-colour mosaic and resolve to the real page on hover/focus. Motion grammar: stepped, no easing, row-by-row draw, blink; the one exception is the user-approved open, where grey static fades and the page eases from blur into focus (1.1s); all held still under reduced motion (opening becomes a plain link).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
