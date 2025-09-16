import type { PickupDef } from '../missions/types';

export type StructureKind = 'fuel-depot' | 'radar' | 'bunker' | 'village' | 'comms';

export interface Structure {
  kind: StructureKind;
  score: number;
  drop?: PickupDef;
}
