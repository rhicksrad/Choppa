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
    const cached = this.tileAtlases.get(gid);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = tileWidth;
    canvas.height = tileHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to acquire 2D context for tile atlas');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawTile(ctx, tileWidth, tileHeight, gid);

    this.tileAtlases.set(gid, canvas);
    return canvas;
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    tileWidth: number,
    tileHeight: number,
    gid: number,
  ): void {
    const halfW = tileWidth / 2;
    const halfH = tileHeight / 2;

    const drawDiamond = (
      scaleX: number,
      scaleY: number,
      fill: string,
      stroke?: string,
      lineWidth: number = 1,
    ): void => {
      const sx = halfW * scaleX;
      const sy = halfH * scaleY;
      ctx.beginPath();
      ctx.moveTo(halfW, halfH - sy);
      ctx.lineTo(halfW + sx, halfH);
      ctx.lineTo(halfW, halfH + sy);
      ctx.lineTo(halfW - sx, halfH);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const drawRoad = (hasIntersection: boolean): void => {
      drawDiamond(0.92, 0.92, '#6f7379');
      ctx.save();
      ctx.translate(halfW, halfH);
      ctx.strokeStyle = '#aeb3bb';
      ctx.lineWidth = hasIntersection ? 2.4 : 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-halfW * 0.7, 0);
      ctx.lineTo(halfW * 0.7, 0);
      ctx.stroke();
      if (hasIntersection) {
        ctx.beginPath();
        ctx.moveTo(0, -halfH * 0.72);
        ctx.lineTo(0, halfH * 0.72);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawTree = (radius: number): void => {
      ctx.save();
      ctx.translate(halfW, halfH - halfH * 0.35);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(0, halfH * 0.55, radius * 1.4, radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a612f';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#27451f';
      ctx.beginPath();
      ctx.arc(-radius * 0.4, radius * 0.2, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4c7b38';
      ctx.beginPath();
      ctx.arc(radius * 0.5, radius * -0.1, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5c4323';
      ctx.fillRect(-1.6, radius * 0.7, 3.2, halfH * 0.5);
      ctx.restore();
    };

    const drawShrub = (): void => {
      ctx.save();
      ctx.translate(halfW, halfH - halfH * 0.1);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, halfH * 0.4, halfW * 0.5, halfH * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#345c34';
      ctx.beginPath();
      ctx.arc(-halfW * 0.25, -halfH * 0.15, halfW * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4f7c3f';
      ctx.beginPath();
      ctx.arc(halfW * 0.2, -halfH * 0.05, halfW * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    switch (gid) {
      case 1: // grass
        drawDiamond(1, 1, '#3d7240', '#2c4f2d');
        break;
      case 2: // water
        drawDiamond(1, 1, '#1f4e70', '#16354d');
        ctx.save();
        ctx.translate(0, halfH * 0.1);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i += 1) {
          ctx.beginPath();
          const y = halfH + i * 4;
          ctx.moveTo(8, y);
          ctx.quadraticCurveTo(tileWidth / 2, y + 2, tileWidth - 8, y);
          ctx.stroke();
        }
        ctx.restore();
        break;
      case 3: // dirt / trail
        drawDiamond(1, 1, '#6b5435', '#4b3a23');
        break;
      case 4: // rocky highland
        drawDiamond(1, 1, '#6d6f73', '#4b4c4f');
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(halfW - 8, halfH - 6);
        ctx.lineTo(halfW + 10, halfH + 4);
        ctx.moveTo(halfW - 12, halfH + 2);
        ctx.lineTo(halfW + 6, halfH - 10);
        ctx.stroke();
        ctx.restore();
        break;
      case 5: // concrete pad / base
        drawDiamond(1, 1, '#9aa0a8', '#6d7278', 1.5);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(halfW - 4, halfH);
        ctx.lineTo(halfW + 4, halfH);
        ctx.stroke();
        ctx.restore();
        break;
      case 6: // farmland
        drawDiamond(1, 1, '#8a6135', '#5b3f22');
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        for (let i = -halfW + 6; i < halfW; i += 6) {
          ctx.beginPath();
          ctx.moveTo(halfW + i, 2);
          ctx.lineTo(halfW + i + halfW * 0.4, tileHeight - 2);
          ctx.stroke();
        }
        ctx.restore();
        break;
      case 10: // road segment
        drawRoad(false);
        break;
      case 11: // intersection / crossroads
        drawRoad(true);
        break;
      case 20: // tree cluster
        drawTree(Math.min(halfW, halfH * 1.7) * 0.85);
        break;
      case 21: // single tree
        drawTree(Math.min(halfW, halfH * 1.7) * 0.6);
        break;
      case 30: // shrub
        drawShrub();
        break;
      case 31: // boulder
        ctx.save();
        ctx.translate(halfW, halfH - halfH * 0.2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, halfH * 0.5, halfW * 0.45, halfH * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7d7f84';
        ctx.beginPath();
        ctx.ellipse(0, 0, halfW * 0.4, halfH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9ea1a6';
        ctx.beginPath();
        ctx.ellipse(-halfW * 0.12, -halfH * 0.1, halfW * 0.18, halfH * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      default:
        drawDiamond(1, 1, `hsl(${(gid * 40) % 360} 40% 35%)`);
        break;
    }
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
