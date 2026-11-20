# TimeLine — prototype

A zoomable, mindmap-style horizontal timeline for tracking events and date ranges.
This branch holds an early **prototype** to validate the core interaction before the
full app is built. It is a single self-contained HTML file with **no dependencies and
no build step**.

## How to open it

Download **`timeline.html`** and open it in any browser — on your laptop or your phone.

- **Laptop:** double-click the file, or drag it into a browser tab.
- **Phone:** save the file to your device and open it with your browser. (On GitHub,
  open the file, tap **Raw**, then open/save it.)

Your data is stored locally in the browser (IndexedDB) and survives reloads. Each
browser/device keeps its own data for now — syncing between devices comes later.

## What the prototype does

- **Axis starting November 2026** with month blocks; a **"+"** at the right end adds the
  next month (months are added manually, always in order).
- **Pan** by dragging empty space; **zoom** with scroll / pinch. Fully zoomed out shows
  about two months.
- **+ Event** — enter a date to spawn a draggable card with a **fixed connector line** to
  its exact date on the axis. Drag the card anywhere (position is saved); **click to expand**
  it for notes, edit, and delete.
- **+ Range** — a start/end date drawn as a **low-opacity bar** along the axis. Overlapping
  ranges stack and share height (one range fills half the band; more overlap makes each thinner).
- **Category colors** (Deadline / Exam / Admin / Personal) and **past items grayed out**
  (for the demo, "today" is fixed to 20 November 2026).
- **Delete** everywhere with a confirmation popup; a **Reset data** button starts fresh.

The prototype is seeded with a few sample events and two overlapping ranges so there is
something to see on first open.

## Not in this prototype (planned for the full app)

- Server + manual **Sync** across devices (over Tailscale).
- Installable **PWA** (add-to-home-screen, offline app shell).
- Full category management.

The full app is planned on React + TypeScript + Vite (React Flow canvas), with a small
Fastify + SQLite backend. See `.kiro/specs/timeline-app/` for the requirements and design.

## Developer self-check

`selfcheck.mjs` runs the prototype's core logic (month math, date→pixel mapping, graying
rules, range overlap stacking) outside the browser:

```
node selfcheck.mjs
```
