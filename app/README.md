# Momsly — Your Smart Parenting Companion

A premium, installable Progressive Web App for new parents. Pure HTML/CSS/vanilla JS — no frameworks, no backend, no build step.

## Run it locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly via `file://` will **not** work — the Service Worker and `fetch()`-based routing require an actual HTTP origin.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo (root, or a `/docs` folder).
2. Repo Settings → Pages → set source to that branch/folder.
3. Done — Momsly needs no environment variables, database, or build step.

## What's implemented and fully functional

- **Auth**: signup / login / forgot-password, local-only account stored in `localStorage` (no backend, so passwords never leave the device).
- **7-day trial → Lifetime Premium**: trial countdown banner, premium-gated tools/trackers, Gumroad checkout link (`upgrade.html`), plus a local "I already purchased" unlock since there's no server to verify a receipt against.
- **Tracker** (`tracker.html`): 14 tracker types (feeding, breastfeeding, pump, sleep, diaper, medicine, weight, height, vaccine, temperature, mood, teething, water, solids), each with its own quick-log form, history list, delete, and canvas-based bar/line charts.
- **Smart Feeding & Sleep Timers**: live running timer persisted across reloads, next-feed prediction from recent history, sleep score + wake prediction.
- **Reminders**: one-time / daily / interval reminders, real browser Notifications (with sound + vibration fallback to in-app toast), a 30-second due-check loop.
- **AI Daily Planner**: a deterministic, age-aware rule engine (wake windows, feed intervals) — genuinely generated from your inputs, not a static template.
- **Milestones**: timeline with presets, confetti on completion.
- **Tools page**: all ~35 tools from the spec, searchable/filterable, favoritable. Checklists (hospital bag, school, packing, shopping), mood journal, emergency contacts, budget + expense tracker + savings goal, activity generator, meal planner, breathing exercise, self-care prompts, photo memories (stored as local data URLs), and a locally-generated sleep-sounds/white-noise/lullaby player (Web Audio, no audio files needed).
- **Data**: CSV export, printable PDF report, full JSON backup/restore, reset-all-data.
- **PWA**: manifest + generated icon set, offline-capable Service Worker (cache-first app shell), install prompt banner, `offline.html` fallback.
- **Design**: the exact pink→purple palette and token set from the brief, dark mode, confetti/ripple/skeleton micro-interactions, mobile-first bottom nav.

## Honest scope notes

- There's no backend by design (matches the "no backend, GitHub Pages, local storage" requirement), so: passwords are a local-only demo store (not for real user credentials at scale), Premium unlock after Gumroad checkout is an honor-system local toggle rather than server-verified, and background push notifications only fire reliably while the app is open or backgrounded on the device (true closed-app push needs a push server).
- Sleep Sounds / White Noise / Lullaby are generated locally with the Web Audio API rather than licensed audio files — genuinely playable, just synthesized tones instead of recordings.
- Growth chart percentile curves (comparing to population data) aren't included — the Weight/Height/Temperature trackers chart the child's own logged history over time, not WHO/CDC percentile bands.

## File map

See the original spec's file list — every named file exists in this folder (`app.js`, `router.js`, `storage.js`, `auth.js`, `notification.js`, `scheduler.js`, `feeding.js`, `sleep.js`, `tracker.js`, `milestones.js`, `tools.js`, `pages.js`, `ui.js`, `components.js`, `charts.js`, `utils.js`, `export.js`, `share.js`, `backup.js`, `data.js`, `logic.js`, plus all HTML pages, `manifest.json`, `sw.js`, and the three CSS files).
