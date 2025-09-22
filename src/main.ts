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
import {
  drawSafeHouse,
  getSafeHouseDoorIso,
  type SafeHouseParams,
} from './render/sprites/safehouse';
import { drawRescueRunner } from './render/sprites/rescuees';
import { WeaponFireSystem, type FireEvent } from './game/systems/WeaponFire';
import type { Ammo } from './game/components/Ammo';
import type { WeaponHolder } from './game/components/Weapon';
import { RNG } from './core/util/rng';
import { ProjectilePool } from './game/systems/Projectile';
import type { AAA, SAM, PatrolDrone, ChaserDrone } from './game/components/AI';
import { AIControlSystem } from './game/systems/AIControl';
import { EnemyBehaviorSystem } from './game/systems/EnemyBehavior';
import {
  drawAAATurret,
  drawSAM,
  drawPatrolDrone,
  drawChaserDrone,
  drawAlienMonstrosity,
  drawSpeedboat,
} from './render/sprites/targets';
import { Menu } from './ui/menus/menu';
import { createUIStore, type UIStore } from './ui/menus/scenes';
import { renderSettings, renderAchievements, renderAbout } from './ui/menus/renderers';
import { FogOfWar } from './render/draw/fog';
import { DamageSystem } from './game/systems/Damage';
import { MissionTracker } from './game/missions/tracker';
import { loadMission } from './game/missions/loader';
import type { MissionDef, ObjectiveState } from './game/missions/types';
import missionJson from './game/data/missions/sample_mission.json';
import oceanMissionJson from './game/data/missions/ocean_mission.json';
import type { Health } from './game/components/Health';
import type { Collider } from './game/components/Collider';
import type { Building } from './game/components/Building';
import type { Pickup } from './game/components/Pickup';
import type { Speedboat } from './game/components/Speedboat';
import { drawHUD } from './ui/hud/hud';
import { loadJson, saveJson } from './core/util/storage';
import { loadBindings, isDown } from './ui/input-remap/bindings';
import { AudioBus } from './core/audio/audio';
import {
  EngineSound,
  playMissile,
  playRocket,
  playHellfire,
  playExplosion,
  startPickupCrane,
  type PickupCraneSoundHandle,
} from './core/audio/sfx';
import { CameraShake } from './render/camera/shake';
import { getCanvasViewMetrics } from './render/canvas/metrics';
import { drawPickupCrate } from './render/sprites/pickups';
import { SpeedboatBehaviorSystem } from './game/systems/SpeedboatBehavior';
import {
  createMissionOneLayout,
  createMissionTwoLayout,
  cloneBuildingSite,
  clonePadConfig,
  clonePickupSite,
  clonePoint,
  cloneSafeHouseParams,
  cloneSurvivorSite,
  type PadConfig,
  type BuildingSite,
  type PickupSite,
  type SurvivorSite,
  type BoatLane,
  type BoatWave,
} from './game/scenarios/layouts';

interface EnemyMeta {
  kind: 'aaa' | 'sam' | 'patrol' | 'chaser' | 'speedboat';
  score: number;
  wave?: number;
}

interface BuildingMeta {
  score: number;
  drop?: { kind: 'armor'; amount: number };
  category: 'campus' | 'stronghold' | 'civilian';
  triggersAlarm: boolean;
}

type ObjectiveLabelFn = (objective: ObjectiveState) => string;

interface ScenarioConfig {
  pad: PadConfig;
  safeHouse: SafeHouseParams;
  campusSites: BuildingSite[];
  civilianGenerator?: () => BuildingSite[];
  staticStructures?: BuildingSite[];
  pickupSites: PickupSite[];
  survivorSites: SurvivorSite[];
  alienSpawnPoints: Array<{ tx: number; ty: number }>;
  waveSpawnPoints: Array<{ tx: number; ty: number }>;
  initialWaveCountdown?: number;
  waveCooldown?: (index: number) => number;
  waveSpawner?: (index: number) => boolean;
  setupMissionHandlers: () => void;
  setupObjectiveLabels: () => void;
  onApply?: () => void;
  onReset?: () => void;
  spawnExtraEnemies?: () => void;
}

interface BoatScenarioConfig {
  lanes: BoatLane[];
  waves: BoatWave[];
  maxEscapes: number;
  nextWaveDelay: number;
}

interface Explosion {
  tx: number;
  ty: number;
  age: number;
  duration: number;
  radius: number;
}

interface RescueRunner {
  startIso: { x: number; y: number };
  endIso: { x: number; y: number };
  progress: number;
  delay: number;
  duration: number;
  elapsed: number;
  bobOffset: number;
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

// Disable right-click context menu on the game canvas only
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

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

const ui: UIStore = loadJson<UIStore>('choppa:ui', createUIStore());
ui.state = 'title';
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
const fog = new FogOfWar();
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
const speedboats = new ComponentStore<Speedboat>();

let isoParams = { tileWidth: 64, tileHeight: 32 };
const runtimeMap = parseTiled(sampleMapJson as unknown);
isoParams = { tileWidth: runtimeMap.tileWidth, tileHeight: runtimeMap.tileHeight };

const missionOneLayout = createMissionOneLayout(runtimeMap);
const missionTwoLayout = createMissionTwoLayout();
let pad: PadConfig = clonePadConfig(missionOneLayout.pad);

let safeHouse: SafeHouseParams = cloneSafeHouseParams(missionOneLayout.safeHouse);

fog.configure(runtimeMap.width, runtimeMap.height);

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
  missiles: 200,
  missilesMax: 200,
  rockets: 12,
  rocketsMax: 12,
  hellfires: 2,
  hellfiresMax: 2,
});
weapons.set(player, {
  active: 'missile',
  cooldownMissile: 0,
  cooldownRocket: 0,
  cooldownHellfire: 0,
});
healths.set(player, { current: 100, max: 100 });
colliders.set(player, { radius: 0.4, team: 'player' });

const scheduler = new SystemScheduler();
const rng = new RNG(1337);
const projectilePool = new ProjectilePool();
const fireEvents: FireEvent[] = [];
const weaponFire = new WeaponFireSystem(transforms, physics, weapons, ammos, fireEvents, rng);
const damage = new DamageSystem(transforms, colliders, healths);
interface MissionProgressData {
  current?: string;
  unlocked?: string;
  lastWin?: number;
  mission?: string; // legacy field
}

const missionDefs: MissionDef[] = [missionJson as MissionDef, oceanMissionJson as MissionDef];

function findMissionIndex(id?: string): number {
  if (!id) return -1;
  return missionDefs.findIndex((def) => def.id === id);
}

const savedProgress = loadJson<MissionProgressData>('choppa:progress', {});
let currentMissionIndex = findMissionIndex(savedProgress.current);
if (currentMissionIndex < 0) {
  currentMissionIndex = findMissionIndex(savedProgress.mission);
}
if (currentMissionIndex < 0) currentMissionIndex = 0;

let highestUnlockedMissionIndex = findMissionIndex(savedProgress.unlocked);
if (highestUnlockedMissionIndex < 0) {
  const legacyIndex = findMissionIndex(savedProgress.mission);
  if (legacyIndex >= 0)
    highestUnlockedMissionIndex = Math.min(legacyIndex + 1, missionDefs.length - 1);
}
if (highestUnlockedMissionIndex < 0) highestUnlockedMissionIndex = currentMissionIndex;
highestUnlockedMissionIndex = Math.max(highestUnlockedMissionIndex, currentMissionIndex);

