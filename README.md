# TimeLine

A zoomable, mindmap-style horizontal timeline for tracking events and date ranges —
built as an **installable, offline Progressive Web App (PWA)**. Zero dependencies,
no build step: it's a single `index.html` plus a manifest, a service worker, and icons.

## Install it on your phone (recommended)

Once this is served over HTTPS (see **Hosting** below), open the URL on your phone and
add it to your home screen:

- **iPhone (Safari):** Share → **Add to Home Screen**.
- **Android (Chrome):** menu (⋮) → **Install app** / **Add to Home screen**.

It then launches full-screen like a normal app and works **fully offline** — your data
lives on the device (IndexedDB) and the app shell is cached by the service worker.

You can also just open the URL in any browser on your laptop without installing.

## Hosting (GitHub Pages)

A PWA needs HTTPS to install, so open it via GitHub Pages rather than a local file:

1. In the repo: **Settings → Pages**.
2. **Build and deployment → Source: Deploy from a branch**.
3. Pick the branch that holds these files and folder **/ (root)**, then **Save**.
4. After a minute it's live at `https://<username>.github.io/TimeLine/`.

Open that URL on your phone and install it.

## Features

- **Axis starting November 2026** with month blocks. Months are added manually and always
  in order: **+** at the right end adds the next month, **−** removes the last month (with a
  confirmation that warns if any items fall in it — those items stay saved).
- **Pan** (drag empty space) and **zoom** (scroll / pinch). Fully zoomed out shows about
  two months. **Settings (⋯) → Fit to start** re-centers.
- **+ Event** — pick a date to spawn a draggable card with a **fixed connector line** to its
  exact date on the axis. Drag it anywhere (position is saved); **click to expand** for notes,
  edit, and delete.
- **+ Range** — a start/end date drawn as a **low-opacity bar** along the axis. Overlapping
  ranges stack and share height (one range fills half the band; more overlap makes each thinner).
- **Categories** — create your own, **rename** them, change colors, and delete them. Deleting a
  category that's in use doesn't block: those items move to **Uncategorized** (grey).
- **Dates shown as dd/mm/yyyy.** (The native date picker's own text follows your phone's
  region setting; everything the app displays is dd/mm/yyyy.)
- **Past items grayed out** — events before today, and ranges whose end date is before today.
- **Delete** everywhere with a confirmation popup.
- **Settings (⋯) → Reset all data** restores the sample data (tucked away so it's not easy to
  hit by accident).

## Not yet (planned)

- Sync across devices (a small server over Tailscale; whole-dataset last-write-wins).
- A normal calendar (month/agenda) view of the same events.
- Eventually a rebuild on React + Vite + React Flow as the production stack.

See `.kiro/specs/timeline-app/` for the full requirements and design.

## Files

- `index.html` — the whole app (UI + logic, inline).
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` — PWA plumbing.
- `make-icons.mjs` — regenerates the icons (`node make-icons.mjs`), no dependencies.
- `selfcheck.mjs` — runs the core logic (month math, date→pixel mapping, dd/mm/yyyy,
  category fallback, overlap stacking, zoom clamp) outside the browser: `node selfcheck.mjs`.
