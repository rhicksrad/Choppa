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
  const pad: PadConfig = { tx: 12, ty: 41, radius: 1.35 };
  const safeHouse: SafeHouseParams = {
    tx: pad.tx - 0.9,
    ty: pad.ty - 0.6,
    width: 1.6,
    depth: 1.18,
    height: 28,
    bodyColor: '#b0bcc9',
    roofColor: '#3e4c5d',
    trimColor: '#d9e4ef',
    doorColor: '#243241',
    windowColor: '#9ed4ff',
    walkwayColor: '#6f7c89',
  };

  const campusSites: BuildingSite[] = [
    {
      tx: 9.1,
      ty: 28.6,
      width: 2.3,
      depth: 1.6,
      height: 34,
      health: 150,
      colliderRadius: 1.18,
      bodyColor: '#1f2e57',
      roofColor: '#83d3ff',
      ruinColor: '#15213d',
      score: 320,
      category: 'stronghold',
      triggersAlarm: true,
    },
    {
      tx: 13.4,
      ty: 27.8,
      width: 2.1,
      depth: 1.5,
      height: 30,
      health: 140,
      colliderRadius: 1.05,
      bodyColor: '#243961',
      roofColor: '#76d1ff',
      ruinColor: '#1a2642',
      score: 310,
      category: 'stronghold',
      triggersAlarm: true,
    },
    {
      tx: 17.2,
      ty: 30.4,
      width: 2.0,
      depth: 1.6,
      height: 28,
      health: 135,
      colliderRadius: 1.02,
      bodyColor: '#1c2f4a',
      roofColor: '#8bd0ff',
      ruinColor: '#152438',
      score: 290,
      category: 'stronghold',
      triggersAlarm: true,
    },
  ];

  const staticStructures: BuildingSite[] = [
    {
      tx: 11.4,
      ty: 31.6,
      width: 1.6,
      depth: 1.2,
      height: 20,
      health: 95,
      colliderRadius: 0.9,
      bodyColor: '#36485e',
      roofColor: '#5fa1c7',
      ruinColor: '#243542',
      score: 180,
      category: 'civilian',
      triggersAlarm: false,
      drop: { kind: 'armor', amount: 35 },
    },
    {
      tx: 14.8,
      ty: 32.4,
      width: 1.5,
      depth: 1.2,
      height: 22,
      health: 100,
      colliderRadius: 0.88,
      bodyColor: '#3a4c62',
      roofColor: '#58a7d4',
      ruinColor: '#27374a',
      score: 190,
      category: 'civilian',
      triggersAlarm: false,
    },
    {
      tx: 10.2,
      ty: 26.9,
      width: 1.3,
      depth: 1.1,
      height: 18,
      health: 82,
      colliderRadius: 0.76,
      bodyColor: '#28384c',
      roofColor: '#6fb7dd',
      ruinColor: '#1c2835',
      score: 160,
      category: 'civilian',
      triggersAlarm: false,
    },
    {
      tx: 16.1,
      ty: 28.4,
      width: 1.4,
      depth: 1.1,
      height: 19,
      health: 88,
      colliderRadius: 0.8,
      bodyColor: '#2f4055',
      roofColor: '#63add3',
      ruinColor: '#1f2c3b',
      score: 175,
      category: 'civilian',
      triggersAlarm: false,
    },
  ];

  const pickupSites: PickupSite[] = [
    { tx: 11.6, ty: 40.6, kind: 'fuel', fuelAmount: 70 },
    { tx: 9.4, ty: 29.8, kind: 'ammo', ammo: { missiles: 110, rockets: 4, hellfires: 1 } },
    { tx: 13.9, ty: 28.1, kind: 'ammo', ammo: { missiles: 115, rockets: 4, hellfires: 2 } },
    { tx: 16.8, ty: 33.4, kind: 'fuel', fuelAmount: 64 },
    { tx: 12.4, ty: 34.2, kind: 'ammo', ammo: { missiles: 108, rockets: 5, hellfires: 1 } },
    { tx: 18.6, ty: 31.2, kind: 'fuel', fuelAmount: 60 },
  ];

  const alienSpawnPoints = [
    { tx: 9.0, ty: 27.6 },
    { tx: 13.4, ty: 27.4 },
    { tx: 17.2, ty: 30.0 },
    { tx: 11.8, ty: 31.2 },
  ];

  const waveSpawnPoints = [
    { tx: 5.6, ty: 27.8 },
    { tx: 6.4, ty: 32.4 },
    { tx: 7.8, ty: 30.6 },
  ];

  const guardPosts = [
    { tx: 10.4, ty: 30.9 },
    { tx: 14.2, ty: 32.1 },
    { tx: 16.4, ty: 33.0 },
  ];

  const patrolRoutes: PatrolRoute[] = [
    { tx: 11.6, ty: 31.6, axis: 'x', range: 1.4 },
    { tx: 15.0, ty: 32.6, axis: 'x', range: 1.6 },
    { tx: 13.0, ty: 29.2, axis: 'y', range: 1.3 },
  ];

  const boat = {
    lanes: [
      offsetBoatLane({ entry: { tx: 2.5, ty: 28.5 }, target: { tx: 8.8, ty: 28.8 } }, 0),
      offsetBoatLane({ entry: { tx: 1.8, ty: 32.0 }, target: { tx: 12.4, ty: 32.6 } }, 0),
      offsetBoatLane({ entry: { tx: 3.0, ty: 33.8 }, target: { tx: 16.2, ty: 34.2 } }, 0),
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
