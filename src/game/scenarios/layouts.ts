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
}

export interface BoatWave {
  count: number;
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
  },
  border: number = MAP_BORDER,
): BoatLane {
  return {
    entry: { tx: seed.entry.tx + border, ty: seed.entry.ty + border },
    target: { tx: seed.target.tx + border, ty: seed.target.ty + border },
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
      ty: 47.0,
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
      ty: 45.4,
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
    { tx: 26.0, ty: 47.8 },
    { tx: 40.0, ty: 47.0 },
  ];

  const patrolRoutes: PatrolRoute[] = [
    { tx: 18.8, ty: 46.4, axis: 'x', range: 2.4 },
    { tx: 33.2, ty: 46.4, axis: 'x', range: 2.4 },
    { tx: 26.0, ty: 44.6, axis: 'y', range: 1.6 },
  ];

  const boat = {
    lanes: [
      offsetBoatLane({ entry: { tx: 12.0, ty: 18.0 }, target: { tx: 12.0, ty: 45.0 } }, 0),
      offsetBoatLane({ entry: { tx: 26.0, ty: 16.5 }, target: { tx: 26.0, ty: 45.6 } }, 0),
      offsetBoatLane({ entry: { tx: 40.0, ty: 18.0 }, target: { tx: 40.0, ty: 45.0 } }, 0),
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
