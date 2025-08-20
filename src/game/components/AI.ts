export interface AAA {
  range: number; // tiles
  cooldown: number; // time until next shot
  fireInterval: number; // seconds between shots
  projectileSpeed: number; // tiles/sec
  spread: number; // radians
}

export interface SAM {
  range: number; // tiles
  lockTime: number; // seconds to acquire
  cooldown: number; // time until next missile
  fireInterval: number; // seconds
  turnRate: number; // missile turn rate
  missileSpeed: number; // tiles/sec initial
  lockProgress: number; // internal state 0..lockTime
}
