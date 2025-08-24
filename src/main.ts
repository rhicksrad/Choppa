import { GameLoop } from './core/time/loop';
import { InputManager } from './core/input/input';
import { DebugOverlay } from './render/debug/overlay';
import { parseTiled } from './world/tiles/tiled';
import { IsoTilemapRenderer } from './render/draw/tilemap';
import { isoMapBounds, tileToIso, screenToApproxTile } from './render/iso/projection';
import { Camera2D } from './render/camera/camera';
import { ParallaxSky } from './render/draw/parallax';
import sampleMapJson from './world/tiles/sample_map.json';
import { EntityRegistry } from './core/ecs/entities';
import { ComponentStore } from './core/ecs/components';
import type { Transform } from './game/components/Transform';
import type { Physics } from './game/components/Physics';
import type { Fuel } from './game/components/Fuel';
import type { Sprite } from './game/components/Sprite';
import { SystemScheduler } from './core/ecs/systems';
import { MovementSystem } from './game/systems/Movement';
import { RotorSpinSystem } from './game/systems/RotorSpin';
import { FuelDrainSystem } from './game/systems/FuelDrain';
import { RefuelRearmSystem, type RefuelPad } from './game/systems/RefuelRearm';
import { drawHeli, drawPad } from './render/sprites/heli';
import { WeaponFireSystem, type FireEvent } from './game/systems/WeaponFire';
import type { Ammo } from './game/components/Ammo';
import type { WeaponHolder } from './game/components/Weapon';
import { RNG } from './core/util/rng';
import { ProjectilePool } from './game/systems/Projectile';
import type { AAA, SAM } from './game/components/AI';
import { AIControlSystem } from './game/systems/AIControl';
import { drawAAATurret, drawSAM } from './render/sprites/targets';
import { Menu } from './ui/menus/menu';
import { createUIStore, type UIStore } from './ui/menus/scenes';
import { renderSettings, renderAchievements, renderAbout } from './ui/menus/renderers';
import { FogOfWar } from './render/draw/fog';
import { DamageSystem } from './game/systems/Damage';
import { MissionTracker } from './game/missions/tracker';
import { loadMission } from './game/missions/loader';
import type { MissionDef } from './game/missions/types';
import missionJson from './game/data/missions/sample_mission.json';
import type { Health } from './game/components/Health';
import type { Collider } from './game/components/Collider';
import { drawHUD } from './ui/hud/hud';
import { loadJson, saveJson } from './core/util/storage';
import { loadBindings, isDown } from './ui/input-remap/bindings';
import { AudioBus } from './core/audio/audio';
import { EngineSound, playCannon, playRocket, playMissile, playExplosion } from './core/audio/sfx';
import { CameraShake } from './render/camera/shake';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element with id "game" not found');
const context = canvas.getContext('2d');
if (!context) throw new Error('Failed to get 2D context');

function resizeCanvasToDisplaySize(): void {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const displayWidth = Math.floor(canvas.clientWidth * dpr);
  const displayHeight = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvasToDisplaySize);
resizeCanvasToDisplaySize();

// Input
const input = new InputManager();
input.attach(window);

// Debug overlay toggle with tilde
const debug = new DebugOverlay();
window.addEventListener('keydown', (e) => {
  if (e.key === '`' || e.key === '~') debug.toggle();
});

// UI store and menus
const ui: UIStore = loadJson<UIStore>('vinestrike:ui', createUIStore());
const titleMenu = new Menu([
  { id: 'start', label: 'Start Mission' },
  { id: 'settings', label: 'Settings' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'about', label: 'About' },
]);
const bindings = loadBindings();

// Simple counters for FPS & dt
let fps = 0;
let frames = 0;
let accumulator = 0;

// Phase 2: load a sample isometric map and set up camera
const renderer = new IsoTilemapRenderer();
const camera = new Camera2D({ deadzoneWidth: 160, deadzoneHeight: 120, lerp: 0.12 });
const sky = new ParallaxSky();
const fog = new FogOfWar(0.78);
const bus = new AudioBus({ masterVolume: 0.9, musicVolume: 0.4, sfxVolume: 0.9 });
const engine = new EngineSound(bus);
const shake = new CameraShake();