let nextMissionIndex = Math.min(currentMissionIndex + 1, highestUnlockedMissionIndex);
const missionProgress: MissionProgressData = {
  current: missionDefs[currentMissionIndex]?.id ?? missionDefs[0]?.id,
  unlocked: missionDefs[highestUnlockedMissionIndex]?.id ?? missionDefs[0]?.id,
  lastWin: savedProgress.lastWin,
};

function persistMissionProgress(): void {
  saveJson('choppa:progress', missionProgress);
}

let missionDef: MissionDef = missionDefs[currentMissionIndex];
let missionState = loadMission(missionDef);
const missionHandlers: Record<string, () => boolean> = {};
const mission = new MissionTracker(
  missionState,
  transforms,
  colliders,
  healths,
  () => ({
    tx: transforms.get(player)!.tx,
    ty: transforms.get(player)!.ty,
  }),
  missionHandlers,
);
let missionBriefingInfo = createMissionBriefing(missionDef);

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
scheduler.add(
  new SpeedboatBehaviorSystem(
    transforms,
    physics,
    speedboats,
    fireEvents,
    rng,
    () => ({
      x: transforms.get(player)!.tx,
      y: transforms.get(player)!.ty,
    }),
    handleBoatLanding,
  ),
);

const playerState: PlayerState = { lives: 3, respawnTimer: 0, invulnerable: false };
const stats = { score: 0 };
const explosions: Explosion[] = [];
const enemyMeta = new Map<Entity, EnemyMeta>();
const buildingMeta = new Map<Entity, BuildingMeta>();
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
const pickupCraneSounds = new Map<Entity, PickupCraneSoundHandle>();
const survivorEntities: Entity[] = [];
const alienEntities: Set<Entity> = new Set();
const rescueRunners: RescueRunner[] = [];

const SURVIVOR_CAPACITY = 4;

const rescueState = {
  carrying: 0,
  rescued: 0,
  total: 0,
  survivorsSpawned: false,
};

let aliensTriggered = false;
let aliensDefeated = false;
let campusLeveled = false;

let campusSites: BuildingSite[] = [];
let civilianHouseSites: BuildingSite[] = [];
let staticBuildingSites: BuildingSite[] = [];
let buildingSites: BuildingSite[] = [];
let pickupSites: PickupSite[] = [];
let survivorSites: SurvivorSite[] = [];
let alienSpawnPoints: { tx: number; ty: number }[] = [];
let waveSpawnPoints: { tx: number; ty: number }[] = [];
let extraStructureGenerator: (() => BuildingSite[]) | null = null;
let spawnWaveHandler: ((index: number) => boolean) | null = null;
let computeWaveCooldown: ((index: number) => number) | null = null;
let initialWaveCountdown = 3.5;
let scenarioOnReset: (() => void) | null = null;
let spawnExtraScenarioEnemies: (() => void) | null = null;
let objectiveLabelOverrides: Record<string, ObjectiveLabelFn> = {};

let boatScenario: BoatScenarioConfig | null = null;
let boatsEscaped = 0;
let boatObjectiveComplete = false;
let boatObjectiveFailed = false;

function generateMissionOneCivilianHouses(): BuildingSite[] {
  const clusters = missionOneLayout.civilianClusters ?? [];
  const palettes = [
    { body: '#7c95a3', roof: '#2f3f4d', ruin: '#3b2b2b' },
    { body: '#9a7c6a', roof: '#4c3324', ruin: '#3c2018' },
    { body: '#7f8f6b', roof: '#39482f', ruin: '#32291d' },
    { body: '#a08aa3', roof: '#3d2c4b', ruin: '#352139' },
  ];
  const houses: BuildingSite[] = [];
  for (let c = 0; c < clusters.length; c += 1) {
    const cluster = clusters[c]!;
    for (let i = 0; i < cluster.count; i += 1) {
      const paletteRawIndex = Math.floor(rng.range(0, palettes.length));
      const paletteIndex = Math.min(palettes.length - 1, paletteRawIndex);
      const palette = palettes[paletteIndex]!;
      houses.push({
        tx: cluster.tx + rng.range(-cluster.spread, cluster.spread),
        ty: cluster.ty + rng.range(-cluster.spread, cluster.spread),
        width: 0.95 + rng.range(-0.1, 0.25),
        depth: 0.95 + rng.range(-0.18, 0.2),
        height: 18 + rng.range(-2, 4),
        health: 60 + rng.range(-8, 10),
        colliderRadius: 0.6 + rng.range(-0.04, 0.08),
        bodyColor: palette.body,
        roofColor: palette.roof,
        ruinColor: palette.ruin,
        score: 0,
        category: 'civilian',
        triggersAlarm: false,
      });
    }
  }
  if (houses.length > 0) {
    const specialIndex = Math.min(houses.length - 1, Math.floor(rng.range(0, houses.length)));
    houses[specialIndex] = {
      ...houses[specialIndex]!,
      drop: { kind: 'armor', amount: 35 },
    };
  }
  return houses;
}

const missionTwoBoat = missionTwoLayout.boat;

const scenarioConfigs: Record<string, ScenarioConfig> = {
  m01: {
    pad: missionOneLayout.pad,
    safeHouse: missionOneLayout.safeHouse,
    campusSites: missionOneLayout.campusSites,
    civilianGenerator: generateMissionOneCivilianHouses,
    pickupSites: missionOneLayout.pickupSites,
    survivorSites: missionOneLayout.survivorSites,
    alienSpawnPoints: missionOneLayout.alienSpawnPoints,
    waveSpawnPoints: missionOneLayout.waveSpawnPoints,
    initialWaveCountdown: 3.5,
    waveCooldown: defaultWaveCooldown,
    waveSpawner: spawnDefaultWave,
    setupMissionHandlers: setupMissionOneHandlers,
    setupObjectiveLabels: setupMissionOneObjectiveLabels,
    onApply: () => {
      boatScenario = null;
      boatsEscaped = 0;
      boatObjectiveComplete = false;
      boatObjectiveFailed = false;
    },
  },
  m02: {
    pad: missionTwoLayout.pad,
    safeHouse: missionTwoLayout.safeHouse,
    campusSites: missionTwoLayout.campusSites,
    staticStructures: missionTwoLayout.staticStructures,
    pickupSites: missionTwoLayout.pickupSites,
    survivorSites: missionTwoLayout.survivorSites,
    alienSpawnPoints: missionTwoLayout.alienSpawnPoints,
    waveSpawnPoints: missionTwoLayout.waveSpawnPoints,
    initialWaveCountdown: 4.5,
    waveCooldown: boatWaveCooldown,
    waveSpawner: spawnBoatWave,
    setupMissionHandlers: setupMissionTwoHandlers,
    setupObjectiveLabels: setupMissionTwoObjectiveLabels,
    onApply: () => {
      activateBoatScenario();
    },
    onReset: () => {
      boatsEscaped = 0;
      boatObjectiveComplete = false;
      boatObjectiveFailed = false;
    },
    spawnExtraEnemies: spawnMissionTwoGuards,
  },
};

function createMissionBriefing(def: MissionDef): { title: string; text: string; goals: string[] } {
  return {
    title: def.title,
    text: def.briefing,
    goals: def.objectives.map((o) => o.name),
  };
}

function defaultWaveCooldown(index: number): number {
  return Math.max(3, 5 - index * 0.2);
}

