import type { RuntimeTilemap } from '../../world/tiles/tiled';
import type { IsoParams } from '../iso/projection';
import { tileToIso } from '../iso/projection';

/**
 * Draws an isometric tilemap from a Tiled JSON runtime structure.
 * This MVP renderer uses solid-color tiles generated algorithmically
 * to comply with "no third-party assets" for now.
 */
export class IsoTilemapRenderer {
  private cacheCanvas: HTMLCanvasElement;
  private cacheContext: CanvasRenderingContext2D;
  private tileAtlases: Map<number, HTMLCanvasElement> = new Map();

  constructor() {
    this.cacheCanvas = document.createElement('canvas');
    const ctx = this.cacheCanvas.getContext('2d');
    if (!ctx) throw new Error('2D ctx');
    this.cacheContext = ctx;
  }

  /**
   * Generate a placeholder diamond tile atlas based on gid modulo a few hues.
   */
  private getPlaceholderTile(
    tileWidth: number,
    tileHeight: number,
    gid: number,
  ): HTMLCanvasElement {
    const key = gid % 7; // 7 hues
    const cached = this.tileAtlases.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = tileWidth;
    canvas.height = tileHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const hue = (key * 50) % 360;
    ctx.fillStyle = `hsl(${hue} 40% 35%)`;
    ctx.strokeStyle = `hsl(${hue} 40% 20%)`;
    ctx.lineWidth = 1;

    // diamond polygon
    ctx.beginPath();
    ctx.moveTo(tileWidth / 2, 0);
    ctx.lineTo(tileWidth, tileHeight / 2);
    ctx.lineTo(tileWidth / 2, tileHeight);
    ctx.lineTo(0, tileHeight / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    this.tileAtlases.set(key, canvas);
    return canvas;
  }

  public draw(
    context: CanvasRenderingContext2D,
    map: RuntimeTilemap,
    params: IsoParams,
    originX: number,
    originY: number,
  ): void {
    // Simple painter's draw per layer ordered in Tiled
    for (let li = 0; li < map.layers.length; li += 1) {
      const layer = map.layers[li]!;
      const data = layer.data;
      for (let ty = 0; ty < map.height; ty += 1) {
        for (let tx = 0; tx < map.width; tx += 1) {
          const gid = data[ty * map.width + tx] >>> 0;
          if (gid === 0) continue;
          const iso = tileToIso(tx, ty, params);
          const tileCanvas = this.getPlaceholderTile(params.tileWidth, params.tileHeight, gid);
          const drawX = originX + iso.x - params.tileWidth / 2;
          const drawY = originY + iso.y - params.tileHeight / 2;
          context.drawImage(tileCanvas, drawX, drawY);
        }
      }
    }
  }
}
