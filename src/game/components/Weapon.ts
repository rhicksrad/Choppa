export type WeaponKind = 'missile' | 'rocket' | 'hellfire';

export interface WeaponHolder {
  active: WeaponKind;
  cooldownMissile: number;
  cooldownRocket: number;
  cooldownHellfire: number;
}
