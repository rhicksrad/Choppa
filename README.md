### VineStrike

Isometric helicopter action built with TypeScript + Vite + Canvas 2D.

Codename VineStrike — an original homage to early-90s isometric action. All names, art, sounds, and code are original.

### Tech

- Vite + TypeScript (strict)
- Canvas 2D (no WebGL)
- ECS-lite architecture, deterministic fixed-timestep
- 100% static hosting (GitHub Pages)

### Getting Started

Prerequisite: Node.js 18+

Install

```bash
npm ci
```

Run (dev)

```bash
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

Build

```bash
npm run build
```

Outputs to `dist/`.

Preview build

```bash
npm run preview
```

### Deploy (GitHub Pages)

This repo auto-deploys on push to `main`.

- Workflow builds and publishes `dist/` to the `gh-pages` branch.
- Ensure Settings → Pages deploys from the `gh-pages` branch (root).
- Asset URLs are relative via Vite `base: './'`.

### Controls (Phase 0 placeholder)

- WASD: movement
- Mouse: aim
- Esc: pause

Remapping and full input schema will land in later phases.

### Project Structure (high-level)

```
/index.html
/vite.config.ts
/public/
/src/
  main.ts
  core/ (ecs, math, time, input, audio, assets, util)
  render/ (camera, iso, sprites, draw, debug)
  world/ (tiles, collisions, pathing)
  game/
    components/
    systems/
    data/ (tilesets, maps, missions, entity-presets)
    scenes/
  ui/ (hud, menus, input-remap)
  assets/
/.github/workflows/gh-pages.yml
```

### License

- Code: MIT (see `LICENSE`)
- Original assets in `src/assets/`: CC0 1.0 (see `src/assets/LICENSE`)

### Phase Plan

- Phase 0 — Scaffold & Pages (this commit)
- Phase 1 — Core Engine
- Phase 2 — Iso Map + Camera
- Phase 3 — Player Flight Model
- Phase 4 — Weapons & Projectiles
- Phase 5 — Enemies & AI
- Phase 6 — Mission System + HUD
- Phase 7 — Polish & MVP Ship

### Manual Test Checklist (Phase 0)

1. `npm ci` installs dependencies without errors
2. `npm run dev` starts Vite and serves index
3. Canvas fills the window and shows the phase splash
4. Resize window — canvas resizes without blurring
5. `npm run build` completes without errors
6. `npm run preview` serves built site correctly
7. No console errors in latest Chrome/Edge/Firefox
8. ESLint runs: `npm run lint`
9. Prettier formats: `npm run format`
10. Push to `main` triggers GitHub Pages deployment

### Credits

Created by the VineStrike team (original code and placeholder assets).
