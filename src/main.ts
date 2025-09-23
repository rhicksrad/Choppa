import { GameLoop } from './core/time/loop';
import { removeKey, saveJson } from './core/util/storage';
import { bootstrapApp } from './game/app/bootstrap';
import { createGameState } from './game/app/state';
import { createGameSceneRenderer } from './render/scene/gameScene';
import { createEntityLifecycle } from './game/spawn/lifecycle';
import { createBuildingFactory } from './game/spawn/buildings';
import { createPickupFactory } from './game/spawn/pickups';
import { createEnemyFactory } from './game/spawn/enemies';
import { MissionTracker } from './game/missions/tracker';
import { createMissionCoordinator } from './game/missions/coordinator';
import { createUIController } from './game/app/update/ui';
import { createPlayerController } from './game/app/update/player';
import { createPickupProcessor } from './game/app/update/pickups';
import { createCombatProcessor } from './game/app/update/combat';
import { loadMission } from './game/missions/loader';
import missionJson from './game/data/missions/sample_mission.json';
import type { MissionDef } from './game/missions/types';
import { defaultBindings } from './ui/input-remap/bindings';
import { createUIStore, type UIState } from './ui/menus/scenes';

const bootstrap = bootstrapApp();
const state = createGameState();

const {
  canvas,
  context,
  resizeCanvasToDisplaySize,
  input,
  debug,
  ui,
  titleMenu,
  bindings,
  renderer,
  camera,
  sky,
  fog,
  audio,
  shake,
  entities,
  stores,
  scheduler,
  rng,
  projectilePool,
  fireEvents,
  weaponFire,
  damage,
  setPlayerLocator,
  setBoatLandingHandler,
} = bootstrap;

const audioBaseUrl = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
const rescueCueUrl = `${audioBaseUrl}audio/GTTC.mp3`;
let rescueCueBuffer: AudioBuffer | null = null;

void (async () => {
  try {
    const response = await fetch(rescueCueUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    rescueCueBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      audio.bus.context.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
    });
  } catch (err) {
    console.warn('[audio] Failed to load rescue cue', err);
  }
})();

void audio.music.play('title');

const player = entities.create();
stores.transforms.set(player, { tx: 0, ty: 0, rot: 0 });
stores.physics.set(player, {
  vx: 0,
  vy: 0,
  ax: 0,
  ay: 0,
  drag: 0.8,
  maxSpeed: 4.2,
  turnRate: Math.PI * 2,
});
stores.fuels.set(player, { current: 65, max: 100 });
stores.sprites.set(player, { color: '#92ffa6', rotor: 0 });
stores.ammos.set(player, {
  missiles: 200,
  missilesMax: 200,
  rockets: 12,
  rocketsMax: 12,
  hellfires: 2,
  hellfiresMax: 2,
});
stores.weapons.set(player, {
  active: 'missile',
  cooldownMissile: 0,
  cooldownRocket: 0,
  cooldownHellfire: 0,
});
stores.healths.set(player, { current: 100, max: 100 });
stores.colliders.set(player, { radius: 0.4, team: 'player' });

state.playerId = player;

const missionHandlers: Record<string, () => boolean> = {};
const missionTracker = new MissionTracker(
  loadMission(missionJson as MissionDef),
  stores.transforms,
  stores.colliders,
  stores.healths,
  () => {
    const transform = stores.transforms.get(player);
    return transform ? { tx: transform.tx, ty: transform.ty } : { tx: 0, ty: 0 };
  },
  missionHandlers,
);

const lifecycle = createEntityLifecycle({ entities, stores, state });
const { destroyEntity, registerEnemy, clearEnemies } = lifecycle;

const { spawnBuildings, spawnAlienStronghold } = createBuildingFactory({
  entities,
  stores: {
    transforms: stores.transforms,
    buildings: stores.buildings,
    healths: stores.healths,
    colliders: stores.colliders,
  },
  state,
  destroyEntity,
});

const {
  spawnPickupEntity,
  spawnPickups,
  spawnSurvivors,
  beginPickupCraneSound,
  cancelPickupCraneSound,
  completePickupCraneSound,
} = createPickupFactory({
  entities,
  stores: {
    transforms: stores.transforms,
    pickups: stores.pickups,
  },
  state,
  bus: audio.bus,
  destroyEntity,
});

