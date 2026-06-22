// Howler.js ses yöneticisi
// Gerçek ses dosyaları olmadan Web Audio API ile procedural ses üretir

export class Audio {
  constructor() {
    this._ctx = null;
    this._bgGain = null;
    this._sfxGain = null;
    this._bgPlaying = false;
    this._muted = false;
    this._init();
    this._buildMuteBtn();
  }

  _init() {
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._bgGain = this._ctx.createGain();
      this._bgGain.gain.value = 0.18;
      this._bgGain.connect(this._ctx.destination);

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = 0.55;
      this._sfxGain.connect(this._ctx.destination);
    } catch (e) {
      console.warn('Web Audio API desteklenmiyor.');
    }
  }

  startAmbient() {
    if (!this._ctx || this._bgPlaying) return;
    this._bgPlaying = true;
    this._playAmbientLoop();
  }

  _playAmbientLoop() {
    if (!this._ctx || !this._bgPlaying) return;
    const duration = 8;
    const notes = [261.63, 293.66, 329.63, 392, 349.23, 329.63, 293.66, 261.63];
    let t = this._ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i);
      gain.gain.linearRampToValueAtTime(0.12, t + i + 0.3);
      gain.gain.linearRampToValueAtTime(0.08, t + i + 0.7);
      gain.gain.linearRampToValueAtTime(0, t + i + 1.0);
      osc.connect(gain);
      gain.connect(this._bgGain);
      osc.start(t + i);
      osc.stop(t + i + 1.2);
    });

    // Nature pad (slow oscillating noise texture)
    const bufferSize = this._ctx.sampleRate * 2;
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.015;
    }
    const src = this._ctx.createBufferSource();
    const filter = this._ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    src.buffer = buffer;
    src.loop = true;
    src.connect(filter);
    filter.connect(this._bgGain);
    src.start(t);
    src.stop(t + duration);

    setTimeout(() => this._playAmbientLoop(), duration * 1000 - 500);
  }

  play(eventName) {
    if (!this._ctx || this._muted) return;
    const map = {
      pickup:         () => this._tone(880, 0.08, 'square', 0.12),
      quest_start:    () => { this._tone(523, 0.06, 'sine', 0.1); setTimeout(() => this._tone(659, 0.06, 'sine', 0.1), 120); setTimeout(() => this._tone(784, 0.08, 'sine', 0.15), 240); },
      quest_complete: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._tone(f, 0.08, 'sine', 0.2), i * 100)); },
      correct:        () => { this._tone(659, 0.06, 'sine', 0.1); setTimeout(() => this._tone(880, 0.06, 'sine', 0.12), 100); },
      wrong:          () => this._tone(220, 0.08, 'sawtooth', 0.2),
      interact:       () => this._tone(660, 0.03, 'sine', 0.05),
    };
    if (map[eventName]) map[eventName]();
  }

  _tone(freq, vol, type = 'sine', duration = 0.15) {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.start();
    osc.stop(this._ctx.currentTime + duration + 0.01);
  }

  resume() {
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  }

  _buildMuteBtn() {
    const btn = document.createElement('button');
    btn.textContent = '🔊';
    btn.title = 'Sesi Aç/Kapat';
    btn.style.cssText = `
      position:fixed; bottom:20px; right:178px; z-index:300;
      width:46px; height:46px; background:rgba(0,0,0,0.7);
      border:2px solid #aaa; border-radius:50%;
      color:#aaa; font-size:1.2rem; cursor:pointer;
    `;
    btn.onclick = () => {
      this._muted = !this._muted;
      if (this._bgGain) this._bgGain.gain.value = this._muted ? 0 : 0.18;
      btn.textContent = this._muted ? '🔇' : '🔊';
    };
    document.body.appendChild(btn);
  }
}