function boatWaveCooldown(index: number): number {
  if (!boatScenario) return Number.POSITIVE_INFINITY;
  return index < boatScenario.waves.length ? boatScenario.nextWaveDelay : Number.POSITIVE_INFINITY;
}

function regenerateWorldStructures(): void {
  civilianHouseSites = extraStructureGenerator ? extraStructureGenerator() : [];
  buildingSites = [...campusSites];
  if (civilianHouseSites.length > 0) buildingSites.push(...civilianHouseSites);
  if (staticBuildingSites.length > 0) buildingSites.push(...staticBuildingSites);
}

function applyScenario(id: string): void {
  const config = scenarioConfigs[id];
  if (!config) throw new Error(`Unknown mission scenario: ${id}`);
  pad = clonePadConfig(config.pad);
  safeHouse = cloneSafeHouseParams(config.safeHouse);
  campusSites = config.campusSites.map((site) => cloneBuildingSite(site));
  extraStructureGenerator = config.civilianGenerator ?? null;
  staticBuildingSites = config.staticStructures
    ? config.staticStructures.map((site) => cloneBuildingSite(site))
    : [];
  pickupSites = config.pickupSites.map((site) => clonePickupSite(site));
  survivorSites = config.survivorSites.map((site) => cloneSurvivorSite(site));
  alienSpawnPoints = config.alienSpawnPoints.map((point) => clonePoint(point));
  waveSpawnPoints = config.waveSpawnPoints.map((point) => clonePoint(point));
  spawnWaveHandler = config.waveSpawner ?? spawnDefaultWave;
  computeWaveCooldown = config.waveCooldown ?? defaultWaveCooldown;
  initialWaveCountdown = config.initialWaveCountdown ?? 3.5;
  scenarioOnReset = config.onReset ?? null;
  spawnExtraScenarioEnemies = config.spawnExtraEnemies ?? null;
  objectiveLabelOverrides = {};
  for (const key of Object.keys(missionHandlers)) delete missionHandlers[key];
  if (config.onApply) config.onApply();
  regenerateWorldStructures();
  rescueState.carrying = 0;
  rescueState.rescued = 0;
  rescueState.total = survivorSites.reduce((sum, site) => sum + site.count, 0);
  rescueState.survivorsSpawned = false;
  aliensTriggered = false;
  aliensDefeated = false;
  campusLeveled = false;
  config.setupMissionHandlers();
  config.setupObjectiveLabels();
  waveState.index = 0;
  waveState.countdown = initialWaveCountdown;
  waveState.active = false;
  waveState.timeInWave = 0;
  waveState.enemies.clear();
}

function setMission(index: number): void {
  const clampedIndex = Math.min(Math.max(index, 0), missionDefs.length - 1);
  currentMissionIndex = clampedIndex;
  if (highestUnlockedMissionIndex < currentMissionIndex) {
    highestUnlockedMissionIndex = currentMissionIndex;
  }
  missionDef = missionDefs[currentMissionIndex];
  missionState = loadMission(missionDef);
  mission.state = missionState;
  missionBriefingInfo = createMissionBriefing(missionDef);
  applyScenario(missionDef.id);
  nextMissionIndex = Math.min(currentMissionIndex + 1, highestUnlockedMissionIndex);
  missionProgress.current = missionDefs[currentMissionIndex]?.id ?? missionProgress.current;
  missionProgress.unlocked =
    missionDefs[highestUnlockedMissionIndex]?.id ?? missionProgress.unlocked;
  persistMissionProgress();
}

function setupMissionOneHandlers(): void {
  missionHandlers.obj4 = () => aliensTriggered && aliensDefeated;
  missionHandlers.obj5 = () => rescueState.rescued >= rescueState.total;
}

function setupMissionOneObjectiveLabels(): void {
  objectiveLabelOverrides.obj4 = (objective) => {
    if (!aliensTriggered) return `${objective.name} (stand by)`;
    if (!objective.complete) return `${objective.name} (${alienEntities.size} remaining)`;
    return objective.name;
  };
  objectiveLabelOverrides.obj5 = (objective) => {
    const carrying = rescueState.carrying;
    let label = `${objective.name} (${rescueState.rescued}/${rescueState.total}`;
    if (carrying > 0) label += ` +${carrying}`;
    label += ')';
    return label;
  };
}

function setupMissionTwoHandlers(): void {
  missionHandlers.boats = () => boatObjectiveComplete && !boatObjectiveFailed;
}

function setupMissionTwoObjectiveLabels(): void {
  objectiveLabelOverrides.boats = (objective) => {
    if (!boatScenario) return objective.name;
    const totalWaves = boatScenario.waves.length;
    const currentWave = waveState.active
      ? waveState.index
      : Math.min(waveState.index + 1, totalWaves);
    let label = `${objective.name} (Escaped: ${boatsEscaped}/${boatScenario.maxEscapes}`;
    if (!objective.complete) {
      const clampedWave = Math.min(Math.max(currentWave, 1), totalWaves);
      label += ` | Wave ${clampedWave} of ${totalWaves}`;
      if (
        !waveState.active &&
        waveState.index < totalWaves &&
        Number.isFinite(waveState.countdown)
      ) {
        label += ` | Next wave in: ${Math.max(0, waveState.countdown).toFixed(1)}s`;
      }
    }
    label += ')';
    return label;
  };
}

function spawnMissionTwoGuards(): void {
  const guardPosts = missionTwoLayout.guardPosts ?? [];
  for (let i = 0; i < guardPosts.length; i += 1) {
    spawnCoastGuard(guardPosts[i]!, 9.2);
  }
  const patrolRoutes = missionTwoLayout.patrolRoutes ?? [];
  for (let i = 0; i < patrolRoutes.length; i += 1) {
    spawnShorePatrol(patrolRoutes[i]!);
  }
}

function spawnCoastGuard(point: { tx: number; ty: number }, leashRange: number): void {
  const entity = entities.create();
  transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
  physics.set(entity, {
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    drag: 0.72,
    maxSpeed: 3.4,
    turnRate: Math.PI * 1.5,
  });
  healths.set(entity, { current: 38, max: 38 });
  colliders.set(entity, { radius: 0.35, team: 'enemy' });
  chasers.set(entity, {
    speed: 3.1,
    acceleration: 3.5,
    fireRange: 6.5,
    fireInterval: 1.05,
    cooldown: 0,
    spread: 0.2,
    guard: {
      homeX: point.tx,
      homeY: point.ty,
      holdRadius: 0.6,
      aggroRange: 6.8,
      leashRange,
      alerted: false,
    },
  });
  registerEnemy(entity, { kind: 'chaser', score: 250 });
}

function spawnShorePatrol(route: { tx: number; ty: number; axis: 'x' | 'y'; range: number }): void {
  const entity = entities.create();
  transforms.set(entity, { tx: route.tx, ty: route.ty, rot: 0 });
  physics.set(entity, {
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    drag: 0.86,
    maxSpeed: 2.3,
    turnRate: Math.PI,
  });
  healths.set(entity, { current: 28, max: 28 });
  colliders.set(entity, { radius: 0.38, team: 'enemy' });
  patrols.set(entity, {
    axis: route.axis,
    originX: route.tx,
    originY: route.ty,
    range: route.range,
    speed: 2.1,
    direction: rng.float01() > 0.5 ? 1 : -1,
    fireRange: 6.4,
    fireInterval: 1.15,
    cooldown: 0,
  });
  registerEnemy(entity, { kind: 'patrol', score: 165 });
}

