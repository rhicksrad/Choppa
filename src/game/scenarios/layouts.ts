import type { SafeHouseParams } from '../../render/sprites/safehouse';

export interface PadConfig {
  tx: number;
  ty: number;
  radius: number;
}

export interface BuildingSite {
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
  score?: number;
  drop?: { kind: 'armor'; amount: number };
  category?: 'campus' | 'stronghold' | 'civilian';
  triggersAlarm?: boolean;
  tag?: string;
}

export interface PickupSite {
  tx: number;
  ty: number;
  kind: 'fuel' | 'ammo' | 'armor';
  radius?: number;
  duration?: number;
  fuelAmount?: number;
  ammo?: { missiles?: number; rockets?: number; hellfires?: number };
  armorAmount?: number;
}

export interface SurvivorSite {
  tx: number;
  ty: number;
  count: number;
  radius?: number;
  duration?: number;
}

export interface BoatLane {
  entry: { tx: number; ty: number };
  target: { tx: number; ty: number };
  squadId?: string;
}

export interface BoatWave {
  count: number;
}

export interface SentinelPost {
  tx: number;
  ty: number;
  holdRadius?: number;
  leashRange?: number;
  fireRange?: number;
}

export interface ObeliskSite {
  tx: number;
  ty: number;
  fireRange?: number;
  damage?: number;
}

export interface PatrolRoute {
  tx: number;
  ty: number;
  axis: 'x' | 'y';
  range: number;
}

export interface CivilianCluster {
  tx: number;
  ty: number;
  spread: number;
  count: number;
}

export interface MissionLayout {
  pad: PadConfig;
  safeHouse: SafeHouseParams;
  campusSites: BuildingSite[];
  staticStructures?: BuildingSite[];
  pickupSites: PickupSite[];
  survivorSites: SurvivorSite[];
  alienSpawnPoints: Array<{ tx: number; ty: number }>;
  waveSpawnPoints: Array<{ tx: number; ty: number }>;
  guardPosts?: Array<{ tx: number; ty: number }>;
  patrolRoutes?: PatrolRoute[];
  sentinelPosts?: SentinelPost[];
  obeliskSites?: ObeliskSite[];
  boat?: {
    lanes: BoatLane[];
    waves: BoatWave[];
    maxEscapes: number;
    nextWaveDelay: number;
  };
  civilianClusters?: CivilianCluster[];
}

const MAP_BORDER = 8;

function offsetTiles<T extends { tx: number; ty: number }>(
  items: T[],
  border: number = MAP_BORDER,
): T[] {
  return items.map((item) => ({
    ...item,
    tx: item.tx + border,
    ty: item.ty + border,
  }));
}

function offsetBoatLane(
  seed: {
    entry: { tx: number; ty: number };
    target: { tx: number; ty: number };
    squadId?: string;
  },
  border: number = MAP_BORDER,
): BoatLane {
  return {
    entry: { tx: seed.entry.tx + border, ty: seed.entry.ty + border },
    target: { tx: seed.target.tx + border, ty: seed.target.ty + border },
    squadId: seed.squadId,
  };
}

export function clonePadConfig(config: PadConfig): PadConfig {
  return { ...config };
}

export function cloneSafeHouseParams(params: SafeHouseParams): SafeHouseParams {
  return { ...params };
}

export function cloneBuildingSite(site: BuildingSite): BuildingSite {
  return {
    ...site,
    drop: site.drop ? { ...site.drop } : undefined,
    tag: site.tag,
  };
}

export function clonePickupSite(site: PickupSite): PickupSite {
  return {
    ...site,
    ammo: site.ammo ? { ...site.ammo } : undefined,
  };
}

export function cloneSurvivorSite(site: SurvivorSite): SurvivorSite {
  return { ...site };
}

export function clonePoint(point: { tx: number; ty: number }): { tx: number; ty: number } {
  return { tx: point.tx, ty: point.ty };
}

