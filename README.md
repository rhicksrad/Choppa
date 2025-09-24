# Choppa

Choppa is a browser-based homage to classic isometric helicopter strike games. The final campaign spans four handcrafted missions with cinematic briefings, reactive audio, and a deterministic fixed-step loop written entirely in TypeScript.

## Campaign highlights

- **Operation Dawnshield** – Level the alien forward bases, repel escalating drone waves, and airlift stranded survivors out of the valley.
- **Operation Stormbreak** – Launch from the carrier deck, silence roaming mortar platforms, and escort convoy ships past relentless strike boats.
- **Operation Starfall** – Infiltrate the mothership hangar, shred three shield conduits, and breach the hull before the invasion fleet escapes.
- **Operation Black Sun** – Fight across the alien homeland, plant a nuke in the hivemind well, and survive the two-phase Vorusk encounter to finish the war.
- **Powerup draft** – Between sorties, pick from escalating upgrade rounds to expand ammo reserves, reduce weapon cooldowns, and boost warhead yield.

## Core features

- **Responsive flight & combat** – WASD flight with strafe thrusters supports mouse-aimed machine guns, guided missiles, and devastating hellfires tuned around reproducible physics.
- **Enemy variety** – AAA emplacements, SAM towers, drones, gunships, strike boats, and late-game bosses mix projectile patterns and objective pressure.
- **Mission scripting** – Objectives track destruction, timed waves, evac counts, and extraction pads to pace each theater.
- **Achievements** – Ten unlockable achievements celebrate perfect evacuations, flawless convoy escorts, and campaign completion; unlocked medals persist in local storage.
- **Persistent settings** – Audio mix, fog-of-war, minimap visibility, screen shake, and key bindings save between runs for quick relaunches.

## Controls

- **WASD / Arrow Keys** – Fly the chopper
- **Q / E** – Strafe left / right
- **Left Mouse / Space** – Machine gun
- **Right Mouse / Shift** – Missiles
- **Middle Mouse / Ctrl** – Hellfires
- **Esc** – Pause / Resume / Back
- **M** – Toggle mute
- **Title Screen → Settings** – Adjust audio sliders, fog-of-war, screen shake, minimap, and input bindings

## Development setup

1. Install Node.js 18 or newer.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (add `--host` to expose on your LAN):
   ```bash
   npm run dev -- --host
   ```

### Useful scripts

- `npm run build` – Create a production build under `dist/`.
- `npm run preview -- --host` – Preview the production bundle locally.
- `npm run lint` – Type-check and lint the TypeScript source with ESLint.
- `npm run pages:deploy` – Push the contents of `dist/` to the `gh-pages` branch.

## Deployment

The production site is deployed through `.github/workflows/gh-pages.yml`. The workflow installs dependencies, runs the Vite build, and publishes the generated `dist/` artifacts (including `favicon.ico`, `manifest.webmanifest`, and `og-image.png`) to GitHub Pages.

## Project structure

```
/index.html            Entry page and canvas
/vite.config.ts        Vite configuration
/src/
  core/                ECS, timing, input, audio, utilities
  game/                Campaign data, systems, spawn factories
  render/              Camera, isometric projection, sprite painters
  ui/                  HUD, menus, bindings, achievements overlay
  world/               Tilemap helpers and runtime maps
  main.ts              Game wiring and loop
/public/               Audio, favicon, manifest, Open Graph preview
```

## Persistence & accessibility

- Campaign progress, unlocked achievements, and settings persist in `localStorage` for returning pilots.
- Mouse-free menus and large-font HUD keep the action readable even during heavy effects.

## Known limitations

- Placeholder art and procedural audio remain until bespoke assets land.
- No persistent progression between campaigns beyond stored settings and achievements.
- AI navigation favors simple pathing; terrain collision and friendly formations are still evolving.
- Mobile/touch controls are not implemented.

## License

- Code: MIT (`LICENSE`)
- Placeholder assets: CC0 (`src/assets/LICENSE`)