function activateBoatScenario(): void {
  if (!missionTwoBoat) {
    boatScenario = null;
    return;
  }
  boatScenario = {
    lanes: missionTwoBoat.lanes.map((lane) => ({
      entry: { ...lane.entry },
      target: { ...lane.target },
    })),
    waves: missionTwoBoat.waves.map((wave) => ({ ...wave })),
    maxEscapes: missionTwoBoat.maxEscapes,
    nextWaveDelay: missionTwoBoat.nextWaveDelay,
  };
  boatsEscaped = 0;
  boatObjectiveComplete = false;
  boatObjectiveFailed = false;
}

function spawnSpeedboat(lane: BoatLane, wave: number): void {
  const entity = entities.create();
  const entryJitter = (rng.float01() - 0.5) * 0.6;
  const entryJitterY = (rng.float01() - 0.5) * 0.4;
  transforms.set(entity, {
    tx: lane.entry.tx + entryJitter,
    ty: lane.entry.ty + entryJitterY,
    rot: 0,
  });
  physics.set(entity, {
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    drag: 0.78,
    maxSpeed: 3.6 + wave * 0.25,
    turnRate: Math.PI,
  });
  healths.set(entity, { current: 24 + wave * 4, max: 24 + wave * 4 });
  colliders.set(entity, { radius: 0.4, team: 'enemy' });
  speedboats.set(entity, {
    targetX: lane.target.tx + (rng.float01() - 0.5) * 0.5,
    targetY: lane.target.ty + (rng.float01() - 0.5) * 0.5,
    speed: 3.6 + wave * 0.25,
    acceleration: 3.4,
    fireRange: 6.2,
    fireInterval: Math.max(0.95, 1.3 - wave * 0.08),
    cooldown: 0,
    arrivalRadius: 0.6,
  });
  registerEnemy(entity, { kind: 'speedboat', score: 220 + wave * 25, wave });
}

function spawnDefaultWave(index: number): boolean {
  if (waveSpawnPoints.length === 0) return false;
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
  return true;
}

function spawnBoatWave(index: number): boolean {
  if (!boatScenario || boatScenario.lanes.length === 0) return false;
  waveState.enemies.clear();
  const waveDef = boatScenario.waves[index - 1];
  if (!waveDef) return false;
  const laneOffset = Math.floor(rng.range(0, boatScenario.lanes.length));
  for (let i = 0; i < waveDef.count; i += 1) {
    const lane = boatScenario.lanes[(i + laneOffset) % boatScenario.lanes.length]!;
    spawnSpeedboat(lane, index);
  }
  return waveDef.count > 0;
}

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

function spawnExplosion(tx: number, ty: number, radius = 0.9, duration = 0.6): void {
  explosions.push({ tx, ty, age: 0, duration, radius });
}

function updateExplosions(dt: number): void {
  for (let i = explosions.length - 1; i >= 0; i -= 1) {
    const e = explosions[i]!;
    e.age += dt;
    if (e.age >= e.duration) explosions.splice(i, 1);
  }
}

function handleBoatLanding(entity: Entity): void {
  if (!boatScenario) return;
  const t = transforms.get(entity);
  if (t) spawnExplosion(t.tx, t.ty, 1.1, 0.8);
  playExplosion(bus, 0.8);
  destroyEntity(entity);
  boatsEscaped += 1;
  if (ui.state === 'in-game' && boatsEscaped >= boatScenario.maxEscapes) {
    boatObjectiveFailed = true;
    ui.state = 'game-over';
    waveState.active = false;
    engine.stop();
  }
}

function spawnRescueRunnerAnimation(count: number): void {
  if (count <= 0) return;
  const padOrigin = tileToIso(pad.tx - 0.05, pad.ty + 0.18, isoParams);
  const doorIso = getSafeHouseDoorIso(isoParams, safeHouse);
  for (let i = 0; i < count; i += 1) {
    const jitterStartX = (rng.float01() - 0.5) * 10;
    const jitterStartY = (rng.float01() - 0.5) * 6;
    const jitterEndX = (rng.float01() - 0.5) * 3;
    const jitterEndY = (rng.float01() - 0.5) * 2.4;
    const delay = i * 0.16 + rng.float01() * 0.05;
    const duration = 0.82 + rng.float01() * 0.32;
    rescueRunners.push({
      startIso: { x: padOrigin.x + jitterStartX, y: padOrigin.y + jitterStartY },
      endIso: { x: doorIso.x + jitterEndX, y: doorIso.y + jitterEndY },
      progress: 0,
      delay,
      duration,
      elapsed: 0,
      bobOffset: rng.float01() * Math.PI * 2,
    });
  }
}

function updateRescueRunnerAnimations(dt: number): void {
  for (let i = rescueRunners.length - 1; i >= 0; i -= 1) {
    const runner = rescueRunners[i]!;
    if (runner.delay > 0) {
      runner.delay -= dt;
      if (runner.delay > 0) continue;
      runner.delay = 0;
    }
    runner.elapsed += dt;
    runner.progress += dt / runner.duration;
    if (runner.progress >= 1.3) {
      rescueRunners.splice(i, 1);
    }
  }
}

function beginPickupCraneSound(entity: Entity, pickup: Pickup): void {
  if (pickupCraneSounds.has(entity)) return;
  const handle = startPickupCrane(bus, pickup.duration);
  pickupCraneSounds.set(entity, handle);
}

function cancelPickupCraneSound(entity: Entity): void {
  const handle = pickupCraneSounds.get(entity);
  if (!handle) return;
  handle.cancel();
  pickupCraneSounds.delete(entity);
}

function completePickupCraneSound(entity: Entity): void {
  const handle = pickupCraneSounds.get(entity);
  if (!handle) return;
  handle.complete();
  pickupCraneSounds.delete(entity);
}

function destroyEntity(entity: Entity): void {
  if (entity === player) return;
  cancelPickupCraneSound(entity);
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
  speedboats.remove(entity);
  healths.remove(entity);
  colliders.remove(entity);
  buildings.remove(entity);
  pickups.remove(entity);
  buildingMeta.delete(entity);
  const buildingIndex = buildingEntities.indexOf(entity);
  if (buildingIndex !== -1) buildingEntities.splice(buildingIndex, 1);
  const pickupIndex = pickupEntities.indexOf(entity);
  if (pickupIndex !== -1) pickupEntities.splice(pickupIndex, 1);
  const survivorIndex = survivorEntities.indexOf(entity);
  if (survivorIndex !== -1) survivorEntities.splice(survivorIndex, 1);
  enemyMeta.delete(entity);
  alienEntities.delete(entity);
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
  alienEntities.clear();
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
      spawnAlienStronghold('AAA', spawn.at.tx, spawn.at.ty);
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
      spawnAlienStronghold('SAM', spawn.at.tx, spawn.at.ty);
    }
  }
  if (spawnExtraScenarioEnemies) spawnExtraScenarioEnemies();
}

function clearBuildings(): void {
  for (let i = buildingEntities.length - 1; i >= 0; i -= 1) {
    const entity = buildingEntities[i]!;
    destroyEntity(entity);
  }
  buildingEntities.length = 0;
}