export function createMissionOneLayout(map: { width: number; height: number }): MissionLayout {
  const pad: PadConfig = { tx: map.width - 5, ty: map.height - 5, radius: 1.2 };
  const safeHouse: SafeHouseParams = {
    tx: pad.tx - 1.4,
    ty: pad.ty + 0.55,
    width: 1.18,
    depth: 1.02,
    height: 22,
    bodyColor: '#d8d2c6',
    roofColor: '#6e7b88',
    trimColor: '#f4f0e6',
    doorColor: '#394758',
    windowColor: '#cfe4ff',
    walkwayColor: '#d6d0c4',
  };

  const campusSites = offsetTiles([
    {
      tx: 18,
      ty: 16,
      width: 1.8,
      depth: 1.35,
      height: 36,
      health: 140,
      colliderRadius: 0.92,
      bodyColor: '#372a54',
      roofColor: '#48c7b8',
      ruinColor: '#271b3d',
      score: 260,
      category: 'campus',
      triggersAlarm: true,
    },
    {
      tx: 23,
      ty: 19,
      width: 1.6,
      depth: 1.2,
      height: 32,
      health: 130,
      colliderRadius: 0.88,
      bodyColor: '#2f234a',
      roofColor: '#44bea9',
      ruinColor: '#251739',
      score: 240,
      category: 'campus',
      triggersAlarm: true,
    },
    {
      tx: 20,
      ty: 21,
      width: 1.4,
      depth: 1.4,
      height: 32,
      health: 125,
      colliderRadius: 0.84,
      bodyColor: '#352c60',
      roofColor: '#48c7b8',
      ruinColor: '#291d40',
      score: 210,
      category: 'campus',
      triggersAlarm: true,
    },
  ]);

  const pickupSites = offsetTiles([
    { tx: 15.2, ty: 18.4, kind: 'fuel', fuelAmount: 55 },
    { tx: 18.6, ty: 16.1, kind: 'ammo', ammo: { missiles: 90, rockets: 3, hellfires: 1 } },
    { tx: 10.4, ty: 12.6, kind: 'ammo', ammo: { missiles: 110, rockets: 4, hellfires: 1 } },
    { tx: 22.5, ty: 12.2, kind: 'fuel', fuelAmount: 60 },
    { tx: 25.3, ty: 19.4, kind: 'ammo', ammo: { missiles: 100, rockets: 5, hellfires: 1 } },
    { tx: 28.2, ty: 27.1, kind: 'fuel', fuelAmount: 65 },
    { tx: 13.2, ty: 26.4, kind: 'fuel', fuelAmount: 58 },
    { tx: 7.4, ty: 22.3, kind: 'ammo', ammo: { missiles: 80, rockets: 3, hellfires: 1 } },
    { tx: 31.2, ty: 14.4, kind: 'ammo', ammo: { missiles: 95, rockets: 3, hellfires: 1 } },
    { tx: 20.4, ty: 29.1, kind: 'fuel', fuelAmount: 62 },
  ]);

  const survivorSites = offsetTiles([
    { tx: 18.2, ty: 17.4, count: 3, radius: 0.85, duration: 1.6 },
    { tx: 20.4, ty: 18.8, count: 2, radius: 0.85, duration: 1.6 },
    { tx: 16.1, ty: 19.6, count: 3, radius: 0.9, duration: 1.7 },
    { tx: 18.7, ty: 21.2, count: 2, radius: 0.9, duration: 1.7 },
    { tx: 15.4, ty: 17.8, count: 2, radius: 0.85, duration: 1.5 },
  ]);

  const alienSpawnPoints = offsetTiles([
    { tx: 17.2, ty: 14.6 },
    { tx: 21.1, ty: 16.3 },
    { tx: 14.4, ty: 18.4 },
    { tx: 19.6, ty: 21.3 },
    { tx: 16.2, ty: 22.1 },
    { tx: 22.4, ty: 19.2 },
  ]);

  const waveSpawnPoints = offsetTiles([
    { tx: 7, ty: 7 },
    { tx: 28, ty: 9 },
    { tx: 12, ty: 28 },
    { tx: 20, ty: 6 },
  ]);

  const civilianClusters = offsetTiles([
    { tx: 9.4, ty: 24.2, spread: 1.4, count: 3 },
    { tx: 24.6, ty: 27.5, spread: 1.6, count: 3 },
    { tx: 6.4, ty: 15.2, spread: 1.1, count: 2 },
    { tx: 28.4, ty: 20.6, spread: 1.2, count: 2 },
  ]);

  return {
    pad,
    safeHouse,
    campusSites,
    pickupSites,
    survivorSites,
    alienSpawnPoints,
    waveSpawnPoints,
    civilianClusters,
  };
}