// ECS world
const entities = new EntityRegistry();
const transforms = new ComponentStore<Transform>();
const physics = new ComponentStore<Physics>();
const fuels = new ComponentStore<Fuel>();
const sprites = new ComponentStore<Sprite>();
const ammos = new ComponentStore<Ammo>();
const weapons = new ComponentStore<WeaponHolder>();
const aaas = new ComponentStore<AAA>();
const sams = new ComponentStore<SAM>();
const healths = new ComponentStore<Health>();
const colliders = new ComponentStore<Collider>();

// Systems
const scheduler = new SystemScheduler();
const rng = new RNG(1337);
const projectilePool = new ProjectilePool();
const fireEvents: FireEvent[] = [];
const weaponFire = new WeaponFireSystem(transforms, physics, weapons, ammos, fireEvents, rng);
let isoParams = { tileWidth: 64, tileHeight: 32 };
let runtimeMap: ReturnType<typeof parseTiled> | null = null;
const damage = new DamageSystem(transforms, colliders, healths);
const mission = new MissionTracker(
  loadMission(missionJson as MissionDef),
  transforms,
  colliders,
  healths,
  () => ({ tx: transforms.get(player)!.tx, ty: transforms.get(player)!.ty }),
);

runtimeMap = parseTiled(sampleMapJson as unknown);
isoParams = { tileWidth: runtimeMap.tileWidth, tileHeight: runtimeMap.tileHeight };
// Create a refuel pad near center
const pad: RefuelPad = {
  tx: Math.floor(runtimeMap.width / 2) - 2,
  ty: Math.floor(runtimeMap.height / 2) + 1,
  radius: 1.2,
};

// Create player heli entity
const player = entities.create();
transforms.set(player, {
  tx: runtimeMap.width / 2,
  ty: runtimeMap.height / 2,
  rot: 0,
});
physics.set(player, {
  vx: 0,
  vy: 0,
  ax: 0,
  ay: 0,
  drag: 0.8,
  maxSpeed: 4.2,
  turnRate: Math.PI * 2,
});
fuels.set(player, { current: 65, max: 100 });
sprites.set(player, { color: '#92ffa6', rotor: 0 });
ammos.set(player, {
  cannon: 200,
  cannonMax: 200,
  rockets: 12,
  rocketsMax: 12,
  missiles: 6,
  missilesMax: 6,
});
weapons.set(player, { active: 'cannon', cooldownCannon: 0, cooldownRocket: 0, cooldownMissile: 0 });
healths.set(player, { current: 100, max: 100 });
colliders.set(player, { radius: 0.4 });

// Register systems
scheduler.add(new MovementSystem(transforms, physics));
scheduler.add(new RotorSpinSystem(sprites));
scheduler.add(new FuelDrainSystem(fuels));
scheduler.add(new RefuelRearmSystem(transforms, fuels, [pad]));
scheduler.add(weaponFire);
scheduler.add(
  new AIControlSystem(transforms, aaas, sams, fireEvents, rng, () => ({
    x: transforms.get(player)!.tx,
    y: transforms.get(player)!.ty,
  })),
);

