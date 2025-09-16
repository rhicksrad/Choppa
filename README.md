# VineStrike

VineStrike is a browser-based homage to classic isometric helicopter strike games. The MVP now ships with a sprawling isometric theatre, multi-mission campaign flow, reactive enemies, and a light upgrade & pickup system – all built in TypeScript on top of a lightweight ECS, Canvas 2D rendering, and a deterministic fixed-step loop.

## Quickstart

```bash
npm install
npm run dev -- --host
```

Open the printed URL in Chrome or Firefox. Useful scripts:

- `npm run dev -- --host` – start the Vite dev server
- `npm run build` – produce an optimized build
- `npm run lint` – run ESLint over the source

## Controls

- **WASD / Arrow Keys** – Fly the chopper
- **Space / Left Mouse** – Primary cannon
- **Shift / Right Mouse** – Rockets
- **E / Middle Mouse / X** – Missiles
- **R / Q / Tab** – Cycle weapons (1/2/3 for direct selection)
- **Esc** – Pause / Resume / Back
- **M** – Toggle mute

## Features

- **Campaign** – Three bespoke missions with briefings, objectives, and wave pacing. Select an operation from the new mission screen.
- **Large theatre** – A 96×96 tile isometric map with river, coastline, and plateau zones inspired by classic 16-bit strike games.
- **Upgrades & pickups** – Destroying depots or exploring the map rewards fuel, repairs, intel, and weapon upgrades that persist until you abandon the mission.
- **Destructibles** – Fuel depots, radar, bunkers, and comms towers can be demolished; many eject pickups or advance objectives when destroyed.
- **Enemy ecology** – Static AAA/SAM sites, patrolling drones, and chaser gunships coordinate through wave spawning with increasing difficulty.
- **HUD & minimap** – Live objective tracking, upgrade indicators, minimap, mission timer, and compass cue to the active objective.
- **Audio & polish** – Procedural engine, weapon, explosion, and pickup cues respect the mute toggle; mission intros and menus provide flow.

## Project Structure

```
/index.html            Entry page and canvas
/vite.config.ts        Vite configuration
/src/
  core/                ECS, timing, input, audio, utilities
  game/                Components, systems, missions, data
  render/              Camera, isometric projection, sprite painters
  ui/                  HUD, menus, bindings
  world/               Tilemap helpers and generated map
  main.ts              Game wiring and loop
/public/               Favicon and manifest
```

## Gameplay Notes

- Start a mission from the **Select Operation** screen; briefings recap objectives and recommended targets.
- Clear objective circles (destroy / collect / reach) to progress. Intel and rescue pickups advance collection objectives automatically.
- Destructible structures award score and often spawn fuel, repair, ammo, or upgrade crates – grab them to boost survivability and firepower.
- The forward pad (highlighted on the map) refuels the helicopter. Watch the HUD compass for guidance to the next objective.
- Survive the escalating patrol and chaser waves; between waves you have a short respite to rearm or complete mission goals.

## Known Limitations

- Placeholder art and procedural audio are used until bespoke assets land.
- No persistent progression beyond the current run – upgrades reset when you leave a mission and settings only live locally.
- Enemy AI and navigation are intentionally lightweight; terrain collision and friendly squads are future enhancements.
- Mobile/touch controls are not implemented.

## License

- Code: MIT (`LICENSE`)
- Placeholder assets: CC0 (`src/assets/LICENSE`)
