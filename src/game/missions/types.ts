export type ObjectiveType = 'reach' | 'destroy' | 'collect';

export interface ObjectiveDef {
  id: string;
  type: ObjectiveType;
  name: string;
  at: { tx: number; ty: number };
  radiusTiles: number;
  collectId?: string;
}

export interface PickupDef {
  id: string;
  kind: 'ammo' | 'fuel' | 'repair' | 'upgrade' | 'intel';
  at: { tx: number; ty: number };
  amount?: number;
  upgrade?: 'cannon' | 'rocket' | 'armor' | 'missile';
  objectiveFlag?: string;
}

export interface StructureDef {
  id: string;
  kind: 'fuel-depot' | 'radar' | 'bunker' | 'village' | 'comms';
  at: { tx: number; ty: number };
  health: number;
  score: number;
  drop?: PickupDef;
}

export interface WaveSpawnPoint {
  tx: number;
  ty: number;
  axis?: 'x' | 'y';
}

export interface PatrolSpawnDef {
  at: { tx: number; ty: number };
  axis: 'x' | 'y';
  range?: number;
  speed?: number;
}

export interface ChaserSpawnDef {
  at: { tx: number; ty: number };
}

export interface MissionDef {
  id: string;
  title: string;
  briefing: string;
  startPos: { tx: number; ty: number };
  objectives: ObjectiveDef[];
  enemySpawns?: Array<{ type: 'AAA' | 'SAM'; at: { tx: number; ty: number } }>;
  waveSpawnPoints: WaveSpawnPoint[];
  structures?: StructureDef[];
  pickups?: PickupDef[];
  initialPatrols?: PatrolSpawnDef[];
  initialChasers?: ChaserSpawnDef[];
}

export interface ObjectiveState extends ObjectiveDef {
  complete: boolean;
}

export interface MissionState {
  def: MissionDef;
  objectives: ObjectiveState[];
  complete: boolean;
  collected: Record<string, boolean>;
}