function createBuildingEntity(site: BuildingSite): Entity {
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
  buildingMeta.set(entity, {
    score: site.score ?? 0,
    drop: site.drop,
    category: site.category ?? 'civilian',
    triggersAlarm: Boolean(site.triggersAlarm),
  });
  buildingEntities.push(entity);
  return entity;
}

function spawnBuildings(): void {
  clearBuildings();
  for (let i = 0; i < buildingSites.length; i += 1) {
    const site = buildingSites[i]!;
    createBuildingEntity(site);
  }
}

function spawnAlienStronghold(type: 'AAA' | 'SAM', tx: number, ty: number): void {
  const strongholdStructures: BuildingSite[] =
    type === 'AAA'
      ? [
          {
            tx: tx - 0.85,
            ty: ty + 0.55,
            width: 1.15,
            depth: 0.95,
            height: 22,
            health: 85,
            colliderRadius: 0.7,
            bodyColor: '#25143c',
            roofColor: '#6efdd4',
            ruinColor: '#341d4d',
            score: 130,
            category: 'stronghold',
          },
          {
            tx: tx + 0.9,
            ty: ty - 0.45,
            width: 1.05,
            depth: 0.85,
            height: 20,
            health: 80,
            colliderRadius: 0.68,
            bodyColor: '#28163f',
            roofColor: '#63f0c8',
            ruinColor: '#2f1744',
            score: 130,
            category: 'stronghold',
          },
          {
            tx: tx,
            ty: ty + 0.9,
            width: 1.6,
            depth: 0.6,
            height: 16,
            health: 70,
            colliderRadius: 0.65,
            bodyColor: '#1f0f32',
            roofColor: '#8bf9e1',
            ruinColor: '#2a123d',
            score: 110,
            category: 'stronghold',
          },
        ]
      : [
          {
            tx: tx,
            ty: ty - 0.95,
            width: 1.6,
            depth: 1.15,
            height: 30,
            health: 140,
            colliderRadius: 0.88,
            bodyColor: '#1f1d46',
            roofColor: '#7afbe9',
            ruinColor: '#261b3d',
            score: 200,
            category: 'stronghold',
          },
          {
            tx: tx - 1.15,
            ty: ty + 0.55,
            width: 1.1,
            depth: 0.9,
            height: 24,
            health: 90,
            colliderRadius: 0.72,
            bodyColor: '#261548',
            roofColor: '#5cf3db',
            ruinColor: '#2e1a4f',
            score: 150,
            category: 'stronghold',
          },
          {
            tx: tx + 1.1,
            ty: ty + 0.65,
            width: 1.15,
            depth: 0.95,
            height: 24,
            health: 90,
            colliderRadius: 0.74,
            bodyColor: '#2a184d',
            roofColor: '#68f8e1',
            ruinColor: '#311e53',
            score: 150,
            category: 'stronghold',
          },
        ];
  for (let i = 0; i < strongholdStructures.length; i += 1) {
    const site = strongholdStructures[i]!;
    createBuildingEntity({ ...site, triggersAlarm: false });
  }

  const defenders =
    type === 'AAA'
      ? [
          { tx: tx - 1.2, ty: ty + 0.2 },
          { tx: tx + 1, ty: ty - 0.1 },
        ]
      : [
          { tx: tx - 1.25, ty: ty + 0.2 },
          { tx: tx + 1.2, ty: ty + 0.3 },
          { tx: tx + 0.1, ty: ty - 1.2 },
        ];
  for (let i = 0; i < defenders.length; i += 1) {
    spawnAlienUnit(defenders[i]!);
  }
}

function clearPickups(): void {
  for (let i = pickupEntities.length - 1; i >= 0; i -= 1) {
    const entity = pickupEntities[i]!;
    destroyEntity(entity);
  }
  pickupEntities.length = 0;
  survivorEntities.length = 0;
}

function spawnPickupEntity(site: PickupSite): Entity {
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
            missiles: site.ammo?.missiles ?? 80,
            rockets: site.ammo?.rockets ?? 3,
            hellfires: site.ammo?.hellfires ?? 0,
          }
        : undefined,
    armorAmount: site.kind === 'armor' ? (site.armorAmount ?? 35) : undefined,
    collectingBy: null,
    progress: 0,
  });
  pickupEntities.push(entity);
  return entity;
}

function spawnPickups(): void {
  clearPickups();
  for (let i = 0; i < pickupSites.length; i += 1) {
    const site = pickupSites[i]!;
    spawnPickupEntity(site);
  }
}

function spawnSurvivors(): void {
  if (rescueState.survivorsSpawned) return;
  rescueState.survivorsSpawned = true;
  for (let i = 0; i < survivorSites.length; i += 1) {
    const site = survivorSites[i]!;
    const entity = entities.create();
    transforms.set(entity, { tx: site.tx, ty: site.ty, rot: 0 });
    pickups.set(entity, {
      kind: 'survivor',
      radius: site.radius ?? 0.9,
      duration: site.duration ?? 1.6,
      fuelAmount: undefined,
      ammo: undefined,
      survivorCount: site.count,
      collectingBy: null,
      progress: 0,
    });
    pickupEntities.push(entity);
    survivorEntities.push(entity);
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

function spawnAlienUnit(point: { tx: number; ty: number }): void {
  const entity = entities.create();
  transforms.set(entity, { tx: point.tx, ty: point.ty, rot: 0 });
  physics.set(entity, {
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    drag: 0.7,
    maxSpeed: 3.4,
    turnRate: Math.PI * 1.5,
  });
  healths.set(entity, { current: 36, max: 36 });
  colliders.set(entity, { radius: 0.35, team: 'enemy' });
  chasers.set(entity, {
    speed: 3.1,
    acceleration: 3.6,
    fireRange: 6.6,
    fireInterval: 1,
    cooldown: 0,
    spread: 0.22,
    guard: {
      homeX: point.tx,
      homeY: point.ty,
      holdRadius: 0.45,
      aggroRange: 5.6,
      leashRange: 9.5,
      alerted: false,
    },
  });
  registerEnemy(entity, { kind: 'chaser', score: 260 });
  alienEntities.add(entity);
}

function triggerAlienCounterattack(): void {
  if (aliensTriggered) return;
  aliensTriggered = true;
  aliensDefeated = false;
  for (let i = 0; i < alienSpawnPoints.length; i += 1) {
    spawnAlienUnit(alienSpawnPoints[i]!);
  }
}

function checkBuildingsForAlienTrigger(): void {
  if (aliensTriggered) return;
  for (let i = 0; i < buildingEntities.length; i += 1) {
    const entity = buildingEntities[i]!;
    const meta = buildingMeta.get(entity);
    if (!meta || !meta.triggersAlarm) continue;
    const h = healths.get(entity);
    if (h && h.current < h.max) {
      triggerAlienCounterattack();
      break;
    }
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
    ammo.missiles = ammo.missilesMax;
    ammo.rockets = ammo.rocketsMax;
    ammo.hellfires = ammo.hellfiresMax;
    health.current = health.max;
    colliders.set(player, { radius: 0.4, team: 'player' });
  }
  playerState.respawnTimer = 0;
  playerState.invulnerable = false;
  engine.start();
  engine.setIntensity(0);
}

function resetGame(targetMissionIndex?: number): void {
  const clampedTarget = Math.min(
    targetMissionIndex ?? currentMissionIndex,
    highestUnlockedMissionIndex,
  );
  setMission(clampedTarget);
  clearEnemies();
  projectilePool.clear();
  damage.reset();
  explosions.length = 0;
  stats.score = 0;
  waveState.index = 0;
  waveState.countdown = initialWaveCountdown;
  waveState.active = false;
  waveState.timeInWave = 0;
  rescueState.carrying = 0;
  rescueState.rescued = 0;
  rescueState.survivorsSpawned = false;
  rescueRunners.length = 0;
  aliensTriggered = false;
  aliensDefeated = false;
  campusLeveled = false;
  if (scenarioOnReset) scenarioOnReset();
  spawnBuildings();
  spawnMissionEnemies();
  spawnPickups();
  fog.reset();
  playerState.lives = 3;
  resetPlayer();
  ui.state = 'briefing';
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
      const meta = buildingMeta.get(entity);
      if (meta) {
        if (meta.score) stats.score += meta.score;
        if (t && meta.drop) {
          spawnPickupEntity({
            tx: t.tx,
            ty: t.ty,
            kind: meta.drop.kind,
            radius: 0.95,
            duration: 1.4,
            armorAmount: meta.drop.amount,
          });
        }
      }
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
      const delay = computeWaveCooldown
        ? computeWaveCooldown(waveState.index)
        : Number.POSITIVE_INFINITY;
      waveState.countdown = delay;
      if (boatScenario && waveState.index >= boatScenario.waves.length && !boatObjectiveFailed) {
        boatObjectiveComplete = true;
      }
    }
  } else if (spawnWaveHandler) {
    if (!Number.isFinite(waveState.countdown)) return;
    waveState.countdown -= dt;
    if (waveState.countdown <= 0) {
      waveState.index += 1;
      const spawned = spawnWaveHandler(waveState.index);
      if (spawned) {
        waveState.active = true;
        waveState.timeInWave = 0;
      } else {
        waveState.countdown = Number.POSITIVE_INFINITY;
      }
    }
  }
}

