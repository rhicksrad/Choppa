export type PickupKind = 'ammo' | 'fuel' | 'repair' | 'upgrade' | 'intel';

export interface Pickup {
  id: string;
  kind: PickupKind;
  amount?: number;
  upgrade?: 'cannon' | 'rocket' | 'armor' | 'missile';
  objectiveFlag?: string;
}
