import type { UIStore } from './scenes';
import { getCanvasViewMetrics } from '../../render/canvas/metrics';
import { computeSettingsLayout } from './settingsLayout';
import type { AchievementRenderState } from '../../game/achievements/tracker';
import { drawBackdrop, drawPanel, font, mixColor, palette } from '../theme';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function renderSettings(context: CanvasRenderingContext2D, ui: UIStore): void {
  const { width: w, height: h } = getCanvasViewMetrics(context);
  const layout = computeSettingsLayout(w, h);

  context.save();

  drawBackdrop(context, w, h);

  const panelRect = {
    x: layout.panel.x,
    y: layout.panel.y,
    width: layout.panel.width,
    height: layout.panel.height,
  } as const;
  const panelGradient = context.createLinearGradient(
    panelRect.x,
    panelRect.y,
    panelRect.x,
    panelRect.y + panelRect.height,
  );
  panelGradient.addColorStop(0, 'rgba(18, 36, 52, 0.95)');
  panelGradient.addColorStop(1, palette.panel);
  drawPanel(context, panelRect, {
    radius: 22,
    fill: panelGradient,
    stroke: palette.accentSoft,
    borderWidth: 1.5,
    shadow: { color: 'rgba(0, 0, 0, 0.5)', blur: 30, offsetY: 18 },
  });

  const titleX = layout.panel.x + layout.panel.paddingX;
  let cursorY = layout.panel.y + layout.panel.paddingTop;

  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillStyle = palette.accent;
  context.font = font(30, 'bold');
  context.fillText('Settings', titleX, cursorY);
  cursorY += 38;

  context.fillStyle = palette.textSecondary;
  context.font = font(15);
  context.fillText('Fine-tune the mix and presentation for your mission.', titleX, cursorY);

  // Volume sliders
  context.textBaseline = 'middle';
  context.font = font(16);
  for (const slider of layout.sliders) {
    const value = clamp01(ui.settings[slider.id]);
    const fillWidth = slider.track.width * value;
    const knobX = slider.track.x + fillWidth;

    context.fillStyle = palette.textSecondary;
    context.textAlign = 'left';
    context.fillText(slider.label, slider.labelX, slider.centerY);

    context.fillStyle = 'rgba(20, 34, 48, 0.95)';
    context.fillRect(slider.track.x, slider.track.y, slider.track.width, slider.track.height);

    if (fillWidth > 0) {
      const gradient = context.createLinearGradient(
        slider.track.x,
        0,
        slider.track.x + slider.track.width,
        0,
      );
      gradient.addColorStop(0, mixColor(palette.accentStrong, '#ffffff', 0.25));
      gradient.addColorStop(1, palette.accent);
      context.fillStyle = gradient;
      context.fillRect(slider.track.x, slider.track.y, fillWidth, slider.track.height);
    }

    context.beginPath();
    context.arc(knobX, slider.centerY, slider.knobRadius, 0, Math.PI * 2);
    context.shadowColor = 'rgba(0, 0, 0, 0.35)';
    context.shadowBlur = 6;
    context.shadowOffsetY = 2;
    context.fillStyle = palette.textPrimary;
    context.fill();
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    context.strokeStyle = palette.textInverted;
    context.lineWidth = 2;
    context.stroke();

    context.textAlign = 'center';
    context.fillStyle = palette.accent;
    context.fillText(`${Math.round(value * 100)}%`, slider.valueX, slider.centerY);
  }

  // Toggle switches
  context.textAlign = 'left';
  context.font = font(15);
  for (const toggle of layout.toggles) {
    const enabled = ui.settings[toggle.id];
    drawPanel(
      context,
      { x: toggle.box.x, y: toggle.box.y, width: toggle.box.width, height: toggle.box.height },
      {
        radius: 10,
        fill: enabled ? 'rgba(24, 56, 44, 0.95)' : 'rgba(11, 20, 29, 0.95)',
        stroke: enabled ? palette.accentSoft : 'rgba(43, 60, 75, 0.8)',
        borderWidth: 1.4,
        shadow: false,
      },
    );
    if (enabled) {
      context.strokeStyle = palette.accent;
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(toggle.box.x + 4, toggle.box.y + toggle.box.height / 2 + 2);
      context.lineTo(toggle.box.x + toggle.box.width / 2, toggle.box.y + toggle.box.height - 4);
      context.lineTo(toggle.box.x + toggle.box.width - 4, toggle.box.y + 4);
      context.stroke();
    }
    context.fillStyle = palette.textSecondary;
    context.fillText(toggle.label, toggle.labelX, toggle.centerY);
  }

  // Reset button
  const button = layout.resetButton;
  drawPanel(
    context,
    { x: button.x, y: button.y, width: button.width, height: button.height },
    {
      radius: 14,
      fill: 'rgba(16, 42, 58, 0.95)',
      stroke: 'rgba(45, 65, 84, 0.85)',
      borderWidth: 1.4,
      shadow: { color: 'rgba(0, 0, 0, 0.4)', blur: 14, offsetY: 8 },
    },
  );
  context.fillStyle = palette.textSecondary;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = font(15, 'bold');
  context.fillText('Restore Defaults', button.x + button.width / 2, button.y + button.height / 2);

  // Instructions footer
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.font = font(13);
  context.fillStyle = palette.textMuted;
  for (let i = 0; i < layout.instructions.lines.length; i += 1) {
    context.fillText(
      layout.instructions.lines[i]!,
      layout.instructions.x,
      layout.instructions.startY + i * layout.instructions.lineGap,
    );
  }

  context.restore();
}

