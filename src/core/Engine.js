import * as THREE from 'three';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this._setupRenderer();
    this._setupCamera();
    this._setupLights();
    this._setupFog();
    this._setupSky();
    window.addEventListener('resize', () => this._onResize());
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x87ceeb);
  }

  _setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      58, window.innerWidth / window.innerHeight, 0.15, 400
    );
    this.camera.position.set(0, 8, 14);
    this.camera.lookAt(0, 0, 0);
  }

  _setupLights() {
    // Ortam ışığı — hafif sıcak ton
    this.ambientLight = new THREE.AmbientLight(0xfff0d8, 0.55);
    this.scene.add(this.ambientLight);

    // Ana güneş ışığı — keskin gölge
    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.6);
    this.sunLight.position.set(45, 70, 25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(4096, 4096);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 250;
    this.sunLight.shadow.camera.left   = -100;
    this.sunLight.shadow.camera.right  =  100;
    this.sunLight.shadow.camera.top    =  100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.bias = -0.0008;
    this.sunLight.shadow.normalBias = 0.04;
    this.scene.add(this.sunLight);

    // Mavi gökyüzü yansıması (fill light)
    this.skyFill = new THREE.HemisphereLight(0x87ceeb, 0x6aaa50, 0.35);
    this.scene.add(this.skyFill);

    // Yumuşak dolgu ışığı — gölge tarafı çok kararmaz
    this.fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.4);
    this.fillLight.position.set(-30, 20, -20);
    this.scene.add(this.fillLight);
  }

  _setupFog() {
    // Hafif eksponansiyel sis — uzak binaları yumuşatır
    this.scene.fog = new THREE.FogExp2(0xb8d8f0, 0.008);
  }

  _setupSky() {
    // Basit gradyan gökyüzü (büyük kutu)
    const skyGeo = new THREE.SphereGeometry(380, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor:    { value: new THREE.Color(0x2a7fc1) },
        bottomColor: { value: new THREE.Color(0x87ceeb) },
        offset:      { value: 60 },
        exponent:    { value: 0.5 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getDelta() { return Math.min(this.clock.getDelta(), 0.05); }
  render()   { this.renderer.render(this.scene, this.camera); }
}
