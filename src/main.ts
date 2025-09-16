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
import { RefuelRearmSystem, type RefuelPad } from './game/systems/RefuelRearm';
import { drawHeli, drawPad } from './render/sprites/heli';
import { WeaponFireSystem, type FireEvent, type WeaponModifiers } from './game/systems/WeaponFire';
import type { Ammo } from './game/components/Ammo';
import type { WeaponHolder } from './game/components/Weapon';
import { RNG } from './core/util/rng';
import { ProjectilePool } from './game/systems/Projectile';
import type { AAA, SAM, PatrolDrone, ChaserDrone } from './game/components/AI';
import { AIControlSystem } from './game/systems/AIControl';
import { EnemyBehaviorSystem } from './game/systems/EnemyBehavior';
import { drawAAATurret, drawSAM, drawPatrolDrone, drawChaserDrone } from './render/sprites/targets';
import { drawStructure } from './render/sprites/structures';
import { drawPickup } from './render/sprites/pickups';
import { Menu } from './ui/menus/menu';
import { createUIStore, type UIStore } from './ui/menus/scenes';
import { renderSettings, renderAchievements, renderAbout } from './ui/menus/renderers';
import { FogOfWar } from './render/draw/fog';
import { DamageSystem } from './game/systems/Damage';
import { MissionTracker } from './game/missions/tracker';
import { loadMission } from './game/missions/loader';
import type { MissionDef, PickupDef, StructureDef, WaveSpawnPoint } from './game/missions/types';
import type { Structure } from './game/components/Structure';
import type { Pickup } from './game/components/Pickup';
import { CAMPAIGN_MISSIONS } from './game/data/missions/campaign';
import type { Health } from './game/components/Health';
import type { Collider } from './game/components/Collider';
import { drawHUD } from './ui/hud/hud';
import { loadJson, saveJson } from './core/util/storage';
import { loadBindings, isDown } from './ui/input-remap/bindings';
import { AudioBus } from './core/audio/audio';
import {
  EngineSound,
  playCannon,
  playRocket,
  playMissile,
  playExplosion,
  playPickup,
} from './core/audio/sfx';
import { CameraShake } from './render/camera/shake';

interface EnemyMeta {
  kind: 'aaa' | 'sam' | 'patrol' | 'chaser';
  score: number;
  wave?: number;
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
const missionIndexById = new Map<string, number>();
const missionMenu = new Menu(
  CAMPAIGN_MISSIONS.map((mission, index) => {
    missionIndexById.set(mission.id, index);
    return { id: mission.id, label: `${index + 1}. ${mission.title}` };
  }),
);
let currentMissionIndex = 0;
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
const structuresStore = new ComponentStore<Structure>();
const pickupsStore = new ComponentStore<Pickup>();
const pickupPulse = new Map<Entity, number>();

let isoParams = { tileWidth: 64, tileHeight: 32 };
const runtimeMap = parseTiled(sampleMapJson as unknown);
isoParams = { tileWidth: runtimeMap.tileWidth, tileHeight: runtimeMap.tileHeight };
const pad: RefuelPad = {
  tx: 0,
  ty: 0,
  radius: 1.6,
};

const player = entities.create();
transforms.set(player, {
  tx: 0,
  ty: 0,
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
let missionDef: MissionDef = CAMPAIGN_MISSIONS[currentMissionIndex]!;
let missionState = loadMission(missionDef);
let mission = new MissionTracker(missionState, transforms, colliders, healths, () => ({
  tx: transforms.get(player)!.tx,
  ty: transforms.get(player)!.ty,
}));
let waveSpawnPoints: WaveSpawnPoint[] = missionDef.waveSpawnPoints.slice();

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
scheduler.add(
  new EnemyBehaviorSystem(transforms, physics, patrols, chasers, fireEvents, rng, () => ({
    x: transforms.get(player)!.tx,
    y: transforms.get(player)!.ty,
  })),
);

const playerState: PlayerState = { lives: 3, respawnTimer: 0, invulnerable: false };
const stats = { score: 0, crates: 0, missionTimer: 0 };
const playerUpgrades = { cannon: 0, rocket: 0, missile: 0, armor: 0 };
const explosions: Explosion[] = [];
const enemyMeta = new Map<Entity, EnemyMeta>();
const waveState: WaveState = {
  index: 0,
  countdown: 3,
  active: false,
  timeInWave: 0,
  enemies: new Set<Entity>(),
};
const minimapEnemies: { tx: number; ty: number }[] = [];
let missionIntroTimer = 0;

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
  structuresStore.remove(entity);
  pickupsStore.remove(entity);
  pickupPulse.delete(entity);
  enemyMeta.delete(entity);
  waveState.enemies.delete(entity);
  entities.destroy(entity);
}

function registerEnemy(entity: Entity, meta: EnemyMeta): void {
  enemyMeta.set(entity, meta);
  if (meta.wave !== undefined) waveState.enemies.add(entity);
}

function clearDynamicEntities(): void {
  const ids: Entity[] = [];
  enemyMeta.forEach((_meta, entity) => {
    ids.push(entity);
  });
  structuresStore.forEach((entity) => {
    ids.push(entity);
  });
  pickupsStore.forEach((entity) => {
    ids.push(entity);
  });
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i]!;
    if (id !== player) destroyEntity(id);
  }
  enemyMeta.clear();
  waveState.enemies.clear();
}

