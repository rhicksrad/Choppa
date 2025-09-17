import { GameLoop } from './core/time/loop';
import { InputManager } from './core/input/input';
import { DebugOverlay } from './render/debug/overlay';
import { parseTiled } from './world/tiles/tiled';
import { IsoTilemapRenderer } from './render/draw/tilemap';
import { isoMapBounds, tileToIso, screenToApproxTile } from './render/iso/projection';
import { Camera2D } from './render/camera/camera';
import { ParallaxSky } from './render/draw/parallax';
import sampleMapJson from './world/tiles/sample_map.json';
import { EntityRegistry, type Entity } from './core/ecs/entities';
import { ComponentStore } from './core/ecs/components';
import type { Transform } from './game/components/Transform';
import type { Physics } from './game/components/Physics';
import type { Fuel } from './game/components/Fuel';
import type { Sprite } from './game/components/Sprite';
import { SystemScheduler } from './core/ecs/systems';
import { MovementSystem } from './game/systems/Movement';
import { RotorSpinSystem } from './game/systems/RotorSpin';
import { FuelDrainSystem } from './game/systems/FuelDrain';
import { drawHeli, drawPad } from './render/sprites/heli';
import { drawBuilding } from './render/sprites/buildings';
import { WeaponFireSystem, type FireEvent } from './game/systems/WeaponFire';
import type { Ammo } from './game/components/Ammo';
import type { WeaponHolder } from './game/components/Weapon';
import { RNG } from './core/util/rng';
import { ProjectilePool } from './game/systems/Projectile';
import type { AAA, SAM, PatrolDrone, ChaserDrone } from './game/components/AI';
import { AIControlSystem } from './game/systems/AIControl';
import { EnemyBehaviorSystem } from './game/systems/EnemyBehavior';
import { drawAAATurret, drawSAM, drawPatrolDrone, drawChaserDrone } from './render/sprites/targets';
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
import type { Building } from './game/components/Building';
import type { Pickup } from './game/components/Pickup';
import { drawHUD } from './ui/hud/hud';
import { loadJson, saveJson } from './core/util/storage';
import { loadBindings, isDown } from './ui/input-remap/bindings';
import { AudioBus } from './core/audio/audio';
import { EngineSound, playCannon, playRocket, playMissile, playExplosion } from './core/audio/sfx';
import { CameraShake } from './render/camera/shake';
import { drawPickupCrate } from './render/sprites/pickups';

interface EnemyMeta {
  kind: 'aaa' | 'sam' | 'patrol' | 'chaser';
  score: number;
  wave?: number;
}

interface BuildingSite {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
  health: number;
  colliderRadius: number;
  bodyColor: string;
  roofColor: string;
  ruinColor?: string;
  score: number;
}

interface PickupSite {
  tx: number;
  ty: number;
  kind: 'fuel' | 'ammo';
  radius?: number;
  duration?: number;
  fuelAmount?: number;
  ammo?: { cannon?: number; rockets?: number; missiles?: number };
}

interface Explosion {
  tx: number;
  ty: number;
  age: number;
  duration: number;
}

interface WaveState {
  index: number;
  countdown: number;
  active: boolean;
  timeInWave: number;
  enemies: Set<Entity>;
}

interface PlayerState {
  lives: number;
  respawnTimer: number;
  invulnerable: boolean;
}
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

const input = new InputManager();
input.attach(window);

const debug = new DebugOverlay();
window.addEventListener('keydown', (e) => {
  if (e.key === '`' || e.key === '~') debug.toggle();
});

const ui: UIStore = loadJson<UIStore>('vinestrike:ui', createUIStore());
const titleMenu = new Menu([
  { id: 'start', label: 'Start Mission' },
  { id: 'settings', label: 'Settings' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'about', label: 'About' },
]);
const bindings = loadBindings();

const renderer = new IsoTilemapRenderer();
const camera = new Camera2D({ deadzoneWidth: 160, deadzoneHeight: 120, lerp: 0.12 });
const sky = new ParallaxSky();
const fog = new FogOfWar(0.78);
const bus = new AudioBus({
  masterVolume: ui.settings.masterVolume,
  musicVolume: ui.settings.musicVolume,
  sfxVolume: ui.settings.sfxVolume,
});
const engine = new EngineSound(bus);
const shake = new CameraShake();
const entities = new EntityRegistry();
const transforms = new ComponentStore<Transform>();
const physics = new ComponentStore<Physics>();
const fuels = new ComponentStore<Fuel>();
const sprites = new ComponentStore<Sprite>();
const ammos = new ComponentStore<Ammo>();
const weapons = new ComponentStore<WeaponHolder>();
const aaas = new ComponentStore<AAA>();
const sams = new ComponentStore<SAM>();
const patrols = new ComponentStore<PatrolDrone>();
const chasers = new ComponentStore<ChaserDrone>();
const healths = new ComponentStore<Health>();
const colliders = new ComponentStore<Collider>();
const buildings = new ComponentStore<Building>();
const pickups = new ComponentStore<Pickup>();

