// Dünya boyutu ±55 birim → minimap piksel
const WORLD_SIZE = 110;

// Bina renklerini ve konumlarını tanımla (world.js ile senkron)
const BUILDINGS = [
  { label: '📚', cx:   0, cz: -32, hw: 7.5, hd: 5.5, color: '#e8c97a' },
  { label: '🔬', cx:  24, cz: -20, hw: 6.5, hd: 5,   color: '#b0d4e8' },
  { label: '🎨', cx:  34, cz:   5, hw: 5.5, hd: 6,   color: '#cd8b5a' },
  { label: '🍽', cx:   0, cz:  32, hw: 8.5, hd: 5.5, color: '#f5deb3' },
  { label: '⚽', cx: -24, cz:  20, hw: 7,   hd: 6,   color: '#c8a2c8' },
  { label: '🏛', cx: -32, cz:   0, hw: 6.5, hd: 5.5, color: '#f0f0e8' },
];

export class Minimap {
  constructor() {
    this.SIZE       = 180;   // canvas boyutu px
    this.scale      = this.SIZE / WORLD_SIZE;
    this.activeTarget = null;  // { x, z, label }
    this.npcs         = [];    // { id, x, z, hasQuest }
    this.collectibles = [];    // { x, z }

    this._build();
  }

  _build() {
    this.wrap = document.createElement('div');
    this.wrap.style.cssText = `
      position:fixed; bottom:160px; left:12px; z-index:300;
      width:${this.SIZE}px; height:${this.SIZE}px;
      border-radius:50%; overflow:hidden;
      border:3px solid rgba(246,201,14,0.7);
      box-shadow:0 2px 12px rgba(0,0,0,0.5);
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.width  = this.SIZE;
    this.canvas.height = this.SIZE;
    this.wrap.appendChild(this.canvas);

    // Kuzey etiketi
    const north = document.createElement('div');
    north.style.cssText = `
      position:absolute; top:2px; left:50%; transform:translateX(-50%);
      color:#f6c90e; font-size:0.65rem; font-weight:bold; pointer-events:none;
    `;
    north.textContent = 'K';
    this.wrap.appendChild(north);

    document.body.appendChild(this.wrap);
    this.ctx = this.canvas.getContext('2d');
  }

  // Dünya koordinatını minimap piksellerine dönüştür
  _w2p(wx, wz) {
    return {
      px: (wx + WORLD_SIZE / 2) * this.scale,
      py: (wz + WORLD_SIZE / 2) * this.scale,
    };
  }

  setNPCs(npcList) {
    // npcList: [{ id, position:[x,y,z], hasAvailableQuest, hasActiveQuest }]
    this.npcs = npcList;
  }

  setActiveTarget(target) {
    // target: null | { x, z, label }
    this.activeTarget = target;
  }

  setCollectibles(list) {
    this.collectibles = list; // [{ x, z }]
  }

  update(playerX, playerZ, cameraYaw) {
    const ctx = this.ctx;
    const S   = this.SIZE;
    ctx.clearRect(0, 0, S, S);

    // ── Arkaplan ──
    ctx.save();
    ctx.beginPath();
    ctx.arc(S/2, S/2, S/2, 0, Math.PI*2);
    ctx.clip();

    // Çim
    ctx.fillStyle = '#4a8c4a';
    ctx.fillRect(0, 0, S, S);

    // Yollar
    ctx.fillStyle = '#d4c080';
    ctx.fillRect(S/2-2, 0, 4, S);
    ctx.fillRect(0, S/2-2, S, 4);

    // Binalar
    BUILDINGS.forEach(b => {
      const tl = this._w2p(b.cx - b.hw, b.cz - b.hd);
      const br = this._w2p(b.cx + b.hw, b.cz + b.hd);
      ctx.fillStyle = b.color;
      ctx.fillRect(tl.px, tl.py, br.px - tl.px, br.py - tl.py);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(tl.px, tl.py, br.px - tl.px, br.py - tl.py);
    });

    // Koleksiyon noktaları — büyük sarı ⭐ (pulse animasyonu)
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
    this.collectibles.forEach(c => {
      const { px, py } = this._w2p(c.x, c.z);
      const r = 5 + pulse * 2;
      // Dış hale
      ctx.beginPath();
      ctx.arc(px, py, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,215,0,${0.25 + pulse * 0.2})`;
      ctx.fill();
      // İç dolu nokta
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.strokeStyle = '#fff8';
      ctx.lineWidth = 1;
      ctx.stroke();
      // ⭐ sembolü
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', px, py);
    });

    // NPC'ler
    this.npcs.forEach(n => {
      const { px, py } = this._w2p(n.x, n.z);
      ctx.fillStyle = n.hasAvailableQuest ? '#f6c90e'
                    : n.hasActiveQuest    ? '#4a90d9'
                    : '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // ── Aktif hedef: yanıp sönen kırmızı daire + ok ──
    if (this.activeTarget) {
      const { px: tpx, py: tpy } = this._w2p(this.activeTarget.x, this.activeTarget.z);
      const pulse = (Math.sin(Date.now() * 0.006) + 1) / 2; // 0..1
      ctx.strokeStyle = `rgba(255,80,80,${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tpx, tpy, 7 + pulse * 3, 0, Math.PI*2);
      ctx.stroke();

      // Hedefe ok çiz (oyuncu→hedef)
      const { px: ppx, py: ppy } = this._w2p(playerX, playerZ);
      const dx = tpx - ppx, dy = tpy - ppy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 10) {
        const nx = dx/dist, ny = dy/dist;
        // ok başlangıcı: oyuncudan 8px uzak
        const ax = ppx + nx*8, ay = ppy + ny*8;
        const ex = ppx + nx*Math.min(dist-8, 20);
        const ey = ppy + ny*Math.min(dist-8, 20);
        ctx.strokeStyle = '#ff5050';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ex, ey);
        // ok ucu
        const angle = Math.atan2(ny, nx);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - Math.cos(angle-0.4)*5, ey - Math.sin(angle-0.4)*5);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - Math.cos(angle+0.4)*5, ey - Math.sin(angle+0.4)*5);
        ctx.stroke();
      }
    }

    // ── Oyuncu (üçgen, kamera yönünü gösterir) ──
    const { px: ppx, py: ppy } = this._w2p(playerX, playerZ);
    ctx.save();
    ctx.translate(ppx, ppy);
    ctx.rotate(cameraYaw); // kamera yönünü değil, ileri yönü göster
    ctx.fillStyle = '#00eaff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // clip release
  }
}