setMission(currentMissionIndex);
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
      if (action) saveJson('choppa:ui', ui);
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

    if (ui.state === 'briefing') {
      if (snap.keys['Enter'] || snap.keys[' '] || snap.keys['Space']) ui.state = 'in-game';
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
      if (snap.keys['Enter'] || snap.keys[' ']) resetGame(nextMissionIndex);
      if (snap.keys['Escape']) ui.state = 'title';
      return;
    }

    tryRespawn(dt);

    const playerTransform = transforms.get(player)!;
    const ph = physics.get(player)!;
    const playerFuel = fuels.get(player)!;
    const playerAmmo = ammos.get(player)!;
    const playerHealth = healths.get(player)!;
    let dx = 0;
    let dy = 0;
    if (!playerState.invulnerable) {
      if (isDown(snap, bindings, 'moveUp')) dy -= 1;
      if (isDown(snap, bindings, 'moveDown')) dy += 1;
      if (isDown(snap, bindings, 'moveLeft')) dx -= 1;
      if (isDown(snap, bindings, 'moveRight')) dx += 1;
      if (isDown(snap, bindings, 'strafeLeft')) dx -= 1;
      if (isDown(snap, bindings, 'strafeRight')) dx += 1;
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

    const { width: viewWidth, height: viewHeight } = getCanvasViewMetrics(context);
    let aimTile = screenToApproxTile(
      snap.mouseX,
      snap.mouseY,
      viewWidth,
      viewHeight,
      camera.x,
      camera.y,
      isoParams,
    );
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
      kind: Pickup['kind'];
      fuelAmount?: number;
      ammo?: { missiles?: number; rockets?: number; hellfires?: number };
      survivorCount?: number;
      armorAmount?: number;
    }[] = [];
    pickups.forEach((entity, pickup) => {
      const pickupTransform = transforms.get(entity);
      if (!pickupTransform) {
        completePickupCraneSound(entity);
        completedPickups.push({
          entity,
          kind: pickup.kind,
          fuelAmount: pickup.fuelAmount,
          ammo: pickup.ammo,
          armorAmount: pickup.armorAmount,
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
          cancelPickupCraneSound(entity);
          return;
        }
        pickup.progress = Math.min(1, pickup.progress + dt / pickup.duration);
        if (pickup.progress >= 1) {
          completePickupCraneSound(entity);
          completedPickups.push({
            entity,
            kind: pickup.kind,
            fuelAmount: pickup.fuelAmount,
            ammo: pickup.ammo ? { ...pickup.ammo } : undefined,
            survivorCount: pickup.survivorCount,
            armorAmount: pickup.armorAmount,
          });
        }
        return;
      }

      if (pickup.collectingBy && !transforms.has(pickup.collectingBy)) {
        pickup.collectingBy = null;
        pickup.progress = 0;
        cancelPickupCraneSound(entity);
        return;
      }

      if (pickup.collectingBy === null) {
        const dx = pickupTransform.tx - playerTransform.tx;
        const dy = pickupTransform.ty - playerTransform.ty;
        const dist = Math.hypot(dx, dy);
        if (dist <= pickup.radius && !playerState.invulnerable) {
          if (pickup.kind === 'fuel') {
            const needsFuel = playerFuel.current < playerFuel.max - 0.5;
            if (needsFuel) {
              pickup.collectingBy = player;
              pickup.progress = 0;
              beginPickupCraneSound(entity, pickup);
            }
          } else if (pickup.kind === 'ammo') {
            const needsAmmo =
              playerAmmo.missiles < playerAmmo.missilesMax ||
              playerAmmo.rockets < playerAmmo.rocketsMax ||
              playerAmmo.hellfires < playerAmmo.hellfiresMax;
            if (needsAmmo) {
              pickup.collectingBy = player;
              pickup.progress = 0;
              beginPickupCraneSound(entity, pickup);
            }
          } else if (pickup.kind === 'survivor') {
            const survivors = pickup.survivorCount ?? 1;
            const remainingCapacity = SURVIVOR_CAPACITY - rescueState.carrying;
            if (remainingCapacity >= survivors) {
              pickup.collectingBy = player;
              pickup.progress = 0;
              beginPickupCraneSound(entity, pickup);
            }
          } else if (pickup.kind === 'armor') {
            const needsArmor = playerHealth.current < playerHealth.max - 0.5;
            if (needsArmor) {
              pickup.collectingBy = player;
              pickup.progress = 0;
              beginPickupCraneSound(entity, pickup);
            }
          }
        }
      }
    });

    for (let i = 0; i < completedPickups.length; i += 1) {
      const item = completedPickups[i]!;
      if (item.kind === 'fuel') {
        const amount = item.fuelAmount ?? 50;
        playerFuel.current = Math.min(playerFuel.max, playerFuel.current + amount);
      } else if (item.kind === 'ammo' && item.ammo) {
        playerAmmo.rockets = Math.min(
          playerAmmo.rocketsMax,
          playerAmmo.rockets + (item.ammo.rockets ?? 0),
        );
        playerAmmo.missiles = Math.min(
          playerAmmo.missilesMax,
          playerAmmo.missiles + (item.ammo.missiles ?? 0),
        );
        playerAmmo.hellfires = Math.min(
          playerAmmo.hellfiresMax,
          playerAmmo.hellfires + (item.ammo.hellfires ?? 0),
        );
      } else if (item.kind === 'armor') {
        const amount = item.armorAmount ?? 35;
        playerHealth.current = Math.min(playerHealth.max, playerHealth.current + amount);
      } else if (item.kind === 'survivor') {
        const count = item.survivorCount ?? 1;
        rescueState.carrying = Math.min(SURVIVOR_CAPACITY, rescueState.carrying + count);
      }
      destroyEntity(item.entity);
    }

    if (rescueState.carrying > 0 && !playerState.invulnerable) {
      const dxPad = playerTransform.tx - pad.tx;
      const dyPad = playerTransform.ty - pad.ty;
      const distPad = Math.hypot(dxPad, dyPad);
      if (distPad <= pad.radius + 0.2) {
        const dropped = rescueState.carrying;
        if (dropped > 0) spawnRescueRunnerAnimation(dropped);
        rescueState.rescued = Math.min(rescueState.total, rescueState.rescued + dropped);
        rescueState.carrying = 0;
      }
    }

    updateRescueRunnerAnimations(dt);

    const margin = 1.2;
    const maxX = runtimeMap.width - 1 - margin;
    const maxY = runtimeMap.height - 1 - margin;
    playerTransform.tx = Math.max(margin, Math.min(maxX, playerTransform.tx));
    playerTransform.ty = Math.max(margin, Math.min(maxY, playerTransform.ty));

    for (let i = 0; i < fireEvents.length; i += 1) {
      const ev = fireEvents[i]!;
      if (ev.kind === 'missile') {
        playMissile(bus);
        const dirLen = Math.hypot(ev.dx, ev.dy) || 1;
        const dirX = ev.dx / dirLen;
        const dirY = ev.dy / dirLen;
        const speedM = ev.speed ?? 22;
        const launchOffset = ev.launchOffset ?? 0.48;
        const spawnX = ev.sx + dirX * launchOffset;
        const spawnY = ev.sy + dirY * launchOffset;
        projectilePool.spawn({
          kind: 'missile',
          faction: ev.faction,
          x: spawnX,
          y: spawnY,
          vx: dirX * speedM,
          vy: dirY * speedM,
          ttl: ev.ttl ?? 0.6,
          radius: ev.radius ?? 0.08,
          damage: { amount: ev.damage ?? 10, radius: ev.damageRadius ?? 0.12 },
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
          ttl: ev.ttl ?? 5.2,
          radius: ev.radius ?? 0.22,
          damage: { amount: ev.damage ?? 16, radius: ev.damageRadius ?? 0.9 },
        });
      } else if (ev.kind === 'hellfire') {
        playHellfire(bus);
        const velLen = Math.hypot(ev.vx, ev.vy) || 1;
        const dirX = ev.vx / velLen;
        const dirY = ev.vy / velLen;
        const launchOffset = ev.launchOffset ?? 0.92;
        const speedH = ev.speed ?? velLen;
        const spawnX = ev.x + dirX * launchOffset;
        const spawnY = ev.y + dirY * launchOffset;
        projectilePool.spawn({
          kind: 'hellfire',
          faction: ev.faction,
          x: spawnX,
          y: spawnY,
          vx: dirX * speedH,
          vy: dirY * speedH,
          ttl: ev.ttl ?? 3.2,
          radius: ev.radius ?? 0.3,
          seek: { targetX: ev.targetX, targetY: ev.targetY, turnRate: Math.PI * 0.8 },
          damage: { amount: ev.damage ?? 36, radius: ev.damageRadius ?? 1.9 },
        });
      }
    }
    fireEvents.length = 0;

    projectilePool.update(dt, colliders, colliders, transforms, (hit) => {
      damage.queue(hit);
      const boomRadius = Math.max(0.2, hit.radius * 1.45);
      const boomDuration = 0.32 + hit.radius * 0.38;
      spawnExplosion(hit.x, hit.y, boomRadius, boomDuration);
      playExplosion(bus, hit.radius);
      if (ui.settings.screenShake) shake.trigger(8, 0.25);
    });

    damage.update();
    checkBuildingsForAlienTrigger();
    handleDeaths();
    if (!campusLeveled) {
      let campusRemaining = 0;
      buildingMeta.forEach((meta) => {
        if (meta.category === 'campus') campusRemaining += 1;
      });
      if (campusRemaining === 0) campusLeveled = true;
    }
    if (aliensTriggered && !aliensDefeated && alienEntities.size === 0) aliensDefeated = true;
    if (!rescueState.survivorsSpawned && campusLeveled && aliensDefeated) spawnSurvivors();

    mission.update();
    if (mission.state.complete && ui.state === 'in-game') {
      ui.state = 'win';
      const candidate = Math.min(currentMissionIndex + 1, missionDefs.length - 1);
      if (candidate > highestUnlockedMissionIndex) {
        highestUnlockedMissionIndex = candidate;
      }
      nextMissionIndex = Math.min(candidate, highestUnlockedMissionIndex);
      missionProgress.unlocked =
        missionDefs[highestUnlockedMissionIndex]?.id ?? missionProgress.unlocked;
      missionProgress.lastWin = Date.now();
      persistMissionProgress();
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
    const displayWidth = canvas.width;
    const displayHeight = canvas.height;
    fog.resize(displayWidth, displayHeight);
    const { width: viewWidth, height: viewHeight } = getCanvasViewMetrics(context);
    sky.render(context, camera.x, camera.y);

    if (ui.state === 'title') {
      titleMenu.render(context, 'Choppa', 'Isometric helicopter action prototype');
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
    camera.follow(targetIso.x, targetIso.y, viewWidth, viewHeight);

    const originX = Math.floor(viewWidth / 2 - camera.x);
    const originY = Math.floor(viewHeight / 2 - camera.y);
    const shakeOffset = shake.offset(1 / 60);
    const originWithShakeX = originX + shakeOffset.x;
    const originWithShakeY = originY + shakeOffset.y;
    const cameraIsoX = camera.x - shakeOffset.x;
    const cameraIsoY = camera.y - shakeOffset.y;
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

    drawSafeHouse(context, isoParams, originWithShakeX, originWithShakeY, safeHouse);

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
      if (t) drawAAATurret(context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
    });
    sams.forEach((entity, _s) => {
      const t = transforms.get(entity);
      if (t) drawSAM(context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
    });
    patrols.forEach((entity, _p) => {
      const t = transforms.get(entity);
      if (t) drawPatrolDrone(context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
    });
    chasers.forEach((entity, _c) => {
      const t = transforms.get(entity);
      if (!t) return;
      if (alienEntities.has(entity)) {
        drawAlienMonstrosity(context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
      } else {
        drawChaserDrone(context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
      }
    });

    speedboats.forEach((entity, _boat) => {
      const t = transforms.get(entity);
      if (!t) return;
      drawSpeedboat(context, isoParams, originWithShakeX, originWithShakeY, t.tx, t.ty);
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
      const progress = Math.min(1, e.age / e.duration);
      const alpha = 1 - progress;
      const scale = Math.max(isoParams.tileWidth, isoParams.tileHeight) * 0.45;
      const outerRadius = e.radius * scale * (0.9 + (1 - progress) * 0.35);
      const coreRadius = outerRadius * 0.45;

      // Outer glow
      context.save();
      context.globalAlpha = Math.max(0, alpha * 0.9);
      context.globalCompositeOperation = 'lighter';
      const gradient = context.createRadialGradient(drawX, drawY, 0, drawX, drawY, outerRadius);
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(0.35, 'rgba(255,214,102,0.85)');
      gradient.addColorStop(0.75, 'rgba(255,111,89,0.55)');
      gradient.addColorStop(1, 'rgba(255,71,71,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(drawX, drawY, outerRadius, 0, Math.PI * 2);
      context.fill();
      context.restore();

      // Core flash
      context.save();
      context.globalAlpha = Math.max(0, alpha * 0.75);
      context.fillStyle = '#fff2d5';
      context.beginPath();
      context.arc(drawX, drawY, coreRadius, 0, Math.PI * 2);
      context.fill();
      context.restore();

      // Shock ring
      context.save();
      context.globalAlpha = Math.max(0, alpha * 0.5);
      context.strokeStyle = '#ffd166';
      context.lineWidth = 2;
      const shockRadius = outerRadius * (0.85 + progress * 0.4);
      context.beginPath();
      context.arc(drawX, drawY, shockRadius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    drawPad(context, isoParams, originWithShakeX, originWithShakeY, pad.tx, pad.ty);

    const runnerScale = isoParams.tileHeight / 32;
    for (let i = 0; i < rescueRunners.length; i += 1) {
      const runner = rescueRunners[i]!;
      if (runner.delay > 0) continue;
      const t = Math.min(1, runner.progress);
      const isoX = runner.startIso.x + (runner.endIso.x - runner.startIso.x) * t;
      const isoY = runner.startIso.y + (runner.endIso.y - runner.startIso.y) * t;
      const drawX = originWithShakeX + isoX;
      const drawY = originWithShakeY + isoY;
      const dirX = runner.endIso.x - runner.startIso.x;
      const dirY = runner.endIso.y - runner.startIso.y;
      const angle = Math.atan2(dirY, dirX);
      const phase = runner.elapsed * 11 + runner.bobOffset;
      const bob = Math.sin(phase) * runnerScale * 1.6;
      const fade = runner.progress <= 1 ? 1 : Math.max(0, 1 - (runner.progress - 1) / 0.3);
      drawRescueRunner(context, {
        x: drawX,
        y: drawY,
        angle: Number.isFinite(angle) ? angle : 0,
        stepPhase: phase,
        bob,
        fade,
        scale: runnerScale,
      });
    }

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

    const revealRadius = Math.max(120, Math.min(viewWidth, viewHeight) * 0.22);
    fog.reveal(playerT.tx, playerT.ty, revealRadius, isoParams);
    if (ui.settings.fogOfWar) {
      fog.render(context, {
        iso: isoParams,
        originX: originWithShakeX,
        originY: originWithShakeY,
        cameraX: cameraIsoX,
        cameraY: cameraIsoY,
        viewWidth,
        viewHeight,
      });
    }

    const fuelComp = fuels.get(player)!;
    const ammoComp = ammos.get(player)!;
    const healthComp = healths.get(player)!;
    const weaponComp = weapons.get(player)!;

    const objectiveLines = mission.state.objectives.map((o) => {
      const labelFn = objectiveLabelOverrides[o.id];
      const label = labelFn ? labelFn(o) : o.name;
      return `${o.complete ? '[x]' : '[ ]'} ${label}`;
    });

    const nextWaveCountdown =
      !waveState.active && Number.isFinite(waveState.countdown)
        ? Math.max(0, waveState.countdown)
        : null;

    drawHUD(
      context,
      {
        fuel01: fuelComp.current / fuelComp.max,
        fuelCurrent: fuelComp.current,
        fuelMax: fuelComp.max,
        armor01: healthComp.current / healthComp.max,
        ammo: {
          missiles: ammoComp.missiles,
          rockets: ammoComp.rockets,
          hellfires: ammoComp.hellfires,
        },
        ammoMax: {
          missiles: ammoComp.missilesMax,
          rockets: ammoComp.rocketsMax,
          hellfires: ammoComp.hellfiresMax,
        },
        activeWeapon: weaponComp.active,
        lives: Math.max(0, playerState.lives),
        score: stats.score,
        wave: waveState.active ? waveState.index : Math.max(1, waveState.index + 1),
        enemiesRemaining: waveState.enemies.size,
        nextWaveIn: nextWaveCountdown,
      },
      objectiveLines,
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
      context.fillRect(0, 0, viewWidth, viewHeight);
      context.fillStyle = '#ffd166';
      context.font = 'bold 18px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Respawning...', viewWidth / 2, viewHeight / 2);
      context.restore();
    }

    if (ui.state === 'briefing') {
      context.save();
      context.fillStyle = 'rgba(4, 10, 18, 0.7)';
      context.fillRect(0, 0, viewWidth, viewHeight);
      context.textAlign = 'center';
      context.fillStyle = '#92ffa6';
      context.font = 'bold 28px system-ui, sans-serif';
      context.fillText(missionBriefingInfo.title, viewWidth / 2, viewHeight / 2 - 140);
      context.fillStyle = '#c8d7e1';
      context.font = '16px system-ui, sans-serif';
      const briefingLines = missionBriefingInfo.text.split('\n');
      for (let i = 0; i < briefingLines.length; i += 1) {
        context.fillText(briefingLines[i]!, viewWidth / 2, viewHeight / 2 - 100 + i * 22);
      }
      context.textAlign = 'left';
      const goals = missionBriefingInfo.goals.slice(0, 5);
      const goalX = viewWidth / 2 - 200;
      let goalY = viewHeight / 2 - 20;
      context.font = '15px system-ui, sans-serif';
      for (let i = 0; i < goals.length; i += 1) {
        context.fillText(`• ${goals[i]!}`, goalX, goalY + i * 22);
      }
      context.textAlign = 'center';
      context.fillStyle = '#92ffa6';
      context.font = 'bold 16px system-ui, sans-serif';
      context.fillText('Press Enter to deploy', viewWidth / 2, goalY + goals.length * 22 + 24);
      context.restore();
    }

    if (ui.state === 'paused') {
      context.save();
      context.fillStyle = 'rgba(0, 0, 0, 0.55)';
      context.fillRect(0, 0, viewWidth, viewHeight);
      context.fillStyle = '#92ffa6';
      context.font = 'bold 28px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Paused', viewWidth / 2, viewHeight / 2);
      context.fillStyle = '#c8d7e1';
      context.font = '14px system-ui, sans-serif';
      context.fillText('Press Esc to resume', viewWidth / 2, viewHeight / 2 + 24);
      context.restore();
    }

    if (ui.state === 'game-over') {
      context.save();
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, viewWidth, viewHeight);
      context.fillStyle = '#ef476f';
      context.font = 'bold 28px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Mission Failed', viewWidth / 2, viewHeight / 2);
      context.fillStyle = '#c8d7e1';
      context.font = '14px system-ui, sans-serif';
      context.fillText(
        'Press Enter to restart or Esc for title',
        viewWidth / 2,
        viewHeight / 2 + 26,
      );
      context.restore();
      return;
    }

    if (ui.state === 'win') {
      context.save();
      context.fillStyle = 'rgba(0,0,0,0.6)';
      context.fillRect(0, 0, viewWidth, viewHeight);
      context.fillStyle = '#92ffa6';
      context.font = 'bold 28px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Mission Complete', viewWidth / 2, viewHeight / 2 - 8);
      context.fillStyle = '#c8d7e1';
      context.font = '14px system-ui, sans-serif';
      context.fillText(
        'Press Enter to restart or Esc for title',
        viewWidth / 2,
        viewHeight / 2 + 16,
      );
      context.restore();
      return;
    }

    debug.render(context, { fps, dt: lastStepDt, entities: enemyMeta.size + 1 });
  },
});

loop.start();
