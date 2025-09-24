import type { IsoParams } from '../iso/projection';

export interface RubbleDrawParams {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  seed: number;
}

export function drawRubble(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: RubbleDrawParams,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (params.tx - params.ty) * halfW;
  const iy = (params.tx + params.ty) * halfH;
  const x = originX + ix;
  const y = originY + iy;
  const rng = createRng(params.seed);

  const baseWidth = halfW * Math.max(0.45, params.width * 0.55);
  const baseDepth = halfH * Math.max(0.45, params.depth * 0.6);

  ctx.save();
  ctx.translate(x, y);

  const smearTilt = (rng() - 0.5) * 0.6;
  const smearOffsetY = 6 + rng() * 4;

  ctx.save();
  ctx.rotate(smearTilt * 0.15);
  ctx.fillStyle = 'rgba(38, 29, 23, 0.8)';
  ctx.beginPath();
  ctx.ellipse(0, smearOffsetY, baseWidth, baseDepth * 0.75, smearTilt, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(62, 52, 44, 0.8)';
  ctx.beginPath();
  ctx.ellipse(0, smearOffsetY - 2, baseWidth * 0.78, baseDepth * 0.58, smearTilt * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(94, 82, 68, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, smearOffsetY - 3, baseWidth * 0.62, baseDepth * 0.45, smearTilt * 0.3, 0, Math.PI * 2);
  ctx.fill();

  const shardCount = 5;
  for (let i = 0; i < shardCount; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = rng() * 0.55 + 0.2;
    const shardX = Math.cos(angle) * baseWidth * radius * 0.55;
    const shardY = smearOffsetY - baseDepth * radius * (0.4 + rng() * 0.2);
    const shardWidth = 3.5 + rng() * 2.5;
    const shardHeight = shardWidth * (0.6 + rng() * 0.4);
    const shardTilt = (rng() - 0.5) * 0.7;

    ctx.save();
    ctx.translate(shardX, shardY);
    ctx.rotate(shardTilt);
    ctx.fillStyle = 'rgba(72, 60, 50, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-shardWidth * 0.6, shardHeight * 0.3);
    ctx.lineTo(0, -shardHeight * 0.4);
    ctx.lineTo(shardWidth * 0.7, shardHeight * 0.2);
    ctx.lineTo(0, shardHeight * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(22, 18, 15, 0.6)';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.fillStyle = 'rgba(131, 112, 92, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-shardWidth * 0.2, 0);
    ctx.lineTo(0, -shardHeight * 0.18);
    ctx.lineTo(shardWidth * 0.3, shardHeight * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const pebbleCount = 6;
  ctx.fillStyle = 'rgba(112, 96, 80, 0.55)';
  for (let i = 0; i < pebbleCount; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = rng() * 0.6;
    const pebbleX = Math.cos(angle) * baseWidth * radius * 0.6;
    const pebbleY = smearOffsetY - baseDepth * (radius * 0.45 + 0.05);
    const pebbleW = 2 + rng() * 1.8;
    const pebbleH = 1 + rng() * 1.3;
    const pebbleTilt = (rng() - 0.5) * 0.8;

    ctx.save();
    ctx.translate(pebbleX, pebbleY);
    ctx.rotate(pebbleTilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, pebbleW, pebbleH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(168, 140, 112, 0.35)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-baseWidth * 0.5, smearOffsetY + baseDepth * 0.12);
  ctx.lineTo(-baseWidth * 0.1, smearOffsetY + baseDepth * 0.25);
  ctx.moveTo(baseWidth * 0.2, smearOffsetY + baseDepth * 0.18);
  ctx.lineTo(baseWidth * 0.55, smearOffsetY + baseDepth * 0.05);
  ctx.stroke();

  ctx.restore();
}

function createRng(seed: number): () => number {
  let state = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