function spawnMissionEnemies(): void {
  const def = mission.state.def;
  if (def.enemySpawns) {
    for (let i = 0; i < def.enemySpawns.length; i += 1) {
      const spawn = def.enemySpawns[i]!;
      const entity = entities.create();
      transforms.set(entity, { tx: spawn.at.tx, ty: spawn.at.ty, rot: 0 });
      healths.set(entity, { current: 30, max: 30 });
      colliders.set(entity, { radius: 0.5, team: 'enemy' });
      if (spawn.type === 'AAA') {
        aaas.set(entity, {
          range: 9,
          cooldown: 0,
          fireInterval: 0.55,
          projectileSpeed: 12,
          spread: 0.06,
        });
        registerEnemy(entity, { kind: 'aaa', score: 160 });
      } else {
        sams.set(entity, {
          range: 13,
          lockTime: 0.7,
          cooldown: 0,
          fireInterval: 2.3,
          turnRate: Math.PI * 0.8,
          missileSpeed: 6.5,
          lockProgress: 0,
        });
        registerEnemy(entity, { kind: 'sam', score: 220 });
      }
    }
  }
  if (def.structures) {
    for (let i = 0; i < def.structures.length; i += 1) {
      spawnStructureEntity(def.structures[i]!);
    }
  }
  if (def.pickups) {
    for (let i = 0; i < def.pickups.length; i += 1) {
      spawnPickupEntity(def.pickups[i]!);
    }
  }
  if (def.initialPatrols) {
    for (let i = 0; i < def.initialPatrols.length; i += 1) {
      const patrol = def.initialPatrols[i]!;
      spawnPatrolEnemy(patrol.at, 2, patrol.axis, {
        range: patrol.range,
        speed: patrol.speed,
        score: 190,
        wave: null,
      });
    }
  }
  if (def.initialChasers) {
    for (let i = 0; i < def.initialChasers.length; i += 1) {
      const chaser = def.initialChasers[i]!;
      spawnChaserEnemy(chaser.at, 3, { score: 260, wave: null });
    }
  }
}

function spawnStructureEntity(def: StructureDef): void {
  const entity = entities.create();
  transforms.set(entity, { tx: def.at.tx, ty: def.at.ty, rot: 0 });
  healths.set(entity, { current: def.health, max: def.health });
  colliders.set(entity, { radius: 0.6, team: 'enemy' });
  structuresStore.set(entity, { kind: def.kind, score: def.score, drop: def.drop });
}

function spawnPickupEntity(def: PickupDef): Entity {
  const entity = entities.create();
  transforms.set(entity, { tx: def.at.tx, ty: def.at.ty, rot: 0 });
  pickupsStore.set(entity, {
    id: def.id,
    kind: def.kind,
    amount: def.amount,
    upgrade: def.upgrade,
    objectiveFlag: def.objectiveFlag,
  });
  pickupPulse.set(entity, Math.random() * Math.PI * 2);
  return entity;
}

