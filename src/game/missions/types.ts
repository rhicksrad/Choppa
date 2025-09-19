export type ObjectiveType = 'reach' | 'destroy' | 'custom';

export interface ObjectiveDef {
  id: string;
  type: ObjectiveType;
  name: string;
  at: { tx: number; ty: number };
  radiusTiles: number;
}

export interface MissionDef {
  id: string;
  title: string;
  briefing: string;
  startPos: { tx: number; ty: number };
  objectives: ObjectiveDef[];
  enemySpawns?: Array<{ type: 'AAA' | 'SAM'; at: { tx: number; ty: number } }>;
}

export interface ObjectiveState extends ObjectiveDef {
  complete: boolean;
}

export interface MissionState {
  def: MissionDef;
  objectives: ObjectiveState[];
  complete: boolean;
}