export function renderAchievements(
  context: CanvasRenderingContext2D,
  achievements: AchievementRenderState,
): void {
  const { width: w, height: h } = getCanvasViewMetrics(context);
  const sorted = [...achievements.definitions].sort((a, b) => {
    const orderA = a.sortOrder ?? Number.POSITIVE_INFINITY;
    const orderB = b.sortOrder ?? Number.POSITIVE_INFINITY;
    if (orderA === orderB) return a.title.localeCompare(b.title);
    return orderA - orderB;
  });

  const panelWidth = Math.min(860, Math.max(520, w * 0.72));
  const panelPaddingX = 36;
  const panelPaddingTop = 36;
  const panelPaddingBottom = 40;
  const columns = panelWidth >= 640 ? 2 : 1;
  const columnGap = columns > 1 ? 24 : 0;
  const columnWidth =
    (panelWidth - panelPaddingX * 2 - columnGap * (columns - 1)) / Math.max(1, columns);
  const rowHeight = 78;
  const rowGap = 16;
  const rows = Math.ceil(sorted.length / columns);
  const listHeight = rows * rowHeight + Math.max(0, rows - 1) * rowGap;
  const headerHeight = 74;

  let panelHeight = panelPaddingTop + headerHeight + listHeight + panelPaddingBottom;
  panelHeight = Math.min(panelHeight, h - 48);
  const panelX = (w - panelWidth) / 2;
  const panelY = Math.max(24, (h - panelHeight) / 2);

  const bodyFont = font(13);
  const wrapDescription = (text: string, maxWidth: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i]!;
      const candidate = current ? `${current} ${word}` : word;
      context.font = bodyFont;
      if (context.measureText(candidate).width <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, 3);
  };

  context.save();
  drawBackdrop(context, w, h);

  const panelRect = { x: panelX, y: panelY, width: panelWidth, height: panelHeight } as const;
  const panelGradient = context.createLinearGradient(
    panelRect.x,
    panelRect.y,
    panelRect.x,
    panelRect.y + panelRect.height,
  );
  panelGradient.addColorStop(0, 'rgba(18, 36, 52, 0.95)');
  panelGradient.addColorStop(1, palette.panel);
  drawPanel(context, panelRect, {
    radius: 24,
    fill: panelGradient,
    stroke: palette.accentSoft,
    borderWidth: 1.6,
    shadow: { color: 'rgba(0, 0, 0, 0.55)', blur: 34, offsetY: 20 },
  });

  context.save();
  context.beginPath();
  context.rect(panelX, panelY, panelWidth, panelHeight);
  context.clip();

  const titleX = panelX + panelPaddingX;
  let cursorY = panelY + panelPaddingTop;

  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillStyle = palette.accent;
  context.font = font(30, 'bold');
  context.fillText('Achievements', titleX, cursorY);
  cursorY += 36;

  context.fillStyle = palette.textSecondary;
  context.font = font(15);
  context.fillText('Campaign milestones and rescue accolades.', titleX, cursorY);
  cursorY += 28;

  context.fillStyle = palette.accentSoft;
  context.fillRect(panelX + panelPaddingX, cursorY, panelWidth - panelPaddingX * 2, 1);
  cursorY += 24;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const index = row * columns + col;
      if (index >= sorted.length) continue;
      const def = sorted[index]!;
      const unlocked = achievements.unlocked.has(def.id);

      const entryX = panelX + panelPaddingX + col * (columnWidth + columnGap);
      const entryY = cursorY + row * (rowHeight + rowGap);
      const entryHeight = rowHeight;

      context.save();
      drawPanel(
        context,
        { x: entryX, y: entryY, width: columnWidth, height: entryHeight },
        {
          radius: 16,
          fill: unlocked ? 'rgba(24, 58, 44, 0.94)' : 'rgba(11, 20, 29, 0.92)',
          stroke: unlocked ? palette.accentSoft : palette.panelBorderMuted,
          borderWidth: 1.2,
          shadow: false,
        },
      );

      const badgeCenterX = entryX + 20;
      const badgeCenterY = entryY + entryHeight / 2;

      context.lineWidth = 2;
      if (unlocked) {
        context.fillStyle = palette.accentStrong;
        context.beginPath();
        context.arc(badgeCenterX, badgeCenterY, 14, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = mixColor(palette.accentStrong, '#000000', 0.5);
        context.stroke();
        context.strokeStyle = '#ffffff';
        context.lineWidth = 2.5;
        context.beginPath();
        context.moveTo(badgeCenterX - 6, badgeCenterY);
        context.lineTo(badgeCenterX - 1, badgeCenterY + 5);
        context.lineTo(badgeCenterX + 7, badgeCenterY - 6);
        context.stroke();
      } else {
        context.strokeStyle = palette.accentSoft;
        context.beginPath();
        context.arc(badgeCenterX, badgeCenterY, 14, 0, Math.PI * 2);
        context.stroke();
      }

      const textX = badgeCenterX + 24;
      const textWidth = columnWidth - (textX - entryX) - 18;

      context.textAlign = 'left';
      context.fillStyle = unlocked ? palette.textPrimary : palette.textSecondary;
      context.font = font(16, 'bold');
      context.fillText(def.title, textX, entryY + 14);

      const descriptionLines = wrapDescription(def.description, textWidth);

      context.fillStyle = palette.textMuted;
      context.font = bodyFont;
      for (let lineIndex = 0; lineIndex < descriptionLines.length; lineIndex += 1) {
        context.fillText(descriptionLines[lineIndex]!, textX, entryY + 36 + lineIndex * 16);
      }

      context.textAlign = 'right';
      context.font = font(12, 'bold');
      context.fillStyle = unlocked ? palette.accent : 'rgba(95, 115, 134, 0.9)';
      context.fillText(unlocked ? 'Unlocked' : 'Locked', entryX + columnWidth - 16, entryY + 16);
      context.textAlign = 'left';

      context.restore();
    }
  }

  context.font = font(13);
  context.fillStyle = palette.textMuted;
  context.fillText('Press Esc to return.', titleX, panelY + panelHeight - panelPaddingBottom + 8);

  context.restore();
  context.restore();
}