let isoParams = { tileWidth: 64, tileHeight: 32 };
const runtimeMap = parseTiled(sampleMapJson as unknown);
isoParams = { tileWidth: runtimeMap.tileWidth, tileHeight: runtimeMap.tileHeight };
const pad = {
  tx: Math.floor(runtimeMap.width / 2) - 2,
  ty: Math.floor(runtimeMap.height / 2) + 1,
  radius: 1.2,
};

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
colliders.set(player, { radius: 0.4, team: 'player' });

const scheduler = new SystemScheduler();
const rng = new RNG(1337);
const projectilePool = new ProjectilePool();
const fireEvents: FireEvent[] = [];
const weaponFire = new WeaponFireSystem(transforms, physics, weapons, ammos, fireEvents, rng);
const damage = new DamageSystem(transforms, colliders, healths);
const missionDef = missionJson as MissionDef;
let missionState = loadMission(missionDef);
const mission = new MissionTracker(missionState, transforms, colliders, healths, () => ({
  tx: transforms.get(player)!.tx,
  ty: transforms.get(player)!.ty,
}));

scheduler.add(new MovementSystem(transforms, physics));
scheduler.add(new RotorSpinSystem(sprites));
scheduler.add(new FuelDrainSystem(fuels));
scheduler.add(weaponFire);
scheduler.add(
  new AIControlSystem(transforms, aaas, sams, fireEvents, rng, () => ({
    x: transforms.get(player)!.tx,
    y: transforms.get(player)!.ty,
  })),
);
scheduler.add(
  new EnemyBehaviorSystem(transforms, physics, patrols, chasers, fireEvents, rng, () => ({
    x: transforms.get(player)!.tx,
    y: transforms.get(player)!.ty,
  })),
);

const playerState: PlayerState = { lives: 3, respawnTimer: 0, invulnerable: false };
const stats = { score: 0 };
const explosions: Explosion[] = [];
const enemyMeta = new Map<Entity, EnemyMeta>();
const buildingMeta = new Map<Entity, { score: number }>();
const waveState: WaveState = {
  index: 0,
  countdown: 3,
  active: false,
  timeInWave: 0,
  enemies: new Set<Entity>(),
};
const minimapEnemies: { tx: number; ty: number }[] = [];
const buildingEntities: Entity[] = [];
const pickupEntities: Entity[] = [];
const waveSpawnPoints = [
  { tx: 7, ty: 7 },
  { tx: 28, ty: 9 },
  { tx: 12, ty: 28 },
  { tx: 29, ty: 28 },
];
const buildingSites: BuildingSite[] = [
  {
    tx: 18,
    ty: 16,
    width: 1.6,
    depth: 1.2,
    height: 34,
    health: 110,
    colliderRadius: 0.85,
    bodyColor: '#5b6d82',
    roofColor: '#27313d',
    ruinColor: '#472b2b',
    score: 220,
  },
  {
    tx: 21,
    ty: 19.2,
    width: 1.4,
    depth: 1.4,
    height: 28,
    health: 95,
    colliderRadius: 0.8,
    bodyColor: '#6c7c8f',
    roofColor: '#2f3e4d',
    ruinColor: '#593535',
    score: 180,
  },
  {
    tx: 15,
    ty: 20.5,
    width: 1.8,
    depth: 1.1,
    height: 24,
    health: 90,
    colliderRadius: 0.9,
    bodyColor: '#7c6d54',
    roofColor: '#3c3322',
    ruinColor: '#4a2b21',
    score: 160,
  },
  {
    tx: 13.6,
    ty: 17.8,
    width: 1.3,
    depth: 1.3,
    height: 30,
    health: 100,
    colliderRadius: 0.82,
    bodyColor: '#5f6f5b',
    roofColor: '#2a3529',
    ruinColor: '#403125',
    score: 190,
  },
];

const pickupSites: PickupSite[] = [
  { tx: 15.2, ty: 18.4, kind: 'fuel', fuelAmount: 55 },
  { tx: 18.6, ty: 16.1, kind: 'ammo', ammo: { cannon: 90, rockets: 3, missiles: 1 } },
  { tx: 10.4, ty: 12.6, kind: 'ammo', ammo: { cannon: 110, rockets: 4, missiles: 2 } },
  { tx: 22.5, ty: 12.2, kind: 'fuel', fuelAmount: 60 },
  { tx: 25.3, ty: 19.4, kind: 'ammo', ammo: { cannon: 100, rockets: 5, missiles: 2 } },
  { tx: 28.2, ty: 27.1, kind: 'fuel', fuelAmount: 65 },
  { tx: 13.2, ty: 26.4, kind: 'fuel', fuelAmount: 58 },
  { tx: 7.4, ty: 22.3, kind: 'ammo', ammo: { cannon: 80, rockets: 3, missiles: 1 } },
  { tx: 31.2, ty: 14.4, kind: 'ammo', ammo: { cannon: 95, rockets: 3, missiles: 2 } },
  { tx: 20.4, ty: 29.1, kind: 'fuel', fuelAmount: 62 },
];