const enemyFactory = createEnemyFactory({
  entities,
  stores: {
    transforms: stores.transforms,
    physics: stores.physics,
    healths: stores.healths,
    colliders: stores.colliders,
    aaas: stores.aaas,
    sams: stores.sams,
    patrols: stores.patrols,
    chasers: stores.chasers,
    speedboats: stores.speedboats,
  },
  rng,
  state,
  registerEnemy,
});
const {
  spawnMissionEnemies,
  spawnCoastGuard,
  spawnShorePatrol,
  spawnSpeedboat,
  spawnDefaultWave,
  spawnBoatWave,
  spawnAlienUnit,
  spawnSentinel,
  spawnObelisk,
} = enemyFactory;

const missionCoordinator = createMissionCoordinator({
  rng,
  state,
  missionTracker,
  missionHandlers,
  enemySpawners: {
    spawnMissionEnemies,
    spawnCoastGuard,
    spawnShorePatrol,
    spawnSpeedboat,
    spawnDefaultWave,
    spawnBoatWave,
    spawnSentinel,
    spawnObelisk,
  },
  buildingSpawner: {
    spawnAlienStronghold: (type, tx, ty, spawnUnit) =>
      spawnAlienStronghold(type, tx, ty, spawnUnit),
  },
  spawnAlienUnit,
});
missionCoordinator.initMissions();

const missionMusicMap = {
  m01: 'level1',
  m02: 'level2',
  m03: 'level3',
  m04: 'level3',
} as const;

const getMissionTrackId = (missionId: string): string =>
  missionMusicMap[missionId as keyof typeof missionMusicMap] ?? 'level1';

const playMissionTrack = (missionId: string): void => {
  const trackId = getMissionTrackId(missionId);
  void audio.music.play(trackId);
};

const handleUIStateChange = (next: UIState, prev: UIState): void => {
  if (next === 'title') {
    void audio.music.play('title');
    return;
  }
  if (prev === 'title' && next !== 'title') {
    playMissionTrack(missionCoordinator.getScenario().id);
  }
};

const transitionUIState = (next: UIState): void => {
  if (ui.state === next) return;
  const prev = ui.state;
  ui.state = next;
  handleUIStateChange(next, prev);
};

let scenario = missionCoordinator.getScenario();
let runtimeMap = scenario.map;
let isoParams = scenario.isoParams;
let pad = scenario.pad;
let safeHouse = scenario.safeHouse;
let missionBriefing = missionCoordinator.getBriefing();

fog.configure(runtimeMap.width, runtimeMap.height);

setPlayerLocator(() => {
  const transform = stores.transforms.get(player);
  return transform ? { x: transform.tx, y: transform.ty } : { x: 0, y: 0 };
});

const gameSceneRenderer = createGameSceneRenderer({
  canvas,
  context,
  resizeCanvasToDisplaySize,
  renderer,
  camera,
  sky,
  fog,
  shake,
  projectilePool,
  debug,
});

const playerController = createPlayerController({
  state,
  ui,
  player,
  transforms: stores.transforms,
  physics: stores.physics,
  fuels: stores.fuels,
  ammos: stores.ammos,
  healths: stores.healths,
  colliders: stores.colliders,
  weaponFire,
  engine: audio.engine,
  bindings,
  camera,
  context,
  getStartPosition: () => missionCoordinator.mission.state.def.startPos,
});

const pickupProcessor = createPickupProcessor({
  state,
  player,
  transforms: stores.transforms,
  pickups: stores.pickups,
  fuels: stores.fuels,
  ammos: stores.ammos,
  healths: stores.healths,
  pickupFactory: {
    beginPickupCraneSound,
    cancelPickupCraneSound,
    completePickupCraneSound,
  },
  destroyEntity,
  rng,
});

const spawnPickupDrop = (tx: number, ty: number, amount: number): void => {
  spawnPickupEntity({
    tx,
    ty,
    kind: 'armor',
    radius: 0.95,
    duration: 1.4,
    armorAmount: amount,
  });
};

const combatProcessor = createCombatProcessor({
  state,
  ui,
  player,
  scheduler,
  fireEvents,
  projectilePool,
  damage,
  bus: audio.bus,
  shake,
  transforms: stores.transforms,
  colliders: stores.colliders,
  physics: stores.physics,
  healths: stores.healths,
  buildings: stores.buildings,
  mission: missionCoordinator.mission,
  missionCoordinator,
  spawnSurvivors,
  spawnPickupDrop,
  destroyEntity,
  engine: audio.engine,
  spawnAlienUnit,
  getRescueCueBuffer: () => rescueCueBuffer,
});

