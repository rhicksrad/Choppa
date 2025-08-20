export type Key = string;

export interface InputSnapshot {
  /** key -> pressed */
  keys: Record<string, boolean>;
  /** mouse position in pixels */
  mouseX: number;
  mouseY: number;
  /** buttons: 0=LMB, 1=MMB, 2=RMB */
  mouseButtons: number;
  /** wheel delta since last frame */
  wheelDeltaY: number;
  /** gamepad axes (normalized) */
  axes: number[];
  /** gamepad buttons (0..1 pressed value) */
  buttons: number[];
}

/**
 * InputManager collects input state with minimal allocations.
 * Gamepad is optional; basic deadzone is applied.
 */
export class InputManager {
  private pressed: Record<Key, boolean> = Object.create(null);
  private mouseX = 0;
  private mouseY = 0;
  private mouseButtons = 0;
  private wheelDeltaY = 0;

  private snapshot: InputSnapshot = {
    keys: Object.create(null),
    mouseX: 0,
    mouseY: 0,
    mouseButtons: 0,
    wheelDeltaY: 0,
    axes: [],
    buttons: [],
  };

  private deadzone = 0.15;

  public attach(target: HTMLElement | Window = window): void {
    const onKeyDown = (e: KeyboardEvent): void => {
      this.pressed[e.key] = true;
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      this.pressed[e.key] = false;
    };
    const onMouseMove = (e: MouseEvent): void => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };
    const onMouseDown = (e: MouseEvent): void => {
      this.mouseButtons |= 1 << e.button;
    };
    const onMouseUp = (e: MouseEvent): void => {
      this.mouseButtons &= ~(1 << e.button);
    };
    const onWheel = (e: WheelEvent): void => {
      this.wheelDeltaY += e.deltaY;
    };

    target.addEventListener('keydown', onKeyDown as EventListener);
    target.addEventListener('keyup', onKeyUp as EventListener);
    target.addEventListener('mousemove', onMouseMove as EventListener);
    target.addEventListener('mousedown', onMouseDown as EventListener);
    target.addEventListener('mouseup', onMouseUp as EventListener);
    target.addEventListener('wheel', onWheel as EventListener, { passive: true });
  }

  public readSnapshot(): InputSnapshot {
    // Copy keys into snapshot.keys without reallocating object
    const keys = this.snapshot.keys;
    // Clear previous keys cheaply by setting to false when seen false
    for (const k in keys) {
      if (Object.prototype.hasOwnProperty.call(keys, k)) keys[k] = false;
    }
    for (const k in this.pressed) {
      if (Object.prototype.hasOwnProperty.call(this.pressed, k)) {
        keys[k] = !!this.pressed[k];
      }
    }

    // Mouse
    this.snapshot.mouseX = this.mouseX;
    this.snapshot.mouseY = this.mouseY;
    this.snapshot.mouseButtons = this.mouseButtons;

    // Wheel (consume this frame)
    this.snapshot.wheelDeltaY = this.wheelDeltaY;
    this.wheelDeltaY = 0;

    // Gamepad (first connected)
    const gamepads = navigator.getGamepads?.() ?? [];
    const gp = gamepads[0];
    const axesOut = (this.snapshot.axes = this.snapshot.axes || []);
    const buttonsOut = (this.snapshot.buttons = this.snapshot.buttons || []);
    axesOut.length = 0;
    buttonsOut.length = 0;
    if (gp) {
      for (let i = 0; i < gp.axes.length; i += 1) {
        const v = gp.axes[i] ?? 0;
        axesOut.push(Math.abs(v) < this.deadzone ? 0 : v);
      }
      for (let i = 0; i < gp.buttons.length; i += 1) {
        buttonsOut.push(gp.buttons[i]?.value ?? 0);
      }
    }
    return this.snapshot;
  }
}
