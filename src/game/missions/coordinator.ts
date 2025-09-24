import { parseTiled, type RuntimeTilemap } from '../../world/tiles/tiled';
import missionJson from '../data/missions/sample_mission.json';
import oceanMissionJson from '../data/missions/ocean_mission.json';
import mothershipMissionJson from '../data/missions/mothership_mission.json';
import homelandMissionJson from '../data/missions/homeland_mission.json';
import sampleMapJson from '../../world/tiles/sample_map.json';
import oceanMapJson from '../../world/tiles/ocean_map.json';
import mothershipMapJson from '../../world/tiles/mothership_map.json';
import homelandMapJson from '../../world/tiles/homeland_map.json';
import { loadJson, saveJson, removeKey } from '../../core/util/storage';
import type { MissionTracker } from './tracker';
import { loadMission } from './loader';
import type { MissionDef, ObjectiveState } from './types';
import { RNG } from '../../core/util/rng';
import type { GameState } from '../app/state';
import {
  createMissionOneLayout,
  createMissionTwoLayout,
  createMissionThreeLayout,
  createMissionFourLayout,
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
} from '../scenarios/layouts';
import type { SafeHouseParams } from '../../render/sprites/safehouse';
export type ObjectiveLabelFn = (objective: ObjectiveState) => string;

export interface BoatScenarioConfig {
  lanes: BoatLane[];
  waves: BoatWave[];
  maxEscapes: number;
  nextWaveDelay: number;
}

