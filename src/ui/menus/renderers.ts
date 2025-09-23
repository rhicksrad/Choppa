import type { UIStore } from './scenes';
import { getCanvasViewMetrics } from '../../render/canvas/metrics';
import { computeSettingsLayout } from './settingsLayout';

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

  // Dim the game scene
  context.fillStyle = '#050b12';
  context.globalAlpha = 0.82;
  context.fillRect(0, 0, w, h);
  context.globalAlpha = 1;

  // Settings panel
  context.fillStyle = '#0f1c29';
  context.fillRect(layout.panel.x, layout.panel.y, layout.panel.width, layout.panel.height);
  context.strokeStyle = '#1d2f3f';
  context.lineWidth = 2;
  context.strokeRect(layout.panel.x, layout.panel.y, layout.panel.width, layout.panel.height);

  const titleX = layout.panel.x + layout.panel.paddingX;
  let cursorY = layout.panel.y + layout.panel.paddingTop;

  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillStyle = '#92ffa6';
  context.font = 'bold 30px system-ui, sans-serif';
  context.fillText('Settings', titleX, cursorY);
  cursorY += 38;

  context.fillStyle = '#c8d7e1';
  context.font = '15px system-ui, sans-serif';
  context.fillText('Fine-tune the mix and presentation for your mission.', titleX, cursorY);

  // Volume sliders
  context.textBaseline = 'middle';
  context.font = '16px system-ui, sans-serif';
  for (const slider of layout.sliders) {
    const value = clamp01(ui.settings[slider.id]);
    const fillWidth = slider.track.width * value;
    const knobX = slider.track.x + fillWidth;

    context.fillStyle = '#c8d7e1';
    context.textAlign = 'left';
    context.fillText(slider.label, slider.labelX, slider.centerY);

    context.fillStyle = '#132437';
    context.fillRect(slider.track.x, slider.track.y, slider.track.width, slider.track.height);

    if (fillWidth > 0) {
      const gradient = context.createLinearGradient(
        slider.track.x,
        0,
        slider.track.x + slider.track.width,
        0,
      );
      gradient.addColorStop(0, '#1fb879');
      gradient.addColorStop(1, '#82ffb8');
      context.fillStyle = gradient;
      context.fillRect(slider.track.x, slider.track.y, fillWidth, slider.track.height);
    }

    context.beginPath();
    context.arc(knobX, slider.centerY, slider.knobRadius, 0, Math.PI * 2);
    context.fillStyle = '#f4fff8';
    context.fill();
    context.strokeStyle = '#0b151d';
    context.lineWidth = 2;
    context.stroke();

    context.textAlign = 'center';
    context.fillStyle = '#92ffa6';
    context.fillText(`${Math.round(value * 100)}%`, slider.valueX, slider.centerY);
  }

  // Toggle switches
  context.textAlign = 'left';
  context.font = '15px system-ui, sans-serif';
  for (const toggle of layout.toggles) {
    const enabled = ui.settings[toggle.id];
    context.fillStyle = enabled ? '#16382a' : '#0b141d';
    context.fillRect(toggle.box.x, toggle.box.y, toggle.box.width, toggle.box.height);
    context.strokeStyle = enabled ? '#92ffa6' : '#2b3c4b';
    context.lineWidth = 2;
    context.strokeRect(toggle.box.x, toggle.box.y, toggle.box.width, toggle.box.height);
    if (enabled) {
      context.strokeStyle = '#92ffa6';
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(toggle.box.x + 4, toggle.box.y + toggle.box.height / 2 + 2);
      context.lineTo(toggle.box.x + toggle.box.width / 2, toggle.box.y + toggle.box.height - 4);
      context.lineTo(toggle.box.x + toggle.box.width - 4, toggle.box.y + 4);
      context.stroke();
    }
    context.fillStyle = '#c8d7e1';
    context.fillText(toggle.label, toggle.labelX, toggle.centerY);
  }

  // Reset button
  const button = layout.resetButton;
  context.fillStyle = '#102a3a';
  context.fillRect(button.x, button.y, button.width, button.height);
  context.strokeStyle = '#2d4154';
  context.lineWidth = 2;
  context.strokeRect(button.x, button.y, button.width, button.height);
  context.fillStyle = '#c8d7e1';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '15px system-ui, sans-serif';
  context.fillText('Restore Defaults', button.x + button.width / 2, button.y + button.height / 2);

  // Instructions footer
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.font = '13px system-ui, sans-serif';
  context.fillStyle = '#7f92a3';
  for (let i = 0; i < layout.instructions.lines.length; i += 1) {
    context.fillText(
      layout.instructions.lines[i]!,
      layout.instructions.x,
      layout.instructions.startY + i * layout.instructions.lineGap,
    );
  }

  context.restore();
}

