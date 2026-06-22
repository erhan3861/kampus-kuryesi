import * as THREE from 'three';

const INTERACT_DIST = 4.0;

export class NPC {
  constructor(scene, data) {
    this.scene = scene;
    this.id = data.id;
    this.name = data.name;
    this.color = data.color || 0x4a90d9;
    this.position = new THREE.Vector3(...(data.position || [0, 0, 0]));
    this.group = new THREE.Group();
    this._indicatorMesh = null;
    this._indicatorState = 'none'; // 'none' | '!' | '?'
    this._bobTime = Math.random() * Math.PI * 2;
    this._baseY = this.position.y;

    this._buildMesh();
    this._buildIndicator();
    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  _buildMesh() {
    const mat = c => new THREE.MeshToonMaterial({ color: c });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.38), mat(this.color));
    body.position.y = 0.8;
    body.castShadow = true;

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.46), mat(0xf4a460));
    head.position.y = 1.55;
    head.castShadow = true;

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.5), mat(0x3d2b1f));
    hair.position.y = 1.82;

    // Eyes
    const eyeMat = mat(0x222222);
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.05), eyeMat);
    leftEye.position.set(-0.12, 1.58, 0.24);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.05), eyeMat);
    rightEye.position.set(0.12, 1.58, 0.24);

    // Legs
    const legMat = mat(0x2c3e6e);
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.65, 0.28), legMat);
    lLeg.position.set(-0.16, 0.22, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.65, 0.28), legMat);
    rLeg.position.set(0.16, 0.22, 0);

    // Arms
    const armMat = mat(this.color);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), armMat);
    lArm.position.set(-0.43, 0.76, 0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), armMat);
    rArm.position.set(0.43, 0.76, 0);

    this.group.add(body, head, hair, leftEye, rightEye, lLeg, rLeg, lArm, rArm);
    this._bodyParts = { lArm, rArm };
  }

  _buildIndicator() {
    this._indicatorCanvas = document.createElement('canvas');
    this._indicatorCanvas.width = 64;
    this._indicatorCanvas.height = 64;
    const tex = new THREE.CanvasTexture(this._indicatorCanvas);
    const geo = new THREE.PlaneGeometry(0.7, 0.7);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this._indicatorMesh = new THREE.Mesh(geo, mat);
    this._indicatorMesh.position.y = 2.6;
    this._indicatorMesh.visible = false;
    this.group.add(this._indicatorMesh);
  }

  _drawIndicator(symbol, color) {
    const ctx = this._indicatorCanvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, 32, 34);
    this._indicatorMesh.material.map.needsUpdate = true;
  }

  setIndicator(state) {
    if (state === this._indicatorState) return;
    this._indicatorState = state;
    if (state === 'none') {
      this._indicatorMesh.visible = false;
    } else if (state === '!') {
      this._indicatorMesh.visible = true;
      this._drawIndicator('!', '#f6c90e');
    } else if (state === '?') {
      this._indicatorMesh.visible = true;
      this._drawIndicator('?', '#4a90d9');
    }
  }

  update(delta, camera, playerPos) {
    this._bobTime += delta * 1.2;
    this.group.position.y = this._baseY + Math.sin(this._bobTime) * 0.03;

    // Arms idle sway
    if (this._bodyParts) {
      const sway = Math.sin(this._bobTime) * 0.08;
      this._bodyParts.lArm.rotation.x = sway;
      this._bodyParts.rArm.rotation.x = -sway;
    }

    // Face player
    if (playerPos) {
      const dx = playerPos.x - this.group.position.x;
      const dz = playerPos.z - this.group.position.z;
      const targetAngle = Math.atan2(dx, dz);
      this.group.rotation.y += (targetAngle - this.group.rotation.y) * 0.05;
    }

    // Indicator billboard
    if (this._indicatorMesh && camera) {
      this._indicatorMesh.lookAt(camera.position);
    }
  }

  distanceTo(pos) {
    return this.group.position.distanceTo(pos);
  }

  isInRange(pos) {
    return this.distanceTo(pos) < INTERACT_DIST;
  }
}
