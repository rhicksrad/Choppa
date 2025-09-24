const fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const palette = {
  backdrop: 'rgba(5, 11, 18, 0.82)',
  backdropStrong: 'rgba(7, 16, 24, 0.92)',
  panel: 'rgba(12, 22, 32, 0.94)',
  panelSunken: 'rgba(9, 18, 27, 0.9)',
  panelBorder: 'rgba(146, 255, 166, 0.18)',
  panelBorderMuted: 'rgba(48, 66, 80, 0.55)',
  panelShadow: 'rgba(0, 0, 0, 0.35)',
  accent: '#92ffa6',
  accentSoft: 'rgba(146, 255, 166, 0.28)',
  accentStrong: '#1fb879',
  textPrimary: '#e6eef5',
  textSecondary: '#c8d7e1',
  textMuted: '#7f92a3',
  textInverted: '#050b12',
  warning: '#ff8a5c',
  caution: '#ffd166',
  danger: '#f94144',
  minimapFill: '#0b1720',
  minimapBorder: '#11202b',
  minimapGrid: 'rgba(20, 42, 58, 0.7)',
  minimapEnemy: '#ef476f',
  minimapPlayer: '#92ffa6',
};

export type FontWeight = 'regular' | 'medium' | 'bold';

export function font(size: number, weight: FontWeight = 'regular'): string {
  const prefix = weight === 'bold' ? 'bold ' : weight === 'medium' ? '600 ' : '';
  return `${prefix}${size}px ${fontFamily}`;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelOptions {
  radius?: number;
  fill?: string | CanvasGradient;
  stroke?: string;
  borderWidth?: number;
  shadow?:
    | false
    | {
        color?: string;
        blur?: number;
        offsetX?: number;
        offsetY?: number;
      };
}

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  alpha = 0.82,
  fill: string = palette.backdrop,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawPanel(ctx: CanvasRenderingContext2D, rect: Rect, options: PanelOptions = {}): void {
  const { radius = 10, fill = palette.panel, stroke = palette.panelBorder, borderWidth = 1.5 } = options;
  const shadowOptions = options.shadow === undefined ? {} : options.shadow;

  ctx.save();

  if (shadowOptions !== false) {
    const shadowColor = (shadowOptions && shadowOptions.color) || palette.panelShadow;
    const shadowBlur = (shadowOptions && shadowOptions.blur) ?? 20;
    const shadowOffsetX = (shadowOptions && shadowOptions.offsetX) ?? 0;
    const shadowOffsetY = (shadowOptions && shadowOptions.offsetY) ?? 12;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  roundedRectPath(ctx, rect, radius);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (borderWidth > 0) {
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = stroke;
    roundedRectPath(ctx, rect, radius);
    ctx.stroke();
  }

  ctx.restore();
}

export function createVerticalGradient(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  topColor: string,
  bottomColor: string,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  return gradient;
}

export function mixColor(base: string, mix: string, ratio: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const baseRgb = hexToRgb(base);
  const mixRgb = hexToRgb(mix);
  if (!baseRgb || !mixRgb) return base;
  const mixRatio = Math.max(0, Math.min(1, ratio));
  const r = clamp(baseRgb.r + (mixRgb.r - baseRgb.r) * mixRatio);
  const g = clamp(baseRgb.g + (mixRgb.g - baseRgb.g) * mixRatio);
  const b = clamp(baseRgb.b + (mixRgb.b - baseRgb.b) * mixRatio);
  return rgbToHex(r, g, b);
}

export function traceRoundedRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number): void {
  roundedRectPath(ctx, rect, radius);
}

function roundedRectPath(ctx: CanvasRenderingContext2D, rect: Rect, radius: number): void {
  const { x, y, width, height } = rect;
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value)) return null;
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(component: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(component)));
  return clamped.toString(16).padStart(2, '0');
}