let fps = 0;
let frames = 0;
let accumulator = 0;
let lastStepDt = 1 / 60;
let pauseLatch = false;
let muteLatch = false;
let audioMuted = false;
function setAudioVolumes(): void {
  bus.setMaster(audioMuted ? 0 : ui.settings.masterVolume);
  bus.setMusic(ui.settings.musicVolume);
  bus.setSfx(ui.settings.sfxVolume);
}
setAudioVolumes();

function spawnExplosion(tx: number, ty: number): void {
  explosions.push({ tx, ty, age: 0, duration: 0.6 });
}

function updateExplosions(dt: number): void {
  for (let i = explosions.length - 1; i >= 0; i -= 1) {
    const e = explosions[i]!;
    e.age += dt;
    if (e.age >= e.duration) explosions.splice(i, 1);
  }
}

function destroyEntity(entity: Entity): void {
  if (entity === player) return;
  transforms.remove(entity);
  physics.remove(entity);
  fuels.remove(entity);
  sprites.remove(entity);
  ammos.remove(entity);
  weapons.remove(entity);
  aaas.remove(entity);
  sams.remove(entity);
  patrols.remove(entity);
  chasers.remove(entity);
  healths.remove(entity);
  colliders.remove(entity);
  buildings.remove(entity);
  pickups.remove(entity);
  buildingMeta.delete(entity);
  const buildingIndex = buildingEntities.indexOf(entity);
  if (buildingIndex !== -1) buildingEntities.splice(buildingIndex, 1);
  const pickupIndex = pickupEntities.indexOf(entity);
  if (pickupIndex !== -1) pickupEntities.splice(pickupIndex, 1);
  enemyMeta.delete(entity);
  waveState.enemies.delete(entity);
  entities.destroy(entity);
}

function registerEnemy(entity: Entity, meta: EnemyMeta): void {
  enemyMeta.set(entity, meta);
  if (meta.wave !== undefined) waveState.enemies.add(entity);
}

function clearEnemies(): void {
  const ids = Array.from(enemyMeta.keys());
  for (let i = 0; i < ids.length; i += 1) destroyEntity(ids[i]!);
  enemyMeta.clear();
  waveState.enemies.clear();
}

function spawnMissionEnemies(): void {
  if (!mission.state.def.enemySpawns) return;
  for (let i = 0; i < mission.state.def.enemySpawns.length; i += 1) {
    const spawn = mission.state.def.enemySpawns[i]!;
    const entity = entities.create();
    transforms.set(entity, { tx: spawn.at.tx, ty: spawn.at.ty, rot: 0 });
    healths.set(entity, { current: 30, max: 30 });
    colliders.set(entity, { radius: 0.5, team: 'enemy' });
    if (spawn.type === 'AAA') {
      aaas.set(entity, {
        range: 8,
        cooldown: 0,
        fireInterval: 0.6,
        projectileSpeed: 12,
        spread: 0.06,
      });
      registerEnemy(entity, { kind: 'aaa', score: 150 });
    } else {
      sams.set(entity, {
        range: 12,
        lockTime: 0.8,
        cooldown: 0,
        fireInterval: 2.5,
        turnRate: Math.PI * 0.7,
        missileSpeed: 6,
        lockProgress: 0,
      });
      registerEnemy(entity, { kind: 'sam', score: 200 });
    }
  }
}

function clearBuildings(): void {
  for (let i = buildingEntities.length - 1; i >= 0; i -= 1) {
    const entity = buildingEntities[i]!;
    destroyEntity(entity);
  }
  buildingEntities.length = 0;
}

function spawnBuildings(): void {
  clearBuildings();
  for (let i = 0; i < buildingSites.length; i += 1) {
    const site = buildingSites[i]!;
    const entity = entities.create();
    transforms.set(entity, { tx: site.tx, ty: site.ty, rot: 0 });
    buildings.set(entity, {
      width: site.width,
      depth: site.depth,
      height: site.height,
      bodyColor: site.bodyColor,
      roofColor: site.roofColor,
      ruinColor: site.ruinColor,
    });
    healths.set(entity, { current: site.health, max: site.health });
    colliders.set(entity, { radius: site.colliderRadius, team: 'enemy' });
    buildingMeta.set(entity, { score: site.score });
    buildingEntities.push(entity);
  }
}

function clearPickups(): void {
  for (let i = pickupEntities.length - 1; i >= 0; i -= 1) {
    const entity = pickupEntities[i]!;
    destroyEntity(entity);
  }
  pickupEntities.length = 0;
}