setBoatLandingHandler(combatProcessor.handleBoatLanding);

const resetGame = (targetMissionIndex?: number): void => {
  const { current, highestUnlocked } = missionCoordinator.getMissionIndices();
  const clamped = Math.min(targetMissionIndex ?? current, highestUnlocked);

  missionCoordinator.setMission(clamped);
  scenario = missionCoordinator.getScenario();
  runtimeMap = scenario.map;
  isoParams = scenario.isoParams;
  pad = scenario.pad;
  safeHouse = scenario.safeHouse;
  missionBriefing = missionCoordinator.getBriefing();

  playMissionTrack(scenario.id);

  fog.configure(runtimeMap.width, runtimeMap.height);

  clearEnemies();
  projectilePool.clear();
  damage.reset();
  state.explosions.length = 0;
  state.minimapEnemies.length = 0;
  state.rescueRunners.length = 0;

  spawnBuildings(scenario.buildingSites);
  spawnPickups(scenario.pickupSites);
  missionCoordinator.spawnMissionEnemies();

  state.stats.score = 0;
  state.player.lives = 3;
  state.player.respawnTimer = 0;
  state.player.invulnerable = false;
  state.rescue.carrying = 0;
  state.rescue.rescued = 0;
  state.rescue.total = scenario.survivorSites.reduce(
    (sum, site) => sum + Math.max(0, Math.round(site.count)),
    0,
  );
  state.rescue.survivorsSpawned = false;
  state.boat.boatsEscaped = 0;
  state.boat.objectiveComplete = false;
  state.boat.objectiveFailed = false;
  state.wave.index = 0;
  state.wave.countdown = scenario.initialWaveCountdown;
  state.wave.active = false;
  state.wave.timeInWave = 0;
  state.wave.enemies.clear();
  state.pickupCraneSounds.forEach((handle) => handle.cancel());
  state.pickupCraneSounds.clear();

  fog.reset();
  playerController.resetPlayer();

  transitionUIState('briefing');
};

const resetCampaignProgress = (): void => {
  missionCoordinator.resetProgress();

  const defaultUI = createUIStore();
  removeKey('choppa:ui');
  ui.settings = { ...defaultUI.settings };
  ui.achievements = { ...defaultUI.achievements };

  audio.applySettings(false);

  removeKey('choppa:bindings');
  const freshBindings = defaultBindings();
  (Object.keys(freshBindings) as Array<keyof typeof freshBindings>).forEach((action) => {
    bindings[action] = [...freshBindings[action]];
  });

  resetGame(0);
};

const uiController = createUIController({
  ui,
  titleMenu,
  bindings,
  canvas,
  saveUI: (store) => saveJson('choppa:ui', store),
  applyAudioSettings: (muted) => audio.applySettings(muted),
  resetGame,
  resetCampaign: resetCampaignProgress,
  getNextMissionIndex: () => missionCoordinator.getMissionIndices().next,
  onStateChange: handleUIStateChange,
});

let fps = 0;
let frames = 0;
let accumulator = 0;
let lastStepDt = 1 / 60;

const loop = new GameLoop({
  update: (dt) => {
    lastStepDt = dt;
    const snapshot = input.readSnapshot();
    const playing = uiController.update(dt, snapshot);
    if (!playing) return;

    playerController.update(dt, snapshot, isoParams, runtimeMap);
    pickupProcessor.update(dt, isoParams, pad, safeHouse);
    combatProcessor.update(dt);

    accumulator += dt;
    frames += 1;
    if (accumulator >= 0.5) {
      fps = Math.round((frames / accumulator) * 10) / 10;
      frames = 0;
      accumulator = 0;
    }
  },
  render: () => {
    gameSceneRenderer.render({
      state,
      ui,
      titleMenu,
      mission: missionCoordinator.mission,
      objectiveLabels: missionCoordinator.objectiveLabelOverrides,
      missionBriefing,
      runtimeMap,
      isoParams,
      stores,
      player,
      pad,
      safeHouse,
      fps,
      dt: lastStepDt,
    });
  },
});

loop.start();
