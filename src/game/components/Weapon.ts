export type WeaponKind = 'missile' | 'rocket' | 'hellfire';

export interface WeaponHolder {
  active: WeaponKind;
  cooldownMissile: number;
  cooldownRocket: number;
  cooldownHellfire: number;
  machineGunFireDelay?: number;
  rocketFireDelay?: number;
  hellfireFireDelay?: number;
  machineGunDamage?: number;
  machineGunDamageRadius?: number;
  machineGunProjectileSpeed?: number;
  rocketDamage?: number;
  rocketDamageRadius?: number;
  rocketProjectileSpeed?: number;
  hellfireDamage?: number;
  hellfireDamageRadius?: number;
  hellfireProjectileSpeed?: number;
  hellfireLaunchOffset?: number;
}
