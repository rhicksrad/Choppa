export interface SpeedboatWeaponConfig {
  kind: 'missile' | 'laser';
  speed?: number;
  ttl?: number;
  radius?: number;
  damage?: number;
  damageRadius?: number;
  launchOffset?: number;
  spread?: number;
}

export interface Speedboat {
  targetX: number;
  targetY: number;
  speed: number;
  acceleration: number;
  fireRange: number;
  fireInterval: number;
  cooldown: number;
  arrivalRadius: number;
  activationRange: number;
  activated: boolean;
  squadId?: string;
  weapon?: SpeedboatWeaponConfig;
}
