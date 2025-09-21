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
  const crateSx = halfTileW * 0.35;
  const crateSy = halfTileH * 0.35;

  const extendPhase = params.collecting ? Math.min(1, params.progress / 0.45) : 0;
  const haulPhase = params.collecting ? Math.max(0, (params.progress - 0.45) / 0.55) : 0;
  const lift = haulPhase * 26;

  const isFuel = params.kind === 'fuel';
  const shadowRadiusX = isFuel ? halfTileW * 0.32 : crateSx * 0.9;
  const shadowRadiusY = isFuel ? halfTileH * 0.3 : crateSy * 0.9;

  // Drop shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + 8, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(baseX, baseY - lift);

  const attachYOffset = isFuel
    ? drawFuelBarrel(ctx, palette, halfTileW, halfTileH)
    : drawSupplyCrate(ctx, palette, params, crateSx, crateSy);

  ctx.restore();

  const attachX = baseX;
  const attachY = baseY - lift + attachYOffset;

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

function drawSupplyCrate(
  ctx: CanvasRenderingContext2D,
  palette: { body: string; top: string; straps: string; icon: string },
  params: PickupDrawParams,
  sx: number,
  sy: number,
): number {
  const height = 22;

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
  if (params.kind === 'survivor') {
    ctx.beginPath();
    ctx.arc(0, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-2, 0, 4, 6);
    ctx.beginPath();
    ctx.roundRect(-5, 2, 10, 3.5, 1.5);
    ctx.fill();
  } else if (params.kind === 'armor') {
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(6, -2);
    ctx.quadraticCurveTo(0, 8, 0, 8);
    ctx.quadraticCurveTo(0, 8, -6, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shadeColor(palette.icon, -35);
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(3.6, -1.2);
    ctx.quadraticCurveTo(0, 5.5, 0, 5.5);
    ctx.quadraticCurveTo(0, 5.5, -3.6, -1.2);
    ctx.closePath();
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

  return -height + sy * 0.2;
}

function drawFuelBarrel(
  ctx: CanvasRenderingContext2D,
  palette: { body: string; top: string; straps: string; icon: string },
  halfTileW: number,
  halfTileH: number,
): number {
  const radiusX = halfTileW * 0.3;
  const radiusY = halfTileH * 0.28;
  const bodyHeight = 28;
  const topY = -bodyHeight;

  const gradient = ctx.createLinearGradient(-radiusX, 0, radiusX, 0);
  gradient.addColorStop(0, shadeColor(palette.body, -35));
  gradient.addColorStop(0.5, palette.body);
  gradient.addColorStop(1, shadeColor(palette.body, 20));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-radiusX, topY);
  ctx.lineTo(-radiusX, 0);
  ctx.bezierCurveTo(-radiusX, radiusY, radiusX, radiusY, radiusX, 0);
  ctx.lineTo(radiusX, topY);
  ctx.bezierCurveTo(radiusX, topY - radiusY, -radiusX, topY - radiusY, -radiusX, topY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shadeColor(palette.body, -45);
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI);
  ctx.fill();

  const highlightTop = topY + bodyHeight * 0.2;
  const highlightBottom = -bodyHeight * 0.05;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-radiusX * 0.45, highlightTop);
  ctx.lineTo(-radiusX * 0.2, highlightTop - 2);
  ctx.lineTo(-radiusX * 0.2, highlightBottom);
  ctx.lineTo(-radiusX * 0.45, highlightBottom + 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const strapY1 = topY + bodyHeight * 0.35;
  const strapY2 = topY + bodyHeight * 0.7;
  ctx.strokeStyle = palette.straps;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, strapY1, radiusX * 0.95, radiusY * 0.6, 0, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, strapY2, radiusX * 0.95, radiusY * 0.6, 0, 0, Math.PI);
  ctx.stroke();

  const labelHeight = bodyHeight * 0.32;
  const labelWidth = radiusX * 1.6;
  const labelY = topY + bodyHeight * 0.55;

  ctx.fillStyle = shadeColor(palette.body, -30);
  ctx.beginPath();
  ctx.roundRect(
    -labelWidth / 2,
    labelY - labelHeight / 2,
    labelWidth,
    labelHeight,
    labelHeight * 0.3,
  );
  ctx.fill();
  ctx.strokeStyle = shadeColor(palette.body, -45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(
    -labelWidth / 2,
    labelY - labelHeight / 2,
    labelWidth,
    labelHeight,
    labelHeight * 0.3,
  );
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = palette.icon;
  ctx.font = '700 10px "Press Start 2P", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(0, labelY);
  ctx.scale(1, 0.9);
  ctx.fillText('OIL', 0, 0);
  ctx.restore();

  ctx.fillStyle = palette.top;
  ctx.beginPath();
  ctx.ellipse(0, topY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = shadeColor(palette.top, -25);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, topY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = shadeColor(palette.top, 35);
  ctx.beginPath();
  ctx.ellipse(0, topY - radiusY * 0.15, radiusX * 0.55, radiusY * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  return topY - radiusY;
}

function getPalette(kind: PickupKind): {
  body: string;
  top: string;
  straps: string;
  icon: string;
} {
  if (kind === 'fuel') {
    return {
      body: '#bb2b2b',
      top: '#e04c4c',
      straps: '#781212',
      icon: '#fff3c4',
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
  if (kind === 'armor') {
    return {
      body: '#1d4b59',
      top: '#266c7b',
      straps: '#0f2e36',
      icon: '#9df2ff',
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