function spawnPickups(): void {
  clearPickups();
  for (let i = 0; i < pickupSites.length; i += 1) {
    const site = pickupSites[i]!;
    const entity = entities.create();
    transforms.set(entity, { tx: site.tx, ty: site.ty, rot: 0 });
    pickups.set(entity, {
      kind: site.kind,
      radius: site.radius ?? 0.9,
      duration: site.duration ?? 1.3,
      fuelAmount: site.kind === 'fuel' ? (site.fuelAmount ?? 50) : undefined,
      ammo:
        site.kind === 'ammo'
          ? {
              cannon: site.ammo?.cannon ?? 80,
              rockets: site.ammo?.rockets ?? 3,
              missiles: site.ammo?.missiles ?? 1,
            }
          : undefined,
      collectingBy: null,
      progress: 0,
    });
    pickupEntities.push(entity);
  }
}

function spawnPatrolEnemy(point: { tx: number; ty: number }, wave: number, axis: 'x' | 'y'): void {
  const entity = entities.create();
  transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
  physics.set(entity, {
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    drag: 0.9,
    maxSpeed: 2.2 + wave * 0.1,
    turnRate: Math.PI,
  });
  healths.set(entity, { current: 22 + wave * 3, max: 22 + wave * 3 });
  colliders.set(entity, { radius: 0.4, team: 'enemy' });
  patrols.set(entity, {
    axis,
    originX: point.tx,
    originY: point.ty,
    range: 2.5 + Math.min(4, wave * 0.6),
    speed: 1.8 + wave * 0.2,
    direction: rng.float01() > 0.5 ? 1 : -1,
    fireRange: 6.5,
    fireInterval: Math.max(0.9, 1.4 - wave * 0.1),
    cooldown: 0,
  });
  registerEnemy(entity, { kind: 'patrol', score: 125 + wave * 15, wave });
}

function spawnChaserEnemy(point: { tx: number; ty: number }, wave: number): void {
  const entity = entities.create();
  transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
  physics.set(entity, {
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    drag: 0.7,
    maxSpeed: 3.2 + wave * 0.25,
    turnRate: Math.PI * 1.4,
  });
  healths.set(entity, { current: 26 + wave * 4, max: 26 + wave * 4 });
  colliders.set(entity, { radius: 0.35, team: 'enemy' });
  chasers.set(entity, {
    speed: 2.6 + wave * 0.25,
    acceleration: 3.2,
    fireRange: 6,
    fireInterval: Math.max(0.8, 1.3 - wave * 0.1),
    cooldown: 0,
    spread: 0.18,
  });
  registerEnemy(entity, { kind: 'chaser', score: 220 + wave * 20, wave });
}

function spawnWave(index: number): void {
  waveState.enemies.clear();
  const patrolCount = Math.min(waveSpawnPoints.length, 2 + index);
  const chaserCount = Math.min(waveSpawnPoints.length, Math.max(0, Math.floor(index / 2)));
  for (let i = 0; i < patrolCount; i += 1) {
    const point = waveSpawnPoints[i % waveSpawnPoints.length]!;
    const axis: 'x' | 'y' = i % 2 === 0 ? 'x' : 'y';
    spawnPatrolEnemy(point, index, axis);
  }
  for (let i = 0; i < chaserCount; i += 1) {
    const point = waveSpawnPoints[(i + patrolCount) % waveSpawnPoints.length]!;
    spawnChaserEnemy(point, index);
  }
}

function resetPlayer(): void {
  const t = transforms.get(player);
  const ph = physics.get(player);
  const fuel = fuels.get(player);
  const ammo = ammos.get(player);
  const health = healths.get(player);
  if (t && ph && fuel && ammo && health) {
    t.tx = mission.state.def.startPos.tx;
    t.ty = mission.state.def.startPos.ty;
    t.rot = 0;
    ph.vx = 0;
    ph.vy = 0;
    ph.ax = 0;
    ph.ay = 0;
    fuel.current = fuel.max;
    ammo.cannon = ammo.cannonMax;
    ammo.rockets = ammo.rocketsMax;
    ammo.missiles = ammo.missilesMax;
    health.current = health.max;
    colliders.set(player, { radius: 0.4, team: 'player' });
  }
  playerState.respawnTimer = 0;
  playerState.invulnerable = false;
  engine.start();
  engine.setIntensity(0);
}

function resetGame(): void {
  clearEnemies();
  projectilePool.clear();
  damage.reset();
  explosions.length = 0;
  stats.score = 0;
  waveState.index = 0;
  waveState.countdown = 3.5;
  waveState.active = false;
  waveState.timeInWave = 0;
  missionState = loadMission(missionDef);
  mission.state = missionState;
  spawnBuildings();
  spawnMissionEnemies();
  spawnPickups();
  playerState.lives = 3;
  resetPlayer();
  ui.state = 'in-game';
  setAudioVolumes();
}