function applyPickupReward(pickup: Pickup): void {
  stats.crates += 1;
  const ammo = ammos.get(player);
  const fuel = fuels.get(player);
  const health = healths.get(player);
  if (pickup.kind === 'ammo' && ammo) {
    const amount = pickup.amount ?? 40;
    ammo.cannon = Math.min(ammo.cannonMax, ammo.cannon + amount);
    ammo.rockets = Math.min(ammo.rocketsMax, ammo.rockets + Math.ceil(amount / 12));
    ammo.missiles = Math.min(ammo.missilesMax, ammo.missiles + Math.ceil(amount / 20));
    stats.score += 60;
  } else if (pickup.kind === 'fuel' && fuel) {
    const amount = pickup.amount ?? 55;
    fuel.current = Math.min(fuel.max, fuel.current + amount);
    stats.score += 40;
  } else if (pickup.kind === 'repair' && health) {
    const amount = pickup.amount ?? 55;
    health.current = Math.min(health.max, health.current + amount);
    stats.score += 40;
  } else if (pickup.kind === 'upgrade') {
    const type = pickup.upgrade ?? 'cannon';
    if (type === 'cannon') playerUpgrades.cannon = Math.min(4, playerUpgrades.cannon + 1);
    else if (type === 'rocket') playerUpgrades.rocket = Math.min(4, playerUpgrades.rocket + 1);
    else if (type === 'missile') playerUpgrades.missile = Math.min(4, playerUpgrades.missile + 1);
    else if (type === 'armor') playerUpgrades.armor = Math.min(4, playerUpgrades.armor + 1);
    applyUpgradeStats();
    if (ammo) {
      ammo.cannon = ammo.cannonMax;
      ammo.rockets = ammo.rocketsMax;
      ammo.missiles = ammo.missilesMax;
    }
    if (fuel) fuel.current = fuel.max;
    if (health) health.current = health.max;
    stats.score += 140;
  } else if (pickup.kind === 'intel') {
    stats.score += 220;
  }

  if (pickup.objectiveFlag) mission.markCollected(pickup.objectiveFlag);
  else if (pickup.kind === 'intel') mission.markCollected(pickup.id);

  playPickup(bus);
}

function updatePickups(): void {
  const playerT = transforms.get(player);
  if (!playerT) return;
  const consumed: Entity[] = [];
  pickupsStore.forEach((entity, pickup) => {
    const t = transforms.get(entity);
    if (!t) return;
    const dx = t.tx - playerT.tx;
    const dy = t.ty - playerT.ty;
    if (dx * dx + dy * dy <= 0.45 * 0.45) {
      applyPickupReward(pickup);
      consumed.push(entity);
    }
  });
  for (let i = 0; i < consumed.length; i += 1) {
    const id = consumed[i]!;
    const t = transforms.get(id);
    if (t) spawnExplosion(t.tx, t.ty);
    destroyEntity(id);
  }
}

function spawnPatrolEnemy(
  point: { tx: number; ty: number },
  wave: number,
  axis: 'x' | 'y',
  overrides?: {
    range?: number;
    speed?: number;
    fireInterval?: number;
    health?: number;
    score?: number;
    wave?: number | null;
  },
): void {
  const entity = entities.create();
  transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
  physics.set(entity, {
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    drag: 0.9,
    maxSpeed: overrides?.speed ?? 2.2 + wave * 0.1,
    turnRate: Math.PI,
  });
  const baseHealth = overrides?.health ?? 22 + wave * 3;
  healths.set(entity, { current: baseHealth, max: baseHealth });
  colliders.set(entity, { radius: 0.4, team: 'enemy' });
  patrols.set(entity, {
    axis,
    originX: point.tx,
    originY: point.ty,
    range: overrides?.range ?? 2.5 + Math.min(4, wave * 0.6),
    speed: overrides?.speed ?? 1.8 + wave * 0.2,
    direction: rng.float01() > 0.5 ? 1 : -1,
    fireRange: 6.5,
    fireInterval: overrides?.fireInterval ?? Math.max(0.9, 1.4 - wave * 0.1),
    cooldown: 0,
  });
  const waveTag = overrides?.wave === null ? undefined : (overrides?.wave ?? wave);
  registerEnemy(entity, {
    kind: 'patrol',
    score: overrides?.score ?? 125 + wave * 15,
    wave: waveTag,
  });
}

