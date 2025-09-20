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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c1030';
  ctx.beginPath();
  ctx.moveTo(-16, 8);
  ctx.lineTo(0, -10);
  ctx.lineTo(16, 8);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#63fce0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -2, 11, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#2a1548';
  ctx.beginPath();
  ctx.roundRect(-9, -16, 18, 16, 6);
  ctx.fill();

  ctx.fillStyle = '#9bfff1';
  ctx.beginPath();
  ctx.arc(0, -8, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c7a4ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-11, -3);
  ctx.lineTo(-20, -11);
  ctx.moveTo(11, -3);
  ctx.lineTo(20, -11);
  ctx.stroke();

  ctx.strokeStyle = '#6dfcdf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(0, -26);
  ctx.moveTo(-5, -14);
  ctx.lineTo(-7, -22);
  ctx.moveTo(5, -14);
  ctx.lineTo(7, -22);
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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111b36';
  ctx.beginPath();
  ctx.moveTo(-20, 10);
  ctx.lineTo(0, -16);
  ctx.lineTo(20, 10);
  ctx.lineTo(0, 20);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1f2e57';
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.lineTo(0, -6);
  ctx.lineTo(14, 8);
  ctx.lineTo(0, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2a1552';
  ctx.beginPath();
  ctx.roundRect(-12, -22, 24, 20, 8);
  ctx.fill();

  ctx.fillStyle = '#7ff4ff';
  ctx.beginPath();
  ctx.roundRect(-7, -18, 14, 12, 4);
  ctx.fill();

  ctx.fillStyle = '#3a1d60';
  ctx.beginPath();
  ctx.moveTo(-17, 6);
  ctx.lineTo(-25, -8);
  ctx.lineTo(-13, -14);
  ctx.closePath();
  ctx.moveTo(17, 6);
  ctx.lineTo(25, -8);
  ctx.lineTo(13, -14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#96fff6';
  ctx.beginPath();
  ctx.arc(0, -24, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#63fce0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(0, -34);
  ctx.stroke();
  ctx.restore();
}

export function drawPatrolDrone(
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
  ctx.fillStyle = '#3e4c65';
  ctx.strokeStyle = '#1d2533';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-5, -4, 10, 8, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9fb3c8';
  ctx.fillRect(-2, -8, 4, 4);
  ctx.restore();
}

export function drawChaserDrone(
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
  ctx.fillStyle = '#5a2f43';
  ctx.strokeStyle = '#2a0f1c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-5, -5, 10, 10, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
