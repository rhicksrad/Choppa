import type { IsoParams } from '../../render/iso/projection';

export interface BarsData {
  fuel01: number;
  armor01: number;
  ammo: { cannon: number; rockets: number; missiles: number };
  activeWeapon: string;
}

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  bars: BarsData,
  objectiveLines: string[],
  compassDir: { dx: number; dy: number } | null,
  minimap: {
    mapW: number;
    mapH: number;
    player: { tx: number; ty: number };
    enemies: { tx: number; ty: number }[];
  },
  _iso: IsoParams,
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.save();
  // Bars bottom-left
  const x0 = 16;
  const y0 = h - 20;
  drawBar(ctx, x0, y0 - 18, 160, 10, bars.fuel01, '#4caf50', '#16351b', 'FUEL');
  drawBar(ctx, x0, y0, 160, 10, bars.armor01, '#45a1ff', '#0e2236', 'ARMOR');
  ctx.fillStyle = '#c8d7e1';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(
    `C:${bars.ammo.cannon} R:${bars.ammo.rockets} M:${bars.ammo.missiles} [${bars.activeWeapon}]`,
    x0,
    y0 - 28,
  );

  // Objective list top-left
  ctx.textAlign = 'left';
  ctx.fillStyle = '#92ffa6';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('Objectives', 16, 24);
  ctx.fillStyle = '#c8d7e1';
  ctx.font = '12px system-ui, sans-serif';
  for (let i = 0; i < objectiveLines.length; i += 1)
    ctx.fillText(objectiveLines[i]!, 16, 40 + i * 16);

  // Minimap top-right (orthographic)
  const mmW = 140;
  const mmH = 100;
  const mmX = w - mmW - 16;
  const mmY = 16;
  ctx.fillStyle = '#11202b';
  ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
  ctx.fillStyle = '#0b1720';
  ctx.fillRect(mmX, mmY, mmW, mmH);
  // grid/terrain hint (simple)
  ctx.strokeStyle = '#142a3a';
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= minimap.mapW; gx += 4) {
    const x = mmX + (gx / minimap.mapW) * mmW;
    ctx.beginPath();
    ctx.moveTo(x, mmY);
    ctx.lineTo(x, mmY + mmH);
    ctx.stroke();
  }
  for (let gy = 0; gy <= minimap.mapH; gy += 4) {
    const y = mmY + (gy / minimap.mapH) * mmH;
    ctx.beginPath();
    ctx.moveTo(mmX, y);
    ctx.lineTo(mmX + mmW, y);
    ctx.stroke();
  }
  // enemies
  ctx.fillStyle = '#ef476f';
  for (let i = 0; i < minimap.enemies.length; i += 1) {
    const e = minimap.enemies[i]!;
    const px = mmX + (e.tx / minimap.mapW) * mmW;
    const py = mmY + (e.ty / minimap.mapH) * mmH;
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }
  // player
  ctx.fillStyle = '#92ffa6';
  const ppx = mmX + (minimap.player.tx / minimap.mapW) * mmW;
  const ppy = mmY + (minimap.player.ty / minimap.mapH) * mmH;
  ctx.fillRect(ppx - 2, ppy - 2, 4, 4);

  // Compass top-center
  if (compassDir) {
    ctx.save();
    ctx.translate(w / 2, 28);
    const ang = Math.atan2(compassDir.dy, compassDir.dx);
    ctx.rotate(ang);
    ctx.fillStyle = '#c8d7e1';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  v01: number,
  color: string,
  bg: string,
  label: string,
): void {
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, v01)) * w, h);
  ctx.fillStyle = '#c8d7e1';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText(label, x, y - 2);
  ctx.restore();
}
