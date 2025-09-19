import { tileToIso } from '../iso/projection';
import type { IsoParams } from '../iso/projection';

type Point = { x: number; y: number };

export interface SafeHouseParams {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
  bodyColor: string;
  roofColor: string;
  trimColor: string;
  doorColor: string;
  windowColor: string;
  walkwayColor: string;
}

export function drawSafeHouse(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: SafeHouseParams,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const isoPos = tileToIso(params.tx, params.ty, iso);
  const x = originX + isoPos.x;
  const y = originY + isoPos.y;
  const sx = halfW * params.width * 0.5;
  const sy = halfH * params.depth * 0.5;
  const h = params.height;

  ctx.save();
  ctx.translate(x, y);

  drawWalkway(ctx, params, sx, sy);
  drawHouseBody(ctx, params, sx, sy, h);
  drawDoorAndDetails(ctx, params, sx, sy);

  ctx.restore();
}

export function getSafeHouseDoorIso(iso: IsoParams, params: SafeHouseParams): Point {
  const base = tileToIso(params.tx, params.ty, iso);
  const quad = computeDoorQuad(params, iso);
  const bottomCenter: Point = {
    x: (quad.bottomLeft.x + quad.bottomRight.x) / 2,
    y: (quad.bottomLeft.y + quad.bottomRight.y) / 2,
  };
  return {
    x: base.x + bottomCenter.x,
    y: base.y + bottomCenter.y,
  };
}

