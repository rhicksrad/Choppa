# Choppa

Choppa is a browser-based homage to classic isometric helicopter strike games. Everything runs in TypeScript with a lightweight ECS, Canvas 2D rendering, and a deterministic fixed-step loop.

## Quickstart

```bash
npm install
npm run dev -- --host
```

Open the printed URL in Chrome or Firefox. For a production build:

```bash
npm run build
```

## Deployment

The production site is deployed through the automated workflow in
`.github/workflows/gh-pages.yml`, which builds the project with Vite and uploads the
contents of the `dist/` directory to GitHub Pages. This ensures the published
site always serves bundled JavaScript along with the generated `favicon.ico` and
`manifest.webmanifest` assets, avoiding MIME-type errors or missing resources in
production.

## Controls

- **WASD / Arrow Keys** – Fly the chopper
- **Space / Left Mouse** – Primary cannon
- **Shift / Right Mouse** – Rockets
- **E / Middle Mouse / X** – Missiles
- **R / Q / Tab** – Cycle weapons (1/2/3 for direct selection)
- **Esc** – Pause / Resume / Back
- **M** – Toggle mute

## Project Structure

```
/index.html            Entry page and canvas
/vite.config.ts        Vite configuration
/src/
  core/                ECS, timing, input, audio, utilities
  game/                Components, systems, data
  render/              Camera, isometric projection, sprite painters
  ui/                  HUD, menus, bindings
  world/               Tilemap helpers and sample map
  main.ts              Game wiring and loop
/public/               Favicon and manifest
```

## Gameplay Notes

- Waves spawn patrol drones and chaser gunships; difficulty ramps each wave.
- The mission layer tracks static AAA/SAM objectives. Clear them and survive to win.
- Helicopter fuel and ammo must be recovered from supply crates scattered across the map.
- Explosion, weapon, and engine audio are procedural and respect the mute toggle.

## Known Limitations

- Placeholder art and procedural audio are used until bespoke assets land.
- No persistent progression between sessions beyond local storage of settings.
- AI navigation is simple; terrain collision and friendly units are not yet modelled.
- Mobile/touch controls are not implemented.

## License

- Code: MIT (`LICENSE`)
- Placeholder assets: CC0 (`src/assets/LICENSE`)