function spawnChaserEnemy(
  point: { tx: number; ty: number },
  wave: number,
  overrides?: {
    speed?: number;
    score?: number;
    fireInterval?: number;
    health?: number;
    wave?: number | null;
  },
): void {
  const entity = entities.create();
  transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
  physics.set(entity, {
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    drag: 0.7,
    maxSpeed: overrides?.speed ?? 3.2 + wave * 0.25,
    turnRate: Math.PI * 1.4,
  });
  const baseHealth = overrides?.health ?? 26 + wave * 4;
  healths.set(entity, { current: baseHealth, max: baseHealth });
  colliders.set(entity, { radius: 0.35, team: 'enemy' });
  chasers.set(entity, {
    speed: overrides?.speed ?? 2.6 + wave * 0.25,
    acceleration: 3.2,
    fireRange: 6,
    fireInterval: overrides?.fireInterval ?? Math.max(0.8, 1.3 - wave * 0.1),
    cooldown: 0,
    spread: 0.18,
  });
  const waveTag = overrides?.wave === null ? undefined : (overrides?.wave ?? wave);
  registerEnemy(entity, {
    kind: 'chaser',
    score: overrides?.score ?? 220 + wave * 20,
    wave: waveTag,
  });
}

function spawnWave(index: number): void {
  waveState.enemies.clear();
  const patrolCount = Math.min(waveSpawnPoints.length, 2 + index);
  const chaserCount = Math.min(waveSpawnPoints.length, Math.max(0, Math.floor(index / 2)));
  for (let i = 0; i < patrolCount; i += 1) {
    const point = waveSpawnPoints[i % waveSpawnPoints.length]!;
    const axis: 'x' | 'y' = point.axis ?? (i % 2 === 0 ? 'x' : 'y');
    spawnPatrolEnemy({ tx: point.tx, ty: point.ty }, index, axis);
  }
  for (let i = 0; i < chaserCount; i += 1) {
    const point = waveSpawnPoints[(i + patrolCount) % waveSpawnPoints.length]!;
    spawnChaserEnemy({ tx: point.tx, ty: point.ty }, index);
  }
}