export function renderAbout(context: CanvasRenderingContext2D): void {
  const { width: w, height: h } = getCanvasViewMetrics(context);

  const panelWidth = Math.min(640, Math.max(480, w * 0.74));
  const panelX = (w - panelWidth) / 2;
  const panelY = Math.max(32, h * 0.1);
  const paddingX = 40;
  const paddingTop = 40;
  const paddingBottom = 44;
  const contentWidth = panelWidth - paddingX * 2;

  const wrapText = (text: string, fontSpec: string, maxWidth: number): string[] => {
    context.save();
    context.font = fontSpec;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    context.restore();
    return lines;
  };

  const taglineLines = [
    'An isometric rescue prototype focused on speed, clarity, and high-stakes extractions.',
    'Every sortie is tuned to make each evac feel clutch—fuel dwindles, civilians panic, and AAA fire lights the ridge.',
  ];
  const stats = [
    {
      label: 'Build',
      value: 'Pre-alpha',
      description: 'Core loop, freeplay sandbox, keyboard & mouse.',
    },
    {
      label: 'Team',
      value: 'Solo dev',
      description: 'Code, design, placeholder art & audio.',
    },
    {
      label: 'Focus',
      value: 'Feel first',
      description: 'Tight controls, readable combat, dramatic rescues.',
    },
  ];
  const missionLines = [
    'Choppa is a love letter to the chopper missions of 16-bit arcades. You balance fuel, evac timing, and survival while',
    'navigating layered terrain and dynamic weather. Systems are designed to surface tension quickly and reward decisive flying.',
  ];
  const pillarPoints = [
    'High-contrast, tilt-shifted visuals make targets and threats legible even when chaos erupts.',
    'Flight handling favours precise inputs—short bursts, controlled slides, and momentum awareness.',
    'Pickups, objectives, and comms chatter feed the pilot critical information without flooding the HUD.',
    'Moment-to-moment goals escalate smoothly: scout, rescue, defend, extract.',
  ];
  const techChips = [
    'TypeScript + Vite',
    'Canvas 2D renderer',
    'Entity Component Systems',
    'Tiled mission maps',
    'Deterministic game loops',
    'Web Audio mix bus',
    'Local storage persistence',
    'Vitest smoke harness',
  ];
  const roadmap = [
    {
      phase: 'Short final',
      notes: [
        'Tutorialised first mission',
        'Dynamic soundtrack layers',
        'Moment-to-moment telemetry overlay',
      ],
    },
    {
      phase: 'Afterburner',
      notes: [
        'Campaign arc of linked rescues',
        'Expanded enemy roster & behaviours',
        'Controller + accessibility pass',
      ],
    },
    {
      phase: 'Wishlist',
      notes: [
        'Co-op sorties with shared fuel economy',
        'Replay + photo tools',
        'Seasonal rescue challenges',
      ],
    },
  ];
  const supportPoints = [
    'Share feedback on pacing, readability, and mission clarity—every sortie log informs balance tweaks.',
    'Flag bugs with reproduction steps so we can tighten the pre-flight checklist fast.',
    'Spread the word to other rotor-heads; more pilots means better telemetry and more ambitious missions.',
  ];
  const footerLines = [
    'Press Esc to return to the cockpit.',
    '© 2024 Choppa Prototype — built with love for rescue pilots.',
  ];

  const accentHeight = 4;
  const headingBlock = accentHeight + 10 + 24;
  const chipHeight = 28;
  const chipHorizontalGap = 12;
  const chipVerticalGap = 12;
  const taglineFont = font(16);
  const missionFont = font(15);
  const pillarFont = font(15);
  const supportFont = font(15);
  const statLabelFont = font(15, 'bold');
  const statValueFont = font(20, 'bold');
  const statDescriptionFont = font(12);
  const statDescriptionLineHeight = 14;
  const chipFont = font(14, 'bold');
  const roadmapNoteFont = font(14);
  const bulletOffset = 16;
  const supportIndent = 16;
  const taglineLineHeight = 20;
  const missionLineHeight = 20;
  const pillarLineHeight = 22;
  const supportLineHeight = 20;
  const supportItemGap = 10;
  const roadmapNoteLineHeight = 18;

  const contentX = panelX + paddingX;

  const statGap = 16;
  const cardWidth = (contentWidth - statGap * (stats.length - 1)) / stats.length;
  const statDescriptions = stats.map((stat) =>
    wrapText(stat.description, statDescriptionFont, Math.max(0, cardWidth - 32)),
  );
  const maxStatDescriptionLines = Math.max(
    1,
    ...statDescriptions.map((lines) => lines.length || 0),
  );
  const statDescriptionBlockHeight = maxStatDescriptionLines * statDescriptionLineHeight;
  const statCardHeight = 52 + statDescriptionBlockHeight + 12;

  const taglineWrapped = taglineLines.map((line) => wrapText(line, taglineFont, contentWidth));
  const taglineLineCount = taglineWrapped.reduce(
    (sum, lines) => sum + Math.max(1, lines.length || 0),
    0,
  );

  const missionWrapped = missionLines.map((line) => wrapText(line, missionFont, contentWidth));
  const missionLineCount = missionWrapped.reduce(
    (sum, lines) => sum + Math.max(1, lines.length || 0),
    0,
  );

  const pillarWrapped = pillarPoints.map((point) =>
    wrapText(point, pillarFont, Math.max(0, contentWidth - bulletOffset)),
  );
  const pillarLineCount = pillarWrapped.reduce(
    (sum, lines) => sum + Math.max(1, lines.length || 0),
    0,
  );

  const supportWrapped = supportPoints.map((point) =>
    wrapText(point, supportFont, Math.max(0, contentWidth - supportIndent)),
  );
  const supportTotalHeight = supportWrapped.reduce((sum, lines) => {
    const lineCount = Math.max(1, lines.length || 0);
    return sum + lineCount * supportLineHeight + supportItemGap;
  }, 0);

  context.save();
  context.font = chipFont;
  let chipRows = 1;
  let measureChipX = 0;
  for (const chip of techChips) {
    const chipWidth = Math.min(220, context.measureText(chip).width + 26);
    if (measureChipX + chipWidth > contentWidth && measureChipX > 0) {
      chipRows += 1;
      measureChipX = 0;
    }
    measureChipX += chipWidth + chipHorizontalGap;
  }
  context.restore();

  const chipsBlockHeight =
    14 + chipHeight / 2 + 20 + 12 + (chipRows - 1) * (chipHeight + chipVerticalGap);

  const timelineTextIndent = 24;
  const timelineBulletWidth = (() => {
    context.save();
    context.font = roadmapNoteFont;
    const width = context.measureText('• ').width;
    context.restore();
    return width;
  })();
  const roadmapNoteWidth = Math.max(0, contentWidth - timelineTextIndent - timelineBulletWidth);
  const roadmapLayouts = roadmap.map((entry) => {
    const wrappedNotes = entry.notes.map((note) =>
      wrapText(note, roadmapNoteFont, roadmapNoteWidth),
    );
    const noteLineCount = wrappedNotes.reduce(
      (sum, lines) => sum + Math.max(1, lines.length || 0),
      0,
    );
    const noteBlockHeight = noteLineCount * roadmapNoteLineHeight;
    const height = Math.max(64, noteBlockHeight + 36);
    return { ...entry, wrappedNotes, noteLineCount, height };
  });
  const totalRoadmapHeight = roadmapLayouts.reduce((sum, entry) => sum + entry.height, 0);

  let panelContentHeight = paddingTop;
  panelContentHeight += 34; // title
  panelContentHeight += 10;
  panelContentHeight += taglineLineCount * taglineLineHeight;
  panelContentHeight += 26;
  panelContentHeight += statCardHeight;
  panelContentHeight += 32;
  panelContentHeight += headingBlock; // Mission heading
  panelContentHeight += missionLineCount * missionLineHeight;
  panelContentHeight += 12;
  panelContentHeight += headingBlock; // Pillars heading
  panelContentHeight += pillarLineCount * pillarLineHeight;
  panelContentHeight += 16;
  panelContentHeight += headingBlock; // Tech heading
  panelContentHeight += chipsBlockHeight;
  panelContentHeight += headingBlock; // Flight Plan heading
  panelContentHeight += totalRoadmapHeight + 8;
  panelContentHeight += headingBlock; // Support heading
  panelContentHeight += supportTotalHeight;
  panelContentHeight += 20;
  panelContentHeight += footerLines.length * 18;

  const panelHeight = panelContentHeight + paddingBottom;

  context.save();

  drawBackdrop(context, w, h, 0.85);
  const panelRect = { x: panelX, y: panelY, width: panelWidth, height: panelHeight } as const;
  const panelGradient = context.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
  panelGradient.addColorStop(0, 'rgba(18, 36, 52, 0.96)');
  panelGradient.addColorStop(1, palette.panel);
  drawPanel(context, panelRect, {
    radius: 28,
    fill: panelGradient,
    stroke: palette.accentSoft,
    borderWidth: 1.8,
    shadow: { color: 'rgba(0, 0, 0, 0.58)', blur: 36, offsetY: 24 },
  });

  const accentGradient = context.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY);
  accentGradient.addColorStop(0, palette.accentStrong);
  accentGradient.addColorStop(1, palette.accent);
  context.fillStyle = accentGradient;
  context.fillRect(panelX, panelY, panelWidth, 3);

  let cursorY = panelY + paddingTop;

  context.textAlign = 'left';
  context.textBaseline = 'top';

  context.fillStyle = palette.accent;
  context.font = font(32, 'bold');
  context.fillText('About Choppa', contentX, cursorY);
  cursorY += 34;
  cursorY += 10;

  context.fillStyle = palette.textSecondary;
  context.font = taglineFont;
  for (const paragraph of taglineWrapped) {
    const lines = paragraph.length ? paragraph : [''];
    for (const line of lines) {
      context.fillText(line, contentX, cursorY);
      cursorY += taglineLineHeight;
    }
  }
  cursorY += 26;

  const statsTop = cursorY;
  for (let i = 0; i < stats.length; i += 1) {
    const cardX = contentX + i * (cardWidth + statGap);
    const cardGradient = context.createLinearGradient(
      cardX,
      statsTop,
      cardX,
      statsTop + statCardHeight,
    );
    cardGradient.addColorStop(0, 'rgba(24, 48, 66, 0.96)');
    cardGradient.addColorStop(1, 'rgba(14, 26, 36, 0.94)');
    drawPanel(
      context,
      { x: cardX, y: statsTop, width: cardWidth, height: statCardHeight },
      {
        radius: 18,
        fill: cardGradient,
        stroke: 'rgba(39, 64, 88, 0.65)',
        borderWidth: 1.2,
        shadow: false,
      },
    );

    context.fillStyle = palette.accent;
    context.font = statLabelFont;
    context.fillText(stats[i]!.label, cardX + 16, statsTop + 12);

    context.fillStyle = palette.textPrimary;
    context.font = statValueFont;
    context.fillText(stats[i]!.value, cardX + 16, statsTop + 32);

    context.fillStyle = palette.textMuted;
    context.font = statDescriptionFont;
    let descY = statsTop + 52;
    const descriptionLines = statDescriptions[i]?.length ? statDescriptions[i]! : [''];
    for (const line of descriptionLines) {
      context.fillText(line, cardX + 16, descY);
      descY += statDescriptionLineHeight;
    }
  }
  cursorY += statCardHeight;
  cursorY += 32;

  const drawSectionHeading = (title: string) => {
    context.fillStyle = palette.accentStrong;
    context.fillRect(contentX, cursorY, 44, accentHeight);
    cursorY += accentHeight + 10;
    context.fillStyle = palette.accent;
    context.font = font(20, 'bold');
    context.fillText(title, contentX, cursorY);
    cursorY += 24;
  };

  drawSectionHeading('Mission Brief');
  context.fillStyle = palette.textSecondary;
  context.font = missionFont;
  for (const paragraph of missionWrapped) {
    const lines = paragraph.length ? paragraph : [''];
    for (const line of lines) {
      context.fillText(line, contentX, cursorY);
      cursorY += missionLineHeight;
    }
  }
  cursorY += 12;

  drawSectionHeading('Core Pillars');
  context.font = pillarFont;
  const bulletRadius = 4;
  for (const lines of pillarWrapped) {
    const entryLines = lines.length ? lines : [''];
    context.fillStyle = palette.accent;
    context.beginPath();
    context.arc(contentX + 5, cursorY + 8, bulletRadius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = palette.textSecondary;
    let lineY = cursorY;
    for (const line of entryLines) {
      context.fillText(line, contentX + bulletOffset, lineY);
      lineY += pillarLineHeight;
    }
    cursorY = lineY;
  }
  cursorY += 16;

  drawSectionHeading('Tech Stack & Tools');
  const maxChipX = contentX + contentWidth;
  let chipX = contentX;
  let chipY = cursorY + 14;
  context.save();
  context.font = chipFont;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const chip of techChips) {
    const chipWidth = Math.min(220, context.measureText(chip).width + 26);
    if (chipX + chipWidth > maxChipX && chipX > contentX) {
      chipX = contentX;
      chipY += chipHeight + chipVerticalGap;
    }
    const chipRectY = chipY - chipHeight / 2;
    drawPanel(
      context,
      { x: chipX, y: chipRectY, width: chipWidth, height: chipHeight },
      {
        radius: 14,
        fill: 'rgba(19, 36, 55, 0.95)',
        stroke: 'rgba(43, 72, 95, 0.7)',
        borderWidth: 1,
        shadow: false,
      },
    );
    context.fillStyle = palette.textSecondary;
    context.fillText(chip, chipX + chipWidth / 2, chipY);
    chipX += chipWidth + chipHorizontalGap;
  }
  context.restore();
  const chipsBottom = chipY + chipHeight / 2;
  cursorY = chipsBottom + 20;
  cursorY += 12;

  drawSectionHeading('Flight Plan');
  const timelineX = contentX + 6;
  const timelineTop = cursorY + 4;
  let timelineBottom = timelineTop;
  let roadmapCursor = cursorY;
  for (const entry of roadmapLayouts) {
    timelineBottom = Math.max(
      timelineBottom,
      roadmapCursor + 18 + entry.noteLineCount * roadmapNoteLineHeight,
    );
    roadmapCursor += entry.height;
  }
  timelineBottom += 6;
  context.strokeStyle = 'rgba(31, 53, 71, 0.7)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(timelineX, timelineTop);
  context.lineTo(timelineX, timelineBottom);
  context.stroke();

  const textX = contentX + timelineTextIndent;
  let entryY = cursorY;
  for (const entry of roadmapLayouts) {
    const dotY = entryY + 6;
    context.fillStyle = palette.accent;
    context.beginPath();
    context.arc(timelineX, dotY, 5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = palette.accent;
    context.font = font(16, 'bold');
    context.fillText(entry.phase, textX, entryY - 4);

    context.fillStyle = palette.textSecondary;
    context.font = roadmapNoteFont;
    let noteY = entryY + 18;
    for (const noteLines of entry.wrappedNotes) {
      const lines = noteLines.length ? noteLines : [''];
      const [firstLine, ...rest] = lines;
      context.fillText(`• ${firstLine}`, textX, noteY);
      noteY += roadmapNoteLineHeight;
      for (const line of rest) {
        context.fillText(line, textX + timelineBulletWidth, noteY);
        noteY += roadmapNoteLineHeight;
      }
    }

    entryY += entry.height;
  }
  cursorY = entryY + 8;

  drawSectionHeading('How You Can Help');
  context.font = supportFont;
  for (const lines of supportWrapped) {
    const itemTop = cursorY;
    const entryLines = lines.length ? lines : [''];
    context.fillStyle = palette.accentStrong;
    context.fillRect(contentX, itemTop + 6, 6, 6);
    context.fillStyle = palette.textSecondary;
    let lineY = itemTop;
    for (const line of entryLines) {
      context.fillText(line, contentX + supportIndent, lineY);
      lineY += supportLineHeight;
    }
    cursorY = lineY + supportItemGap;
  }
  cursorY += 20;

  context.fillStyle = palette.textMuted;
  context.font = font(13);
  for (const line of footerLines) {
    context.fillText(line, contentX, cursorY);
    cursorY += 18;
  }

  context.restore();
}
