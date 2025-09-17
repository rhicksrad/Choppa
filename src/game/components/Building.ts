export interface Building {
  width: number; // in tiles
  depth: number; // in tiles
  height: number; // in pixels for iso extrusion
  bodyColor: string;
  roofColor: string;
  ruinColor?: string;
}
