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

export interface TeslaTowerDraw {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
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

export function drawMothershipTeslaTower(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: TeslaTowerDraw,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (params.tx - params.ty) * halfW;
  const iy = (params.tx + params.ty) * halfH;
  const x = originX + ix;
  const y = originY + iy;

  const baseRadiusX = halfW * params.width * 0.55;
  const baseRadiusY = halfH * params.depth * 0.55;
  const columnHeight = params.height * 1.08;
  const damage = Math.max(0, Math.min(1, params.damage01));
  const integrity = 1 - damage;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const anim = now / 280 + params.tx * 1.37 + params.ty * 0.79;
  const flicker = 0.6 + 0.4 * Math.sin(anim);
  const pulse = Math.sin(anim * 2.1);

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 1.6, baseRadiusX * 1.28, baseRadiusY * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  const baseColor = adjustShade('#120920', -damage * 26);
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 1.05, baseRadiusX * 1.12, baseRadiusY * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexToRgba('#68f7ff', 0.28 + integrity * 0.35);
  ctx.lineWidth = 2;
  ctx.setLineDash([halfW * 0.24, halfW * 0.22]);
  ctx.beginPath();
  ctx.ellipse(0, baseRadiusY * 0.92, baseRadiusX * 0.92, baseRadiusY * 0.58, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const columnColor = adjustShade('#1a0c31', -damage * 38);
  ctx.fillStyle = columnColor;
  ctx.beginPath();
  ctx.moveTo(-baseRadiusX * 0.42, baseRadiusY * 0.45);
  ctx.lineTo(-baseRadiusX * 0.26, -columnHeight * 0.18);
  ctx.lineTo(-baseRadiusX * 0.12, -columnHeight);
  ctx.lineTo(baseRadiusX * 0.12, -columnHeight);
  ctx.lineTo(baseRadiusX * 0.26, -columnHeight * 0.18);
  ctx.lineTo(baseRadiusX * 0.42, baseRadiusY * 0.45);
  ctx.closePath();
  ctx.fill();

  const coreGradient = ctx.createLinearGradient(0, -columnHeight * 0.96, 0, baseRadiusY * 0.5);
  coreGradient.addColorStop(0, `rgba(166, 255, 255, ${0.18 + integrity * 0.4})`);
  coreGradient.addColorStop(0.4, `rgba(104, 229, 255, ${0.4 + 0.35 * flicker})`);
  coreGradient.addColorStop(0.8, adjustShade('#24113f', -damage * 18));
  coreGradient.addColorStop(1, adjustShade('#160922', -damage * 28));
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.moveTo(-baseRadiusX * 0.26, baseRadiusY * 0.3);
  ctx.lineTo(-baseRadiusX * 0.16, -columnHeight * 0.05);
  ctx.lineTo(-baseRadiusX * 0.08, -columnHeight * 0.82);
  ctx.lineTo(baseRadiusX * 0.08, -columnHeight * 0.82);
  ctx.lineTo(baseRadiusX * 0.16, -columnHeight * 0.05);
  ctx.lineTo(baseRadiusX * 0.26, baseRadiusY * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = hexToRgba('#9dfcff', 0.16 + integrity * 0.32);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-baseRadiusX * 0.09, -columnHeight * 0.82);
  ctx.lineTo(-baseRadiusX * 0.2, baseRadiusY * 0.32);
  ctx.moveTo(baseRadiusX * 0.09, -columnHeight * 0.82);
  ctx.lineTo(baseRadiusX * 0.2, baseRadiusY * 0.32);
  ctx.stroke();

  const coilY = -columnHeight * 0.92;
  const coilRadius = baseRadiusX * 0.58;
  ctx.fillStyle = adjustShade('#1c0f30', -damage * 18);
  ctx.beginPath();
  ctx.ellipse(0, coilY + coilRadius * 0.48, coilRadius * 1.2, coilRadius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  const coilGradient = ctx.createLinearGradient(
    0,
    coilY - coilRadius * 0.8,
    0,
    coilY + coilRadius * 0.6,
  );
  coilGradient.addColorStop(0, `rgba(198, 255, 255, ${0.24 + 0.32 * integrity})`);
  coilGradient.addColorStop(0.5, `rgba(120, 236, 255, ${0.46 + 0.34 * flicker})`);
  coilGradient.addColorStop(1, adjustShade('#221239', -damage * 26));
  ctx.fillStyle = coilGradient;
  ctx.beginPath();
  ctx.ellipse(0, coilY, coilRadius, coilRadius * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  const orbGlow = 0.32 + integrity * 0.5 + flicker * 0.18;
  ctx.shadowColor = `rgba(136, 228, 255, ${0.35 + integrity * 0.45})`;
  ctx.shadowBlur = 18 * (0.6 + 0.4 * integrity);
  ctx.fillStyle = `rgba(210, 255, 255, ${Math.min(0.9, orbGlow)})`;
  ctx.beginPath();
  ctx.arc(0, coilY - coilRadius * 0.62, coilRadius * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = `rgba(198, 255, 255, ${0.32 + orbGlow * 0.35})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(
    0,
    coilY - coilRadius * 0.72,
    coilRadius * (0.78 + 0.08 * pulse),
    coilRadius * (0.32 + 0.05 * Math.cos(anim * 1.8)),
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  const boltBaseY = coilY - coilRadius * 0.62;
  const boltTargets = [
    { x: -baseRadiusX * 0.82, y: baseRadiusY * 0.18, phase: 0.2 },
    { x: baseRadiusX * 0.82, y: baseRadiusY * 0.18, phase: 1.8 },
    { x: 0, y: -columnHeight * 0.34, phase: -1.2 },
  ];

  const outerBolt = `rgba(130, 228, 255, ${0.36 + 0.32 * orbGlow})`;
  const innerBolt = `rgba(255, 255, 255, ${0.32 + 0.28 * orbGlow})`;
  ctx.lineCap = 'round';
  for (let i = 0; i < boltTargets.length; i += 1) {
    const target = boltTargets[i]!;
    const sway = Math.sin(anim * 1.6 + target.phase) * coilRadius * 0.45;
    ctx.strokeStyle = outerBolt;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, boltBaseY);
    ctx.quadraticCurveTo(sway, coilY - coilRadius * 0.18, target.x, target.y);
    ctx.stroke();

    ctx.strokeStyle = innerBolt;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, boltBaseY);
    ctx.quadraticCurveTo(sway * 0.6, coilY - coilRadius * 0.05, target.x * 0.94, target.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  if (damage > 0.04) {
    const scorch = 0.22 + damage * 0.55;
    ctx.fillStyle = hexToRgba('#07040c', scorch);
    ctx.beginPath();
    ctx.moveTo(-baseRadiusX * 0.34, baseRadiusY * 0.42);
    ctx.lineTo(-baseRadiusX * 0.18, 0);
    ctx.lineTo(-baseRadiusX * 0.05, baseRadiusY * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(baseRadiusX * 0.34, baseRadiusY * 0.42);
    ctx.lineTo(baseRadiusX * 0.18, 0);
    ctx.lineTo(baseRadiusX * 0.05, baseRadiusY * 0.52);
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