export function renderAchievements(context: CanvasRenderingContext2D): void {
  const { width: w, height: h } = getCanvasViewMetrics(context);
  context.save();
  context.fillStyle = '#0e141a';
  context.globalAlpha = 0.9;
  context.fillRect(0, 0, w, h);
  context.globalAlpha = 1;
  context.textAlign = 'center';
  context.fillStyle = '#92ffa6';
  context.font = 'bold 26px system-ui, sans-serif';
  context.fillText('Achievements', w / 2, h * 0.2);
  context.fillStyle = '#c8d7e1';
  context.font = '14px system-ui, sans-serif';
  context.fillText(
    'Achievement tracking will be wired to mission objectives later.',
    w / 2,
    h * 0.2 + 22,
  );
  context.fillText('Press Esc to return.', w / 2, h * 0.2 + 40);
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
  const statCardHeight = 70;
  const chipHeight = 28;
  const chipHorizontalGap = 12;
  const chipVerticalGap = 12;
  const entrySpacing = 68;

  context.save();
  context.font = '14px system-ui, sans-serif';
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

  let panelContentHeight = paddingTop;
  panelContentHeight += 34; // title
  panelContentHeight += 10;
  panelContentHeight += taglineLines.length * 20;
  panelContentHeight += 26;
  panelContentHeight += statCardHeight;
  panelContentHeight += 32;
  panelContentHeight += headingBlock; // Mission heading
  panelContentHeight += missionLines.length * 20;
  panelContentHeight += 12;
  panelContentHeight += headingBlock; // Pillars heading
  panelContentHeight += pillarPoints.length * 22;
  panelContentHeight += 16;
  panelContentHeight += headingBlock; // Tech heading
  panelContentHeight += chipsBlockHeight;
  panelContentHeight += headingBlock; // Flight Plan heading
  panelContentHeight += entrySpacing * roadmap.length + 8;
  panelContentHeight += headingBlock; // Support heading
  panelContentHeight += supportPoints.length * 22;
  panelContentHeight += 20;
  panelContentHeight += footerLines.length * 18;

  const panelHeight = panelContentHeight + paddingBottom;

  context.save();

  const backdropGradient = context.createLinearGradient(0, 0, 0, h);
  backdropGradient.addColorStop(0, 'rgba(5, 11, 18, 0.9)');
  backdropGradient.addColorStop(1, 'rgba(4, 10, 15, 0.94)');
  context.fillStyle = backdropGradient;
  context.fillRect(0, 0, w, h);

  const panelGradient = context.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
  panelGradient.addColorStop(0, '#13273a');
  panelGradient.addColorStop(1, '#0b1620');
  context.shadowColor = 'rgba(10, 28, 38, 0.65)';
  context.shadowBlur = 28;
  context.fillStyle = panelGradient;
  context.fillRect(panelX, panelY, panelWidth, panelHeight);
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;

  context.strokeStyle = '#1f3547';
  context.lineWidth = 2;
  context.strokeRect(panelX, panelY, panelWidth, panelHeight);

  const accentGradient = context.createLinearGradient(panelX, panelY, panelX + panelWidth, panelY);
  accentGradient.addColorStop(0, '#1fb879');
  accentGradient.addColorStop(1, '#6fffbe');
  context.fillStyle = accentGradient;
  context.fillRect(panelX, panelY, panelWidth, 3);

  const contentX = panelX + paddingX;
  let cursorY = panelY + paddingTop;

  context.textAlign = 'left';
  context.textBaseline = 'top';

  context.fillStyle = '#92ffa6';
  context.font = 'bold 32px system-ui, sans-serif';
  context.fillText('About Choppa', contentX, cursorY);
  cursorY += 34;
  cursorY += 10;

  context.fillStyle = '#d2e8f3';
  context.font = '16px system-ui, sans-serif';
  for (const line of taglineLines) {
    context.fillText(line, contentX, cursorY);
    cursorY += 20;
  }
  cursorY += 26;

  const statGap = 16;
  const cardWidth = (contentWidth - statGap * (stats.length - 1)) / stats.length;
  const statsTop = cursorY;
  for (let i = 0; i < stats.length; i += 1) {
    const cardX = contentX + i * (cardWidth + statGap);
    const cardGradient = context.createLinearGradient(
      cardX,
      statsTop,
      cardX,
      statsTop + statCardHeight,
    );
    cardGradient.addColorStop(0, '#14283a');
    cardGradient.addColorStop(1, '#101d2a');
    context.fillStyle = cardGradient;
    context.fillRect(cardX, statsTop, cardWidth, statCardHeight);
    context.strokeStyle = '#274058';
    context.strokeRect(cardX, statsTop, cardWidth, statCardHeight);

    context.fillStyle = '#74e49a';
    context.font = 'bold 15px system-ui, sans-serif';
    context.fillText(stats[i]!.label, cardX + 16, statsTop + 12);

    context.fillStyle = '#f4fff8';
    context.font = 'bold 20px system-ui, sans-serif';
    context.fillText(stats[i]!.value, cardX + 16, statsTop + 32);

    context.fillStyle = '#9cb4c7';
    context.font = '12px system-ui, sans-serif';
    context.fillText(stats[i]!.description, cardX + 16, statsTop + statCardHeight - 18);
  }
  cursorY += statCardHeight;
  cursorY += 32;

  const drawSectionHeading = (title: string) => {
    context.fillStyle = '#1fb879';
    context.fillRect(contentX, cursorY, 44, accentHeight);
    cursorY += accentHeight + 10;
    context.fillStyle = '#92ffa6';
    context.font = 'bold 20px system-ui, sans-serif';
    context.fillText(title, contentX, cursorY);
    cursorY += 24;
  };

  drawSectionHeading('Mission Brief');
  context.fillStyle = '#c8d7e1';
  context.font = '15px system-ui, sans-serif';
  for (const line of missionLines) {
    context.fillText(line, contentX, cursorY);
    cursorY += 20;
  }
  cursorY += 12;

  drawSectionHeading('Core Pillars');
  context.font = '15px system-ui, sans-serif';
  const bulletOffset = 16;
  for (const point of pillarPoints) {
    context.fillStyle = '#92ffa6';
    context.beginPath();
    context.arc(contentX + 5, cursorY + 8, 4, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#d2e8f3';
    context.fillText(point, contentX + bulletOffset, cursorY);
    cursorY += 22;
  }
  cursorY += 16;

  drawSectionHeading('Tech Stack & Tools');
  const chipFont = '14px system-ui, sans-serif';
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
    context.fillStyle = '#132437';
    context.fillRect(chipX, chipRectY, chipWidth, chipHeight);
    const chipStrokeGradient = context.createLinearGradient(
      chipX,
      chipRectY,
      chipX,
      chipRectY + chipHeight,
    );
    chipStrokeGradient.addColorStop(0, '#2b485f');
    chipStrokeGradient.addColorStop(1, '#1a2f3f');
    context.strokeStyle = chipStrokeGradient;
    context.strokeRect(chipX, chipRectY, chipWidth, chipHeight);
    context.fillStyle = '#a9d4ee';
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
  const timelineBottom = cursorY + entrySpacing * (roadmap.length - 1) + 44;
  context.strokeStyle = '#1f3547';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(timelineX, timelineTop);
  context.lineTo(timelineX, timelineBottom);
  context.stroke();

  let entryY = cursorY;
  for (const entry of roadmap) {
    const dotY = entryY + 6;
    context.fillStyle = '#92ffa6';
    context.beginPath();
    context.arc(timelineX, dotY, 5, 0, Math.PI * 2);
    context.fill();

    const textX = timelineX + 18;
    context.fillStyle = '#92ffa6';
    context.font = 'bold 16px system-ui, sans-serif';
    context.fillText(entry.phase, textX, entryY - 4);

    context.fillStyle = '#c8d7e1';
    context.font = '14px system-ui, sans-serif';
    let noteY = entryY + 18;
    for (const note of entry.notes) {
      context.fillText(`• ${note}`, textX, noteY);
      noteY += 18;
    }

    entryY += entrySpacing;
  }
  cursorY = entryY + 8;

  drawSectionHeading('How You Can Help');
  context.font = '15px system-ui, sans-serif';
  for (const item of supportPoints) {
    context.fillStyle = '#1fb879';
    context.fillRect(contentX, cursorY + 6, 6, 6);
    context.fillStyle = '#d2e8f3';
    context.fillText(item, contentX + 16, cursorY);
    cursorY += 22;
  }
  cursorY += 20;

  context.fillStyle = '#748a9b';
  context.font = '13px system-ui, sans-serif';
  for (const line of footerLines) {
    context.fillText(line, contentX, cursorY);
    cursorY += 18;
  }

  context.restore();
}