function applyUpgradeStats(): void {
  const fuel = fuels.get(player);
  const ammo = ammos.get(player);
  const health = healths.get(player);
  if (fuel) fuel.max = 100 + playerUpgrades.armor * 20;
  if (ammo) {
    ammo.cannonMax = 200 + playerUpgrades.cannon * 40;
    ammo.rocketsMax = 12 + playerUpgrades.rocket * 2;
    ammo.missilesMax = 6 + playerUpgrades.missile * 1;
  }
  if (health) health.max = 100 + playerUpgrades.armor * 20;
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
    applyUpgradeStats();
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

function restartMission(preserveUpgrades: boolean): void {
  clearDynamicEntities();
  projectilePool.clear();
  damage.reset();
  explosions.length = 0;
  missionState = loadMission(missionDef);
  mission = new MissionTracker(missionState, transforms, colliders, healths, () => ({
    tx: transforms.get(player)!.tx,
    ty: transforms.get(player)!.ty,
  }));
  waveSpawnPoints = missionDef.waveSpawnPoints.slice();
  pad.tx = missionDef.startPos.tx;
  pad.ty = Math.min(runtimeMap.height - 2, missionDef.startPos.ty + 2);
  pad.radius = 1.6;
  if (!preserveUpgrades) {
    playerUpgrades.cannon = 0;
    playerUpgrades.rocket = 0;
    playerUpgrades.missile = 0;
    playerUpgrades.armor = 0;
    const ammo = ammos.get(player);
    if (ammo) {
      ammo.cannonMax = 200;
      ammo.rocketsMax = 12;
      ammo.missilesMax = 6;
    }
    const fuel = fuels.get(player);
    if (fuel) fuel.max = 100;
    const health = healths.get(player);
    if (health) health.max = 100;
  }
  stats.score = 0;
  stats.crates = 0;
  stats.missionTimer = 0;
  waveState.index = 0;
  waveState.countdown = 3.5;
  waveState.active = false;
  waveState.timeInWave = 0;
  spawnMissionEnemies();
  playerState.lives = 3;
  resetPlayer();
  ui.state = 'in-game';
  missionIntroTimer = 4.5;
  setAudioVolumes();
}

function startMission(index: number, resetUpgrades: boolean): void {
  currentMissionIndex = Math.max(0, Math.min(CAMPAIGN_MISSIONS.length - 1, index));
  missionDef = CAMPAIGN_MISSIONS[currentMissionIndex]!;
  restartMission(!resetUpgrades);
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
    const structure = structuresStore.get(entity);
    if (structure) {
      const t = transforms.get(entity);
      if (t) spawnExplosion(t.tx, t.ty);
      playExplosion(bus);
      stats.score += structure.score;
      if (structure.drop) {
        const dropAt =
          structure.drop.at ?? (t ? { tx: t.tx, ty: t.ty } : mission.state.def.startPos);
        spawnPickupEntity({ ...structure.drop, at: dropAt });
      }
      destroyEntity(entity);
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
        ui.state = 'mission-select';
      } else if (action === 'settings') ui.state = 'settings';
      else if (action === 'achievements') ui.state = 'achievements';
      else if (action === 'about') ui.state = 'about';
      if (action) saveJson('vinestrike:ui', ui);
      return;
    }

    if (ui.state === 'mission-select') {
      const action = missionMenu.update(snap);
      if (action) {
        const idx = missionIndexById.get(action);
        if (idx !== undefined) {
          startMission(idx, true);
          saveJson('vinestrike:progress', { lastMission: CAMPAIGN_MISSIONS[idx]!.id });
        }
      }
      if (snap.keys['Escape']) ui.state = 'title';
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
        restartMission(true);
      }
      if (snap.keys['Escape']) ui.state = 'title';
      return;
    }

    if (ui.state === 'win') {
      if (snap.keys['Enter'] || snap.keys[' ']) {
        const next = Math.min(currentMissionIndex + 1, CAMPAIGN_MISSIONS.length - 1);
        startMission(next, false);
      }
      if (snap.keys['Escape']) ui.state = 'title';
      return;
    }

    tryRespawn(dt);

    const playerTransform = transforms.get(player)!;
    const ph = physics.get(player)!;
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

    const speed = Math.min(1, Math.hypot(ph.vx, ph.vy) / (physics.get(player)!.maxSpeed || 1));
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

    const weaponMods: WeaponModifiers = {
      cannonRate: 1 + playerUpgrades.cannon * 0.3,
      cannonDamage: 1 + playerUpgrades.cannon * 0.25,
      rocketDamage: 1 + playerUpgrades.rocket * 0.3,
      rocketSpeed: 1 + playerUpgrades.rocket * 0.18,
      missileDamage: 1 + playerUpgrades.missile * 0.28,
      missileSpeed: 1 + playerUpgrades.missile * 0.12,
    };
    weaponFire.setModifiers(weaponMods);

    scheduler.update(dt);
    updatePickups();
    stats.missionTimer += dt;
    if (missionIntroTimer > 0) missionIntroTimer = Math.max(0, missionIntroTimer - dt);

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
        const rocketDamage = ev.damage ?? 12;
        const rocketRadius = ev.radius ?? 0.6;
        const rocketTtl = ev.ttl ?? 4;
        projectilePool.spawn({
          kind: 'rocket',
          faction: ev.faction,
          x: ev.x,
          y: ev.y,
          vx: ev.vx,
          vy: ev.vy,
          ttl: rocketTtl,
          radius: rocketRadius,
          damage: { amount: rocketDamage, radius: rocketRadius },
        });
      } else if (ev.kind === 'missile') {
        playMissile(bus);
        const missileDamage = ev.damage ?? 18;
        const missileRadius = ev.radius ?? 0.9;
        const missileTtl = ev.ttl ?? 6;
        projectilePool.spawn({
          kind: 'missile',
          faction: ev.faction,
          x: ev.x,
          y: ev.y,
          vx: ev.vx,
          vy: ev.vy,
          ttl: missileTtl,
          radius: missileRadius,
          seek: { targetX: ev.targetX, targetY: ev.targetY, turnRate: Math.PI * 0.8 },
          damage: { amount: missileDamage, radius: missileRadius },
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
    if (ui.state === 'mission-select') {
      missionMenu.render(context, 'Select Operation', 'Choose a mission and press Enter');
      const idx = missionMenu.getIndex();
      const preview = CAMPAIGN_MISSIONS[idx] ?? CAMPAIGN_MISSIONS[0]!;
      context.save();
      context.fillStyle = 'rgba(14, 20, 26, 0.6)';
      const panelW = w * 0.5;
      const panelH = 160;
      const panelX = (w - panelW) / 2;
      const panelY = h * 0.65;
      context.fillRect(panelX, panelY, panelW, panelH);
      context.fillStyle = '#92ffa6';
      context.font = 'bold 18px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText(preview.title, w / 2, panelY + 28);
      context.fillStyle = '#c8d7e1';
      context.font = '14px system-ui, sans-serif';
      wrapText(context, preview.briefing, w / 2, panelY + 52, panelW - 24, 18);
      context.restore();
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
    renderer.draw(context, runtimeMap, isoParams, originX + shakeOffset.x, originY + shakeOffset.y);

    structuresStore.forEach((entity, structure) => {
      const t = transforms.get(entity);
      const h = healths.get(entity);
      if (t && h)
        drawStructure(
          context,
          isoParams,
          originX,
          originY,
          t.tx,
          t.ty,
          structure.kind,
          h.current / h.max,
        );
    });

    pickupsStore.forEach((entity, pickup) => {
      const t = transforms.get(entity);
      if (t)
        drawPickup(
          context,
          isoParams,
          originX,
          originY,
          t.tx,
          t.ty,
          pickup.kind,
          pickupPulse.get(entity) ?? 0,
        );
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
      originX + shakeOffset.x,
      originY + shakeOffset.y,
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

    drawPad(context, isoParams, originX + shakeOffset.x, originY + shakeOffset.y, pad.tx, pad.ty);

    drawHeli(context, {
      tx: playerT.tx,
      ty: playerT.ty,
      rot: playerT.rot,
      rotorPhase: sprites.get(player)!.rotor,
      color: sprites.get(player)!.color,
      iso: isoParams,
      originX: originX + shakeOffset.x,
      originY: originY + shakeOffset.y,
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

    const objectiveLines = mission.state.objectives.map(
      (o) => `${o.complete ? '[x]' : '[ ]'} ${o.name}`,
    );
    const nextObjective = mission.nextIncomplete();
    let compass = nextObjective
      ? { dx: nextObjective.at.tx - playerT.tx, dy: nextObjective.at.ty - playerT.ty }
      : null;
    if (compass && compass.dx * compass.dx + compass.dy * compass.dy < 0.05) compass = null;

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
        lives: Math.max(0, playerState.lives),
        score: stats.score,
        wave: waveState.active ? waveState.index : Math.max(1, waveState.index + 1),
        enemiesRemaining: waveState.enemies.size,
        nextWaveIn: waveState.active ? null : waveState.countdown,
        missionTitle: mission.state.def.title,
        missionTimer: stats.missionTimer,
        objectiveName: nextObjective ? nextObjective.name : null,
        upgrades: { ...playerUpgrades },
      },
      objectiveLines,
      compass,
      {
        mapW: runtimeMap.width,
        mapH: runtimeMap.height,
        player: { tx: playerT.tx, ty: playerT.ty },
        enemies: minimapEnemies,
      },
      isoParams,
    );

    if (missionIntroTimer > 0 && ui.state === 'in-game') {
      context.save();
      context.fillStyle = 'rgba(0, 0, 0, 0.55)';
      context.fillRect(0, 0, w, h);
      context.fillStyle = '#92ffa6';
      context.font = 'bold 26px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText(mission.state.def.title, w / 2, h * 0.3);
      context.fillStyle = '#c8d7e1';
      context.font = '15px system-ui, sans-serif';
      wrapText(context, mission.state.def.briefing, w / 2, h * 0.3 + 28, w * 0.6, 20);
      context.restore();
    }

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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  let line = '';
  let offsetY = 0;
  for (let n = 0; n < words.length; n += 1) {
    const testLine = line + words[n]! + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y + offsetY);
      line = words[n]! + ' ';
      offsetY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim().length > 0) ctx.fillText(line.trim(), x, y + offsetY);
}