function drawWalkway(
  ctx: CanvasRenderingContext2D,
  params: SafeHouseParams,
  sx: number,
  sy: number,
): void {
  ctx.save();
  ctx.fillStyle = params.walkwayColor;
  ctx.beginPath();
  ctx.moveTo(-sx * 0.25, sy * 0.62);
  ctx.lineTo(sx * 0.28, sy * 0.45);
  ctx.lineTo(sx * 0.18, sy * 0.96);
  ctx.lineTo(-sx * 0.32, sy * 1.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHouseBody(
  ctx: CanvasRenderingContext2D,
  params: SafeHouseParams,
  sx: number,
  sy: number,
  h: number,
): void {
  const left = shadeColor(params.bodyColor, -18);
  const right = shadeColor(params.bodyColor, 18);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.moveTo(0, sy + sy * 0.24);
  ctx.lineTo(sx * 0.9, sy * 0.6 + h * 0.22);
  ctx.lineTo(0, sy + sy * 0.24 + h * 0.22);
  ctx.lineTo(-sx * 0.75, sy + h * 0.18);
  ctx.closePath();
  ctx.fill();

  // Left wall
  ctx.fillStyle = left;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-sx, sy);
  ctx.lineTo(-sx, sy - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  // Right wall
  ctx.fillStyle = right;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(sx, sy * 0.6 - h);
  ctx.lineTo(0, -h);
  ctx.closePath();
  ctx.fill();

  // Front wall
  ctx.fillStyle = params.bodyColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(0, sy + sy * 0.2);
  ctx.lineTo(-sx, sy);
  ctx.closePath();
  ctx.fill();

  // Roof
  ctx.fillStyle = params.roofColor;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(-sx, sy - h);
  ctx.lineTo(0, sy + sy * 0.2 - h * 0.45);
  ctx.lineTo(sx, sy * 0.6 - h);
  ctx.closePath();
  ctx.fill();

  // Roof highlight ridge
  ctx.strokeStyle = shadeColor(params.roofColor, 30);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-sx * 0.65, sy * 0.55 - h * 0.7);
  ctx.lineTo(sx * 0.6, sy * 0.25 - h * 0.7);
  ctx.stroke();
}

function drawDoorAndDetails(
  ctx: CanvasRenderingContext2D,
  params: SafeHouseParams,
  sx: number,
  sy: number,
): void {
  const quad = computeDoorQuadFromExtents(sx, sy);

  ctx.save();

  ctx.fillStyle = params.trimColor;
  ctx.beginPath();
  ctx.moveTo(quad.topLeft.x - 1.5, quad.topLeft.y - 1.5);
  ctx.lineTo(quad.topRight.x + 1.5, quad.topRight.y - 1.5);
  ctx.lineTo(quad.bottomRight.x + 1.5, quad.bottomRight.y + 1.5);
  ctx.lineTo(quad.bottomLeft.x - 1.5, quad.bottomLeft.y + 1.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = params.doorColor;
  ctx.beginPath();
  ctx.moveTo(quad.topLeft.x, quad.topLeft.y);
  ctx.lineTo(quad.topRight.x, quad.topRight.y);
  ctx.lineTo(quad.bottomRight.x, quad.bottomRight.y);
  ctx.lineTo(quad.bottomLeft.x, quad.bottomLeft.y);
  ctx.closePath();
  ctx.fill();

  const knob = lerpPoint(quad.bottomRight, quad.topRight, 0.6);
  ctx.fillStyle = shadeColor(params.trimColor, -40);
  ctx.beginPath();
  ctx.arc(knob.x - 2, knob.y + 2, 2.2, 0, Math.PI * 2);
  ctx.fill();

  drawWindow(ctx, params, sx, sy, 'left');
  drawWindow(ctx, params, sx, sy, 'right');

  ctx.restore();
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  params: SafeHouseParams,
  sx: number,
  sy: number,
  side: 'left' | 'right',
): void {
  const leftAnchor: Point = { x: -sx, y: sy };
  const rightAnchor: Point = { x: sx, y: sy * 0.6 };
  const topAnchor: Point = { x: 0, y: 0 };
  const bottomAnchor: Point = { x: 0, y: sy + sy * 0.2 };

  const edge = side === 'left' ? leftAnchor : rightAnchor;
  const horizontal = side === 'left' ? -1 : 1;

  const topBase = lerpPoint(edge, topAnchor, 0.45);
  const bottomBase = lerpPoint(edge, bottomAnchor, 0.52);
  const top = lerpPoint(topBase, topAnchor, 0.25);
  const bottom = lerpPoint(bottomBase, bottomAnchor, 0.2);
  const span = sx * 0.22;

  const offsetX = span * 0.6 * horizontal;

  ctx.fillStyle = params.trimColor;
  ctx.beginPath();
  ctx.moveTo(top.x - offsetX, top.y);
  ctx.lineTo(top.x + offsetX, top.y - sy * 0.08 * horizontal);
  ctx.lineTo(bottom.x + offsetX, bottom.y - sy * 0.08 * horizontal);
  ctx.lineTo(bottom.x - offsetX, bottom.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = params.windowColor;
  ctx.beginPath();
  ctx.moveTo(top.x - offsetX * 0.7, top.y - 1);
  ctx.lineTo(top.x + offsetX * 0.7, top.y - sy * 0.05 * horizontal - 1);
  ctx.lineTo(bottom.x + offsetX * 0.7, bottom.y - sy * 0.05 * horizontal + 1);
  ctx.lineTo(bottom.x - offsetX * 0.7, bottom.y + 1);
  ctx.closePath();
  ctx.fill();
}

function computeDoorQuad(
  params: SafeHouseParams,
  iso: IsoParams,
): { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point } {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const sx = halfW * params.width * 0.5;
  const sy = halfH * params.depth * 0.5;
  return computeDoorQuadFromExtents(sx, sy);
}

function computeDoorQuadFromExtents(
  sx: number,
  sy: number,
): {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
} {
  const frontTop: Point = { x: 0, y: 0 };
  const frontLeft: Point = { x: -sx, y: sy };
  const frontRight: Point = { x: sx, y: sy * 0.6 };
  const frontBottom: Point = { x: 0, y: sy + sy * 0.2 };

  const doorTopLeftBase = lerpPoint(frontLeft, frontTop, 0.58);
  const doorTopRightBase = lerpPoint(frontRight, frontTop, 0.58);
  const doorBottomLeftBase = lerpPoint(frontLeft, frontBottom, 0.62);
  const doorBottomRightBase = lerpPoint(frontRight, frontBottom, 0.62);

  const doorTopLeft = lerpPoint(doorTopLeftBase, frontTop, 0.4);
  const doorTopRight = lerpPoint(doorTopRightBase, frontTop, 0.4);
  const doorBottomLeft = lerpPoint(doorBottomLeftBase, frontBottom, 0.32);
  const doorBottomRight = lerpPoint(doorBottomRightBase, frontBottom, 0.32);

  return {
    topLeft: doorTopLeft,
    topRight: doorTopRight,
    bottomRight: doorBottomRight,
    bottomLeft: doorBottomLeft,
  };
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function shadeColor(color: string, delta: number): string {
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
