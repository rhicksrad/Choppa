import type { Entity } from '../../core/ecs/entities';

export type PickupKind = 'fuel' | 'ammo' | 'survivor';

export interface Pickup {
  kind: PickupKind;
  radius: number;
  duration: number;
  fuelAmount?: number;
  ammo?: {
    missiles?: number;
    rockets?: number;
    hellfires?: number;
  };
  survivorCount?: number;
  collectingBy: Entity | null;
  progress: number;
}
