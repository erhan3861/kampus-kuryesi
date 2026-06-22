export class Input {
  constructor() {
    this.keys = {};
    this.moveX = 0;
    this.moveZ = 0;
    this.interactPressed = false;
    this.joystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
    this._joystickTouchId = null;
    this._setupKeyboard();
    this._setupTouch();
    this._createJoystickUI();
  }

  _setupKeyboard() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Space') {
        this.interactPressed = true;
      }
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  _createJoystickUI() {
    const zone = document.createElement('div');
    zone.id = 'joystick-zone';
    zone.style.cssText = `
      position:fixed; left:20px; bottom:20px;
      width:130px; height:130px; border-radius:50%;
      background:rgba(255,255,255,0.12); border:2px solid rgba(255,255,255,0.25);
      touch-action:none; user-select:none; display:none; z-index:200;
    `;

    const knob = document.createElement('div');
    knob.id = 'joystick-knob';
    knob.style.cssText = `
      position:absolute; width:52px; height:52px; border-radius:50%;
      background:rgba(255,255,255,0.55); border:2px solid rgba(255,255,255,0.8);
      top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none;
    `;
    zone.appendChild(knob);
    document.body.appendChild(zone);
    this._joystickZone = zone;
    this._joystickKnob = knob;

    if ('ontouchstart' in window) {
      zone.style.display = 'block';
    }
  }

  _setupTouch() {
    const zone = () => this._joystickZone;
    const knob = () => this._joystickKnob;
    const R = 50;

    document.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el === zone() || zone().contains(el)) {
          this._joystickTouchId = t.identifier;
          this.joystick.startX = t.clientX;
          this.joystick.startY = t.clientY;
          this.joystick.active = true;
          e.preventDefault();
        }
      }
    }, { passive: false });

    document.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._joystickTouchId) {
          const dx = t.clientX - this.joystick.startX;
          const dy = t.clientY - this.joystick.startY;
          const len = Math.sqrt(dx * dx + dy * dy);
          const clamped = Math.min(len, R);
          const nx = len > 0 ? dx / len : 0;
          const ny = len > 0 ? dy / len : 0;
          this.joystick.dx = nx * (clamped / R);
          this.joystick.dy = ny * (clamped / R);
          if (knob()) {
            knob().style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
          }
          e.preventDefault();
        }
      }
    }, { passive: false });

    const endTouch = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._joystickTouchId) {
          this._joystickTouchId = null;
          this.joystick.active = false;
          this.joystick.dx = 0;
          this.joystick.dy = 0;
          if (knob()) knob().style.transform = 'translate(-50%,-50%)';
        }
      }
    };
    document.addEventListener('touchend', endTouch);
    document.addEventListener('touchcancel', endTouch);
  }

  consumeInteract() {
    const v = this.interactPressed;
    this.interactPressed = false;
    return v;
  }

  getMovement() {
    let x = 0, z = 0;

    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) z += 1;

    if (this.joystick.active) {
      x += this.joystick.dx;
      z += this.joystick.dy;
    }

    const len = Math.sqrt(x * x + z * z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z };
  }

  isRunning() {
    return this.keys['ShiftLeft'] || this.keys['ShiftRight'];
  }
}
