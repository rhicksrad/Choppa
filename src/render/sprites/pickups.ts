import type { IsoParams } from '../iso/projection';
import { tileToIso } from '../iso/projection';
import type { PickupKind } from '../../game/components/Pickup';

interface PickupDrawParams {
  tx: number;
  ty: number;
  kind: PickupKind;
  collecting: boolean;
  progress: number;
  collectorIso?: { x: number; y: number } | null;
}

export function drawPickupCrate(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: PickupDrawParams,
): { attachX: number; attachY: number } {
  const isoPos = tileToIso(params.tx, params.ty, iso);
  const baseX = originX + isoPos.x;
  const baseY = originY + isoPos.y;

  const palette = getPalette(params.kind);
  const halfTileW = iso.tileWidth / 2;
  const halfTileH = iso.tileHeight / 2;
  const sx = halfTileW * 0.35;
  const sy = halfTileH * 0.35;
  const height = 22;

  const extendPhase = params.collecting ? Math.min(1, params.progress / 0.45) : 0;
  const haulPhase = params.collecting ? Math.max(0, (params.progress - 0.45) / 0.55) : 0;
  const lift = haulPhase * 26;

  // Drop shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + 8, sx * 0.9, sy * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(baseX, baseY - lift);

  // Left wall
  ctx.fillStyle = shadeColor(palette.body, -22);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-sx, sy);
  ctx.lineTo(-sx, sy - height);
  ctx.lineTo(0, -height);
  ctx.closePath();
  ctx.fill();

  // Right wall
  ctx.fillStyle = shadeColor(palette.body, 12);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(sx, sy * 0.6 - height);
  ctx.lineTo(0, -height);
  ctx.closePath();
  ctx.fill();

  // Front wall
  ctx.fillStyle = palette.body;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sx, sy * 0.6);
  ctx.lineTo(0, sy + sy * 0.2);
  ctx.lineTo(-sx, sy);
  ctx.closePath();
  ctx.fill();

  // Roof
  const roofPoints = [
    { x: 0, y: -height },
    { x: -sx, y: sy - height },
    { x: 0, y: sy + sy * 0.2 - height * 0.5 },
    { x: sx, y: sy * 0.6 - height },
  ];
  ctx.fillStyle = palette.top;
  ctx.beginPath();
  ctx.moveTo(roofPoints[0]!.x, roofPoints[0]!.y);
  for (let i = 1; i < roofPoints.length; i += 1) ctx.lineTo(roofPoints[i]!.x, roofPoints[i]!.y);
  ctx.closePath();
  ctx.fill();

  // Straps across the roof
  ctx.strokeStyle = palette.straps;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const aMid = midpoint(roofPoints[0]!, roofPoints[1]!);
  const cMid = midpoint(roofPoints[2]!, roofPoints[3]!);
  ctx.moveTo(aMid.x, aMid.y);
  ctx.lineTo(cMid.x, cMid.y);
  ctx.stroke();
  ctx.beginPath();
  const bMid = midpoint(roofPoints[1]!, roofPoints[2]!);
  const dMid = midpoint(roofPoints[3]!, roofPoints[0]!);
  ctx.moveTo(bMid.x, bMid.y);
  ctx.lineTo(dMid.x, dMid.y);
  ctx.stroke();

  // Icon to differentiate
  ctx.fillStyle = palette.icon;
  ctx.save();
  ctx.translate(0, (roofPoints[0]!.y + roofPoints[2]!.y) / 2 + 2);
  if (params.kind === 'fuel') {
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(6, -6, 6, -1);
    ctx.quadraticCurveTo(6, 5, 0, 8);
    ctx.quadraticCurveTo(-6, 5, -6, -1);
    ctx.quadraticCurveTo(-6, -6, 0, -4);
    ctx.closePath();
    ctx.fill();
  } else if (params.kind === 'survivor') {
    ctx.beginPath();
    ctx.arc(0, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-2, 0, 4, 6);
    ctx.beginPath();
    ctx.roundRect(-5, 2, 10, 3.5, 1.5);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.roundRect(-7, -3, 14, 6, 2);
    ctx.fill();
    ctx.fillStyle = shadeColor(palette.icon, -40);
    ctx.beginPath();
    ctx.roundRect(-3, -3, 6, 6, 1.5);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();

  const attachX = baseX;
  const attachY = baseY - lift - height + sy * 0.2;

  if (params.collecting && params.collectorIso) {
    const collectorX = originX + params.collectorIso.x;
    const collectorY = originY + params.collectorIso.y - 12;
    const ropeTipX = collectorX + (attachX - collectorX) * extendPhase;
    const ropeTipY = collectorY + (attachY - collectorY) * extendPhase;
    const endX = haulPhase > 0 ? attachX : ropeTipX;
    const endY = haulPhase > 0 ? attachY : ropeTipY;

    ctx.save();
    ctx.strokeStyle = '#dfe5eb';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(collectorX, collectorY - 6);
    ctx.lineTo(collectorX, collectorY + 2);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = '#bcc4cc';
    ctx.fillRect(collectorX - 3, collectorY - 10, 6, 6);

    ctx.fillStyle = '#cfd5dc';
    ctx.beginPath();
    ctx.arc(endX, endY + 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return { attachX, attachY };
}

function getPalette(kind: PickupKind): {
  body: string;
  top: string;
  straps: string;
  icon: string;
} {
  if (kind === 'fuel') {
    return {
      body: '#2f6f3a',
      top: '#3d8f4a',
      straps: '#203526',
      icon: '#9df2b0',
    };
  }
  if (kind === 'survivor') {
    return {
      body: '#2f3d6f',
      top: '#4054a1',
      straps: '#1c2446',
      icon: '#f4f6ff',
    };
  }
  return {
    body: '#7c552e',
    top: '#b67637',
    straps: '#2f1d0e',
    icon: '#ffe29a',
  };
}

function shadeColor(color: string, delta: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const clamp = (v: number): number => Math.max(0, Math.min(255, v));
  return `rgb(${clamp(rgb.r + delta)}, ${clamp(rgb.g + delta)}, ${clamp(rgb.b + delta)})`;
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

function midpoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