export function createMissionTwoLayout(): MissionLayout {
  const pad: PadConfig = { tx: 26, ty: 2, radius: 1.5 };
  const safeHouse: SafeHouseParams = {
    tx: pad.tx - 1.4,
    ty: pad.ty - 0.8,
    width: 2.8,
    depth: 1.5,
    height: 30,
    bodyColor: '#b0bcc9',
    roofColor: '#3e4c5d',
    trimColor: '#d9e4ef',
    doorColor: '#243241',
    windowColor: '#9ed4ff',
    walkwayColor: '#6f7c89',
  };

  const campusSites: BuildingSite[] = [
    {
      tx: 12.0,
      ty: 46.2,
      width: 2.4,
      depth: 1.3,
      height: 34,
      health: 150,
      colliderRadius: 1.2,
      bodyColor: '#1f2e57',
      roofColor: '#83d3ff',
      ruinColor: '#15213d',
      score: 320,
      category: 'stronghold',
      triggersAlarm: true,
    },
    {
      tx: 26.0,
      ty: 30.8,
      width: 2.5,
      depth: 1.3,
      height: 32,
      health: 145,
      colliderRadius: 1.2,
      bodyColor: '#243961',
      roofColor: '#76d1ff',
      ruinColor: '#1a2642',
      score: 315,
      category: 'stronghold',
      triggersAlarm: true,
    },
    {
      tx: 40.0,
      ty: 46.2,
      width: 2.4,
      depth: 1.3,
      height: 33,
      health: 148,
      colliderRadius: 1.2,
      bodyColor: '#1c2f4a',
      roofColor: '#8bd0ff',
      ruinColor: '#152438',
      score: 305,
      category: 'stronghold',
      triggersAlarm: true,
    },
  ];

  const staticStructures: BuildingSite[] = [
    {
      tx: 18.4,
      ty: 46.6,
      width: 1.4,
      depth: 1.0,
      height: 20,
      health: 95,
      colliderRadius: 0.84,
      bodyColor: '#36485e',
      roofColor: '#5fa1c7',
      ruinColor: '#243542',
      score: 185,
      category: 'stronghold',
      triggersAlarm: false,
      drop: { kind: 'armor', amount: 35 },
    },
    {
      tx: 26.0,
      ty: 29.2,
      width: 1.5,
      depth: 1.0,
      height: 22,
      health: 100,
      colliderRadius: 0.88,
      bodyColor: '#3a4c62',
      roofColor: '#58a7d4',
      ruinColor: '#27374a',
      score: 190,
      category: 'stronghold',
      triggersAlarm: false,
    },
    {
      tx: 33.6,
      ty: 46.6,
      width: 1.4,
      depth: 1.0,
      height: 21,
      health: 92,
      colliderRadius: 0.82,
      bodyColor: '#28384c',
      roofColor: '#6fb7dd',
      ruinColor: '#1c2835',
      score: 175,
      category: 'stronghold',
      triggersAlarm: false,
    },
  ];

  const pickupSites: PickupSite[] = [
    { tx: 22.4, ty: 1.6, kind: 'fuel', fuelAmount: 70 },
    { tx: 29.6, ty: 1.6, kind: 'fuel', fuelAmount: 64 },
    { tx: 24.6, ty: 0.8, kind: 'ammo', ammo: { missiles: 110, rockets: 4, hellfires: 1 } },
    { tx: 27.4, ty: 0.8, kind: 'ammo', ammo: { missiles: 115, rockets: 4, hellfires: 2 } },
    { tx: 31.0, ty: 2.6, kind: 'ammo', ammo: { missiles: 108, rockets: 5, hellfires: 1 } },
  ];

  const alienSpawnPoints = [
    { tx: 11.8, ty: 45.8 },
    { tx: 18.8, ty: 46.8 },
    { tx: 33.2, ty: 46.8 },
    { tx: 40.2, ty: 45.8 },
  ];

  const waveSpawnPoints = [
    { tx: 12.0, ty: 42.2 },
    { tx: 26.0, ty: 41.5 },
    { tx: 40.0, ty: 42.2 },
  ];

  const guardPosts = [
    { tx: 12.0, ty: 47.0 },
    { tx: 26.0, ty: 31.6 },
    { tx: 40.0, ty: 47.0 },
  ];

  const patrolRoutes: PatrolRoute[] = [
    { tx: 18.8, ty: 46.4, axis: 'x', range: 2.4 },
    { tx: 33.2, ty: 46.4, axis: 'x', range: 2.4 },
    { tx: 26.0, ty: 28.4, axis: 'y', range: 1.6 },
  ];

  const boat = {
    lanes: [
      offsetBoatLane(
        {
          entry: { tx: 12.0, ty: 18.0 },
          target: { tx: 12.0, ty: 45.0 },
          squadId: 'm02-strikeboats',
        },
        0,
      ),
      offsetBoatLane(
        {
          entry: { tx: 26.0, ty: 16.5 },
          target: { tx: 26.0, ty: 45.6 },
          squadId: 'm02-strikeboats',
        },
        0,
      ),
      offsetBoatLane(
        {
          entry: { tx: 40.0, ty: 18.0 },
          target: { tx: 40.0, ty: 45.0 },
          squadId: 'm02-strikeboats',
        },
        0,
      ),
    ],
    waves: [{ count: 4 }, { count: 5 }, { count: 6 }],
    maxEscapes: 3,
    nextWaveDelay: 7.2,
  };

  return {
    pad,
    safeHouse,
    campusSites,
    staticStructures,
    pickupSites,
    survivorSites: [],
    alienSpawnPoints,
    waveSpawnPoints,
    guardPosts,
    patrolRoutes,
    boat,
  };
}

