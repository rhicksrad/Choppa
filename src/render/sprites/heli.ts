import type { IsoParams } from '../iso/projection';

export interface HeliDrawParams {
  tx: number;
  ty: number;
  rot: number;
  rotorPhase: number; // 0..1
  color: string;
  iso: IsoParams;
  originX: number;
  originY: number;
}

export function drawHeli(ctx: CanvasRenderingContext2D, p: HeliDrawParams): void {
  // Project tile position to iso pixel offset relative to map origin
  const halfW = p.iso.tileWidth / 2;
  const halfH = p.iso.tileHeight / 2;
  const ix = (p.tx - p.ty) * halfW;
  const iy = (p.tx + p.ty) * halfH;
  const x = p.originX + ix;
  const y = p.originY + iy;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.rot);

  // Shadow blob
  ctx.save();
  ctx.translate(6, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  ctx.fillStyle = p.color;
  ctx.strokeStyle = '#142a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-10, -6, 20, 12, 3);
  ctx.fill();
  ctx.stroke();

  // Nose
  ctx.fillStyle = '#d8f3ff';
  ctx.beginPath();
  ctx.arc(10, 0, 3, -0.7, 0.7);
  ctx.fill();

  // Rotor (simple line sweep)
  const bladeLen = 18;
  const blades = 2;
  ctx.strokeStyle = '#9cc9e4';
  ctx.lineWidth = 2;
  for (let i = 0; i < blades; i += 1) {
    const ang = p.rotorPhase * Math.PI * 2 + (i * Math.PI) / 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * bladeLen, Math.sin(ang) * bladeLen);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawPad(
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
  const x = originX + ix;
  const y = originY + iy;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#1f3b4d';
  ctx.strokeStyle = '#92ffa6';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, -halfH);
  ctx.lineTo(halfW, 0);
  ctx.lineTo(0, halfH);
  ctx.lineTo(-halfW, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
