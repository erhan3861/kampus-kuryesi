import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const loader = new GLTFLoader();
const _cache = new Map(); // path → THREE.Group (kaynak)

/**
 * GLB yükle, cache'le, clone döndür.
 * GLTFLoader kendi texture yollarını (Textures/colormap.png) otomatik çözer —
 * biz texture'a dokunmuyoruz.
 */
export function loadModelCached(path, opts = {}) {
  const {
    x = 0, y = 0, z = 0,
    scale = 1, ry = 0,
    scene = null,
    castShadow = true,
    receiveShadow = true,
  } = opts;

  const applyAndPlace = (root) => {
    root.traverse(child => {
      if (child.isMesh) {
        child.castShadow    = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });
    root.position.set(x, y, z);
    root.rotation.y = ry;
    if (scale !== 1) root.scale.setScalar(scale);
    if (scene) scene.add(root);
    return root;
  };

  if (_cache.has(path)) {
    // Cache'de kaynak var — clone yap, hemen döndür
    return Promise.resolve(applyAndPlace(_cache.get(path).clone()));
  }

  // İlk yükleme
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        // Orijinali cache'e koy (sahneye ekleme)
        _cache.set(path, gltf.scene);
        // Clone'u ayarla ve ekle
        const clone = gltf.scene.clone();
        resolve(applyAndPlace(clone));
      },
      undefined,
      (err) => {
        console.warn(`AssetLoader: ${path} yüklenemedi`, err);
        resolve(null); // hata olsa da oyun durmasın
      }
    );
  });
}