const loop = new GameLoop({
  update: (dt) => {
    // Consume input snapshot
    const snap = input.readSnapshot();

    // Global UI transitions
    if (isDown(snap, bindings, 'pause')) {
      if (ui.state === 'in-game') ui.state = 'paused';
      else if (ui.state === 'paused') ui.state = 'in-game';
      else ui.state = 'title';
      saveJson('vinestrike:ui', ui);
    }

    // Title and menus
    if (ui.state === 'title') {
      const action = titleMenu.update(snap);
      if (action === 'start') ui.state = 'in-game';
      else if (action === 'settings') ui.state = 'settings';
      else if (action === 'achievements') ui.state = 'achievements';
      else if (action === 'about') ui.state = 'about';
      if (action) saveJson('vinestrike:ui', ui);
      // Skip game simulation while in title
      return;
    } else if (
      ui.state === 'settings' ||
      ui.state === 'achievements' ||
      ui.state === 'about' ||
      ui.state === 'paused'
    ) {
      // No simulation when in menu overlays (MVP)
      return;
    }

    // In-game simulation below
    const ph = physics.get(player)!;
    let dx = 0;
    let dy = 0;
    if (isDown(snap, bindings, 'moveUp')) dy -= 1;
    if (isDown(snap, bindings, 'moveDown')) dy += 1;
    if (isDown(snap, bindings, 'moveLeft')) dx -= 1;
    if (isDown(snap, bindings, 'moveRight')) dx += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
    }
    const accel = 12; // tiles/sec^2
    ph.ax = dx * accel;
    ph.ay = dy * accel;
    // Engine audio intensity by speed
    const speed = Math.min(1, Math.hypot(ph.vx, ph.vy) / (physics.get(player)!.maxSpeed || 1));
    engine.start();
    engine.setIntensity(speed);

    // Set weapon input (use mouse position to aim in screen pixels → convert to tile space approx)
    const w = context.canvas.width;
    const h = context.canvas.height;
    const aimTile = screenToApproxTile(
      snap.mouseX,
      snap.mouseY,
      w,
      h,
      camera.x,
      camera.y,
      isoParams,
    );
    weaponFire.setInput(snap, aimTile.x, aimTile.y);

    // Run systems (deterministic order)
    scheduler.update(dt);

    // Consume fire events to spawn projectiles
    for (let i = 0; i < fireEvents.length; i += 1) {
      const ev = fireEvents[i]!;
      if (ev.kind === 'cannon') {
        playCannon(bus);
        projectilePool.spawn({
          kind: 'cannon',
          faction: ev.faction || 'player',
          x: ev.sx,
          y: ev.sy,
          vx: ev.dx * 18,
          vy: ev.dy * 18,
          ttl: 0.08,
          radius: 0.05,
          damage: { amount: 3 },
        });
      } else if (ev.kind === 'rocket') {
        playRocket(bus);
        projectilePool.spawn({
          kind: 'rocket',
          faction: ev.faction || 'player',
          x: ev.x,
          y: ev.y,
          vx: ev.vx,
          vy: ev.vy,
          ttl: 4,
          radius: 0.18,
          damage: { amount: 12, radius: 0.6 },
        });
      } else if (ev.kind === 'missile') {
        playMissile(bus);
        projectilePool.spawn({
          kind: 'missile',
          faction: ev.faction || 'player',
          x: ev.x,
          y: ev.y,
          vx: ev.vx,
          vy: ev.vy,
          ttl: 6,
          radius: 0.18,
          seek: { targetX: ev.targetX, targetY: ev.targetY, turnRate: Math.PI * 0.8 },
          damage: { amount: 18, radius: 0.9 },
        });
      }
    }
    fireEvents.length = 0;

    // Update projectiles
    projectilePool.update(
      dt,
      colliders /* player */,
      colliders /* enemy (placeholder) */,
      transforms,
      (hit) => {
        damage.queue(hit);
        playExplosion(bus);
        if (ui.settings.screenShake) shake.trigger(8, 0.25);
      },
    );
    damage.update();
    mission.update();

    // Update FPS measurement
    accumulator += dt;
    frames += 1;
    if (accumulator >= 0.5) {
      fps = Math.round((frames / accumulator) * 10) / 10;
      frames = 0;
      accumulator = 0;
    }
  },
  render: () => {
    resizeCanvasToDisplaySize();
    const w = canvas.width;
    const h = canvas.height;
    fog.resize(w, h);
    // Parallax sky
    sky.render(context, camera.x, camera.y);

    // Menus
    if (ui.state === 'title') {
      titleMenu.render(context, 'VineStrike', 'An original isometric helicopter action prototype');
      return;
    }
    if (ui.state === 'settings') {
      renderSettings(context, ui);
      return;
    }
    if (ui.state === 'achievements') {
      renderAchievements(context);
      return;
    }
    if (ui.state === 'about') {
      renderAbout(context);
      return;
    }
    if (ui.state === 'paused') {
      // Draw game underlay then a pause overlay
    }

    if (runtimeMap) {
      // Camera follow and clamp to iso map bounds
      const bounds = isoMapBounds(runtimeMap.width, runtimeMap.height, isoParams);
      camera.bounds = bounds;
      const playerT = transforms.get(player)!;
      const targetIso = tileToIso(playerT.tx, playerT.ty, isoParams);
      camera.follow(targetIso.x, targetIso.y, w, h);

      // Map origin is camera-centered
      const originX = Math.floor(w / 2 - camera.x);
      const originY = Math.floor(h / 2 - camera.y);
      const shakeOffset = shake.offset(1 / 60);
      renderer.draw(
        context,
        runtimeMap,
        isoParams,
        originX + shakeOffset.x,
        originY + shakeOffset.y,
      );
      // Spawn enemies from mission definition (once)
      if (aaas.get(1) === undefined && (mission as any).state?.def?.enemySpawns) {
        const spawns = (mission as any).state.def.enemySpawns as Array<{
          type: 'AAA' | 'SAM';
          at: { tx: number; ty: number };
        }>;
        for (let i = 0; i < spawns.length; i += 1) {
          const s = spawns[i]!;
          const e = entities.create();
          transforms.set(e, { tx: s.at.tx, ty: s.at.ty, rot: 0 });
          healths.set(e, { current: 30, max: 30 });
          colliders.set(e, { radius: 0.5 });
          if (s.type === 'AAA') {
            aaas.set(e, {
              range: 8,
              cooldown: 0,
              fireInterval: 0.6,
              projectileSpeed: 12,
              spread: 0.06,
            });
          } else {
            sams.set(e, {
              range: 12,
              lockTime: 0.8,
              cooldown: 0,
              fireInterval: 2.5,
              turnRate: Math.PI * 0.7,
              missileSpeed: 6,
              lockProgress: 0,
            });
          }
        }
      }

      // Draw enemy emplacements
      aaas.forEach((e, _a) => {
        const t = transforms.get(e)!;
        drawAAATurret(context, isoParams, originX, originY, t.tx, t.ty);
      });
      sams.forEach((e, _s) => {
        const t = transforms.get(e)!;
        drawSAM(context, isoParams, originX, originY, t.tx, t.ty);
      });
      // Draw projectiles
      projectilePool.draw(
        context,
        originX + shakeOffset.x,
        originY + shakeOffset.y,
        isoParams.tileWidth,
        isoParams.tileHeight,
      );

      // Draw refuel pad
      drawPad(context, isoParams, originX + shakeOffset.x, originY + shakeOffset.y, pad.tx, pad.ty);

      // Draw player heli
      const sprite = sprites.get(player)!;
      drawHeli(context, {
        tx: playerT.tx,
        ty: playerT.ty,
        rot: playerT.rot,
        rotorPhase: sprite.rotor,
        color: sprite.color,
        iso: isoParams,
        originX: originX + shakeOffset.x,
        originY: originY + shakeOffset.y,
      });

      // HUD (minimap toggle)
      drawHUD(
        context,
        {
          fuel01: fuels.get(player)!.current / fuels.get(player)!.max,
          armor01: healths.get(player)!.current / healths.get(player)!.max,
          ammo: {
            cannon: ammos.get(player)!.cannon,
            rockets: ammos.get(player)!.rockets,
            missiles: ammos.get(player)!.missiles,
          },
          activeWeapon: weapons.get(player)!.active,
        },
        mission.state.objectives.map((o) => `${o.complete ? '[x]' : '[ ]'} ${o.name}`),
        null,
        {
          mapW: runtimeMap.width,
          mapH: runtimeMap.height,
          player: { tx: playerT.tx, ty: playerT.ty },
          enemies: [],
        },
        isoParams,
      );

      // Fog of war overlay (player-centric circle). In future: add holes for allies/objectives.
      if (ui.settings.fogOfWar) {
        const playerIso = tileToIso(playerT.tx, playerT.ty, isoParams);
        const holeX = Math.floor(w / 2 + (playerIso.x - camera.x));
        const holeY = Math.floor(h / 2 + (playerIso.y - camera.y));
        fog.render(context, [
          { x: holeX, y: holeY, radius: Math.max(120, Math.min(w, h) * 0.22), softness: 0.5 },
        ]);
      }

      // Win overlay
      if (mission.state.complete) {
        ui.state = 'win';
        saveJson('vinestrike:progress', { lastWin: Date.now(), mission: mission.state.def.id });
      }
    } else {
      // Loading state (should not occur with static import)
      context.fillStyle = '#c8d7e1';
      context.font = '14px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Loading isometric map...', w / 2, h / 2);
    }

    if (ui.state === 'win') {
      context.save();
      context.fillStyle = 'rgba(0,0,0,0.6)';
      context.fillRect(0, 0, w, h);
      context.fillStyle = '#92ffa6';
      context.font = 'bold 28px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Mission Complete', w / 2, h / 2 - 8);
      context.fillStyle = '#c8d7e1';
      context.font = '14px system-ui, sans-serif';
      context.fillText('Press Esc to return to Title', w / 2, h / 2 + 16);
      context.restore();
      return;
    }

    debug.render(context, { fps, dt: 1 / 60, entities: 0 });
  },
});

loop.start();