function handlePlayerDeath(): void {
  if (playerState.invulnerable) return;
  const t = transforms.get(player);
  if (t) spawnExplosion(t.tx, t.ty);
  playExplosion(bus);
  colliders.remove(player);
  const ph = physics.get(player);
  if (ph) {
    ph.vx = 0;
    ph.vy = 0;
    ph.ax = 0;
    ph.ay = 0;
  }
  playerState.lives -= 1;
  playerState.invulnerable = true;
  playerState.respawnTimer = 2.5;
  if (playerState.lives <= 0) {
    ui.state = 'game-over';
    waveState.active = false;
    engine.stop();
  }
}

function tryRespawn(dt: number): void {
  if (!playerState.invulnerable || ui.state === 'game-over') return;
  playerState.respawnTimer -= dt;
  if (playerState.respawnTimer <= 0 && playerState.lives > 0) {
    resetPlayer();
  }
}

function handleDeaths(): void {
  const deaths = damage.consumeDeaths();
  for (let i = 0; i < deaths.length; i += 1) {
    const entity = deaths[i]!;
    if (entity === player) {
      handlePlayerDeath();
      continue;
    }
    const meta = enemyMeta.get(entity);
    if (meta) {
      const t = transforms.get(entity);
      if (t) spawnExplosion(t.tx, t.ty);
      playExplosion(bus);
      stats.score += meta.score;
      destroyEntity(entity);
      continue;
    }
    const building = buildings.get(entity);
    if (building) {
      const t = transforms.get(entity);
      if (t) spawnExplosion(t.tx, t.ty);
      playExplosion(bus);
      const bScore = buildingMeta.get(entity);
      if (bScore) stats.score += bScore.score;
      destroyEntity(entity);
      continue;
    }
    destroyEntity(entity);
  }
}

function updateWave(dt: number): void {
  if (ui.state !== 'in-game') return;
  if (waveState.active) {
    waveState.timeInWave += dt;
    if (waveState.enemies.size === 0) {
      waveState.active = false;
      waveState.countdown = Math.max(3, 5 - waveState.index * 0.2);
    }
  } else {
    waveState.countdown -= dt;
    if (waveState.countdown <= 0) {
      waveState.index += 1;
      spawnWave(waveState.index);
      waveState.active = true;
      waveState.timeInWave = 0;
    }
  }
}

