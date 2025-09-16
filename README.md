# VineStrike

VineStrike is a browser-based homage to classic isometric helicopter strike games. Everything runs in TypeScript with a lightweight ECS, Canvas 2D rendering, and a deterministic fixed-step loop.

## Quickstart

```bash
npm install
npm run dev -- --host
```

Open the printed URL in Chrome or Firefox. For a production build:

```bash
npm run build
```

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
- Helicopter health, ammo, and fuel are replenished at the central refuel pad.
- Explosion, weapon, and engine audio are procedural and respect the mute toggle.

## Known Limitations

- Placeholder art and procedural audio are used until bespoke assets land.
- No persistent progression between sessions beyond local storage of settings.
- AI navigation is simple; terrain collision and friendly units are not yet modelled.
- Mobile/touch controls are not implemented.

## License

- Code: MIT (`LICENSE`)
- Placeholder assets: CC0 (`src/assets/LICENSE`)
