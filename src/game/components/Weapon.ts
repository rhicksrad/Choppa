export type WeaponKind = 'cannon' | 'rocket' | 'missile';

export interface WeaponHolder {
  active: WeaponKind;
  cooldownCannon: number;
  cooldownRocket: number;
  cooldownMissile: number;
}
