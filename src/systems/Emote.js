const EMOTES = [
  { icon: '👍', label: 'Süper' },
  { icon: '✋', label: 'Selam' },
  { icon: '😄', label: 'Mutlu' },
  { icon: '❓', label: 'Meraklı' },
  { icon: '📚', label: 'Ders' },
  { icon: '🎉', label: 'Parti' },
  { icon: '🏃', label: 'Koş' },
  { icon: '🤔', label: 'Düşün' },
];

export class Emote {
  constructor() {
    this._open = false;
    this._buildUI();
    this._activeEmote = null;
  }

  _buildUI() {
    // Emote button
    this.btn = document.createElement('button');
    this.btn.textContent = '😄';
    this.btn.title = 'Emote Menüsü';
    this.btn.style.cssText = `
      position:fixed; bottom:20px; right:70px; z-index:300;
      width:46px; height:46px; background:rgba(0,0,0,0.7);
      border:2px solid #7bc67e; border-radius:50%;
      color:#7bc67e; font-size:1.4rem; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
    `;
    this.btn.onclick = () => this.toggle();
    document.body.appendChild(this.btn);

    // Emote panel
    this.panel = document.createElement('div');
    this.panel.id = 'emote-panel';
    this.panel.style.cssText = `
      position:fixed; bottom:74px; right:16px; z-index:300;
      background:rgba(10,8,5,0.93); border:2px solid #7bc67e;
      border-radius:16px; padding:12px; display:none;
      display:none; flex-wrap:wrap; gap:8px; width:220px;
    `;

    EMOTES.forEach(e => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width:48px; height:48px; background:#1a1a0e;
        border:1px solid #7bc67e44; border-radius:10px;
        font-size:1.5rem; cursor:pointer; display:flex;
        align-items:center; justify-content:center;
        transition:transform 0.1s, background 0.1s;
        title="${e.label}";
      `;
      btn.textContent = e.icon;
      btn.title = e.label;
      btn.onmouseenter = () => btn.style.background = '#2a2a1e';
      btn.onmouseleave = () => btn.style.background = '#1a1a0e';
      btn.onclick = () => this.triggerEmote(e.icon);
      this.panel.appendChild(btn);
    });

    document.body.appendChild(this.panel);

    // Emote display bubble (attached to player, placed by main loop)
    this.bubble = document.createElement('div');
    this.bubble.id = 'emote-bubble';
    this.bubble.style.cssText = `
      position:fixed; display:none; z-index:350;
      font-size:2.5rem; pointer-events:none;
      animation:bounce 0.5s infinite;
      filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));
    `;
    document.body.appendChild(this.bubble);
  }

  toggle() {
    this._open = !this._open;
    this.panel.style.display = this._open ? 'flex' : 'none';
  }

  triggerEmote(icon) {
    this._open = false;
    this.panel.style.display = 'none';
    this._activeEmote = icon;
    this.bubble.textContent = icon;
    this.bubble.style.display = 'block';
    clearTimeout(this._emoteTimer);
    this._emoteTimer = setTimeout(() => {
      this.bubble.style.display = 'none';
      this._activeEmote = null;
    }, 2500);
  }

  updateBubblePosition(x, y) {
    if (this.bubble.style.display !== 'none') {
      this.bubble.style.left = `${x - 20}px`;
      this.bubble.style.top = `${y - 60}px`;
    }
  }
}
