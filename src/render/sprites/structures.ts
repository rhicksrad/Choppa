import type { IsoParams } from '../iso/projection';
import type { StructureKind } from '../../game/components/Structure';

export function drawStructure(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
  kind: StructureKind,
  integrity01: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy - 6);
  const damage = 1 - integrity01;
  const smoke = damage > 0.6;
  const tint = Math.max(0, 1 - damage * 0.5);

  const palette: Record<StructureKind, { body: string; trim: string; accent: string }> = {
    'fuel-depot': { body: `hsl(25 40% ${30 + tint * 20}%)`, trim: '#42210b', accent: '#ef476f' },
    radar: { body: `hsl(200 25% ${28 + tint * 20}%)`, trim: '#1b2b38', accent: '#ffd166' },
    bunker: { body: `hsl(120 15% ${24 + tint * 18}%)`, trim: '#0d150f', accent: '#8ecae6' },
    village: { body: `hsl(40 45% ${38 + tint * 22}%)`, trim: '#3d2b1f', accent: '#ffb703' },
    comms: { body: `hsl(260 25% ${32 + tint * 18}%)`, trim: '#221533', accent: '#cdb4f0' },
  };
  const colors = palette[kind];

  ctx.fillStyle = colors.body;
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-12, -10, 24, 20, 4);
  ctx.fill();
  ctx.stroke();

  // accents per structure kind
  ctx.fillStyle = colors.accent;
  if (kind === 'fuel-depot') {
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillRect(-2, -12, 4, 8);
  } else if (kind === 'radar') {
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, -16);
    ctx.stroke();
  } else if (kind === 'bunker') {
    ctx.fillRect(-10, -2, 20, 4);
    ctx.fillRect(-3, -12, 6, 6);
  } else if (kind === 'village') {
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(0, -12);
    ctx.lineTo(10, -4);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'comms') {
    ctx.fillRect(-3, -14, 6, 12);
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(8, -24);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (smoke) {
    ctx.save();
    ctx.translate(0, -24 - Math.sin(Date.now() / 200) * 3);
    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