export function createMissionThreeLayout(map: { width: number; height: number }): MissionLayout {
  const pad: PadConfig = { tx: Math.round(map.width / 2), ty: 6, radius: 1.8 };
  const safeHouse: SafeHouseParams = {
    tx: pad.tx - 1.2,
    ty: pad.ty + 0.6,
    width: 3,
    depth: 1.8,
    height: 32,
    bodyColor: '#aeb6c9',
    roofColor: '#2c3a4f',
    trimColor: '#e8eef8',
    doorColor: '#1a2533',
    windowColor: '#96d9ff',
    walkwayColor: '#657186',
  };

  const campusSites: BuildingSite[] = [
    {
      tx: 24.2,
      ty: 30.2,
      width: 2.2,
      depth: 1.6,
      height: 36,
      health: 240,
      colliderRadius: 1.45,
      bodyColor: '#24143b',
      roofColor: '#6ef6ff',
      ruinColor: '#170d27',
      score: 420,
      category: 'stronghold',
      triggersAlarm: true,
    },
    {
      tx: 35.8,
      ty: 30.0,
      width: 2.2,
      depth: 1.6,
      height: 36,
      health: 240,
      colliderRadius: 1.45,
      bodyColor: '#23133a',
      roofColor: '#74f9ff',
      ruinColor: '#160d27',
      score: 420,
      category: 'stronghold',
      triggersAlarm: true,
    },
    {
      tx: 30.0,
      ty: 38.6,
      width: 2.4,
      depth: 1.6,
      height: 34,
      health: 250,
      colliderRadius: 1.52,
      bodyColor: '#27153f',
      roofColor: '#63edf7',
      ruinColor: '#190d29',
      score: 430,
      category: 'stronghold',
      triggersAlarm: true,
    },
  ];

  const staticStructures: BuildingSite[] = [
    {
      tx: 27.2,
      ty: 26.6,
      width: 1.15,
      depth: 3.6,
      height: 30,
      health: 180,
      colliderRadius: 0.88,
      bodyColor: '#181038',
      roofColor: '#63e6ff',
      ruinColor: '#0f0624',
      score: 260,
      category: 'stronghold',
      triggersAlarm: false,
    },
    {
      tx: 32.8,
      ty: 26.6,
      width: 1.15,
      depth: 3.6,
      height: 30,
      health: 180,
      colliderRadius: 0.88,
      bodyColor: '#191139',
      roofColor: '#66f0ff',
      ruinColor: '#0f0726',
      score: 260,
      category: 'stronghold',
      triggersAlarm: false,
    },
    {
      tx: 28.6,
      ty: 24.0,
      width: 1.2,
      depth: 1.05,
      height: 22,
      health: 150,
      colliderRadius: 0.82,
      bodyColor: '#190c2b',
      roofColor: '#6fe4ff',
      ruinColor: '#0e051a',
      score: 220,
      category: 'stronghold',
      triggersAlarm: false,
    },
    {
      tx: 31.4,
      ty: 24.0,
      width: 1.2,
      depth: 1.05,
      height: 22,
      health: 150,
      colliderRadius: 0.82,
      bodyColor: '#190c2b',
      roofColor: '#6fe4ff',
      ruinColor: '#0e051a',
      score: 220,
      category: 'stronghold',
      triggersAlarm: false,
    },
    {
      tx: 30.0,
      ty: 26.2,
      width: 2.8,
      depth: 0.5,
      height: 26,
      health: Number.POSITIVE_INFINITY,
      colliderRadius: 1.75,
      bodyColor: '#1ab5ff',
      roofColor: '#8df0ff',
      ruinColor: '#102846',
      score: 0,
      category: 'stronghold',
      triggersAlarm: false,
      tag: 'mothership-shield',
    },
  ];

  const pickupSites: PickupSite[] = [
    { tx: pad.tx - 2.6, ty: pad.ty + 1.3, kind: 'fuel', fuelAmount: 72 },
    { tx: pad.tx + 2.6, ty: pad.ty + 1.3, kind: 'fuel', fuelAmount: 72 },
    {
      tx: pad.tx - 1.8,
      ty: pad.ty - 0.6,
      kind: 'ammo',
      ammo: { missiles: 108, rockets: 6, hellfires: 2 },
    },
    {
      tx: pad.tx + 1.8,
      ty: pad.ty - 0.6,
      kind: 'ammo',
      ammo: { missiles: 126, rockets: 6, hellfires: 3 },
    },
    {
      tx: pad.tx - 3.4,
      ty: pad.ty + 2.4,
      kind: 'fuel',
      fuelAmount: 54,
    },
    {
      tx: pad.tx + 3.4,
      ty: pad.ty + 2.4,
      kind: 'ammo',
      ammo: { missiles: 78, rockets: 3, hellfires: 1 },
    },
    { tx: 23.6, ty: 33.0, kind: 'ammo', ammo: { missiles: 90, rockets: 4 } },
    { tx: 36.4, ty: 33.0, kind: 'fuel', fuelAmount: 64 },
    { tx: 30.0, ty: 37.6, kind: 'armor', armorAmount: 45 },
    { tx: 30.0, ty: 29.2, kind: 'ammo', ammo: { missiles: 84, rockets: 2, hellfires: 1 } },
  ];

  const alienSpawnPoints = [
    { tx: 22.8, ty: 32.2 },
    { tx: 37.2, ty: 32.2 },
    { tx: 30.0, ty: 35.2 },
    { tx: 30.0, ty: 23.8 },
  ];

  const waveSpawnPoints = [
    { tx: 22.5, ty: 44.0 },
    { tx: 37.5, ty: 44.0 },
    { tx: 30.0, ty: 41.8 },
    { tx: 25.8, ty: 38.6 },
    { tx: 34.2, ty: 38.6 },
  ];

  const patrolRoutes: PatrolRoute[] = [
    { tx: 25.6, ty: 34.0, axis: 'x', range: 3.4 },
    { tx: 34.4, ty: 34.0, axis: 'x', range: 3.4 },
    { tx: 30.0, ty: 41.2, axis: 'y', range: 3.8 },
    { tx: 30.0, ty: 29.0, axis: 'y', range: 2.6 },
  ];

  const sentinelPosts: SentinelPost[] = [
    { tx: 24.0, ty: 33.2, holdRadius: 1.0, leashRange: 7.6, fireRange: 8.0 },
    { tx: 36.0, ty: 33.2, holdRadius: 1.0, leashRange: 7.6, fireRange: 8.0 },
    { tx: 30.0, ty: 36.6, holdRadius: 1.1, leashRange: 8.4, fireRange: 8.4 },
    { tx: 30.0, ty: 24.8, holdRadius: 1.0, leashRange: 7.6, fireRange: 8.6 },
  ];

  const obeliskSites: ObeliskSite[] = [
    { tx: 22.4, ty: 32.0, fireRange: 9.4, damage: 11 },
    { tx: 37.6, ty: 32.0, fireRange: 9.4, damage: 11 },
    { tx: 30.0, ty: 21.8, fireRange: 10.8, damage: 13 },
  ];

  return {
    pad,
    safeHouse,
    campusSites,
    staticStructures,
    pickupSites,
    survivorSites: [],
    alienSpawnPoints,
    waveSpawnPoints,
    patrolRoutes,
    sentinelPosts,
    obeliskSites,
  };
}

