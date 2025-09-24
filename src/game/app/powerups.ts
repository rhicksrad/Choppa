import type { Ammo } from '../components/Ammo';
import type { Fuel } from '../components/Fuel';
import type { WeaponHolder } from '../components/Weapon';
import {
  DEFAULT_HELLFIRE_COOLDOWN,
  DEFAULT_HELLFIRE_DAMAGE,
  DEFAULT_HELLFIRE_DAMAGE_RADIUS,
  DEFAULT_HELLFIRE_LAUNCH_OFFSET,
  DEFAULT_HELLFIRE_PROJECTILE_SPEED,
  DEFAULT_MACHINE_GUN_COOLDOWN,
  DEFAULT_MACHINE_GUN_DAMAGE,
  DEFAULT_MACHINE_GUN_DAMAGE_RADIUS,
  DEFAULT_MACHINE_GUN_PROJECTILE_SPEED,
  DEFAULT_ROCKET_COOLDOWN,
  DEFAULT_ROCKET_DAMAGE,
  DEFAULT_ROCKET_DAMAGE_RADIUS,
  DEFAULT_ROCKET_PROJECTILE_SPEED,
} from '../systems/WeaponFire';

export interface PowerupContext {
  ammo: Ammo;
  fuel: Fuel;
  weapon: WeaponHolder;
}

export interface PowerupOption {
  id: string;
  title: string;
  description: string;
  apply: (context: PowerupContext) => void;
}

export interface PowerupRound {
  roundLabel: string;
  options: PowerupOption[];
}

export const PLAYER_BASE_STATS = {
  fuelMax: 100,
  missilesMax: 200,
  rocketsMax: 12,
  hellfiresMax: 2,
  machineGunFireDelay: DEFAULT_MACHINE_GUN_COOLDOWN,
  rocketFireDelay: DEFAULT_ROCKET_COOLDOWN,
  hellfireFireDelay: DEFAULT_HELLFIRE_COOLDOWN,
  machineGunDamage: DEFAULT_MACHINE_GUN_DAMAGE,
  machineGunDamageRadius: DEFAULT_MACHINE_GUN_DAMAGE_RADIUS,
  machineGunProjectileSpeed: DEFAULT_MACHINE_GUN_PROJECTILE_SPEED,
  rocketDamage: DEFAULT_ROCKET_DAMAGE,
  rocketDamageRadius: DEFAULT_ROCKET_DAMAGE_RADIUS,
  rocketProjectileSpeed: DEFAULT_ROCKET_PROJECTILE_SPEED,
  hellfireDamage: DEFAULT_HELLFIRE_DAMAGE,
  hellfireDamageRadius: DEFAULT_HELLFIRE_DAMAGE_RADIUS,
  hellfireProjectileSpeed: DEFAULT_HELLFIRE_PROJECTILE_SPEED,
  hellfireLaunchOffset: DEFAULT_HELLFIRE_LAUNCH_OFFSET,
} as const;

const applyExtraHellfire = ({ ammo }: PowerupContext): void => {
  ammo.hellfiresMax += 1;
  ammo.hellfires = ammo.hellfiresMax;
};

const applyFuelReserve = ({ fuel }: PowerupContext): void => {
  fuel.max += 25;
  fuel.current = fuel.max;
};

const applyRapidCannon = ({ weapon }: PowerupContext): void => {
  weapon.machineGunFireDelay = DEFAULT_MACHINE_GUN_COOLDOWN / 2;
};

const applyDoubleMissileAmmo = ({ ammo }: PowerupContext): void => {
  ammo.missilesMax = Math.max(1, Math.round(ammo.missilesMax * 2));
  ammo.missiles = ammo.missilesMax;
};

const applyRocketReserves = ({ ammo }: PowerupContext): void => {
  ammo.rocketsMax += 6;
  ammo.rockets = ammo.rocketsMax;
};

const applyMachineGunPower = ({ weapon }: PowerupContext): void => {
  weapon.machineGunDamage = Math.round(DEFAULT_MACHINE_GUN_DAMAGE * 1.5);
  weapon.machineGunDamageRadius = DEFAULT_MACHINE_GUN_DAMAGE_RADIUS * 1.15;
};

const applyRocketPower = ({ weapon }: PowerupContext): void => {
  weapon.rocketDamage = Math.round(DEFAULT_ROCKET_DAMAGE * 1.4 * 10) / 10;
  weapon.rocketDamageRadius = DEFAULT_ROCKET_DAMAGE_RADIUS * 1.2;
};

const applyHellfirePower = ({ weapon }: PowerupContext): void => {
  weapon.hellfireDamage = Math.round(DEFAULT_HELLFIRE_DAMAGE * 1.35);
  weapon.hellfireDamageRadius = DEFAULT_HELLFIRE_DAMAGE_RADIUS * 1.2;
};

const roundOneOptions: PowerupOption[] = [
  {
    id: 'round1-hellfire',
    title: '+1 Hellfire',
    description: 'Add an extra hellfire and reload the launcher.',
    apply: applyExtraHellfire,
  },
  {
    id: 'round1-fuel',
    title: 'Aux Fuel Tank',
    description: 'Install an auxiliary fuel tank for +25 max fuel.',
    apply: applyFuelReserve,
  },
  {
    id: 'round1-gun-speed',
    title: 'Rapid Cannon',
    description: 'Double machine gun rate of fire with enhanced cooling.',
    apply: applyRapidCannon,
  },
];

const roundTwoOptions: PowerupOption[] = [
  {
    id: 'round2-hellfire',
    title: '+1 Hellfire',
    description: 'Carry an additional hellfire and reload.',
    apply: applyExtraHellfire,
  },
  {
    id: 'round2-ammo',
    title: 'Ammo Cache',
    description: 'Double machine gun ammo reserves.',
    apply: applyDoubleMissileAmmo,
  },
  {
    id: 'round2-rockets',
    title: '+6 Missiles',
    description: 'Load six additional guided missiles.',
    apply: applyRocketReserves,
  },
];

const roundThreeOptions: PowerupOption[] = [
  {
    id: 'round3-gun-power',
    title: 'AP Cannon Rounds',
    description: 'Boost machine gun impact damage.',
    apply: applyMachineGunPower,
  },
  {
    id: 'round3-rocket-power',
    title: 'High-Impact Missiles',
    description: 'Increase missile warhead yield.',
    apply: applyRocketPower,
  },
  {
    id: 'round3-hellfire-power',
    title: 'Thermobaric Hellfires',
    description: 'Amplify hellfire blast damage.',
    apply: applyHellfirePower,
  },
];

const powerupRounds: Record<string, PowerupRound> = {
  m02: { roundLabel: 'Round 1', options: roundOneOptions },
  m03: { roundLabel: 'Round 2', options: roundTwoOptions },
  m04: { roundLabel: 'Round 3', options: roundThreeOptions },
};

export function getPowerupRoundForMission(missionId: string): PowerupRound | null {
  return powerupRounds[missionId] ?? null;
}