spawnMissionEnemies();
spawnBuildings();
spawnPickups();
const loop = new GameLoop({
  update: (dt) => {
    lastStepDt = dt;
    const snap = input.readSnapshot();

    const pauseDown = isDown(snap, bindings, 'pause');
    if (pauseDown && !pauseLatch) {
      if (ui.state === 'in-game') ui.state = 'paused';
      else if (ui.state === 'paused') ui.state = 'in-game';
      else if (ui.state === 'title') ui.state = 'in-game';
    }
    pauseLatch = pauseDown;

    const muteDown = snap.keys['m'] || snap.keys['M'];
    if (muteDown && !muteLatch) {
      audioMuted = !audioMuted;
      setAudioVolumes();
    }
    muteLatch = muteDown;

    if (ui.state === 'title') {
      const action = titleMenu.update(snap);
      if (action === 'start') {
        resetGame();
      } else if (action === 'settings') ui.state = 'settings';
      else if (action === 'achievements') ui.state = 'achievements';
      else if (action === 'about') ui.state = 'about';
      if (action) saveJson('vinestrike:ui', ui);
      return;
    }

    if (ui.state === 'settings') {
      if (snap.keys['Escape']) ui.state = 'title';
      return;
    }

    if (ui.state === 'achievements') {
      if (snap.keys['Escape']) ui.state = 'title';
      return;
    }

    if (ui.state === 'about') {
      if (snap.keys['Escape']) ui.state = 'title';
      return;
    }

    if (ui.state === 'paused') {
      if (snap.keys['Escape']) ui.state = 'in-game';
      return;
    }

    if (ui.state === 'game-over') {
      if (snap.keys['Enter'] || snap.keys[' '] || snap.keys['r'] || snap.keys['R']) {
        resetGame();
      }
      if (snap.keys['Escape']) ui.state = 'title';
      return;
    }

    if (ui.state === 'win') {
      if (snap.keys['Enter'] || snap.keys[' ']) resetGame();
      if (snap.keys['Escape']) ui.state = 'title';
      return;
    }

    tryRespawn(dt);

    const playerTransform = transforms.get(player)!;
    const ph = physics.get(player)!;
    const playerFuel = fuels.get(player)!;
    const playerAmmo = ammos.get(player)!;
    let dx = 0;
    let dy = 0;
    if (!playerState.invulnerable) {
      if (isDown(snap, bindings, 'moveUp')) dy -= 1;
      if (isDown(snap, bindings, 'moveDown')) dy += 1;
      if (isDown(snap, bindings, 'moveLeft')) dx -= 1;
      if (isDown(snap, bindings, 'moveRight')) dx += 1;
    }
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
    }
    const accel = 12;
    ph.ax = dx * accel;
    ph.ay = dy * accel;

    const speed = Math.min(1, Math.hypot(ph.vx, ph.vy) / (ph.maxSpeed || 1));
    engine.start();
    engine.setIntensity(speed);

    const w = context.canvas.width;
    const h = context.canvas.height;
    let aimTile = screenToApproxTile(snap.mouseX, snap.mouseY, w, h, camera.x, camera.y, isoParams);
    const aimDx = aimTile.x - playerTransform.tx;
    const aimDy = aimTile.y - playerTransform.ty;
    if (!Number.isFinite(aimDx) || !Number.isFinite(aimDy) || Math.hypot(aimDx, aimDy) < 0.3) {
      aimTile = {
        x: playerTransform.tx + Math.cos(playerTransform.rot),
        y: playerTransform.ty + Math.sin(playerTransform.rot),
      };
    }
    weaponFire.setInput(snap, aimTile.x, aimTile.y);

    scheduler.update(dt);

    const completedPickups: {
      entity: Entity;
      kind: 'fuel' | 'ammo';
      fuelAmount?: number;
      ammo?: { cannon?: number; rockets?: number; missiles?: number };
    }[] = [];
    pickups.forEach((entity, pickup) => {
      const pickupTransform = transforms.get(entity);
      if (!pickupTransform) {
        completedPickups.push({
          entity,
          kind: pickup.kind,
          fuelAmount: pickup.fuelAmount,
          ammo: pickup.ammo,
        });
        return;
      }

      if (pickup.collectingBy === player) {
        const dx = pickupTransform.tx - playerTransform.tx;
        const dy = pickupTransform.ty - playerTransform.ty;
        const dist = Math.hypot(dx, dy);
        if (dist > pickup.radius + 0.4 || playerState.invulnerable) {
          pickup.collectingBy = null;
          pickup.progress = 0;
          return;
        }
        pickup.progress = Math.min(1, pickup.progress + dt / pickup.duration);
        if (pickup.progress >= 1) {
          completedPickups.push({
            entity,
            kind: pickup.kind,
            fuelAmount: pickup.fuelAmount,
            ammo: pickup.ammo ? { ...pickup.ammo } : undefined,
          });
        }
        return;
      }

      if (pickup.collectingBy && !transforms.has(pickup.collectingBy)) {
        pickup.collectingBy = null;
        pickup.progress = 0;
        return;
      }

      if (pickup.collectingBy === null) {
        const dx = pickupTransform.tx - playerTransform.tx;
        const dy = pickupTransform.ty - playerTransform.ty;
        const dist = Math.hypot(dx, dy);
        if (dist <= pickup.radius) {
          const needsFuel = playerFuel.current < playerFuel.max - 0.5;
          const needsAmmo =
            playerAmmo.cannon < playerAmmo.cannonMax ||
            playerAmmo.rockets < playerAmmo.rocketsMax ||
            playerAmmo.missiles < playerAmmo.missilesMax;
          if (
            !playerState.invulnerable &&
            ((pickup.kind === 'fuel' && needsFuel) || (pickup.kind === 'ammo' && needsAmmo))
          ) {
            pickup.collectingBy = player;
            pickup.progress = 0;
          }
        }
      }
    });

    for (let i = 0; i < completedPickups.length; i += 1) {
      const item = completedPickups[i]!;
      if (item.kind === 'fuel') {
        const amount = item.fuelAmount ?? 50;
        playerFuel.current = Math.min(playerFuel.max, playerFuel.current + amount);
      } else if (item.ammo) {
        playerAmmo.cannon = Math.min(
          playerAmmo.cannonMax,
          playerAmmo.cannon + (item.ammo.cannon ?? 0),
        );
        playerAmmo.rockets = Math.min(
          playerAmmo.rocketsMax,
          playerAmmo.rockets + (item.ammo.rockets ?? 0),
        );
        playerAmmo.missiles = Math.min(
          playerAmmo.missilesMax,
          playerAmmo.missiles + (item.ammo.missiles ?? 0),
        );
      }
      destroyEntity(item.entity);
    }

    const margin = 1.2;
    const maxX = runtimeMap.width - 1 - margin;
    const maxY = runtimeMap.height - 1 - margin;
    playerTransform.tx = Math.max(margin, Math.min(maxX, playerTransform.tx));
    playerTransform.ty = Math.max(margin, Math.min(maxY, playerTransform.ty));

    for (let i = 0; i < fireEvents.length; i += 1) {
      const ev = fireEvents[i]!;
      if (ev.kind === 'cannon') {
        playCannon(bus);
        const speedC = ev.speed ?? 18;
        projectilePool.spawn({
          kind: 'cannon',
          faction: ev.faction,
          x: ev.sx,
          y: ev.sy,
          vx: ev.dx * speedC,
          vy: ev.dy * speedC,
          ttl: ev.ttl ?? 0.8,
          radius: ev.radius ?? 0.08,
          damage: { amount: ev.damage ?? 4 },
        });
      } else if (ev.kind === 'rocket') {
        playRocket(bus);
        projectilePool.spawn({
          kind: 'rocket',
          faction: ev.faction,
          x: ev.x,
          y: ev.y,
          vx: ev.vx,
          vy: ev.vy,
          ttl: ev.ttl ?? 4,
          radius: ev.radius ?? 0.18,
          damage: { amount: 12, radius: 0.6 },
        });
      } else if (ev.kind === 'missile') {
        playMissile(bus);
        projectilePool.spawn({
          kind: 'missile',
          faction: ev.faction,
          x: ev.x,
          y: ev.y,
          vx: ev.vx,
          vy: ev.vy,
          ttl: ev.ttl ?? 6,
          radius: ev.radius ?? 0.18,
          seek: { targetX: ev.targetX, targetY: ev.targetY, turnRate: Math.PI * 0.8 },
          damage: { amount: 18, radius: 0.9 },
        });
      }
    }
    fireEvents.length = 0;

    projectilePool.update(dt, colliders, colliders, transforms, (hit) => {
      damage.queue(hit);
      playExplosion(bus);
      if (ui.settings.screenShake) shake.trigger(8, 0.25);
    });

    damage.update();
    handleDeaths();

    mission.update();
    if (mission.state.complete && ui.state === 'in-game') {
      ui.state = 'win';
      saveJson('vinestrike:progress', { lastWin: Date.now(), mission: mission.state.def.id });
    }

    updateWave(dt);
    updateExplosions(dt);

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
    sky.render(context, camera.x, camera.y);

    if (ui.state === 'title') {
      titleMenu.render(context, 'VineStrike', 'Isometric helicopter action prototype');
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

    const playerT = transforms.get(player)!;
    const bounds = isoMapBounds(runtimeMap.width, runtimeMap.height, isoParams);
    camera.bounds = bounds;
    const targetIso = tileToIso(playerT.tx, playerT.ty, isoParams);
    camera.follow(targetIso.x, targetIso.y, w, h);

    const originX = Math.floor(w / 2 - camera.x);
    const originY = Math.floor(h / 2 - camera.y);
    const shakeOffset = shake.offset(1 / 60);
    const originWithShakeX = originX + shakeOffset.x;
    const originWithShakeY = originY + shakeOffset.y;
    renderer.draw(context, runtimeMap, isoParams, originWithShakeX, originWithShakeY);

    buildings.forEach((entity, building) => {
      const t = transforms.get(entity);
      const h = healths.get(entity);
      if (!t || !h) return;
      drawBuilding(context, isoParams, originWithShakeX, originWithShakeY, {
        tx: t.tx,
        ty: t.ty,
        width: building.width,
        depth: building.depth,
        height: building.height,
        bodyColor: building.bodyColor,
        roofColor: building.roofColor,
        ruinColor: building.ruinColor,
        damage01: 1 - h.current / h.max,
      });
    });

    const playerCollectorIso = { x: targetIso.x, y: targetIso.y };
    pickups.forEach((entity, pickup) => {
      const t = transforms.get(entity);
      if (!t) return;
      let collectorIso: { x: number; y: number } | null = null;
      if (pickup.collectingBy === player) {
        collectorIso = playerCollectorIso;
      } else if (pickup.collectingBy) {
        const collectorTransform = transforms.get(pickup.collectingBy);
        if (collectorTransform) {
          collectorIso = tileToIso(collectorTransform.tx, collectorTransform.ty, isoParams);
        }
      }
      drawPickupCrate(context, isoParams, originWithShakeX, originWithShakeY, {
        tx: t.tx,
        ty: t.ty,
        kind: pickup.kind,
        collecting: pickup.collectingBy !== null,
        progress: pickup.progress,
        collectorIso,
      });
    });

    aaas.forEach((entity, _a) => {
      const t = transforms.get(entity);
      if (t) drawAAATurret(context, isoParams, originX, originY, t.tx, t.ty);
    });
    sams.forEach((entity, _s) => {
      const t = transforms.get(entity);
      if (t) drawSAM(context, isoParams, originX, originY, t.tx, t.ty);
    });
    patrols.forEach((entity, _p) => {
      const t = transforms.get(entity);
      if (t) drawPatrolDrone(context, isoParams, originX, originY, t.tx, t.ty);
    });
    chasers.forEach((entity, _c) => {
      const t = transforms.get(entity);
      if (t) drawChaserDrone(context, isoParams, originX, originY, t.tx, t.ty);
    });

    projectilePool.draw(
      context,
      originWithShakeX,
      originWithShakeY,
      isoParams.tileWidth,
      isoParams.tileHeight,
    );

    for (let i = 0; i < explosions.length; i += 1) {
      const e = explosions[i]!;
      const iso = tileToIso(e.tx, e.ty, isoParams);
      const drawX = originX + iso.x + shakeOffset.x;
      const drawY = originY + iso.y + shakeOffset.y - 10;
      const alpha = 1 - e.age / e.duration;
      context.save();
      context.globalAlpha = Math.max(0, alpha);
      context.fillStyle = '#ffb347';
      context.beginPath();
      context.arc(drawX, drawY, 16 * alpha, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    drawPad(context, isoParams, originWithShakeX, originWithShakeY, pad.tx, pad.ty);

    drawHeli(context, {
      tx: playerT.tx,
      ty: playerT.ty,
      rot: playerT.rot,
      rotorPhase: sprites.get(player)!.rotor,
      color: sprites.get(player)!.color,
      iso: isoParams,
      originX: originWithShakeX,
      originY: originWithShakeY,
    });

    minimapEnemies.length = 0;
    colliders.forEach((entity, col) => {
      if (col.team === 'enemy') {
        const t = transforms.get(entity);
        if (t) minimapEnemies.push({ tx: t.tx, ty: t.ty });
      }
    });

    if (ui.settings.fogOfWar) {
      const playerIso = tileToIso(playerT.tx, playerT.ty, isoParams);
      const holeX = Math.floor(w / 2 + (playerIso.x - camera.x));
      const holeY = Math.floor(h / 2 + (playerIso.y - camera.y));
      fog.render(context, [
        { x: holeX, y: holeY, radius: Math.max(120, Math.min(w, h) * 0.22), softness: 0.5 },
      ]);
    }

    const fuelComp = fuels.get(player)!;
    const ammoComp = ammos.get(player)!;
    const healthComp = healths.get(player)!;
    const weaponComp = weapons.get(player)!;

    drawHUD(
      context,
      {
        fuel01: fuelComp.current / fuelComp.max,
        fuelCurrent: fuelComp.current,
        fuelMax: fuelComp.max,
        armor01: healthComp.current / healthComp.max,
        ammo: {
          cannon: ammoComp.cannon,
          rockets: ammoComp.rockets,
          missiles: ammoComp.missiles,
        },
        ammoMax: {
          cannon: ammoComp.cannonMax,
          rockets: ammoComp.rocketsMax,
          missiles: ammoComp.missilesMax,
        },
        activeWeapon: weaponComp.active,
        lives: Math.max(0, playerState.lives),
        score: stats.score,
        wave: waveState.active ? waveState.index : Math.max(1, waveState.index + 1),
        enemiesRemaining: waveState.enemies.size,
        nextWaveIn: waveState.active ? null : waveState.countdown,
      },
      mission.state.objectives.map((o) => `${o.complete ? '[x]' : '[ ]'} ${o.name}`),
      null,
      {
        mapW: runtimeMap.width,
        mapH: runtimeMap.height,
        player: { tx: playerT.tx, ty: playerT.ty },
        enemies: minimapEnemies,
      },
      isoParams,
    );

    if (playerState.invulnerable && ui.state === 'in-game') {
      context.save();
      context.fillStyle = 'rgba(0, 0, 0, 0.35)';
      context.fillRect(0, 0, w, h);
      context.fillStyle = '#ffd166';
      context.font = 'bold 18px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Respawning...', w / 2, h / 2);
      context.restore();
    }

    if (ui.state === 'paused') {
      context.save();
      context.fillStyle = 'rgba(0, 0, 0, 0.55)';
      context.fillRect(0, 0, w, h);
      context.fillStyle = '#92ffa6';
      context.font = 'bold 28px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Paused', w / 2, h / 2);
      context.fillStyle = '#c8d7e1';
      context.font = '14px system-ui, sans-serif';
      context.fillText('Press Esc to resume', w / 2, h / 2 + 24);
      context.restore();
    }

    if (ui.state === 'game-over') {
      context.save();
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, w, h);
      context.fillStyle = '#ef476f';
      context.font = 'bold 28px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Mission Failed', w / 2, h / 2);
      context.fillStyle = '#c8d7e1';
      context.font = '14px system-ui, sans-serif';
      context.fillText('Press Enter to restart or Esc for title', w / 2, h / 2 + 26);
      context.restore();
      return;
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
      context.fillText('Press Enter to restart or Esc for title', w / 2, h / 2 + 16);
      context.restore();
      return;
    }

    debug.render(context, { fps, dt: lastStepDt, entities: enemyMeta.size + 1 });
  },
});

loop.start();
