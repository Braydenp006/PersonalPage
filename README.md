# Brayden Paterson's personal site

I really wanted to make a site where I could push the limits of what I thought I could do. That's why a lot of the pages are over the top and extremely stylized. If you're going to make a personal page, it might as well be fun to go through.

It's plain HTML, CSS and JavaScript with no framework and no build step, and I serve it myself from the HP Z420 running FreeBSD in my house.

> Work in progress. The site isn't live yet, so some numbers on the pages are sample data and a few placeholders are still in. The screenshots are from the current build and I'll update them.

<p align="center">
<img width="100%" alt="home" src="https://github.com/user-attachments/assets/a8e8f968-ec92-442d-9adf-6dc9c5e6dcab" />
</p>
<p align="center"><sub><b>Home:</b> a teletext service with page numbers 100 to 600, a 3D laptop, and a rotating ASCII version of me.</sub></p>

<p align="center">
<img width="48%" alt="resume" src="https://github.com/user-attachments/assets/180f187a-403e-4ec7-86ba-6531ce783c05" />
<img width="48%" alt="server" src="https://github.com/user-attachments/assets/98f8f000-e58f-4a63-b9d2-3746cf0f940d" />
</p>
<p align="center"><sub><b>Resume</b> (left) and <b>How this site runs</b> (right)</sub></p>

## The pages

- **Home:** an old teletext screen you can click through or navigate by typing a page number.
- **Resume:** a CRT monitor boots up and asks three quick questions about the role you're hiring for, then hands you the version of my resume that fits. There's a button to skip it if you'd rather not play along.
- **How this site runs:** the server this site is served from, a 3D model of it, how a visit gets here, and stats over time.
- **About me, Projects and Other work:** still being filled in.

<details>
<summary><b>Notes for editing and running it</b></summary>

Brayden Paterson's personal site. Plain HTML + CSS + vanilla JS, no build step.

- **Run locally:** `python3 serve.py` in this folder, then open http://localhost:3000 (it tells the browser not to reuse stale copies; plain `python3 -m http.server` works too, but Firefox may keep running old pages and scripts after edits). (Pages using JS modules, like the resume page, don't work when opened straight from the file.)
- **Colours and fonts:** all in the `:root` block at the top of `styles.css`.
- **Home page:** a teletext service (black screen, page numbers 100–600) with a 3D laptop. Words are in the `EDIT HERE` blocks in `index.html`: the intro, the coloured keys, and one `.tt-ch` block per page for the guide by the table (its `data-href`, `data-to` background colour, `data-src` preview and `data-band` colour). Colours are the `--tt-*` tokens on `.tt` in `styles.css`. `home-teletext.js`: page counter, clock, typing a number, the screen's pages, the Z420 drawing (`Z420` picture) and live stats. `laptop3d.js`: the laptop and its scroll flight. `head-ascii.js`: me as rotating ASCII on page 100. `home.js`: how pages open (static from the screen, row-by-row draw from links). The About work table comes from `PLACES` in `about-data.js`, the quick download from `GENERAL` in `resume-data.js`. **After changing any page, remake the previews:** serve the site on port 3000, then `node make-home-previews.mjs`. `projects.html` and `other-work.html` are throwaway placeholders.
- **Resume page:** the PDFs live in `assets/Resumes/`. **After adding or changing a PDF, run `sh make-previews.sh`** (it makes the page images shown on the on-screen viewer). The versions, the questions and how each answer scores are all in `resume-data.js`. `GENERAL` is the one "Just give me a damn resume" downloads. The monitor is `assets/models/CRT.glb`, drawn by `crt3d.js`. If you swap the model, re-measure `TURN` and `GLASS` at the top of that file (they say where its screen is).
- **How this site runs:** the "About the server" paragraph, the request path and the 3D server's hover labels (the `#parts` list) are plain text in `how-it-runs.html` (marked `EDIT HERE`). The 3D server is built in `server3d.js`. The stats come from `stats.js`: it shows clearly labelled sample numbers until you set `SOURCE` to your stats endpoint (e.g. `'/api/stats'`). The JSON it expects is described at the top of that file.

</details>
