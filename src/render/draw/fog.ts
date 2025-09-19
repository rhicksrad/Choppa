import { tileToIso, screenToApproxTile, type IsoParams } from '../iso/projection';

interface FogRenderParams {
  iso: IsoParams;
  originX: number;
  originY: number;
  cameraX: number;
  cameraY: number;
  viewWidth: number;
  viewHeight: number;
}

/**
 * Fog of War overlay. Tracks discovered tiles and renders an opaque mask,
 * revealing tiles that have been explored.
 */
export class FogOfWar {
  private overlay: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private alpha: number;
  private mapWidth = 0;
  private mapHeight = 0;
  private discovered: Uint8Array = new Uint8Array(0);

  constructor(alpha = 0.88) {
    this.overlay = document.createElement('canvas');
    const ctx = this.overlay.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable for FogOfWar');
    this.ctx = ctx;
    this.alpha = alpha;
  }

  public configure(mapWidth: number, mapHeight: number): void {
    this.mapWidth = Math.max(0, Math.floor(mapWidth));
    this.mapHeight = Math.max(0, Math.floor(mapHeight));
    const size = this.mapWidth * this.mapHeight;
    this.discovered = size > 0 ? new Uint8Array(size) : new Uint8Array(0);
  }

  public reset(): void {
    if (this.discovered.length > 0) {
      this.discovered.fill(0);
    }
  }

  public resize(width: number, height: number): void {
    if (this.overlay.width !== width || this.overlay.height !== height) {
      this.overlay.width = width;
      this.overlay.height = height;
    }
  }

  public reveal(tx: number, ty: number, radiusPx: number, iso: IsoParams): void {
    if (this.discovered.length === 0 || radiusPx <= 0) return;
    const playerIso = tileToIso(tx, ty, iso);
    const radiusSq = radiusPx * radiusPx;
    const halfW = iso.tileWidth / 2;
    const halfH = iso.tileHeight / 2;
    const spanX = Math.max(1, Math.ceil(radiusPx / halfW));
    const spanY = Math.max(1, Math.ceil(radiusPx / halfH));
    const minTx = Math.max(0, Math.floor(tx - spanX));
    const maxTx = Math.min(this.mapWidth - 1, Math.ceil(tx + spanX));
    const minTy = Math.max(0, Math.floor(ty - spanY));
    const maxTy = Math.min(this.mapHeight - 1, Math.ceil(ty + spanY));

    for (let y = minTy; y <= maxTy; y += 1) {
      const rowIndex = y * this.mapWidth;
      for (let x = minTx; x <= maxTx; x += 1) {
        const isoPos = tileToIso(x, y, iso);
        const dx = isoPos.x - playerIso.x;
        const dy = isoPos.y - playerIso.y;
        if (dx * dx + dy * dy <= radiusSq) {
          this.discovered[rowIndex + x] = 1;
        }
      }
    }
  }

  public render(main: CanvasRenderingContext2D, params: FogRenderParams): void {
    const { iso, originX, originY, cameraX, cameraY, viewWidth, viewHeight } = params;
    const w = this.overlay.width;
    const h = this.overlay.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${this.alpha})`;
    ctx.fillRect(0, 0, w, h);

    if (this.discovered.length > 0) {
      const topLeft = screenToApproxTile(0, 0, viewWidth, viewHeight, cameraX, cameraY, iso);
      const topRight = screenToApproxTile(
        viewWidth,
        0,
        viewWidth,
        viewHeight,
        cameraX,
        cameraY,
        iso,
      );
      const bottomLeft = screenToApproxTile(
        0,
        viewHeight,
        viewWidth,
        viewHeight,
        cameraX,
        cameraY,
        iso,
      );
      const bottomRight = screenToApproxTile(
        viewWidth,
        viewHeight,
        viewWidth,
        viewHeight,
        cameraX,
        cameraY,
        iso,
      );

      const minTx = Math.max(
        0,
        Math.floor(Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x) - 2),
      );
      const maxTx = Math.min(
        this.mapWidth - 1,
        Math.ceil(Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x) + 2),
      );
      const minTy = Math.max(
        0,
        Math.floor(Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y) - 2),
      );
      const maxTy = Math.min(
        this.mapHeight - 1,
        Math.ceil(Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y) + 2),
      );

      ctx.globalCompositeOperation = 'destination-out';
      const halfTileW = iso.tileWidth / 2;
      const halfTileH = iso.tileHeight / 2;
      for (let ty = minTy; ty <= maxTy; ty += 1) {
        const rowIndex = ty * this.mapWidth;
        for (let tx = minTx; tx <= maxTx; tx += 1) {
          if (this.discovered[rowIndex + tx] === 0) continue;
          const isoPos = tileToIso(tx, ty, iso);
          const centerX = originX + isoPos.x;
          const centerY = originY + isoPos.y;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - halfTileH);
          ctx.lineTo(centerX + halfTileW, centerY);
          ctx.lineTo(centerX, centerY + halfTileH);
          ctx.lineTo(centerX - halfTileW, centerY);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    main.drawImage(this.overlay, 0, 0);
  }
}
