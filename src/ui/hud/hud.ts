import type { IsoParams } from '../../render/iso/projection';
import { getCanvasViewMetrics } from '../../render/canvas/metrics';
import type { AchievementBannerView } from '../../game/achievements/tracker';
import { createVerticalGradient, drawPanel, font, mixColor, palette, traceRoundedRect } from '../theme';

export interface ObjectiveLine {
  label: string;
  complete: boolean;
}

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

type BossBarData = {
  name: string;
  health01: number;
  enraged: boolean;
} | null;
const ammoDisplayOrder: {
  key: keyof BarsData['ammo'];
  label: string;
  color: string;
}[] = [
  { key: 'missiles', label: 'Machine Gun (LMB / Space)', color: '#ffd166' },
  { key: 'rockets', label: 'Missiles (RMB / Shift)', color: '#ff8a5c' },
  { key: 'hellfires', label: 'Hellfires (MMB / Ctrl)', color: '#f94144' },
];

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  bars: BarsData,
  objectiveLines: ObjectiveLine[],
  boss: BossBarData,
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

  if (boss) {
    const barWidth = Math.min(420, Math.max(260, w * 0.55));
    const barHeight = 18;
    const drawX = Math.max(20, Math.floor((w - barWidth) / 2));
    const drawY = 28;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = font(18, 'bold');
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = palette.textPrimary;
    ctx.fillText(boss.name, drawX + barWidth / 2, drawY - 12);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const barRect = { x: drawX, y: drawY, width: barWidth, height: barHeight } as const;
    const barBase = boss.enraged ? palette.danger : palette.accent;
    drawPanel(ctx, barRect, {
      radius: 9,
      fill: 'rgba(10, 20, 28, 0.9)',
      stroke: mixColor(barBase, '#000000', 0.6),
      borderWidth: 1.5,
      shadow: false,
    });

    const fillWidth = Math.max(0, Math.min(1, boss.health01)) * (barWidth - 6);
    if (fillWidth > 0) {
      const fillRect = { x: drawX + 3, y: drawY + 3, width: fillWidth, height: barHeight - 6 } as const;
      const gradient = createVerticalGradient(
        ctx,
        fillRect,
        mixColor(barBase, '#ffffff', 0.4),
        mixColor(barBase, '#000000', 0.05),
      );
      ctx.save();
      traceRoundedRect(ctx, fillRect, 6);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

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
    const labelFont = font(12, 'bold');
    const titleFont = font(16, 'bold');
    const bodyFont = font(13);

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
      drawPanel(
        ctx,
        { x: drawX, y: drawY, width: bannerWidth, height: bannerHeight },
        {
          radius: 12,
          fill: palette.backdropStrong,
          stroke: palette.accentSoft,
          borderWidth: 1,
          shadow: { color: 'rgba(0, 0, 0, 0.28)', blur: 14, offsetY: 6 },
        },
      );

      let textY = drawY + topPad;
      const textX = drawX + 16;

      ctx.fillStyle = palette.accent;
      ctx.font = labelFont;
      ctx.fillText('Achievement Unlocked', textX, textY);
      textY += labelLineHeight + 6;

      ctx.fillStyle = palette.textPrimary;
      ctx.font = titleFont;
      ctx.fillText(banner.title, textX, textY);
      textY += titleLineHeight + 4;

      ctx.fillStyle = palette.textSecondary;
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

  drawPanel(
    ctx,
    { x: panelX, y: panelY, width: panelW, height: panelH },
    {
      radius: 16,
      fill: palette.panel,
      stroke: palette.accentSoft,
      borderWidth: 1.2,
      shadow: { color: 'rgba(0, 0, 0, 0.45)', blur: 26, offsetY: 14 },
    },
  );

  const leftColumnX = panelX + panelPadding;
  const leftColumnTop = panelY + panelPadding;
  let columnY = leftColumnTop;

  ctx.fillStyle = palette.textPrimary;
  ctx.font = font(16, 'bold');
  ctx.fillText(`Lives: ${bars.lives}`, leftColumnX, columnY + 16);
  columnY += livesLineHeight + barsSpacingTop;

  const fuelColor = '#2bd673';
  const armorColor = '#2ba6ff';
  drawBar(ctx, leftColumnX, columnY, barW, barH, bars.fuel01, fuelColor, mixColor(fuelColor, '#050b12', 0.82), 'FUEL');
  columnY += barH + barSpacing;
  drawBar(ctx, leftColumnX, columnY, barW, barH, bars.armor01, armorColor, mixColor(armorColor, '#050b12', 0.82), 'ARMOR');
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
      mixColor(ammoInfo.color, '#050b12', 0.82),
      ammoInfo.label,
    );
    columnY += barH + barSpacing;
  }

  const drawScoreBlock = (x: number, top: number) => {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.textSecondary;
    ctx.font = font(14);
    let lineY = top + 16;
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
    drawPanel(
      ctx,
      { x: x - 6, y: y - 6, width: mmW + 12, height: mmH + 12 },
      { radius: 12, fill: palette.panelSunken, stroke: palette.panelBorder, borderWidth: 1, shadow: false },
    );
    ctx.fillStyle = palette.minimapFill;
    ctx.fillRect(x, y, mmW, mmH);

    ctx.strokeStyle = palette.minimapGrid;
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

    ctx.fillStyle = palette.minimapEnemy;
    for (let i = 0; i < minimap.enemies.length; i += 1) {
      const e = minimap.enemies[i]!;
      const px = x + (e.tx / minimap.mapW) * mmW;
      const py = y + (e.ty / minimap.mapH) * mmH;
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    ctx.fillStyle = palette.minimapPlayer;
    const ppx = x + (minimap.player.tx / minimap.mapW) * mmW;
    const ppy = y + (minimap.player.ty / minimap.mapH) * mmH;
    ctx.beginPath();
    ctx.arc(ppx, ppy, 3, 0, Math.PI * 2);
    ctx.fill();
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
  const objectiveLineHeight = 24;
  const objectiveIndicatorSize = 16;
  const objectiveIndicatorRadius = 5;
  const objectiveIndicatorGap = 12;
  const hasObjectives = objectiveLines.length > 0;
  const objectiveBodyHeight = hasObjectives ? 12 + objectiveLines.length * objectiveLineHeight : 0;
  const objectivePanelInnerHeight = objectiveHeaderHeight + objectiveBodyHeight;
  const objectivePanelH = objectivePanelInnerHeight + objectivePanelPaddingY * 2;
  const objectivePanelW = panelW;
  const objectivePanelX = panelX;
  const objectivePanelY = panelY + panelH + margin;

  drawPanel(
    ctx,
    { x: objectivePanelX, y: objectivePanelY, width: objectivePanelW, height: objectivePanelH },
    {
      radius: 14,
      fill: palette.panel,
      stroke: palette.accentSoft,
      borderWidth: 1,
      shadow: { color: 'rgba(0, 0, 0, 0.38)', blur: 22, offsetY: 10 },
    },
  );

  ctx.textAlign = 'left';
  ctx.font = font(16, 'bold');
  ctx.fillStyle = palette.accent;
  const objectiveHeaderBaseline = objectivePanelY + objectivePanelPaddingY + objectiveHeaderHeight;
  const objectiveTextX = objectivePanelX + objectivePanelPaddingX;
  ctx.fillText('Objectives', objectiveTextX, objectiveHeaderBaseline);

  if (hasObjectives) {
    const bodyStartY = objectiveHeaderBaseline + 12;
    const indicatorOffsetY = (objectiveLineHeight - objectiveIndicatorSize) / 2;
    const textX = objectiveTextX + objectiveIndicatorSize + objectiveIndicatorGap;
    ctx.font = font(14);
    ctx.textBaseline = 'middle';
    for (let i = 0; i < objectiveLines.length; i += 1) {
      const objective = objectiveLines[i]!;
      const lineTop = bodyStartY + i * objectiveLineHeight + indicatorOffsetY;
      const indicatorRect = {
        x: objectiveTextX,
        y: lineTop,
        width: objectiveIndicatorSize,
        height: objectiveIndicatorSize,
      } as const;
      const indicatorCenterY = indicatorRect.y + objectiveIndicatorSize / 2;

      ctx.save();
      const indicatorGradient = createVerticalGradient(
        ctx,
        indicatorRect,
        objective.complete
          ? mixColor(palette.accent, '#ffffff', 0.4)
          : mixColor(palette.panelSunken, '#ffffff', 0.08),
        objective.complete
          ? mixColor(palette.accentStrong, '#000000', 0.2)
          : mixColor(palette.panelSunken, '#000000', 0.45),
      );
      traceRoundedRect(ctx, indicatorRect, objectiveIndicatorRadius);
      ctx.fillStyle = indicatorGradient;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = objective.complete
        ? mixColor(palette.accentStrong, '#000000', 0.25)
        : palette.panelBorderMuted;
      traceRoundedRect(ctx, indicatorRect, objectiveIndicatorRadius);
      ctx.stroke();
      if (!objective.complete) {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = mixColor(palette.accent, '#ffffff', 0.15);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(indicatorRect.x + objectiveIndicatorSize / 2, indicatorCenterY, objectiveIndicatorSize * 0.22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      if (objective.complete) {
        ctx.save();
        ctx.strokeStyle = palette.textInverted;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(indicatorRect.x + objectiveIndicatorSize * 0.26, indicatorCenterY + objectiveIndicatorSize * 0.05);
        ctx.lineTo(indicatorRect.x + objectiveIndicatorSize * 0.45, indicatorCenterY + objectiveIndicatorSize * 0.24);
        ctx.lineTo(indicatorRect.x + objectiveIndicatorSize * 0.74, indicatorCenterY - objectiveIndicatorSize * 0.22);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = objective.complete ? mixColor(palette.textSecondary, '#ffffff', 0.08) : palette.textPrimary;
      ctx.fillText(objective.label, textX, indicatorCenterY);
    }
    ctx.textBaseline = 'alphabetic';
  }

  // Compass top-center
  if (compassDir) {
    ctx.save();
    ctx.translate(w / 2, 28);
    const ang = Math.atan2(compassDir.dy, compassDir.dx);
    ctx.rotate(ang);
    ctx.fillStyle = palette.textSecondary;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
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
  const radius = Math.min(6, h / 2);
  const backgroundRect = { x, y, width: w, height: h } as const;
  ctx.fillStyle = bg;
  traceRoundedRect(ctx, backgroundRect, radius);
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = mixColor(bg, '#000000', 0.55);
  traceRoundedRect(ctx, backgroundRect, radius);
  ctx.stroke();

  const clamped = Math.max(0, Math.min(1, v01));
  if (clamped > 0) {
    const innerPadding = 2;
    const fillRect = {
      x: x + innerPadding,
      y: y + innerPadding,
      width: Math.max(0, w - innerPadding * 2) * clamped,
      height: Math.max(0, h - innerPadding * 2),
    } as const;

    ctx.save();
    traceRoundedRect(ctx, fillRect, Math.max(2, radius - innerPadding));
    ctx.clip();
    const gradient = createVerticalGradient(
      ctx,
      fillRect,
      mixColor(color, '#ffffff', 0.35),
      mixColor(color, '#000000', 0.1),
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(fillRect.x, fillRect.y, fillRect.width, fillRect.height);
    ctx.restore();
  }

  ctx.fillStyle = palette.textMuted;
  ctx.font = font(11, 'bold');
  ctx.fillText(label, x, y - 4);
  ctx.restore();
}
