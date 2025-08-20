export interface IsoParams {
  tileWidth: number;
  tileHeight: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Convert tile coordinates (tx, ty) to isometric screen-space coordinates
 * (top-left origin) using the classic 2:1 diamond projection.
 */
export function tileToIso(tx: number, ty: number, p: IsoParams): Vec2 {
  const halfW = p.tileWidth / 2;
  const halfH = p.tileHeight / 2;
  return {
    x: (tx - ty) * halfW,
    y: (tx + ty) * halfH,
  };
}

/**
 * Convert isometric screen coordinates back to tile coordinates.
 * Useful for picking.
 */
export function isoToTile(ix: number, iy: number, p: IsoParams): Vec2 {
  const halfW = p.tileWidth / 2;
  const halfH = p.tileHeight / 2;
  const tx = (iy / halfH + ix / halfW) / 2;
  const ty = (iy / halfH - ix / halfW) / 2;
  return { x: tx, y: ty };
}

/** Approximate conversion from screen pixels to tile coordinates using camera center as origin. */
export function screenToApproxTile(
  screenX: number,
  screenY: number,
  viewWidth: number,
  viewHeight: number,
  cameraX: number,
  cameraY: number,
  p: IsoParams,
): Vec2 {
  // Convert screen pixel to iso-pixel relative to map origin at camera center
  const isoX = screenX - viewWidth / 2 + cameraX;
  const isoY = screenY - viewHeight / 2 + cameraY;
  return isoToTile(isoX, isoY, p);
}

/**
 * Compute the isometric map bounding box in iso-space.
 * Returns { minX, minY, maxX, maxY }.
 */
export function isoMapBounds(
  widthTiles: number,
  heightTiles: number,
  p: IsoParams,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const halfW = p.tileWidth / 2;
  const halfH = p.tileHeight / 2;
  const minX = -(heightTiles - 1) * halfW;
  const maxX = (widthTiles - 1) * halfW;
  const minY = 0;
  const maxY = (widthTiles - 1 + (heightTiles - 1)) * halfH;
  return { minX, minY, maxX, maxY };
}
