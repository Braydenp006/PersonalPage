# PersonalPage

Brayden Paterson's personal site. Plain HTML + CSS + vanilla JS, no build step.

- **Run locally:** `python3 -m http.server` in this folder, then open http://localhost:8000. (Pages using JS modules, like the resume page, don't work when opened straight from the file.)
- **Colours and fonts:** all in the `:root` block at the top of `styles.css`.
- **Home page photos:** the `EDIT HERE` block in `index.html`. Swap a `<span class="ph">…</span>` placeholder for `<img src="img/photo.jpg" alt="" loading="lazy">`; `--drop` sets how far down each photo sits.
- **Resume page:** the PDFs live in `assets/Resumes/`. **After adding or changing a PDF, run `sh make-previews.sh`** (it makes the page images shown on the on-screen viewer). The versions, the questions and how each answer scores are all in `resume-data.js`. `GENERAL` is the one "Just give me a damn resume" downloads. The monitor is `assets/models/CRT.glb`, drawn by `crt3d.js`. If you swap the model, re-measure `TURN` and `GLASS` at the top of that file (they say where its screen is).
- **How this site runs:** the "About the server" paragraph, the request path and the 3D server's hover labels (the `#parts` list) are plain text in `how-it-runs.html` (marked `EDIT HERE`). The 3D server is built in `server3d.js`. The stats come from `stats.js`: it shows clearly labelled sample numbers until you set `SOURCE` to your stats endpoint (e.g. `'/api/stats'`). The JSON it expects is described at the top of that file.
- **Home page window animation:** `home.js`. Each photo link's `--to` in `index.html` is the background colour of the page it opens.
