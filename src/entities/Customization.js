const COLOR_OPTIONS = {
  shirt:  ['#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#ffffff', '#333333'],
  pants:  ['#2c3e6e', '#8b4513', '#2c2c2c', '#5d6d7e', '#1a5276', '#4a235a'],
  shoes:  ['#4a3728', '#222222', '#f5f5f5', '#c0392b', '#1a5276'],
  bag:    ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e67e22'],
  hair:   ['#3d2b1f', '#f39c12', '#e74c3c', '#1abc9c', '#9b59b6', '#222222', '#aaaaaa', '#fff9c4'],
  skin:   ['#f4a460', '#d2956d', '#a0522d', '#c68642', '#f5deb3', '#8b4513'],
};

export class Customization {
  constructor(onColorChange) {
    this.colors = {
      shirt: 0x4a90d9, pants: 0x2c3e6e, shoes: 0x4a3728,
      bag: 0xe74c3c, hair: 0x3d2b1f, skin: 0xf4a460,
    };
    this._onChange = onColorChange;
    this._open = false;
    this._buildUI();
  }

  _buildUI() {
    // Toggle button
    this.btn = document.createElement('button');
    this.btn.textContent = '👕';
    this.btn.title = 'Kıyafet';
    this.btn.style.cssText = `
      position:fixed; bottom:20px; right:124px; z-index:300;
      width:46px; height:46px; background:rgba(0,0,0,0.7);
      border:2px solid #4a90d9; border-radius:50%;
      color:#4a90d9; font-size:1.4rem; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
    `;
    this.btn.onclick = () => this.toggle();
    document.body.appendChild(this.btn);

    // Panel
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position:fixed; bottom:74px; right:74px; z-index:300;
      background:rgba(10,8,5,0.95); border:2px solid #4a90d9;
      border-radius:16px; padding:16px; display:none; width:260px;
      box-shadow:0 4px 24px rgba(0,0,0,0.6);
    `;
    this.panel.innerHTML = `<h3 style="color:#4a90d9;margin:0 0 12px;font-size:0.95rem;">👕 Kıyafet Özelleştir</h3>`;

    const labels = { shirt: 'Üst', pants: 'Alt', shoes: 'Ayakkabı', bag: 'Çanta', hair: 'Saç', skin: 'Ten' };
    Object.keys(COLOR_OPTIONS).forEach(key => {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:10px;';
      row.innerHTML = `<div style="color:#ccc;font-size:0.8rem;margin-bottom:4px;">${labels[key]}</div>`;
      const swatches = document.createElement('div');
      swatches.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
      COLOR_OPTIONS[key].forEach(hex => {
        const sw = document.createElement('button');
        sw.style.cssText = `
          width:24px; height:24px; background:${hex}; border:2px solid transparent;
          border-radius:50%; cursor:pointer; transition:border-color 0.1s, transform 0.1s;
        `;
        sw.onclick = () => {
          const threeHex = parseInt(hex.replace('#', ''), 16);
          this.colors[key] = threeHex;
          this._onChange && this._onChange({ ...this.colors });
          // highlight
          swatches.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
          sw.style.borderColor = '#fff';
        };
        swatches.appendChild(sw);
      });
      row.appendChild(swatches);
      this.panel.appendChild(row);
    });

    document.body.appendChild(this.panel);
  }

  toggle() {
    this._open = !this._open;
    this.panel.style.display = this._open ? 'block' : 'none';
  }

  getColors() {
    return { ...this.colors };
  }
}
