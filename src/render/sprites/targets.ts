import type { IsoParams } from '../iso/projection';

export function drawAAATurret(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);
  ctx.fillStyle = '#444f5a';
  ctx.strokeStyle = '#2b3640';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-6, -6, 12, 12, 2);
  ctx.fill();
  ctx.stroke();
  // barrel
  ctx.strokeStyle = '#9fb3c8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(10, -3);
  ctx.stroke();
  ctx.restore();
}

export function drawSAM(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy);
  ctx.fillStyle = '#364d3b';
  ctx.strokeStyle = '#223326';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-6, -6, 12, 12, 2);
  ctx.fill();
  ctx.stroke();
  // tube
  ctx.fillStyle = '#cfe3d3';
  ctx.fillRect(-2, -10, 4, 8);
  ctx.restore();
}
