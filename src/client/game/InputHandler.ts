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
  public touchJoystick: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  public getInputState(): InputState {
    let moveX = 0;
    let moveY = 0;

    if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    // Blend with touch joystick if active
    if (this.touchJoystick.x !== 0 || this.touchJoystick.y !== 0) {
      moveX = this.touchJoystick.x;
      moveY = this.touchJoystick.y;
    }

    // Normalize diagonal movement speed
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
