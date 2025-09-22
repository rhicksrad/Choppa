This document defines autonomous code-agents you can point at this game codebase to evolve it safely and quickly. Each agent has a tight mandate, explicit inputs/outputs, success criteria, and guardrails. Pick agents selectively and run them in small, reviewable branches.

Shared context

Architecture is an isometric, HTML5-canvas action game using ECS (Entity → ComponentStores → Systems), a custom renderer, Tiled tilemaps, local-storage persistence, and JSON-defined missions.

Key subsystems referenced by agents:

World data: world/tiles/*.json, parsed by parseTiled

Rendering: render/**

ECS: core/ecs/**

Gameplay: game/**

Missions: game/data/missions/*.json, game/missions/**

UI/HUD: ui/**

Audio: core/audio/**

Entry point loop: the file that wires everything together (the one you shared)

Versioning principle: keep gameplay balance and mission JSON backward compatible unless the Design Authority agent has co-signed a schema bump.

0. Design Authority

Scope

Approves player-facing changes, balance, and data-schema bumps across missions, pickups, and AI.

Owns the “what” and constraints; does not code except to update design docs under docs/.

Inputs

Change proposals from other agents

Playtest notes

Outputs

Signed-off ADRs in docs/adr/NNN-*.md

Updated design notes in docs/design/

Success criteria

No incompatible data changes land without an ADR

Changelogs reflect rationale and measurable effect

Guardrails

Cannot merge code without at least one implementation agent approval

1. Map/Tile Agent

Scope

Adds or replaces Tiled maps; validates tile size and collision expectations; ensures map switches are seamless.

Inputs

world/tiles/* sources

Tiled exports

Outputs

Parsed maps via parseTiled wired into missionTilemaps

Smoke test scene loads

Tasks

Verify isoParams reflects active RuntimeTilemap

Ensure FogOfWar.configure() is called with the new map dims

Add map regression test: switching missions updates isoParams and camera bounds

Success criteria

No camera softlocks or fog artifacts after mission swap

Frame budget unchanged on typical hardware

Guardrails

Do not alter rendering math in render/iso without Renderer Agent review

2. Mission/Data Agent

Scope

Curates MissionDef JSON, objectives, spawn lists, and labels; guarantees schema stability.

Inputs

game/data/missions/*.json

game/missions/types.ts

Outputs

New mission JSONs

Label override hooks for dynamic objective text

Tasks

Keep startPos, objectives[*].at, enemySpawns within map bounds

Maintain object radii coherency with HUD and pickup radii

Write lint checks for coordinate ranges and duplicate IDs

Success criteria

Mission loads across cold boot, restart, and win→next transitions

Briefing text fits the in-game briefing layout without clipping

Guardrails

No hardcoded mission logic in systems; use handlers and scenario configs

3. AI/Enemy Agent

Scope

Evolves AAA/SAM/patrol/chaser/speedboat behavior; maintains difficulty curves by wave.

Inputs

game/systems/AIControl.ts, EnemyBehaviorSystem.ts, SpeedboatBehaviorSystem.ts

AI components under game/components/AI.ts

Outputs

Tuned parameters and state machines

New enemy archetypes behind feature flags

Tasks

Keep patrol ranges and aggro/leash values consistent with map scale

Provide per-wave spawn scaling functions that cap CPU cost

Add deterministic RNG usage for reproducible tests

Success criteria

Boats objective fails only when intended thresholds are crossed

Average CPU per frame remains stable under wave peaks

Guardrails

Must not introduce global singletons beyond existing RNG and pools

All new projectiles go through ProjectilePool

4. Combat/Weapons Agent

Scope

Owns weapons, projectile dynamics, hit detection, explosions, damage-queue semantics.

Inputs

WeaponFireSystem, ProjectilePool, DamageSystem

SFX hooks

Outputs

Balance adjustments to damage, TTL, radius

Performance fixes to projectile update/draw

Tasks

Keep AoE radii in tile units coherent with visuals

Ensure screen shake is gated by setting and scales with event magnitude

Add micro-benchmarks for projectile pool capacity, GC churn

Success criteria

No missed hits at high fire rates

No hitches during large explosions or wave endings

Guardrails

Do not bypass DamageSystem when applying effects

5. Renderer Agent

Scope

Optimizes draw order, batching, and visual effects; preserves isometric correctness.

Inputs

render/draw/*, render/iso/*, render/canvas/*

Outputs

Faster renderer with identical output

Optional quality toggles controllable via settings

Tasks

Maintain deterministic Z-order for buildings, units, explosions

Keep parallax, fog, and camera shake compositing consistent

Add offscreen-culling and tile-chunk redraw hints when feasible

Success criteria

Measurable frame-time reduction without visual regressions

No artifacts at map edges or during camera pans

Guardrails

No external rendering libraries

Coordinate system invariants must hold: tile units in world space, pixel units in screen space

6. UI/HUD Agent

Scope

Owns menus, HUD layout, objective strings, minimap dots, and briefing panel.

Inputs

ui/**, loadBindings, drawHUD, menu renderers

Outputs

Accessible, readable HUD that scales with DPI

Consistent input prompts and state transitions

Tasks

Keep text from overlapping at minimum window sizes

Ensure state machine transitions are single-source-of-truth

Persist settings safely via loadJson/saveJson

Success criteria

No stuck states between title, briefing, in-game, paused, game-over, win

HUD remains readable at common resolutions

Guardrails

Avoid side effects in draw calls beyond immediate UI

7. Audio Agent

Scope

Mixes SFX/Music levels, ensures engine intensity follows speed, and pickup crane loop life-cycle is correct.

Inputs

core/audio/*, SFX helpers

Outputs

Volume curves, ducking rules, and failure-safe when muted

Tasks

Respect ui.settings.*Volume everywhere

Verify explosion loudness scales with radius

Ensure cancel/complete paths for crane loop are leak-free

Success criteria

No audio artifacts or clicks on repeated actions

Muting is instantaneous and reversible

Guardrails

No autoplay on page load; only after input

8. Persistence/Progress Agent

Scope

Owns mission unlock logic and local-storage schema; guards backward compatibility.

Inputs

Progress keys: choppa:progress, UI settings choppa:ui

Outputs

Migration helpers for legacy fields

Tests for “win → unlock next” and “game-over → restart”

Tasks

Keep findMissionIndex robust to missing IDs

Never crash on malformed local storage; always default gracefully

Success criteria

Returning players resume cleanly even after schema updates

Guardrails

No PII; keep saves minimal

9. Build/Test Agent

Scope

Test harnesses, smoke tests, performance checks, and linting for data.

Inputs

All agents’ outputs

Outputs

CI scripts and local commands documented in docs/dev.md

Headless unit tests for systems and loaders

Tasks

Add regression tests:

Mission switch updates runtimeMap, isoParams, fog, camera bounds

Wave loop: countdown → spawn → clear → cooldown

Death/respawn cycle preserves fuel/ammo/health caps

Lint mission JSON for duplicate IDs and out-of-bounds coords

Success criteria

Reproducible runs using seeded RNG

CI catches broken state transitions before merge

Guardrails

Keep tests deterministic; mock time and RNG

10. Performance Agent

Scope

Targets GC churn, hot loops, and allocations in per-frame paths.

Inputs

Profiling data from browsers

Outputs

Zero-allocation update paths in projectiles and systems

Pre-sized arrays or pools where helpful

Tasks

Audit projectilePool.update/draw, explosions array, and per-frame closures

Introduce frame-time telemetry for debug overlay

Success criteria

Stable 60 fps on mid-tier laptops at 1080p

No frame spikes at wave boundaries or mass explosions

Guardrails

No micro-optimizations that obscure readability without measurable gain

Coding standards

Keep world units in tiles; convert to pixels only at render time.

Systems must be pure per-frame transforms of component data; side effects go through explicit queues.

New entity kinds must register metadata and clean up in destroyEntity.

RNG usage should be seeded for reproducibility; thread through systems where feasible.

Mission JSON: stable IDs, explicit radii, in-bounds coordinates. Do not depend on implicit map edges.

Extension points

New mission: add JSON, extend missionDefs, configure scenarioConfigs[id], wire tilemap in missionTilemaps.

New enemy: add component type, behavior in systems, drawing in render/sprites/targets, and registration metadata.

New pickup: extend Pickup type, spawn logic, HUD icons, SFX hooks, and collection gating.

Known risks to watch

Mission transitions must reinitialize fog, bounds, and isoParams.

Boat objective failure needs exact counting; ensure handleBoatLanding and wave completion do not race UI state.

Pickup crane sound handles must always cancel on entity destruction or distance break.

Minimal review checklist per PR

Does it keep ECS boundaries clean and avoid hidden globals?

Are mission JSON changes validated and documented?

Do camera bounds, fog, and HUD still behave after map changes?

Are audio and SFX volume paths covered and reversible?

Did you add or update tests for any changed state machine or data schema?
