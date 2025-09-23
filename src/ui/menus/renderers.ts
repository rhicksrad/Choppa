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
  context.save();
  context.fillStyle = '#0e141a';
  context.globalAlpha = 0.9;
  context.fillRect(0, 0, w, h);
  context.globalAlpha = 1;
  context.textAlign = 'center';
  context.fillStyle = '#92ffa6';
  context.font = 'bold 26px system-ui, sans-serif';
  context.fillText('About Choppa', w / 2, h * 0.2);
  context.fillStyle = '#c8d7e1';
  context.font = '14px system-ui, sans-serif';
  const lines = [
    'An original isometric helicopter action prototype.',
    'Built with TypeScript, Vite, and Canvas 2D.',
    'Code: MIT | Placeholder assets: CC0',
  ];
  for (let i = 0; i < lines.length; i += 1)
    context.fillText(lines[i]!, w / 2, h * 0.2 + 22 + i * 18);
  context.fillText('Press Esc to return.', w / 2, h * 0.2 + 22 + lines.length * 18 + 10);
  context.restore();
}
