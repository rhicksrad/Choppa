import type { InputSnapshot } from '../../core/input/input';
import { getCanvasViewMetrics } from '../../render/canvas/metrics';

export interface MenuItem {
  id: string;
  label: string;
}

export class Menu {
  private items: MenuItem[];
  private index = 0;
  private prevKeys: Record<string, boolean> = Object.create(null);
  private prevMouseButtons = 0;

  constructor(items: MenuItem[]) {
    this.items = items;
  }

  public update(input: InputSnapshot): string | null {
    const pressedOnce = (key: string): boolean => {
      const pressed = !!input.keys[key];
      const wasPressed = !!this.prevKeys[key];
      this.prevKeys[key] = pressed;
      return pressed && !wasPressed;
    };

    const moveUp = pressedOnce('ArrowUp') || pressedOnce('w') || pressedOnce('W');
    const moveDown = pressedOnce('ArrowDown') || pressedOnce('s') || pressedOnce('S');

    if (moveUp) this.index -= 1;
    if (moveDown) this.index += 1;
    if (this.index < 0) this.index = this.items.length - 1;
    if (this.index >= this.items.length) this.index = 0;

    // Activate

    const activate =
      pressedOnce('Enter') || pressedOnce(' ') || pressedOnce('Space') || pressedOnce('Spacebar');
    const mousePressed = (input.mouseButtons & 1) !== 0 && (this.prevMouseButtons & 1) === 0;
    this.prevMouseButtons = input.mouseButtons;

    if (activate || mousePressed) {
      return this.items[this.index]!.id;
    }

    // Mouse hover selection
    // Caller should provide geometry; here we only support click-to-activate on current selection
    return null;
  }

  public render(context: CanvasRenderingContext2D, title: string, subtitle: string): void {
    const { width: w, height: h } = getCanvasViewMetrics(context);
    context.save();
    context.fillStyle = '#0e141a';
    context.globalAlpha = 0.75;
    context.fillRect(0, 0, w, h);
    context.globalAlpha = 1;

    context.textAlign = 'center';
    context.textBaseline = 'top';

    const measureHeight = (text: string): number => {
      const metrics = context.measureText(text);
      const ascent = metrics.actualBoundingBoxAscent ?? 0;
      const descent = metrics.actualBoundingBoxDescent ?? 0;
      const measured = ascent + descent;
      if (measured > 0) return measured;
      const parsed = parseInt(context.font, 10);
      return Number.isFinite(parsed) ? parsed : 16;
    };

    const titleFont = 'bold 32px system-ui, sans-serif';
    const subtitleFont = '14px system-ui, sans-serif';
    const gapTitleSubtitle = 12;
    const gapSubtitleMenu = 36;
    const gapMenuItems = 18;

    context.font = titleFont;
    const titleHeight = measureHeight(title);
    context.font = subtitleFont;
    const subtitleHeight = measureHeight(subtitle);

    const menuFonts: string[] = [];
    const menuHeights: number[] = [];
    for (let i = 0; i < this.items.length; i += 1) {
      const selected = i === this.index;
      const font = selected ? 'bold 18px system-ui, sans-serif' : '16px system-ui, sans-serif';
      menuFonts.push(font);
      context.font = font;
      menuHeights.push(measureHeight(this.items[i]!.label));
    }

    const menuCount = menuHeights.length;
    const menuHeightSum = menuHeights.reduce((sum, height) => sum + height, 0);
    const menuGapSum = menuCount > 1 ? (menuCount - 1) * gapMenuItems : 0;
    const totalHeight =
      titleHeight +
      gapTitleSubtitle +
      subtitleHeight +
      (menuCount > 0 ? gapSubtitleMenu + menuHeightSum + menuGapSum : 0);

    let y = (h - totalHeight) / 2;

    context.fillStyle = '#92ffa6';
    context.font = titleFont;
    context.fillText(title, w / 2, y);
    y += titleHeight + gapTitleSubtitle;

    context.fillStyle = '#c8d7e1';
    context.font = subtitleFont;
    context.fillText(subtitle, w / 2, y);
    y += subtitleHeight;

    if (menuCount > 0) {
      y += gapSubtitleMenu;
      for (let i = 0; i < menuCount; i += 1) {
        const item = this.items[i]!;
        const selected = i === this.index;
        context.fillStyle = selected ? '#ffffff' : '#9fb3c8';
        context.font = menuFonts[i]!;
        context.fillText(item.label, w / 2, y);
        y += menuHeights[i]!;
        if (i < menuCount - 1) y += gapMenuItems;
      }
    }

    context.restore();
  }
}
