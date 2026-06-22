import * as THREE from 'three';
import { Collision } from './Collision.js';
import { loadModelCached } from './AssetLoader.js';

// Kenney modelleri ~1 birim yükseklik.
// Bina scale 8 → ~6–8m yüksek, ağaç scale 5 → ~4m, çit scale 3 → ~3m panel

export class World {
  constructor(scene) {
    this.scene      = scene;
    this.collision  = new Collision();
    this.collectibles = [];
    this._glbRoots  = [];   // yüklü GLB grupları — frustum culling için

    this._buildGround();
    this._buildPathsFlat();
    this._buildGarden();
    this._buildClockTower();
    this._buildBenches();
    this._buildStreetLamps();

    // Kampüs sınırı collision (±50)
    this.collision.addBox( 0,  53, 55, 1);
    this.collision.addBox( 0, -53, 55, 1);
    this.collision.addBox( 53,  0,  1, 55);
    this.collision.addBox(-53,  0,  1, 55);

    // GLB'leri yükle — binaları + ağaçları + çitleri + saksıları
    this._loadAssets();
  }

  // ── YARDIMCILAR ──────────────────────────────────────────────────────────
  _mat(color, opts = {}) { return new THREE.MeshToonMaterial({ color, ...opts }); }

  _box(w, h, d, color, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this._mat(color));
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    this.scene.add(m); return m;
  }

  _cyl(rt, rb, h, seg, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), this._mat(color));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    this.scene.add(m); return m;
  }

  _sph(r, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), this._mat(color));
    m.position.set(x, y, z); m.castShadow = true;
    this.scene.add(m); return m;
  }

  _cone(r, h, seg, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), this._mat(color));
    m.position.set(x, y, z); m.castShadow = true;
    this.scene.add(m); return m;
  }

  _plane(w, l, color, x, z, y = 0.01, ry = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), this._mat(color));
    m.rotation.x = -Math.PI / 2; m.rotation.z = ry;
    m.position.set(x, y, z); m.receiveShadow = true;
    this.scene.add(m); return m;
  }

  _sign(x, y, z, text) {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fffbe6'; ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 60);
    ctx.fillStyle = '#3d2b1f'; ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 1.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })
    );
    m.position.set(x, y, z); this.scene.add(m);
  }

  // ── ZEMİN ────────────────────────────────────────────────────────────────
  _buildGround() {
    // Büyük çim
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(62, 64), this._mat(0x4e9e52));
    gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true;
    this.scene.add(gnd);

    // İç daha açık çim
    const inn = new THREE.Mesh(new THREE.CircleGeometry(52, 64), this._mat(0x5dba5e));
    inn.rotation.x = -Math.PI / 2; inn.position.y = 0.004; inn.receiveShadow = true;
    this.scene.add(inn);

    // Kaldırım halkası
    const ring = new THREE.Mesh(new THREE.RingGeometry(50, 55, 64), this._mat(0xa09070));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.008;
    this.scene.add(ring);

    // Merkez taş meydan
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(7, 32), this._mat(0xcfc0a0));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.012;
    this.scene.add(plaza);

    // Bina önü plakalar (açık beton)
    [
      { x:  0,  z: -24, w: 12, l:  6 },  // kütüphane
      { x:  0,  z:  24, w: 12, l:  6 },  // kafeterya
      { x: -24, z:   0, w:  6, l: 12 },  // rektörlük
      { x:  24, z: -18, w:  6, l: 10 },  // fen lab
      { x:  33, z:   5, w:  6, l: 12 },  // sanat
      { x: -24, z:  18, w:  6, l: 10 },  // spor
    ].forEach(({ x, z, w, l }) => this._plane(w, l, 0xddd0b0, x, z, 0.015));
  }

  // ── YOLLAR (düz düzlem) ───────────────────────────────────────────────────
  _buildPathsFlat() {
    const C = 0xd8c89a;
    // Dikey ana yol
    this._plane(5, 110, C,  0,  0, 0.02);
    // Yatay ana yol
    this._plane(5, 110, C,  0,  0, 0.021, Math.PI / 2);
    // Bina bağlantı yolları
    this._plane(4,  18, C,  0, -16, 0.022);
    this._plane(4,  18, C,  0,  16, 0.022);
    this._plane(18,  4, C, -16,   0, 0.022, Math.PI / 2);
    this._plane(18,  4, C,  16, -10, 0.022, Math.PI / 2);
  }

  // ── BAHÇE (çiçek tarhlari + fıskiye) ─────────────────────────────────────
  _buildGarden() {
    [[10, -8], [-10, -8], [10, 8], [-10, 8]].forEach(([x, z]) => {
      this._cyl(2.5, 2.5, 0.3, 16, 0x8b4513, x, 0.15, z);
      [0xef5350, 0xffd700, 0xff69b4, 0x9b59b6].forEach((c, i) => {
        const a = (i / 4) * Math.PI * 2;
        const fx = x + Math.cos(a) * 1.3, fz = z + Math.sin(a) * 1.3;
        this._sph(0.25, c, fx, 0.6, fz);
        this._cyl(0.06, 0.06, 0.5, 6, 0x2d8a2d, fx, 0.35, fz);
      });
    });
    this._cyl(3, 3.2, 0.5, 32, 0x4682b4, 0, 0.25, -5);
    this._cyl(0.2, 0.2, 2, 8, 0x888888, 0, 1.25, -5);
    this._sph(0.35, 0x87ceeb, 0, 2.4, -5);
  }

  // ── SAAT KULESİ ──────────────────────────────────────────────────────────
  _buildClockTower() {
    this._cyl(1.2, 1.5, 12, 8, 0xe8e0c8, 0, 6,    0);
    this._cyl(0.8, 1.2,  2, 8, 0xd4c8a8, 0, 13,   0);
    this._cone(1.5, 3, 8, 0xa0522d,       0, 15.5, 0);
    // Saat yüzü
    this._box(0.1, 1.2, 1.2, 0xffffff, 0, 9, -1.56);
    this.collision.addBox(0, 0, 1.8, 1.8);
  }

  // ── BANKLAR ───────────────────────────────────────────────────────────────
  _buildBenches() {
    [[5,-12],[-5,-12],[12,0],[-12,0],[5,12],[-5,12]].forEach(([x,z]) => {
      this._box(2.5, 0.15, 0.7, 0x8b6914, x, 0.5, z);
      [-0.9, 0.9].forEach(ox => this._box(0.15, 0.5, 0.6, 0x6b4226, x+ox, 0.3, z));
    });
  }

  // ── SOKAK LAMBALARI ────────────────────────────────────────────────────────
  _buildStreetLamps() {
    [[18,-18],[-18,-18],[18,18],[-18,18],[0,-38],[0,38],[-38,0],[38,0]].forEach(([x,z]) => {
      this._cyl(0.1, 0.13, 5, 8, 0x333333, x, 2.5, z);
      this._cyl(0.08, 0.08, 1.4, 6, 0x333333, x+0.55, 5.2, z);
      this._sph(0.38, 0xffffcc, x+0.55, 5.8, z);
    });
  }

  // ── GLB ASSET YÜKLEYİCİ ───────────────────────────────────────────────────
  _loadAssets() {
    const sc = this.scene;
    const place = (path, x, y, z, scale, ry = 0) => {
      loadModelCached(path, { scene: sc, x, y, z, scale, ry }).then(root => {
        if (root) {
          root.frustumCulled = true;
          root.traverse(c => { if (c.isMesh) c.frustumCulled = true; });
          this._glbRoots.push(root);
        }
      });
    };

    // ════════════════════════════════════════════════════════════
    //  KAMPÜS BİNALARI — her bina GLB ile değiştirildi
    //  Primitive bina yok, GLB doğrudan konumlanıyor.
    //  collision kutuları burada ekleniyor.
    // ════════════════════════════════════════════════════════════

    // KÜTÜPHANe (kuzey, z=-32)
    place('/models/building-type-c.glb',  0, 0, -32, 9);
    this._sign(0, 10, -27.5, '📚 KÜTÜPHANe');
    this.collision.addBox(0, -32, 6, 5.5);

    // FEN LABORATUVARI (kuzeydoğu, x=24 z=-20)
    place('/models/building-type-a.glb', 24, 0, -20, 8);
    this._sign(24, 9, -15.5, '🔬 FEN LAB');
    this.collision.addBox(24, -20, 5.5, 4.5);

    // SANAT ATÖLYESİ (doğu, x=34 z=5)
    place('/models/building-type-b.glb', 34, 0, 5, 8);
    this._sign(34, 9, -0.5, '🎨 SANAT');
    this.collision.addBox(34, 5, 5, 5.5);

    // KAFETERyA (güney, z=32)
    place('/models/building-type-d.glb',  0, 0, 32, 9);
    this._sign(0, 9, 26.5, '🍽️ KAFETERyA');
    this.collision.addBox(0, 32, 7, 5);

    // SPOR SALONU (güneybatı, x=-24 z=20)
    place('/models/building-type-e.glb', -24, 0, 20, 9);
    this._sign(-24, 10, 14.5, '⚽ SPOR SALONU');
    this.collision.addBox(-24, 20, 6, 5.5);

    // REKTÖRlÜK (batı, x=-32 z=0)
    place('/models/building-type-f.glb', -32, 0, 0, 9);
    this._sign(-32, 10.5, -5.5, '🏛️ REKTÖRlÜK');
    this.collision.addBox(-32, 0, 5.5, 5);

    // ════════════════════════════════════════════════════════════
    //  AĞAÇLAR — sadece kampüs içi (±48)
    // ════════════════════════════════════════════════════════════
    const trees = [
      // kütüphane çevresi
      [-8,-28, 0.0], [8,-28, 1.8], [-12,-24, 3.2], [12,-24, 4.9],
      // fen lab çevresi
      [18,-12, 1.1], [30,-12, 2.6], [18,-28, 0.5],
      // sanat çevresi
      [28,  2, 3.0], [28, 12, 5.5],
      // kafeterya çevresi
      [-8, 26, 1.4], [8,  26, 2.9], [-12, 38, 0.2], [12, 38, 3.7],
      // spor çevresi
      [-18, 12, 4.1], [-30, 12, 0.8], [-18, 28, 2.3],
      // rektörlük çevresi
      [-28, -8, 1.6], [-28,  8, 3.9],
      // merkez avlu
      [20, -5, 0.3], [-20, -5, 2.1], [20, 5, 4.4], [-20, 5, 1.0],
      // kenara yakın ama içeride
      [44, -20, 0.7], [-44, -20, 2.8], [44, 20, 4.0], [-44, 20, 1.3],
      [0, -44, 3.3], [0, 44, 0.9],
    ];
    trees.forEach(([x, z, ry], i) => {
      const big = i % 3 !== 0;
      place(
        big ? '/models/tree-large.glb' : '/models/tree-small.glb',
        x, 0, z, big ? 5 : 3.5, ry
      );
    });

    // ════════════════════════════════════════════════════════════
    //  ÇEVRE ÇİTLERİ — kampüs sınırı boyunca (z=±50, x=±50)
    // ════════════════════════════════════════════════════════════
    // fence.glb ~1.0 birim geniş; scale=3 → 3m, adım=3
    for (let i = -48; i <= 48; i += 3) {
      place('/models/fence.glb',  i,  0,  50, 3, 0);
      place('/models/fence.glb',  i,  0, -50, 3, 0);
      place('/models/fence.glb',  50, 0,   i, 3, Math.PI / 2);
      place('/models/fence.glb', -50, 0,   i, 3, Math.PI / 2);
    }

    // ════════════════════════════════════════════════════════════
    //  SAKSILAR / PLANTER — bina önleri
    // ════════════════════════════════════════════════════════════
    [
      // kütüphane
      [ 5,-27], [-5,-27],
      // kafeterya
      [ 5, 27], [-5, 27],
      // rektörlük
      [-27,  5], [-27, -5],
      // fen lab
      [18,-15], [30,-15],
      // sanat
      [29,  0], [29, 10],
      // spor
      [-18,14], [-30,14],
      // meydan
      [7, -3], [-7, -3], [7, 3], [-7, 3],
    ].forEach(([x, z]) => place('/models/planter.glb', x, 0, z, 3));

    // ════════════════════════════════════════════════════════════
    //  ALÇAK İÇ ÇİTLER — bina önü ayrıcı
    // ════════════════════════════════════════════════════════════
    [
      { x: -7,  z: -25, ry: 0 }, { x: 7,  z: -25, ry: 0 },
      { x: -7,  z:  25, ry: 0 }, { x: 7,  z:  25, ry: 0 },
      { x: -25, z:  6,  ry: Math.PI/2 }, { x: -25, z: -6, ry: Math.PI/2 },
    ].forEach(({ x, z, ry }) => place('/models/fence-low.glb', x, 0, z, 3, ry));
  }

  // ── KOLEKSİYON ────────────────────────────────────────────────────────────
  addCollectible(id, position, color = 0xffd700) {
    const geo = new THREE.OctahedronGeometry(0.4);
    const mat = new THREE.MeshToonMaterial({ color, emissive: color, emissiveIntensity: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.6;
    mesh.castShadow = true;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.04, 8, 24),
      new THREE.MeshToonMaterial({ color, emissive: color, emissiveIntensity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);
    this.scene.add(mesh);
    this.collectibles.push({ id, mesh, collected: false, baseY: mesh.position.y });
    return mesh;
  }

  removeCollectible(id) {
    const idx = this.collectibles.findIndex(c => c.id === id);
    if (idx < 0) return;
    const { mesh } = this.collectibles[idx];
    mesh.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material?.dispose();
      }
    });
    this.scene.remove(mesh);
    this.collectibles.splice(idx, 1);
  }

  update(time) {
    this.collectibles.forEach(c => {
      if (!c.collected) {
        c.mesh.rotation.y = time * 1.8;
        c.mesh.position.y = c.baseY + Math.sin(time * 2.2) * 0.18;
      }
    });
  }
}
