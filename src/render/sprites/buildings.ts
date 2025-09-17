import type { IsoParams } from '../iso/projection';

export interface BuildingDraw {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
  bodyColor: string;
  roofColor: string;
  ruinColor?: string;
  damage01: number;
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: BuildingDraw,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (params.tx - params.ty) * halfW;
  const iy = (params.tx + params.ty) * halfH;
  const x = originX + ix;
  const y = originY + iy;

  const sx = halfW * params.width * 0.5;
  const sy = halfH * params.depth * 0.5;
  const h = params.height;

  ctx.save();
  ctx.translate(x, y);

  const shade = adjustShade(params.bodyColor, -12);
  const highlight = adjustShade(params.bodyColor, 10);
  const ruinOverlay = params.ruinColor ?? '#3b2f2f';

  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.moveTo(0, sy);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(sx, sy * 0.6 + h * 0.25);
  ctx.lineTo(0, sy + h * 0.25);
  ctx.closePath();
  ctx.fill();

  // left wall
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-sx, sy);
  ctx.lineTo(-sx, sy - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  // right wall
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(sx, sy * 0.6 - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  // front wall
  ctx.fillStyle = params.bodyColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(0, sy + sy * 0.2);
  ctx.lineTo(-sx, sy);
  ctx.closePath();
  ctx.fill();

  // roof
  ctx.fillStyle = params.roofColor;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(-sx, sy - h);
  ctx.lineTo(0, sy + sy * 0.2 - h * 0.5);
  ctx.lineTo(sx, sy * 0.6 - h);
  ctx.closePath();
  ctx.fill();

  if (params.damage01 > 0.01) {
    const scorch = Math.min(1, params.damage01);
    ctx.fillStyle = hexToRgba(ruinOverlay, 0.25 + scorch * 0.45);
    ctx.beginPath();
    ctx.moveTo(-sx * 0.2, -h * 0.2);
    ctx.lineTo(-sx * 0.7, sy * 0.4 - h * 0.3);
    ctx.lineTo(-sx * 0.6, sy * 0.6);
    ctx.lineTo(-sx * 0.1, sy * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hexToRgba('#000000', 0.15 + scorch * 0.25);
    ctx.beginPath();
    ctx.moveTo(sx * 0.1, -h * 0.5);
    ctx.lineTo(sx * 0.6, sy * 0.3 - h * 0.4);
    ctx.lineTo(sx * 0.5, sy * 0.5);
    ctx.lineTo(sx * 0.15, sy * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function adjustShade(color: string, delta: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const clamp = (v: number): number => Math.max(0, Math.min(255, v));
  const r = clamp(rgb.r + delta);
  const g = clamp(rgb.g + delta);
  const b = clamp(rgb.b + delta);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
