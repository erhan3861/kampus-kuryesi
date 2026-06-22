import * as THREE from 'three';

export class Collision {
  constructor() {
    this.boxes = [];
    this.worldBounds = { minX: -55, maxX: 55, minZ: -55, maxZ: 55 };
  }

  addBox(cx, cz, hw, hd) {
    this.boxes.push({ cx, cz, hw, hd });
  }

  addFromObject3D(obj, extraPad = 0) {
    const box = new THREE.Box3().setFromObject(obj);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    const hw = (box.max.x - box.min.x) / 2 + extraPad;
    const hd = (box.max.z - box.min.z) / 2 + extraPad;
    this.addBox(cx, cz, hw, hd);
  }

  resolve(from, to, playerRadius) {
    let x = to.x;
    let z = to.z;

    // World bounds
    x = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX, x));
    z = Math.max(this.worldBounds.minZ, Math.min(this.worldBounds.maxZ, z));

    for (const b of this.boxes) {
      const nearX = Math.max(b.cx - b.hw, Math.min(b.cx + b.hw, x));
      const nearZ = Math.max(b.cz - b.hd, Math.min(b.cz + b.hd, z));
      const dx = x - nearX;
      const dz = z - nearZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < playerRadius) {
        if (dist < 0.001) {
          x = from.x;
          z = from.z;
          break;
        }
        const push = playerRadius - dist;
        x += (dx / dist) * push;
        z += (dz / dist) * push;
      }
    }

    return new THREE.Vector3(x, to.y, z);
  }
}
