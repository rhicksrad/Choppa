export interface Physics {
  /** velocity in tiles/sec */
  vx: number;
  vy: number;
  /** acceleration input (desired) in tiles/sec^2 */
  ax: number;
  ay: number;
  /** drag coefficient (0..1 per second) */
  drag: number;
  /** max speed in tiles/sec */
  maxSpeed: number;
  /** turn rate radians/sec */
  turnRate: number;
}