interface ScenarioConfig {
  map: RuntimeTilemap;
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

interface MissionProgressData {
  current?: string;
  unlocked?: string;
  lastWin?: number;
  mission?: string;
}

interface MissionBriefing {
  title: string;
  text: string;
  goals: string[];
  dialog: string[];
}

interface ScenarioRuntime {
  id: string;
  map: RuntimeTilemap;
  isoParams: { tileWidth: number; tileHeight: number };
  pad: PadConfig;
  safeHouse: SafeHouseParams;
  campusSites: BuildingSite[];
  civilianGenerator: (() => BuildingSite[]) | null;
  staticStructures: BuildingSite[];
  buildingSites: BuildingSite[];
  pickupSites: PickupSite[];
  survivorSites: SurvivorSite[];
  alienSpawnPoints: Array<{ tx: number; ty: number }>;
  waveSpawnPoints: Array<{ tx: number; ty: number }>;
  waveSpawner: ((index: number) => boolean) | null;
  waveCooldown: ((index: number) => number) | null;
  initialWaveCountdown: number;
  spawnExtraEnemies?: () => void;
  onReset?: () => void;
  boatScenario: BoatScenarioConfig | null;
}

export interface MissionCoordinatorDeps {
  rng: RNG;
  state: GameState;
  missionTracker: MissionTracker;
  missionHandlers: Record<string, () => boolean>;
  enemySpawners: {
    spawnMissionEnemies: (
      config: { mission: MissionDef; spawnExtraEnemies?: () => void },
      spawnAlienStronghold: (type: 'AAA' | 'SAM', tx: number, ty: number) => void,
    ) => void;
    spawnCoastGuard: (point: { tx: number; ty: number }, leashRange: number) => void;
    spawnShorePatrol: (route: { tx: number; ty: number; axis: 'x' | 'y'; range: number }) => void;
    spawnSpeedboat: (lane: BoatLane, wave: number) => void;
    spawnDefaultWave: (
      waveIndex: number,
      spawnPoints: Array<{ tx: number; ty: number }>,
    ) => boolean;
    spawnBoatWave: (
      waveIndex: number,
      boatScenario: { lanes: BoatLane[]; waves: BoatWave[] },
    ) => boolean;
    spawnSentinel: (
      point: { tx: number; ty: number },
      options?: { holdRadius?: number; leashRange?: number; fireRange?: number },
    ) => void;
    spawnObelisk: (
      point: { tx: number; ty: number },
      options?: { fireRange?: number; damage?: number },
    ) => void;
  };
  buildingSpawner: {
    spawnAlienStronghold: (
      type: 'AAA' | 'SAM',
      tx: number,
      ty: number,
      spawnAlienUnit: (point: { tx: number; ty: number }) => void,
    ) => void;
  };
  spawnAlienUnit: (point: { tx: number; ty: number }) => void;
}

export interface MissionCoordinator {
  mission: MissionTracker;
  objectiveLabelOverrides: Record<string, ObjectiveLabelFn>;
  missionHandlers: Record<string, () => boolean>;
  getScenario(): ScenarioRuntime;
  initMissions(): void;
  setMission(index: number): void;
  getBriefing(): MissionBriefing;
  getMissionIndices(): { current: number; next: number; highestUnlocked: number };
  onMissionWin(): void;
  resetProgress(): void;
  getMissionDefs(): MissionDef[];
  spawnMissionEnemies(): void;
}

const missionDefs: MissionDef[] = [
  missionJson as MissionDef,
  oceanMissionJson as MissionDef,
  mothershipMissionJson as MissionDef,
  homelandMissionJson as MissionDef,
];

const missionTilemaps: Record<string, RuntimeTilemap> = {
  m01: parseTiled(sampleMapJson as unknown),
  m02: parseTiled(oceanMapJson as unknown),
  m03: parseTiled(mothershipMapJson as unknown),
  m04: parseTiled(homelandMapJson as unknown),
};

const MISSION_ONE_WAVE_COUNT = 3;

const missionOneLayout = createMissionOneLayout(missionTilemaps.m01);
const missionTwoLayout = createMissionTwoLayout();
const missionThreeLayout = createMissionThreeLayout(missionTilemaps.m03);
const missionFourLayout = createMissionFourLayout(missionTilemaps.m04);

const PROGRESS_KEY = 'choppa:progress';

function createMissionBriefing(def: MissionDef): MissionBriefing {
  return {
    title: def.title,
    text: def.briefing,
    goals: def.objectives.map((o) => o.name),
    dialog: def.introDialog ? [...def.introDialog] : [],
  };
}

function defaultWaveCooldown(index: number): number {
  return Math.max(3, 5 - index * 0.2);
}

function boatWaveCooldown(index: number, boat: BoatScenarioConfig | null): number {
  if (!boat) return Number.POSITIVE_INFINITY;
  return index < boat.waves.length ? boat.nextWaveDelay : Number.POSITIVE_INFINITY;
}

function generateMissionOneCivilianHouses(rng: RNG): BuildingSite[] {
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

class MissionCoordinatorImpl implements MissionCoordinator {
  public readonly mission: MissionTracker;

  public readonly objectiveLabelOverrides: Record<string, ObjectiveLabelFn> = {};

  public readonly missionHandlers: Record<string, () => boolean>;

  private readonly rng: RNG;

  private readonly state: GameState;

  private readonly enemySpawners: MissionCoordinatorDeps['enemySpawners'];

  private readonly buildingSpawner: MissionCoordinatorDeps['buildingSpawner'];

  private readonly spawnAlienUnit: (point: { tx: number; ty: number }) => void;

  private readonly scenarioConfigs: Record<string, ScenarioConfig>;

  private missionProgress: MissionProgressData;

  private currentMissionIndex: number;

  private highestUnlockedMissionIndex: number;

  private nextMissionIndex: number;

  private missionDef: MissionDef;

  private missionState = loadMission(missionDefs[0]!);

  private missionBriefing: MissionBriefing = createMissionBriefing(missionDefs[0]!);

  private scenario: ScenarioRuntime = {
    id: missionDefs[0]!.id,
    map: missionTilemaps.m01,
    isoParams: {
      tileWidth: missionTilemaps.m01.tileWidth,
      tileHeight: missionTilemaps.m01.tileHeight,
    },
    pad: clonePadConfig(missionOneLayout.pad),
    safeHouse: cloneSafeHouseParams(missionOneLayout.safeHouse),
    campusSites: missionOneLayout.campusSites.map((site) => cloneBuildingSite(site)),
    civilianGenerator: () => generateMissionOneCivilianHouses(this.rng),
    staticStructures: [],
    buildingSites: [],
    pickupSites: missionOneLayout.pickupSites.map((site) => clonePickupSite(site)),
    survivorSites: missionOneLayout.survivorSites.map((site) => cloneSurvivorSite(site)),
    alienSpawnPoints: missionOneLayout.alienSpawnPoints.map((point) => clonePoint(point)),
    waveSpawnPoints: missionOneLayout.waveSpawnPoints.map((point) => clonePoint(point)),
    waveSpawner: null,
    waveCooldown: null,
    initialWaveCountdown: 3.5,
    boatScenario: null,
  };

  public constructor(deps: MissionCoordinatorDeps) {
    this.rng = deps.rng;
    this.state = deps.state;
    this.mission = deps.missionTracker;
    this.missionHandlers = deps.missionHandlers;
    this.enemySpawners = deps.enemySpawners;
    this.buildingSpawner = deps.buildingSpawner;
    this.spawnAlienUnit = deps.spawnAlienUnit;

    this.scenarioConfigs = this.createScenarioConfigs();

    const saved = loadJson<MissionProgressData>(PROGRESS_KEY, {});
    this.currentMissionIndex = this.findMissionIndex(saved.current);
    if (this.currentMissionIndex < 0) {
      this.currentMissionIndex = this.findMissionIndex(saved.mission);
    }
    if (this.currentMissionIndex < 0) this.currentMissionIndex = 0;

    this.highestUnlockedMissionIndex = this.findMissionIndex(saved.unlocked);
    if (this.highestUnlockedMissionIndex < 0) {
      const legacyIndex = this.findMissionIndex(saved.mission);
      if (legacyIndex >= 0) {
        this.highestUnlockedMissionIndex = Math.min(legacyIndex + 1, missionDefs.length - 1);
      }
    }
    if (this.highestUnlockedMissionIndex < 0) {
      this.highestUnlockedMissionIndex = this.currentMissionIndex;
    }
    this.highestUnlockedMissionIndex = Math.max(
      this.highestUnlockedMissionIndex,
      this.currentMissionIndex,
    );

    this.nextMissionIndex = Math.min(
      this.currentMissionIndex + 1,
      this.highestUnlockedMissionIndex,
    );

    this.missionProgress = {
      current: missionDefs[this.currentMissionIndex]?.id ?? missionDefs[0]?.id,
      unlocked: missionDefs[this.highestUnlockedMissionIndex]?.id ?? missionDefs[0]?.id,
      lastWin: saved.lastWin,
    };

    this.missionDef = missionDefs[this.currentMissionIndex]!;
    this.missionState = loadMission(this.missionDef);
    this.mission.state = this.missionState;
    this.missionBriefing = createMissionBriefing(this.missionDef);

    this.applyScenario(this.missionDef.id);
    this.persistProgress();
  }

  public getScenario(): ScenarioRuntime {
    return this.scenario;
  }

  public initMissions(): void {
    this.setMission(this.currentMissionIndex);
  }

  public setMission(index: number): void {
    const clamped = Math.min(Math.max(index, 0), missionDefs.length - 1);
    this.currentMissionIndex = clamped;
    if (this.highestUnlockedMissionIndex < this.currentMissionIndex) {
      this.highestUnlockedMissionIndex = this.currentMissionIndex;
    }
    this.missionDef = missionDefs[this.currentMissionIndex]!;
    this.missionState = loadMission(this.missionDef);
    this.mission.state = this.missionState;
    this.missionBriefing = createMissionBriefing(this.missionDef);
    this.applyScenario(this.missionDef.id);
    this.nextMissionIndex = Math.min(
      this.currentMissionIndex + 1,
      this.highestUnlockedMissionIndex,
    );
    this.missionProgress.current =
      missionDefs[this.currentMissionIndex]?.id ?? this.missionProgress.current;
    this.missionProgress.unlocked =
      missionDefs[this.highestUnlockedMissionIndex]?.id ?? this.missionProgress.unlocked;
    this.persistProgress();
  }

  public getBriefing(): MissionBriefing {
    return this.missionBriefing;
  }

  public getMissionIndices(): { current: number; next: number; highestUnlocked: number } {
    return {
      current: this.currentMissionIndex,
      next: this.nextMissionIndex,
      highestUnlocked: this.highestUnlockedMissionIndex,
    };
  }

  public onMissionWin(): void {
    const candidate = Math.min(this.currentMissionIndex + 1, missionDefs.length - 1);
    if (candidate > this.highestUnlockedMissionIndex) {
      this.highestUnlockedMissionIndex = candidate;
    }
    this.nextMissionIndex = Math.min(candidate, this.highestUnlockedMissionIndex);
    this.missionProgress.unlocked =
      missionDefs[this.highestUnlockedMissionIndex]?.id ?? this.missionProgress.unlocked;
    this.missionProgress.lastWin = Date.now();
    this.persistProgress();
  }

  public resetProgress(): void {
    removeKey(PROGRESS_KEY);
    this.highestUnlockedMissionIndex = 0;
    this.nextMissionIndex = 0;
    this.missionProgress = {};
    this.setMission(0);
  }

  public getMissionDefs(): MissionDef[] {
    return missionDefs;
  }

  public spawnMissionEnemies(): void {
    this.enemySpawners.spawnMissionEnemies(
      { mission: this.mission.state.def, spawnExtraEnemies: this.scenario.spawnExtraEnemies },
      (type, tx, ty) =>
        this.buildingSpawner.spawnAlienStronghold(type, tx, ty, this.spawnAlienUnit),
    );
  }

  private persistProgress(): void {
    saveJson(PROGRESS_KEY, this.missionProgress);
  }

  private findMissionIndex(id?: string): number {
    if (!id) return -1;
    return missionDefs.findIndex((def) => def.id === id);
  }

  private applyScenario(id: string): void {
    const config = this.scenarioConfigs[id];
    if (!config) throw new Error(`Unknown mission scenario: ${id}`);

    this.scenario = {
      id,
      map: config.map,
      isoParams: { tileWidth: config.map.tileWidth, tileHeight: config.map.tileHeight },
      pad: clonePadConfig(config.pad),
      safeHouse: cloneSafeHouseParams(config.safeHouse),
      campusSites: config.campusSites.map((site) => cloneBuildingSite(site)),
      civilianGenerator: config.civilianGenerator ?? null,
      staticStructures: config.staticStructures
        ? config.staticStructures.map((site) => cloneBuildingSite(site))
        : [],
      buildingSites: [],
      pickupSites: config.pickupSites.map((site) => clonePickupSite(site)),
      survivorSites: config.survivorSites.map((site) => cloneSurvivorSite(site)),
      alienSpawnPoints: config.alienSpawnPoints.map((point) => clonePoint(point)),
      waveSpawnPoints: config.waveSpawnPoints.map((point) => clonePoint(point)),
      waveSpawner: config.waveSpawner ?? null,
      waveCooldown: config.waveCooldown ?? ((index: number) => defaultWaveCooldown(index)),
      initialWaveCountdown: config.initialWaveCountdown ?? 3.5,
      spawnExtraEnemies: config.spawnExtraEnemies,
      onReset: config.onReset,
      boatScenario: null,
    };

    this.regenerateWorldStructures();

    if (config.onApply) config.onApply();

    for (const key of Object.keys(this.objectiveLabelOverrides))
      delete this.objectiveLabelOverrides[key];
    for (const key of Object.keys(this.missionHandlers)) delete this.missionHandlers[key];

    config.setupMissionHandlers();
    config.setupObjectiveLabels();

    this.state.rescue.carrying = 0;
    this.state.rescue.rescued = 0;
    this.state.rescue.survivorsSpawned = false;
    this.state.rescue.total = this.scenario.survivorSites.reduce(
      (sum, site) => sum + Math.max(0, Math.round(site.count)),
      0,
    );

    const isMothership = id === 'm03';
    this.state.flags.aliensTriggered = false;
    this.state.flags.aliensDefeated = false;
    this.state.flags.campusLeveled = false;
    this.state.flags.mothershipShieldActive = isMothership;
    this.state.flags.mothershipBreachOpen = false;

    this.state.boat.boatsEscaped = 0;
    this.state.boat.objectiveComplete = false;
    this.state.boat.objectiveFailed = false;
    this.state.boat.scenario = this.scenario.boatScenario;

    this.state.hive.planting = false;
    this.state.hive.progress = 0;
    this.state.hive.target = 0;
    this.state.hive.armed = false;

    this.state.finalBoss.phase = 'inactive';
    this.state.finalBoss.timer = 0;
    this.state.finalBoss.entity = null;
    this.state.finalBoss.objectiveId = null;
    this.state.finalBoss.name = '';
    this.state.finalBoss.health = 0;
    this.state.finalBoss.healthMax = 0;
    this.state.finalBoss.enraged = false;

    this.state.wave.index = 0;
    this.state.wave.countdown = this.scenario.initialWaveCountdown;
    this.state.wave.active = false;
    this.state.wave.timeInWave = 0;
    this.state.wave.enemies.clear();
  }

  private regenerateWorldStructures(): void {
    const structures = this.scenario.civilianGenerator ? this.scenario.civilianGenerator() : [];
    const buildingSites: BuildingSite[] = [...this.scenario.campusSites];
    if (structures.length > 0) buildingSites.push(...structures);
    if (this.scenario.staticStructures.length > 0) {
      buildingSites.push(...this.scenario.staticStructures);
    }
    this.scenario.buildingSites = buildingSites;
  }

  private createScenarioConfigs(): Record<string, ScenarioConfig> {
    return {
      m01: {
        map: missionTilemaps.m01,
        pad: missionOneLayout.pad,
        safeHouse: missionOneLayout.safeHouse,
        campusSites: missionOneLayout.campusSites,
        civilianGenerator: () => generateMissionOneCivilianHouses(this.rng),
        pickupSites: missionOneLayout.pickupSites,
        survivorSites: missionOneLayout.survivorSites,
        alienSpawnPoints: missionOneLayout.alienSpawnPoints,
        waveSpawnPoints: missionOneLayout.waveSpawnPoints,
        initialWaveCountdown: 3.5,
        waveCooldown: (index: number) => {
          if (index >= MISSION_ONE_WAVE_COUNT) return Number.POSITIVE_INFINITY;
          return defaultWaveCooldown(index);
        },
        waveSpawner: (index: number) => {
          if (index > MISSION_ONE_WAVE_COUNT) return false;
          return this.enemySpawners.spawnDefaultWave(index, this.scenario.waveSpawnPoints);
        },
        setupMissionHandlers: () => this.setupMissionOneHandlers(),
        setupObjectiveLabels: () => this.setupMissionOneObjectiveLabels(),
        onApply: () => {
          this.state.boat.scenario = null;
          this.state.boat.boatsEscaped = 0;
          this.state.boat.objectiveComplete = false;
          this.state.boat.objectiveFailed = false;
        },
      },
      m02: {
        map: missionTilemaps.m02,
        pad: missionTwoLayout.pad,
        safeHouse: missionTwoLayout.safeHouse,
        campusSites: missionTwoLayout.campusSites,
        staticStructures: missionTwoLayout.staticStructures,
        pickupSites: missionTwoLayout.pickupSites,
        survivorSites: missionTwoLayout.survivorSites,
        alienSpawnPoints: missionTwoLayout.alienSpawnPoints,
        waveSpawnPoints: missionTwoLayout.waveSpawnPoints,
        initialWaveCountdown: 4.5,
        waveCooldown: (index: number) => boatWaveCooldown(index, this.state.boat.scenario),
        waveSpawner: (index: number) => {
          const boat = this.state.boat.scenario;
          return boat ? this.enemySpawners.spawnBoatWave(index, boat) : false;
        },
        setupMissionHandlers: () => this.setupMissionTwoHandlers(),
        setupObjectiveLabels: () => this.setupMissionTwoObjectiveLabels(),
        onApply: () => {
          this.activateBoatScenario();
        },
        onReset: () => {
          this.state.boat.boatsEscaped = 0;
          this.state.boat.objectiveComplete = false;
          this.state.boat.objectiveFailed = false;
        },
        spawnExtraEnemies: () => this.spawnMissionTwoGuards(),
      },
      m03: {
        map: missionTilemaps.m03,
        pad: missionThreeLayout.pad,
        safeHouse: missionThreeLayout.safeHouse,
        campusSites: missionThreeLayout.campusSites,
        staticStructures: missionThreeLayout.staticStructures,
        pickupSites: missionThreeLayout.pickupSites,
        survivorSites: missionThreeLayout.survivorSites,
        alienSpawnPoints: missionThreeLayout.alienSpawnPoints,
        waveSpawnPoints: missionThreeLayout.waveSpawnPoints,
        initialWaveCountdown: 4.8,
        waveCooldown: (index: number) => Math.max(3.2, 5.2 - index * 0.3),
        waveSpawner: (index: number) =>
          this.enemySpawners.spawnDefaultWave(index, this.scenario.waveSpawnPoints),
        setupMissionHandlers: () => this.setupMissionThreeHandlers(),
        setupObjectiveLabels: () => this.setupMissionThreeObjectiveLabels(),
        onApply: () => {
          this.state.boat.scenario = null;
          this.state.boat.boatsEscaped = 0;
          this.state.boat.objectiveComplete = false;
          this.state.boat.objectiveFailed = false;
        },
        spawnExtraEnemies: () => this.spawnMissionThreeDefenders(),
      },
      m04: {
        map: missionTilemaps.m04,
        pad: missionFourLayout.pad,
        safeHouse: missionFourLayout.safeHouse,
        campusSites: missionFourLayout.campusSites,
        staticStructures: missionFourLayout.staticStructures,
        pickupSites: missionFourLayout.pickupSites,
        survivorSites: missionFourLayout.survivorSites,
        alienSpawnPoints: missionFourLayout.alienSpawnPoints,
        waveSpawnPoints: missionFourLayout.waveSpawnPoints,
        initialWaveCountdown: 5.0,
        waveCooldown: (index: number) => Math.max(3.0, 5.5 - index * 0.35),
        waveSpawner: (index: number) =>
          this.enemySpawners.spawnDefaultWave(index, this.scenario.waveSpawnPoints),
        setupMissionHandlers: () => this.setupMissionFourHandlers(),
        setupObjectiveLabels: () => this.setupMissionFourObjectiveLabels(),
        onApply: () => {
          this.state.boat.scenario = null;
          this.state.boat.boatsEscaped = 0;
          this.state.boat.objectiveComplete = false;
          this.state.boat.objectiveFailed = false;
        },
        spawnExtraEnemies: () => this.spawnMissionFourDefenders(),
      },
    };
  }

  private activateBoatScenario(): void {
    const boat = missionTwoLayout.boat;
    if (!boat) {
      this.state.boat.scenario = null;
      this.scenario.boatScenario = null;
      return;
    }
    const scenario: BoatScenarioConfig = {
      lanes: boat.lanes.map((lane) => ({
        entry: { ...lane.entry },
        target: { ...lane.target },
        squadId: lane.squadId,
      })),
      waves: boat.waves.map((wave) => ({ ...wave })),
      maxEscapes: boat.maxEscapes,
      nextWaveDelay: boat.nextWaveDelay,
    };
    this.scenario.boatScenario = scenario;
    this.state.boat.scenario = scenario;
    this.state.boat.boatsEscaped = 0;
    this.state.boat.objectiveComplete = false;
    this.state.boat.objectiveFailed = false;
  }

  private spawnMissionTwoGuards(): void {
    const guardPosts = missionTwoLayout.guardPosts ?? [];
    for (let i = 0; i < guardPosts.length; i += 1) {
      this.enemySpawners.spawnCoastGuard(guardPosts[i]!, 9.2);
    }
    const patrolRoutes = missionTwoLayout.patrolRoutes ?? [];
    for (let i = 0; i < patrolRoutes.length; i += 1) {
      this.enemySpawners.spawnShorePatrol(patrolRoutes[i]!);
    }
  }

  private spawnMissionThreeDefenders(): void {
    const sentinels = missionThreeLayout.sentinelPosts ?? [];
    for (let i = 0; i < sentinels.length; i += 1) {
      const post = sentinels[i]!;
      this.enemySpawners.spawnSentinel(
        { tx: post.tx, ty: post.ty },
        { holdRadius: post.holdRadius, leashRange: post.leashRange, fireRange: post.fireRange },
      );
    }

    const obelisks = missionThreeLayout.obeliskSites ?? [];
    for (let i = 0; i < obelisks.length; i += 1) {
      const site = obelisks[i]!;
      this.enemySpawners.spawnObelisk(
        { tx: site.tx, ty: site.ty },
        { fireRange: site.fireRange, damage: site.damage },
      );
    }

    const patrolRoutes = missionThreeLayout.patrolRoutes ?? [];
    for (let i = 0; i < patrolRoutes.length; i += 1) {
      this.enemySpawners.spawnShorePatrol(patrolRoutes[i]!);
    }
  }

  private setupMissionOneHandlers(): void {
    this.missionHandlers.obj4 = () =>
      this.state.wave.index >= MISSION_ONE_WAVE_COUNT &&
      !this.state.wave.active &&
      !Number.isFinite(this.state.wave.countdown);
    this.missionHandlers.obj5 = () => this.state.rescue.rescued >= this.state.rescue.total;
  }

  private setupMissionOneObjectiveLabels(): void {
    this.objectiveLabelOverrides.obj4 = (objective) => {
      const totalWaves = MISSION_ONE_WAVE_COUNT;
      const waveState = this.state.wave;
      let label = objective.name;
      if (!objective.complete) {
        const waveNumber = waveState.active
          ? Math.min(Math.max(waveState.index, 1), totalWaves)
          : Math.min(Math.max(waveState.index + 1, 1), totalWaves);
        label += ` (Wave ${waveNumber} of ${totalWaves}`;
        if (waveState.active) {
          label += ` | Remaining: ${waveState.enemies.size}`;
        } else if (waveState.index >= totalWaves && !Number.isFinite(waveState.countdown)) {
          label += ' | All waves defeated';
        } else if (Number.isFinite(waveState.countdown)) {
          label += ` | Next wave in: ${Math.max(0, waveState.countdown).toFixed(1)}s`;
        }
        label += ')';
      }
      return label;
    };
    this.objectiveLabelOverrides.obj5 = (objective) => {
      const carrying = this.state.rescue.carrying;
      let label = `${objective.name} (${this.state.rescue.rescued}/${this.state.rescue.total}`;
      if (carrying > 0) label += ` +${carrying}`;
      label += ')';
      return label;
    };
  }

  private setupMissionTwoHandlers(): void {
    this.missionHandlers.boats = () =>
      this.state.boat.objectiveComplete && !this.state.boat.objectiveFailed;
  }

  private setupMissionTwoObjectiveLabels(): void {
    this.objectiveLabelOverrides.boats = (objective) => {
      const boat = this.state.boat.scenario;
      if (!boat) return objective.name;
      const totalWaves = boat.waves.length;
      const currentWave = this.state.wave.active
        ? this.state.wave.index
        : Math.min(this.state.wave.index + 1, totalWaves);
      let label = `${objective.name} (Escaped: ${this.state.boat.boatsEscaped}/${boat.maxEscapes}`;
      if (!objective.complete) {
        const clampedWave = Math.min(Math.max(currentWave, 1), totalWaves);
        label += ` | Wave ${clampedWave} of ${totalWaves}`;
        if (
          !this.state.wave.active &&
          this.state.wave.index < totalWaves &&
          Number.isFinite(this.state.wave.countdown)
        ) {
          label += ` | Next wave in: ${Math.max(0, this.state.wave.countdown).toFixed(1)}s`;
        }
      }
      label += ')';
      return label;
    };
  }

  private setupMissionThreeHandlers(): void {}

  private setupMissionThreeObjectiveLabels(): void {
    const powerIds = ['core-west', 'core-east', 'core-south'];
    this.objectiveLabelOverrides.breach = (objective) => {
      const completeCount = powerIds.reduce((count, id) => {
        const target = this.mission.state.objectives.find((o) => o.id === id);
        return count + (target && target.complete ? 1 : 0);
      }, 0);
      let label = objective.name;
      if (!objective.complete) {
        label += ` (Power Offline: ${completeCount}/${powerIds.length}`;
        if (!this.state.flags.mothershipShieldActive) {
          label += ' | Hangar open';
        }
        label += ')';
      }
      return label;
    };
  }

  private spawnMissionFourDefenders(): void {
    const sentinels = missionFourLayout.sentinelPosts ?? [];
    for (let i = 0; i < sentinels.length; i += 1) {
      const post = sentinels[i]!;
      this.enemySpawners.spawnSentinel(
        { tx: post.tx, ty: post.ty },
        { holdRadius: post.holdRadius, leashRange: post.leashRange, fireRange: post.fireRange },
      );
    }

    const obelisks = missionFourLayout.obeliskSites ?? [];
    for (let i = 0; i < obelisks.length; i += 1) {
      const site = obelisks[i]!;
      this.enemySpawners.spawnObelisk(
        { tx: site.tx, ty: site.ty },
        { fireRange: site.fireRange, damage: site.damage },
      );
    }

    const patrolRoutes = missionFourLayout.patrolRoutes ?? [];
    for (let i = 0; i < patrolRoutes.length; i += 1) {
      this.enemySpawners.spawnShorePatrol(patrolRoutes[i]!);
    }
  }

  private setupMissionFourHandlers(): void {
    this.state.hive.target = 8;
    this.state.hive.progress = 0;
    this.state.hive.armed = false;
    this.state.hive.planting = false;
    this.missionHandlers['plant-nuke'] = () => this.state.hive.armed;
    this.state.finalBoss.phase = 'inactive';
    this.state.finalBoss.timer = 0;
    this.state.finalBoss.entity = null;
    this.state.finalBoss.objectiveId = null;
    this.state.finalBoss.name = '';
    this.state.finalBoss.health = 0;
    this.state.finalBoss.healthMax = 0;
    this.state.finalBoss.enraged = false;
    this.missionHandlers['final-boss'] = () => this.state.finalBoss.phase === 'defeated';
  }

  private setupMissionFourObjectiveLabels(): void {
    this.objectiveLabelOverrides['plant-nuke'] = (objective) => {
      if (objective.complete) return objective.name;
      const target = Math.max(0.01, this.state.hive.target);
      const percent = Math.min(100, Math.round((this.state.hive.progress / target) * 100));
      let label = `${objective.name} (${percent}% armed`;
      if (this.state.hive.planting) {
        label += ' | Holding core';
      } else if (this.state.hive.progress > 0) {
        label += ' | Interrupted';
      } else {
        label += ' | Approach core';
      }
      label += ')';
      return label;
    };
    this.objectiveLabelOverrides.extract = (objective) => {
      if (objective.complete) return objective.name;
      return `${objective.name} (Nuke armed)`;
    };
    this.objectiveLabelOverrides['final-boss'] = (objective) => {
      const boss = this.state.finalBoss;
      if (objective.complete) return `${objective.name} (Vorusk neutralized)`;
      if (boss.phase === 'inactive' || boss.phase === 'cinematic' || !boss.objectiveId) {
        return `${objective.name} (Awaiting contact)`;
      }
      const max = Math.max(1, boss.healthMax);
      const percent = Math.max(0, Math.round((boss.health / max) * 100));
      const enragedTag = boss.enraged ? ' | Enraged' : '';
      return `${objective.name} (${percent}% vitality${enragedTag})`;
    };
  }
}

export function createMissionCoordinator(deps: MissionCoordinatorDeps): MissionCoordinator {
  return new MissionCoordinatorImpl(deps);
}
