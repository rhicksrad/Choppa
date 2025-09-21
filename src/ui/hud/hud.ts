import type { IsoParams } from '../../render/iso/projection';
import { getCanvasViewMetrics } from '../../render/canvas/metrics';
import type { WeaponKind } from '../../game/components/Weapon';

export interface BarsData {
  fuel01: number;
  fuelCurrent: number;
  fuelMax: number;
  armor01: number;
  ammo: { missiles: number; rockets: number; hellfires: number };
  ammoMax: { missiles: number; rockets: number; hellfires: number };
  activeWeapon: WeaponKind;
  lives: number;
  score: number;
  wave: number;
  enemiesRemaining: number;
  nextWaveIn: number | null;
}

const ammoDisplayOrder: {
  key: keyof BarsData['ammo'];
  label: string;
  color: string;
  bg: string;
  weapon: WeaponKind;
}[] = [
  { key: 'missiles', label: 'MISSILES', color: '#ffd166', bg: '#2b1f08', weapon: 'missile' },
  { key: 'rockets', label: 'ROCKETS', color: '#ff8a5c', bg: '#2b1208', weapon: 'rocket' },
  { key: 'hellfires', label: 'HELLFIRES', color: '#f94144', bg: '#2a090b', weapon: 'hellfire' },
];

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
  const { width: w, height: h } = getCanvasViewMetrics(ctx);
  ctx.save();

  // Minimap top-right (orthographic)
  const mmW = 140;
  const mmH = 100;
  const mmX = w - mmW - 16;
  const mmY = 16;

  // Resource & ammo bars to the left of the minimap
  const barW = 220;
  const barH = 16;
  const barGap = barH + 12;
  const barX = Math.max(16, mmX - barW - 24);
  let barY = mmY;

  ctx.textAlign = 'left';
  drawBar(ctx, barX, barY, barW, barH, bars.fuel01, '#2bd673', '#0a1e13', 'FUEL');
  barY += barGap;
  drawBar(ctx, barX, barY, barW, barH, bars.armor01, '#2ba6ff', '#0a1521', 'ARMOR');
  barY += barGap;

  for (const ammoInfo of ammoDisplayOrder) {
    const current = bars.ammo[ammoInfo.key];
    const max = bars.ammoMax[ammoInfo.key];
    const ammo01 = max > 0 ? current / max : 0;
    const label =
      ammoInfo.weapon === bars.activeWeapon ? `${ammoInfo.label} [ACTIVE]` : ammoInfo.label;
    drawBar(ctx, barX, barY, barW, barH, ammo01, ammoInfo.color, ammoInfo.bg, label);
    barY += barGap;
  }

  ctx.fillStyle = '#c8d7e1';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`Lives: ${bars.lives}`, 16, h - 32);

  // Objective list top-left
  ctx.textAlign = 'left';
  ctx.fillStyle = '#92ffa6';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('Objectives', 16, 24);
  ctx.fillStyle = '#e6eef5';
  ctx.font = '14px system-ui, sans-serif';
  for (let i = 0; i < objectiveLines.length; i += 1)
    ctx.fillText(objectiveLines[i]!, 16, 44 + i * 18);

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

  // Score & wave stats near minimap
  ctx.textAlign = 'right';
  ctx.fillStyle = '#c8d7e1';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`Score: ${Math.floor(bars.score)}`, mmX + mmW, mmY + mmH + 20);
  ctx.fillText(
    `Wave: ${bars.wave}  Remaining: ${bars.enemiesRemaining}`,
    mmX + mmW,
    mmY + mmH + 40,
  );
  if (bars.nextWaveIn !== null) {
    ctx.fillText(`Next wave in: ${bars.nextWaveIn.toFixed(1)}s`, mmX + mmW, mmY + mmH + 60);
  }

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
