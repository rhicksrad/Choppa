import type { UIStore } from './scenes';
import { getCanvasViewMetrics } from '../../render/canvas/metrics';

export function renderSettings(context: CanvasRenderingContext2D, _ui: UIStore): void {
  const { width: w, height: h } = getCanvasViewMetrics(context);
  context.save();
  context.fillStyle = '#0e141a';
  context.globalAlpha = 0.9;
  context.fillRect(0, 0, w, h);
  context.globalAlpha = 1;
  context.textAlign = 'center';
  context.fillStyle = '#92ffa6';
  context.font = 'bold 26px system-ui, sans-serif';
  context.fillText('Settings', w / 2, h * 0.2);
  context.fillStyle = '#c8d7e1';
  context.font = '14px system-ui, sans-serif';
  context.fillText('Use number keys to adjust:', w / 2, h * 0.2 + 22);
  const lines = [
    '1/2 — Master Volume -/+',
    '3/4 — Music Volume -/+',
    '5/6 — SFX Volume -/+',
    'F — Toggle Fog of War',
    'K — Toggle Screen Shake',
    'Press Esc to return',
  ];
  for (let i = 0; i < lines.length; i += 1)
    context.fillText(lines[i]!, w / 2, h * 0.2 + 40 + i * 18);
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
