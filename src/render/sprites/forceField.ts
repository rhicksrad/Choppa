import { tileToIso, type IsoParams } from '../iso/projection';

export interface ForceFieldDraw {
  tx: number;
  ty: number;
  width: number;
  depth: number;
  height: number;
}

export function drawForceFieldDome(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  params: ForceFieldDraw,
): void {
  const { tx, ty, width, depth, height } = params;
  const centerIso = tileToIso(tx, ty, iso);
  const cx = originX + centerIso.x;
  const cy = originY + centerIso.y;

  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const corners = [
    tileToIso(tx - halfWidth, ty - halfDepth, iso),
    tileToIso(tx + halfWidth, ty - halfDepth, iso),
    tileToIso(tx + halfWidth, ty + halfDepth, iso),
    tileToIso(tx - halfWidth, ty + halfDepth, iso),
  ];
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < corners.length; i += 1) {
    const corner = corners[i]!;
    if (corner.x < minX) minX = corner.x;
    if (corner.x > maxX) maxX = corner.x;
    if (corner.y < minY) minY = corner.y;
    if (corner.y > maxY) maxY = corner.y;
  }
  const radiusX = (maxX - minX) / 2;
  const radiusY = (maxY - minY) / 2;
  const baseRadius = Math.max(radiusX, radiusY) * 1.05;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const pulse = (Math.sin(now / 360) + 1) * 0.5;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalCompositeOperation = 'lighter';
  ctx.scale(1, 0.42);
  const baseGradient = ctx.createRadialGradient(0, 0, baseRadius * 0.15, 0, 0, baseRadius);
  baseGradient.addColorStop(0, `rgba(120, 250, 255, ${0.35 + pulse * 0.25})`);
  baseGradient.addColorStop(0.7, `rgba(58, 190, 255, ${0.22 + pulse * 0.1})`);
  baseGradient.addColorStop(1, 'rgba(58, 190, 255, 0)');
  ctx.fillStyle = baseGradient;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const domeHeight = Math.max(radiusX, radiusY) * (0.9 + pulse * 0.2) + height * 0.6;
  const verticalOffset = Math.min(height * 0.35, domeHeight * 0.4);

  ctx.save();
  ctx.translate(cx, cy - verticalOffset);
  ctx.globalCompositeOperation = 'lighter';
  const shellGradient = ctx.createLinearGradient(0, -domeHeight, 0, domeHeight * 0.35);
  shellGradient.addColorStop(0, `rgba(205, 255, 255, ${0.28 + pulse * 0.12})`);
  shellGradient.addColorStop(0.55, `rgba(126, 230, 255, ${0.24 + pulse * 0.1})`);
  shellGradient.addColorStop(1, `rgba(70, 170, 255, ${0.08 + pulse * 0.06})`);
  ctx.fillStyle = shellGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX * 0.95, domeHeight, 0, Math.PI, 0, true);
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = `rgba(180, 250, 255, ${0.45 + pulse * 0.25})`;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy - domeHeight * 0.65);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + pulse * 0.15})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX * 0.55, domeHeight * 0.55, 0, -Math.PI * 0.9, -Math.PI * 0.15);
  ctx.stroke();
  ctx.restore();
}
