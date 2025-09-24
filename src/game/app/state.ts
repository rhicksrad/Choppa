import type { Entity } from '../../core/ecs/entities';
import type { Pickup } from '../components/Pickup';
import type { PickupCraneSoundHandle } from '../../core/audio/sfx';
import type { BoatScenarioConfig } from '../missions/coordinator';

export interface EnemyMeta {
  kind: 'aaa' | 'sam' | 'patrol' | 'chaser' | 'speedboat' | 'sentinel' | 'obelisk' | 'boss';
  score: number;
  wave?: number;
}

export interface BuildingMeta {
  score: number;
  drop?: { kind: 'armor'; amount: number };
  category: 'campus' | 'stronghold' | 'civilian';
  triggersAlarm: boolean;
  tag?: string;
}

export interface Explosion {
  tx: number;
  ty: number;
  age: number;
  duration: number;
  radius: number;
}

export interface RubbleDecal {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  seed: number;
}

export interface RescueRunner {
  startIso: { x: number; y: number };
  endIso: { x: number; y: number };
  progress: number;
  delay: number;
  duration: number;
  elapsed: number;
  bobOffset: number;
}

export interface WaveState {
  index: number;
  countdown: number;
  active: boolean;
  timeInWave: number;
  enemies: Set<Entity>;
}

export interface PlayerState {
  lives: number;
  respawnTimer: number;
  invulnerable: boolean;
}

export interface RescueState {
  carrying: number;
  rescued: number;
  total: number;
  survivorsSpawned: boolean;
}

export interface BoatState {
  scenario: BoatScenarioConfig | null;
  boatsEscaped: number;
  objectiveComplete: boolean;
  objectiveFailed: boolean;
}

export interface HiveState {
  planting: boolean;
  progress: number;
  target: number;
  armed: boolean;
}

export interface FinalBossState {
  phase: 'inactive' | 'cinematic' | 'spawning' | 'active' | 'defeated';
  timer: number;
  entity: Entity | null;
  objectiveId: string | null;
  name: string;
  health: number;
  healthMax: number;
  enraged: boolean;
}

export interface PickupCompleteEvent {
  entity: Entity;
  kind: Pickup['kind'];
  fuelAmount?: number;
  ammo?: { missiles?: number; rockets?: number; hellfires?: number };
  survivorCount?: number;
  armorAmount?: number;
}

export const SURVIVOR_CAPACITY = 4;

export interface GameState {
  playerId: Entity | null;
  player: PlayerState;
  stats: { score: number };
  explosions: Explosion[];
  rubble: RubbleDecal[];
  enemyMeta: Map<Entity, EnemyMeta>;
  buildingMeta: Map<Entity, BuildingMeta>;
  wave: WaveState;
  minimapEnemies: { tx: number; ty: number }[];
  buildingEntities: Entity[];
  pickupEntities: Entity[];
  pickupCraneSounds: Map<Entity, PickupCraneSoundHandle>;
  survivorEntities: Entity[];
  alienEntities: Set<Entity>;
  rescueRunners: RescueRunner[];
  rescue: RescueState;
  flags: {
    aliensTriggered: boolean;
    aliensDefeated: boolean;
    campusLeveled: boolean;
    mothershipShieldActive: boolean;
    mothershipBreachOpen: boolean;
  };
  boat: BoatState;
  hive: HiveState;
  finalBoss: FinalBossState;
}

export function createGameState(): GameState {
  return {
    playerId: null,
    player: { lives: 3, respawnTimer: 0, invulnerable: false },
    stats: { score: 0 },
    explosions: [],
    rubble: [],
    enemyMeta: new Map(),
    buildingMeta: new Map(),
    wave: { index: 0, countdown: 3, active: false, timeInWave: 0, enemies: new Set() },
    minimapEnemies: [],
    buildingEntities: [],
    pickupEntities: [],
    pickupCraneSounds: new Map(),
    survivorEntities: [],
    alienEntities: new Set(),
    rescueRunners: [],
    rescue: { carrying: 0, rescued: 0, total: 0, survivorsSpawned: false },
    flags: {
      aliensTriggered: false,
      aliensDefeated: false,
      campusLeveled: false,
      mothershipShieldActive: false,
      mothershipBreachOpen: false,
    },
    boat: { scenario: null, boatsEscaped: 0, objectiveComplete: false, objectiveFailed: false },
    hive: { planting: false, progress: 0, target: 0, armed: false },
    finalBoss: {
      phase: 'inactive',
      timer: 0,
      entity: null,
      objectiveId: null,
      name: '',
      health: 0,
      healthMax: 0,
      enraged: false,
    },
  };
}
