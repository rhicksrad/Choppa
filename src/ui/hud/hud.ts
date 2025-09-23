import type { IsoParams } from '../../render/iso/projection';
import { getCanvasViewMetrics } from '../../render/canvas/metrics';
import type { AchievementBannerView } from '../../game/achievements/tracker';

export interface BarsData {
  fuel01: number;
  fuelCurrent: number;
  fuelMax: number;
  armor01: number;
  ammo: { missiles: number; rockets: number; hellfires: number };
  ammoMax: { missiles: number; rockets: number; hellfires: number };
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
}[] = [
  { key: 'missiles', label: 'Machine Gun (LMB / Space)', color: '#ffd166', bg: '#2b1f08' },
  { key: 'rockets', label: 'Missiles (RMB / Shift)', color: '#ff8a5c', bg: '#2b1208' },
  { key: 'hellfires', label: 'Hellfires (MMB / Ctrl)', color: '#f94144', bg: '#2a090b' },
];

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  bars: BarsData,
  objectiveLines: string[],
  compassDir: { dx: number; dy: number } | null,
  minimap: {
    enabled: boolean;
    mapW: number;
    mapH: number;
    player: { tx: number; ty: number };
    enemies: { tx: number; ty: number }[];
  },
  _iso: IsoParams,
  achievementBanners: AchievementBannerView[] = [],
): void {
  const { width: w } = getCanvasViewMetrics(ctx);
  ctx.save();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const showMinimap = minimap.enabled;
  const mmW = 140;
  const mmH = 100;

  const margin = 16;
  const panelPadding = 16;
  const columnGap = 24;
  const sectionGap = 16;

  if (achievementBanners.length > 0) {
    const bannerWidth = Math.min(340, Math.max(240, w * 0.32));
    const textMaxWidth = bannerWidth - 32;
    const spacing = 10;
    const topPad = 12;
    const bottomPad = 12;
    const labelLineHeight = 14;
    const titleLineHeight = 20;
    const bodyLineHeight = 16;
    const labelFont = 'bold 12px system-ui, sans-serif';
    const titleFont = 'bold 16px system-ui, sans-serif';
    const bodyFont = '13px system-ui, sans-serif';

    const wrapDescription = (text: string): string[] => {
      const words = text.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let current = '';
      for (let i = 0; i < words.length; i += 1) {
        const word = words[i]!;
        const candidate = current ? `${current} ${word}` : word;
        const width = ctx.measureText(candidate).width;
        if (width <= textMaxWidth || !current) {
          current = candidate;
        } else {
          lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
      return lines.slice(0, 2);
    };

    let stackCursor = margin;

    for (let i = 0; i < achievementBanners.length; i += 1) {
      const banner = achievementBanners[i]!;
      ctx.font = bodyFont;
      const descriptionLines = wrapDescription(banner.description);
      const bannerHeight =
        topPad +
        labelLineHeight +
        6 +
        titleLineHeight +
        4 +
        descriptionLines.length * bodyLineHeight +
        bottomPad;
      const slide = Math.max(0, Math.min(1, banner.slideOffset));
      const drawY = stackCursor - slide * (bannerHeight + spacing + 6);
      const drawX = margin;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, banner.alpha));
      ctx.fillStyle = 'rgba(7, 16, 24, 0.92)';
      ctx.fillRect(drawX, drawY, bannerWidth, bannerHeight);
      ctx.strokeStyle = 'rgba(146, 255, 166, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX + 0.5, drawY + 0.5, bannerWidth - 1, bannerHeight - 1);

      let textY = drawY + topPad;
      const textX = drawX + 16;

      ctx.fillStyle = '#92ffa6';
      ctx.font = labelFont;
      ctx.fillText('Achievement Unlocked', textX, textY);
      textY += labelLineHeight + 6;

      ctx.fillStyle = '#ffffff';
      ctx.font = titleFont;
      ctx.fillText(banner.title, textX, textY);
      textY += titleLineHeight + 4;

      ctx.fillStyle = '#c8d7e1';
      ctx.font = bodyFont;
      for (let lineIndex = 0; lineIndex < descriptionLines.length; lineIndex += 1) {
        ctx.fillText(descriptionLines[lineIndex]!, textX, textY);
        textY += bodyLineHeight;
      }

      ctx.restore();

      stackCursor += bannerHeight + spacing;
    }
  }

  const barW = 220;
  const barH = 16;
  const barSpacing = 12;
  const barsSpacingTop = 12;
  const livesLineHeight = 20;

  const ammoCount = ammoDisplayOrder.length;
  const barsCount = 2 + ammoCount;
  const barsColumnHeight =
    livesLineHeight + barsSpacingTop + barsCount * barH + Math.max(0, barsCount - 1) * barSpacing;

  const statsLineHeight = 18;
  const statsSpacingTop = 12;
  const statsLines = bars.nextWaveIn !== null ? 3 : 2;
  const statsHeight = statsLines * statsLineHeight;

  const minimapSectionHeight = showMinimap
    ? mmH + statsSpacingTop + statsHeight
    : statsSpacingTop + statsHeight;

  const desiredInnerWidth = showMinimap ? barW + columnGap + mmW : barW;
  const availableWidth = w - margin * 2;
  let useTwoColumn = showMinimap && availableWidth >= desiredInnerWidth + panelPadding * 2;
  let panelInnerHeight: number;
  let panelW: number;

  if (useTwoColumn) {
    panelInnerHeight = Math.max(barsColumnHeight, minimapSectionHeight);
    panelW = desiredInnerWidth + panelPadding * 2;
  } else if (showMinimap) {
    panelInnerHeight = barsColumnHeight + sectionGap + minimapSectionHeight;
    panelW = Math.max(barW, mmW) + panelPadding * 2;
  } else {
    panelInnerHeight = barsColumnHeight + sectionGap + minimapSectionHeight;
    panelW = desiredInnerWidth + panelPadding * 2;
    useTwoColumn = false;
  }

  const panelH = panelInnerHeight + panelPadding * 2;
  const rawPanelX = w - panelW - margin;
  const panelX = rawPanelX < margin ? margin : rawPanelX;
  const panelY = margin;

  ctx.fillStyle = 'rgba(7, 16, 24, 0.88)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(146, 255, 166, 0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

  const leftColumnX = panelX + panelPadding;
  const leftColumnTop = panelY + panelPadding;
  let columnY = leftColumnTop;

  ctx.fillStyle = '#e6eef5';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`Lives: ${bars.lives}`, leftColumnX, columnY + 16);
  columnY += livesLineHeight + barsSpacingTop;

  drawBar(ctx, leftColumnX, columnY, barW, barH, bars.fuel01, '#2bd673', '#0a1e13', 'FUEL');
  columnY += barH + barSpacing;
  drawBar(ctx, leftColumnX, columnY, barW, barH, bars.armor01, '#2ba6ff', '#0a1521', 'ARMOR');
  columnY += barH + barSpacing;

  for (const ammoInfo of ammoDisplayOrder) {
    const current = bars.ammo[ammoInfo.key];
    const max = bars.ammoMax[ammoInfo.key];
    const ammo01 = max > 0 ? current / max : 0;
    drawBar(
      ctx,
      leftColumnX,
      columnY,
      barW,
      barH,
      ammo01,
      ammoInfo.color,
      ammoInfo.bg,
      ammoInfo.label,
    );
    columnY += barH + barSpacing;
  }

  const drawScoreBlock = (x: number, top: number) => {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c8d7e1';
    ctx.font = '14px system-ui, sans-serif';
    let lineY = top + 14;
    ctx.fillText(`Score: ${Math.floor(bars.score)}`, x, lineY);
    lineY += statsLineHeight;
    ctx.fillText(`Wave: ${bars.wave}  Remaining: ${bars.enemiesRemaining}`, x, lineY);
    if (bars.nextWaveIn !== null) {
      lineY += statsLineHeight;
      ctx.fillText(`Next wave in: ${bars.nextWaveIn.toFixed(1)}s`, x, lineY);
    }
    ctx.restore();
  };

  const drawMinimapPanel = (x: number, y: number) => {
    ctx.save();
    ctx.fillStyle = '#11202b';
    ctx.fillRect(x - 2, y - 2, mmW + 4, mmH + 4);
    ctx.fillStyle = '#0b1720';
    ctx.fillRect(x, y, mmW, mmH);

    ctx.strokeStyle = '#142a3a';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= minimap.mapW; gx += 4) {
      const gxNorm = (gx / minimap.mapW) * mmW;
      ctx.beginPath();
      ctx.moveTo(x + gxNorm, y);
      ctx.lineTo(x + gxNorm, y + mmH);
      ctx.stroke();
    }
    for (let gy = 0; gy <= minimap.mapH; gy += 4) {
      const gyNorm = (gy / minimap.mapH) * mmH;
      ctx.beginPath();
      ctx.moveTo(x, y + gyNorm);
      ctx.lineTo(x + mmW, y + gyNorm);
      ctx.stroke();
    }

    ctx.fillStyle = '#ef476f';
    for (let i = 0; i < minimap.enemies.length; i += 1) {
      const e = minimap.enemies[i]!;
      const px = x + (e.tx / minimap.mapW) * mmW;
      const py = y + (e.ty / minimap.mapH) * mmH;
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    ctx.fillStyle = '#92ffa6';
    const ppx = x + (minimap.player.tx / minimap.mapW) * mmW;
    const ppy = y + (minimap.player.ty / minimap.mapH) * mmH;
    ctx.fillRect(ppx - 2, ppy - 2, 4, 4);
    ctx.restore();
  };

  const barsBottom = leftColumnTop + barsColumnHeight;
  const infoColumnX = useTwoColumn ? panelX + panelPadding + barW + columnGap : leftColumnX;
  const infoColumnTop = useTwoColumn ? leftColumnTop : barsBottom + sectionGap;

  if (showMinimap) {
    drawMinimapPanel(infoColumnX, infoColumnTop);
    drawScoreBlock(infoColumnX, infoColumnTop + mmH + statsSpacingTop);
  } else {
    drawScoreBlock(infoColumnX, infoColumnTop + statsSpacingTop);
  }

  const objectivePanelPaddingX = panelPadding;
  const objectivePanelPaddingY = 14;
  const objectiveHeaderHeight = 20;
  const objectiveLineHeight = 18;
  const hasObjectives = objectiveLines.length > 0;
  const objectiveBodyHeight = hasObjectives ? 12 + objectiveLines.length * objectiveLineHeight : 0;
  const objectivePanelInnerHeight = objectiveHeaderHeight + objectiveBodyHeight;
  const objectivePanelH = objectivePanelInnerHeight + objectivePanelPaddingY * 2;
  const objectivePanelW = panelW;
  const objectivePanelX = panelX;
  const objectivePanelY = panelY + panelH + margin;

  ctx.fillStyle = 'rgba(7, 16, 24, 0.88)';
  ctx.fillRect(objectivePanelX, objectivePanelY, objectivePanelW, objectivePanelH);
  ctx.strokeStyle = 'rgba(146, 255, 166, 0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    objectivePanelX + 0.5,
    objectivePanelY + 0.5,
    objectivePanelW - 1,
    objectivePanelH - 1,
  );

  ctx.textAlign = 'left';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#92ffa6';
  let objectiveTextY = objectivePanelY + objectivePanelPaddingY + objectiveHeaderHeight;
  const objectiveTextX = objectivePanelX + objectivePanelPaddingX;
  ctx.fillText('Objectives', objectiveTextX, objectiveTextY);

  if (hasObjectives) {
    objectiveTextY += 12;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#e6eef5';
    for (let i = 0; i < objectiveLines.length; i += 1) {
      ctx.fillText(objectiveLines[i]!, objectiveTextX, objectiveTextY + i * objectiveLineHeight);
    }
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