export function createMissionFourLayout(map: { width: number; height: number }): MissionLayout {
  const pad: PadConfig = { tx: Math.round(map.width / 2), ty: map.height - 6, radius: 1.9 };
  const safeHouse: SafeHouseParams = {
    tx: pad.tx - 1.3,
    ty: pad.ty + 0.55,
    width: 3.6,
    depth: 1.95,
    height: 34,
    bodyColor: '#d9d6f2',
    roofColor: '#472f6a',
    trimColor: '#f2eefc',
    doorColor: '#2c1a45',
    windowColor: '#9be2ff',
    walkwayColor: '#6f5c92',
  };

  const campusSites: BuildingSite[] = [
    {
      tx: 24.5,
      ty: 26.2,
      width: 2.8,
      depth: 1.9,
      height: 40,
      health: 280,
      colliderRadius: 1.55,
      bodyColor: '#2a0f3e',
      roofColor: '#7af5ff',
      ruinColor: '#180624',
      score: 480,
      category: 'stronghold',
      triggersAlarm: true,
    },
    {
      tx: 39.5,
      ty: 26.0,
      width: 2.8,
      depth: 1.9,
      height: 40,
      health: 280,
      colliderRadius: 1.55,
      bodyColor: '#290e3d',
      roofColor: '#7df9ff',
      ruinColor: '#170523',
      score: 480,
      category: 'stronghold',
      triggersAlarm: true,
    },
    {
      tx: 32.0,
      ty: 18.4,
      width: 2.6,
      depth: 1.8,
      height: 42,
      health: 290,
      colliderRadius: 1.52,
      bodyColor: '#2d103f',
      roofColor: '#83f1ff',
      ruinColor: '#1a0625',
      score: 500,
      category: 'stronghold',
      triggersAlarm: true,
    },
  ];

  const staticStructures: BuildingSite[] = [
    {
      tx: 27.6,
      ty: 21.8,
      width: 1.5,
      depth: 1.1,
      height: 26,
      health: 170,
      colliderRadius: 0.94,
      bodyColor: '#1c0831',
      roofColor: '#63e6ff',
      ruinColor: '#0e031a',
      score: 260,
      category: 'stronghold',
      triggersAlarm: false,
    },
    {
      tx: 36.4,
      ty: 21.8,
      width: 1.5,
      depth: 1.1,
      height: 26,
      health: 170,
      colliderRadius: 0.94,
      bodyColor: '#1b0730',
      roofColor: '#63e6ff',
      ruinColor: '#0d0319',
      score: 260,
      category: 'stronghold',
      triggersAlarm: false,
    },
    {
      tx: 29.4,
      ty: 30.6,
      width: 1.45,
      depth: 1.05,
      height: 24,
      health: 160,
      colliderRadius: 0.9,
      bodyColor: '#150422',
      roofColor: '#5cd8ff',
      ruinColor: '#0a0214',
      score: 240,
      category: 'stronghold',
      triggersAlarm: false,
    },
    {
      tx: 34.6,
      ty: 30.6,
      width: 1.45,
      depth: 1.05,
      height: 24,
      health: 160,
      colliderRadius: 0.9,
      bodyColor: '#150422',
      roofColor: '#5cd8ff',
      ruinColor: '#0a0214',
      score: 240,
      category: 'stronghold',
      triggersAlarm: false,
    },
  ];

  const pickupSites: PickupSite[] = [
    { tx: pad.tx - 3.2, ty: pad.ty + 1.4, kind: 'fuel', fuelAmount: 82 },
    { tx: pad.tx + 3.2, ty: pad.ty + 1.4, kind: 'fuel', fuelAmount: 82 },
    {
      tx: pad.tx - 2.2,
      ty: pad.ty - 0.9,
      kind: 'ammo',
      ammo: { missiles: 138, rockets: 6, hellfires: 3 },
    },
    {
      tx: pad.tx + 2.2,
      ty: pad.ty - 0.9,
      kind: 'ammo',
      ammo: { missiles: 142, rockets: 6, hellfires: 3 },
    },
    { tx: pad.tx, ty: pad.ty - 3.0, kind: 'armor', armorAmount: 40 },
  ];

  const alienSpawnPoints = [
    { tx: 20.5, ty: 18.0 },
    { tx: 43.5, ty: 18.0 },
    { tx: 18.0, ty: 44.2 },
    { tx: 46.0, ty: 44.2 },
    { tx: 24.0, ty: 28.0 },
    { tx: 40.0, ty: 28.0 },
    { tx: 32.0, ty: 36.2 },
    { tx: 32.0, ty: 50.8 },
  ];

  const waveSpawnPoints = [
    { tx: 18.0, ty: 44.2 },
    { tx: 46.0, ty: 44.2 },
    { tx: 32.0, ty: 50.8 },
    { tx: 32.0, ty: 36.2 },
    { tx: 20.5, ty: 18.0 },
    { tx: 43.5, ty: 18.0 },
  ];

  const patrolRoutes: PatrolRoute[] = [
    { tx: 32.0, ty: 27.6, axis: 'y', range: 6.5 },
    { tx: 24.0, ty: 28.0, axis: 'x', range: 7.5 },
    { tx: 40.0, ty: 28.0, axis: 'x', range: 7.5 },
    { tx: 32.0, ty: 18.0, axis: 'x', range: 10.0 },
    { tx: 32.0, ty: 44.2, axis: 'x', range: 12.0 },
  ];

  const sentinelPosts: SentinelPost[] = [
    { tx: 20.5, ty: 18.0, holdRadius: 1.0, leashRange: 8.8, fireRange: 9.0 },
    { tx: 43.5, ty: 18.0, holdRadius: 1.0, leashRange: 8.8, fireRange: 9.0 },
    { tx: 32.0, ty: 25.6, holdRadius: 1.2, leashRange: 9.2, fireRange: 9.4 },
    { tx: 32.0, ty: 16.0, holdRadius: 1.2, leashRange: 9.6, fireRange: 9.8 },
    { tx: 18.0, ty: 44.2, holdRadius: 1.0, leashRange: 8.4, fireRange: 8.8 },
    { tx: 46.0, ty: 44.2, holdRadius: 1.0, leashRange: 8.4, fireRange: 8.8 },
  ];

  const obeliskSites: ObeliskSite[] = [
    { tx: 24.0, ty: 24.0, fireRange: 10.0, damage: 14 },
    { tx: 40.0, ty: 24.0, fireRange: 10.0, damage: 14 },
    { tx: 32.0, ty: 13.6, fireRange: 11.2, damage: 16 },
  ];

  return {
    pad,
    safeHouse,
    campusSites,
    staticStructures,
    pickupSites,
    survivorSites: [],
    alienSpawnPoints,
    waveSpawnPoints,
    patrolRoutes,
    sentinelPosts,
    obeliskSites,
  };
}
