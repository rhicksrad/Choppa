import type { IsoParams } from '../iso/projection';
import type { PickupKind } from '../../game/components/Pickup';

export function drawPickup(
  ctx: CanvasRenderingContext2D,
  iso: IsoParams,
  originX: number,
  originY: number,
  tx: number,
  ty: number,
  kind: PickupKind,
  pulse: number,
): void {
  const halfW = iso.tileWidth / 2;
  const halfH = iso.tileHeight / 2;
  const ix = (tx - ty) * halfW;
  const iy = (tx + ty) * halfH;
  ctx.save();
  ctx.translate(originX + ix, originY + iy - 8);
  const scale = 1 + Math.sin(Date.now() / 240 + pulse) * 0.1;
  ctx.scale(scale, scale);

  const palette: Record<PickupKind, string> = {
    ammo: '#ffd166',
    fuel: '#06d6a0',
    repair: '#8ecae6',
    upgrade: '#ff6f91',
    intel: '#f4f1de',
  };
  ctx.fillStyle = palette[kind];
  ctx.strokeStyle = 'rgba(10, 16, 24, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-6, -6, 12, 12, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0a1018';
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labels: Record<PickupKind, string> = {
    ammo: 'A',
    fuel: 'F',
    repair: 'R',
    upgrade: 'U',
    intel: 'I',
  };
  ctx.fillText(labels[kind], 0, 0);
  ctx.restore();
}
