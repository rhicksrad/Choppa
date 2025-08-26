export type Team = 'player' | 'enemy';

export interface Collider {
  /** Radius in tiles for simple circular collision */
  radius: number;
  /** Team for friendly-fire filtering */
  team?: Team;
}
