import * as THREE from 'three';

const WALK_SPEED = 8;
const RUN_SPEED = 14;
const CAM_LERP   = 0.12;
const CAM_H      = 10;
const CAM_DIST   = 15;
const CAM_LOOK_Y = 1.5;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.bobTime   = 0;
    this.isMoving  = false;
    this.facingAngle = Math.PI; // güneye bakıyor

    // Kamera sabit açıda durur, A/D tuşuyla döner
    this.cameraYaw = 0; // radyan — başlangıçta kuzeyden güneye bakıyor

    this._camPos    = new THREE.Vector3(0, CAM_H, CAM_DIST);
    this._camTarget = new THREE.Vector3();

    this._buildMesh();
    scene.add(this.group);
    this.group.position.set(0, 0, 5);

    this._colors = {
      skin: 0xf4a460, shirt: 0x4a90d9, pants: 0x2c3e6e,
      shoes: 0x4a3728, bag: 0xe74c3c, hair: 0x3d2b1f,
    };
  }

  _buildMesh() {
    const m = c => new THREE.MeshToonMaterial({ color: c });
    const C = this._colors || {
      skin: 0xf4a460, shirt: 0x4a90d9, pants: 0x2c3e6e,
      shoes: 0x4a3728, bag: 0xe74c3c, hair: 0x3d2b1f,
    };

    // Pivot grubu — yerden 0 yüksek
    const pivot = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), m(C.shirt));
    body.position.y = 0.85; body.castShadow = true;
    this.shirtMesh = body;

    const legGeo = new THREE.BoxGeometry(0.28, 0.7, 0.3);
    this.leftLeg  = new THREE.Mesh(legGeo, m(C.pants));
    this.rightLeg = new THREE.Mesh(legGeo, m(C.pants));
    this.leftLeg.position.set(-0.18, 0.25, 0);  this.leftLeg.castShadow = true;
    this.rightLeg.position.set(0.18, 0.25, 0);  this.rightLeg.castShadow = true;

    const shoeGeo = new THREE.BoxGeometry(0.3, 0.14, 0.36);
    const ls = new THREE.Mesh(shoeGeo, m(C.shoes)); ls.position.set(-0.18, -0.07, 0.04);
    const rs = new THREE.Mesh(shoeGeo, m(C.shoes)); rs.position.set( 0.18, -0.07, 0.04);

    const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
    this.leftArm  = new THREE.Mesh(armGeo, m(C.shirt));
    this.rightArm = new THREE.Mesh(armGeo, m(C.shirt));
    this.leftArm.position.set(-0.46, 0.8, 0);   this.leftArm.castShadow = true;
    this.rightArm.position.set(0.46, 0.8, 0);   this.rightArm.castShadow = true;

    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.5), m(C.skin));
    this.head.position.y = 1.6; this.head.castShadow = true;

    const em = m(0x222222);
    const le = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.05), em); le.position.set(-0.13, 1.62, 0.26);
    const re = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.05), em); re.position.set( 0.13, 1.62, 0.26);

    this.hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.54), m(C.hair));
    this.hairMesh.position.set(0, 1.9, 0);

    this.bagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.22), m(C.bag));
    this.bagMesh.position.set(0, 0.88, -0.3); this.bagMesh.castShadow = true;

    pivot.add(body, this.leftLeg, this.rightLeg, ls, rs,
              this.leftArm, this.rightArm, this.head, le, re,
              this.hairMesh, this.bagMesh);
    this.group.add(pivot);
    this._pivot = pivot;
  }

  applyColors(colors) {
    this._colors = { ...this._colors, ...colors };
    const set = (mesh, c) => { mesh.material = new THREE.MeshToonMaterial({ color: c }); };
    set(this.shirtMesh, colors.shirt);
    set(this.leftArm,   colors.shirt);
    set(this.rightArm,  colors.shirt);
    set(this.leftLeg,   colors.pants);
    set(this.rightLeg,  colors.pants);
    set(this.bagMesh,   colors.bag);
    set(this.head,      colors.skin);
    set(this.hairMesh,  colors.hair);
  }

  update(delta, input, collision) {
    const mv = input.getMovement();   // { x, z } normalised
    const speed = input.isRunning() ? RUN_SPEED : WALK_SPEED;
    this.isMoving = Math.abs(mv.x) > 0.04 || Math.abs(mv.z) > 0.04;

    if (this.isMoving) {
      // W(mv.z=-1)=ileri, S(mv.z=+1)=geri, A(mv.x=-1)=sol, D(mv.x=+1)=sağ
      // Kamera yatay açısına (cameraYaw) göre dünya yönü hesapla
      const cy  = this.cameraYaw;
      const fwX =  Math.sin(cy);   // kamera ileri yönü X
      const fwZ =  Math.cos(cy);   // kamera ileri yönü Z
      // W(mv.z=-1)=geri, S(mv.z=+1)=ileri — yer değiştirme
      const wX = mv.z * fwX + mv.x *  fwZ;
      const wZ = mv.z * fwZ - mv.x *  fwX;

      const dir = new THREE.Vector3(wX, 0, wZ);
      if (dir.lengthSq() > 0.001) dir.normalize();

      const proposed = this.group.position.clone().addScaledVector(dir, speed * delta);
      const resolved = collision
        ? collision.resolve(this.group.position, proposed, 0.4)
        : proposed;
      this.group.position.copy(resolved);

      // Karakterin yüzü hareket yönüne dönsün
      const target = Math.atan2(dir.x, dir.z);
      let diff = target - this.facingAngle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facingAngle += diff * 0.2;
      this.group.rotation.y = this.facingAngle;

      // Bob
      this.bobTime += delta * (input.isRunning() ? 10 : 7);
      const sw = Math.sin(this.bobTime) * 0.45;
      const bo = Math.abs(Math.sin(this.bobTime)) * 0.05;
      this.group.position.y = bo;
      this.leftLeg.rotation.x  =  sw;
      this.rightLeg.rotation.x = -sw;
      this.leftArm.rotation.x  = -sw * 0.55;
      this.rightArm.rotation.x =  sw * 0.55;
      this.head.position.y = 1.6 + Math.sin(this.bobTime) * 0.025;
    } else {
      this.bobTime *= 0.8;
      this.group.position.y *= 0.75;
      this.leftLeg.rotation.x  *= 0.7;
      this.rightLeg.rotation.x *= 0.7;
      this.leftArm.rotation.x  *= 0.7;
      this.rightArm.rotation.x *= 0.7;
      this.head.position.y = 1.6;
    }
  }

  updateCamera(camera) {
    const p = this.group.position;
    const cy = this.cameraYaw;

    // Kamera, cameraYaw yönünün tam ARKASINDA durur
    const tx = p.x + Math.sin(cy) * CAM_DIST;
    const tz = p.z + Math.cos(cy) * CAM_DIST;
    const ty = p.y + CAM_H;

    this._camPos.x += (tx - this._camPos.x) * CAM_LERP;
    this._camPos.z += (tz - this._camPos.z) * CAM_LERP;
    this._camPos.y += (ty - this._camPos.y) * CAM_LERP;

    this._camTarget.set(p.x, p.y + CAM_LOOK_Y, p.z);
    camera.position.copy(this._camPos);
    camera.lookAt(this._camTarget);
  }

  getPosition() { return this.group.position; }
}
