export interface InputState {
  moveX: number; // -1 to 1
  moveY: number; // -1 to 1
  isInteracting: boolean;
  isKillPressed: boolean;
  isVentPressed: boolean;
  isReportPressed: boolean;
  isSabotagePressed: boolean;
}

export class InputHandler {
  private keys: { [key: string]: boolean } = {};
  public joystickDir: { x: number; y: number } = { x: 0, y: 0 };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isEditableTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    // Prevent browser scroll only while the keyboard is controlling the game.
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    this.keys[key] = true;
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    // Always release the key, including when focus moved to the chat between
    // keydown and keyup, so movement cannot get stuck.
    this.keys[event.key.toLowerCase()] = false;
  };

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.keys = {};
    this.joystickDir = { x: 0, y: 0 };
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;

    const tagName = target.tagName;
    return tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      tagName === 'SELECT' ||
      target.isContentEditable;
  }

  public getInputState(): InputState {
    let moveX = 0;
    let moveY = 0;

    if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    // Combine with Joystick
    if (this.joystickDir.x !== 0 || this.joystickDir.y !== 0) {
      moveX = this.joystickDir.x;
      moveY = this.joystickDir.y;
    }

    // Normalize diagonal vector
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }

    return {
      moveX,
      moveY,
      isInteracting: Boolean(this.keys['e'] || this.keys[' ']),
      isKillPressed: Boolean(this.keys['q']),
      isVentPressed: Boolean(this.keys['v']),
      isReportPressed: Boolean(this.keys['r']),
      isSabotagePressed: Boolean(this.keys['x'])
    };
  }
}
