import * as THREE from 'three';
import { Engine }        from './core/Engine.js';
import { Input }         from './core/Input.js';
import { Audio }         from './core/Audio.js';
import { World }         from './world/World.js';
import { Player }        from './entities/Player.js';
import { NPC }           from './entities/NPC.js';
import { Customization } from './entities/Customization.js';
import { Dialogue }      from './systems/Dialogue.js';
import { Emote }         from './systems/Emote.js';
import { QuestSystem }   from './systems/QuestSystem.js';
import { PlayerStats }   from './systems/PlayerStats.js';
import { LearningLog }   from './systems/LearningLog.js';
import { HUD }           from './ui/HUD.js';
import { Minimap }       from './ui/Minimap.js';
import { TeacherPanel }  from './ui/TeacherPanel.js';

import npcData   from './data/npcs.json';
import questData from './data/quests.json';

// ── YÜKLEME EKRANI ───────────────────────────────────────────────────────────
const loadingBar   = document.getElementById('loading-bar');
const startBtn     = document.getElementById('start-btn');
const loadingScreen = document.getElementById('loading-screen');
let gameReady   = false;
let gameStarted = false;
function setProgress(p) { if (loadingBar) loadingBar.style.width = `${p}%`; }

// ── CORE SİSTEMLER ───────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const engine = new Engine(canvas);
const input  = new Input();
const audio  = new Audio();
setProgress(20);

const world  = new World(engine.scene);
setProgress(45);

// Collision kutular World constructor içinde ekleniyor
const col = world.collision;
setProgress(60);

// ── UI SİSTEMLER ─────────────────────────────────────────────────────────────
const dialogue = new Dialogue();
const hud      = new HUD(questData.length);
const minimap  = new Minimap();
const emote    = new Emote();
setProgress(70);

// ── STATS (can / xp / joker / skip) ─────────────────────────────────────────
const stats = new PlayerStats({
  maxHP:    3,
  maxJoker: 2,
  onDead:   () => hud.showDeath(),
  onUpdate: (type, val) => {
    hud.updateStats(stats.getSummary());
    if (type === 'levelup') hud.showNotification(`⚡ Seviye ${val}! +1 Joker kazandın!`, '#b48eff');
  },
});
hud.updateStats(stats.getSummary());

// ── KIYaFET + OYUNCU ─────────────────────────────────────────────────────────
const customization = new Customization(colors => player?.applyColors(colors));
const player = new Player(engine.scene);

// ── NPC'LER ──────────────────────────────────────────────────────────────────
const npcs = npcData.map(d => new NPC(engine.scene, { ...d, color: parseInt(d.color) }));
setProgress(80);

// ── ÖĞRENME KAYDI + ÖĞRETMEN PANELİ ─────────────────────────────────────────
const learningLog   = new LearningLog();
const teacherPanel  = new TeacherPanel(learningLog);

// ── GÖREV SİSTEMİ ────────────────────────────────────────────────────────────
const questSystem = new QuestSystem(questData, dialogue, world, hud, audio, stats, learningLog);
questSystem.onMinimapUpdate(target => minimap.setActiveTarget(target));

// ── KAMERA DÖNDÜRME (Q/E + sağ fare sürükleme) ───────────────────────────────
const CAM_ROTATE_SPEED = 1.8; // rad/s
{
  let dragging = false, lastMX = 0;
  window.addEventListener('mousedown', e => {
    if (e.button === 2 || e.button === 1) { dragging = true; lastMX = e.clientX; }
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    player.cameraYaw -= (e.clientX - lastMX) * 0.007;
    lastMX = e.clientX;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('contextmenu', e => e.preventDefault());

  // Dokunmatik: sağ yarı yatay sürükleme
  let tid = null, tlx = 0;
  window.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (t.clientX > window.innerWidth * 0.45 && tid === null) {
        tid = t.identifier; tlx = t.clientX;
      }
    }
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === tid) {
        player.cameraYaw -= (t.clientX - tlx) * 0.009;
        tlx = t.clientX;
      }
    }
  }, { passive: true });
  window.addEventListener('touchend', e => {
    for (const t of e.changedTouches) if (t.identifier === tid) tid = null;
  });
}

// ── MOBİL BUTONLAR ───────────────────────────────────────────────────────────
const interactBtn = document.createElement('button');
interactBtn.textContent = 'E';
interactBtn.style.cssText = `
  position:fixed; bottom:20px; right:20px; z-index:300;
  width:50px; height:50px; background:rgba(246,201,14,0.9);
  border:2px solid #f6c90e; border-radius:50%;
  color:#1a1a1a; font-size:1.2rem; font-weight:bold; cursor:pointer; display:none;
`;
interactBtn.ontouchstart = e => { e.preventDefault(); input.interactPressed = true; };
interactBtn.onclick      = () => { input.interactPressed = true; };
document.body.appendChild(interactBtn);
if ('ontouchstart' in window) interactBtn.style.display = 'flex';

// Etkileşim ipucu (NPC yakını)
const interactHint = document.createElement('div');
interactHint.style.cssText = `
  position:fixed; bottom:80px; right:12px; z-index:300;
  background:rgba(246,201,14,0.92); color:#1a1a1a;
  padding:4px 12px; border-radius:12px; font-size:0.8rem;
  font-weight:bold; display:none; pointer-events:none;
`;
document.body.appendChild(interactHint);

// Koleksiyon ipucu (toplanabilir nesne yakını)
const collectHint = document.createElement('div');
collectHint.style.cssText = `
  position:fixed; bottom:112px; right:12px; z-index:300;
  background:rgba(255,215,0,0.95); color:#1a1a1a;
  padding:4px 14px; border-radius:12px; font-size:0.82rem;
  font-weight:bold; display:none; pointer-events:none;
  border:2px solid #f6a000;
`;
document.body.appendChild(collectHint);

// ── YARDIMCI: Dünya→Ekran ────────────────────────────────────────────────────
const _v3 = new THREE.Vector3();
function worldToScreen(wx, wy, wz) {
  _v3.set(wx, wy, wz).project(engine.camera);
  return { x: (_v3.x + 1) / 2 * window.innerWidth,
           y: (-_v3.y + 1) / 2 * window.innerHeight };
}

// ── OYUN BAŞLAT ──────────────────────────────────────────────────────────────
setProgress(95);
function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  loadingScreen.style.transition = 'opacity 0.5s';
  loadingScreen.style.opacity = '0';
  setTimeout(() => loadingScreen.style.display = 'none', 600);
  audio.resume();
  audio.startAmbient();
  hud.showNotification('👋 Hoş geldin! Hocalara yaklaş ve [E] bas.', '#f6c90e');
  gameLoop();
}
setProgress(100);
setTimeout(() => { gameReady = true; if (startBtn) startBtn.style.display = 'block'; }, 500);
window.__startGame = startGame;
canvas.addEventListener('click', () => { if (!gameStarted && gameReady) startGame(); audio.resume(); });
canvas.addEventListener('touchstart', () => audio.resume(), { passive: true });

// ── ANA DÖNGÜ ────────────────────────────────────────────────────────────────
let time = 0;
let nearNPC = null, nearDist = Infinity;

function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = engine.getDelta();
  time += dt;

  // Kamera döndürme Q / E veya ok tuşlarıyla değil (ok tuşları hareket)
  // Q = sola döndür, E = zaten etkileşim; kamera döndürme fare/dokunmatikle
  if (input.keys['KeyQ']) player.cameraYaw += CAM_ROTATE_SPEED * dt;
  if (input.keys['KeyR']) player.cameraYaw -= CAM_ROTATE_SPEED * dt;

  if (dialogue.isOpen) {
    player.updateCamera(engine.camera);
    engine.render();
    return;
  }

  // Oyuncu güncelle
  player.update(dt, input, col);
  player.updateCamera(engine.camera);

  const pos = player.getPosition();

  // NPC güncelle, en yakın bul
  nearNPC = null; nearDist = Infinity;
  npcs.forEach(npc => {
    npc.update(dt, engine.camera, pos);
    const d = npc.distanceTo(pos);
    if (d < nearDist) { nearDist = d; nearNPC = npc; }
  });

  // İndikatörler
  npcs.forEach(npc => {
    const av = questSystem.getAvailableFor(npc.id).length > 0;
    const ac = questSystem.getActiveFor(npc.id).length > 0;
    npc.setIndicator(av ? '!' : ac ? '?' : 'none');
  });

  // Etkileşim ipucu
  if (nearNPC && nearDist < 4.5) {
    interactHint.style.display = 'block';
    interactHint.textContent = `[E] ${nearNPC.name}`;
  } else {
    interactHint.style.display = 'none';
  }

  // E tuşu
  if (input.consumeInteract() && nearNPC && nearDist < 4.5) {
    audio.play('interact');
    questSystem.interactNPC(nearNPC.id, npcData);
  }

  // Koleksiyon + keşif
  questSystem.checkCollectibles(pos);
  questSystem.checkExplore(pos, npcData);

  // Yakın collectible ipucu
  const nearCol = world.collectibles
    .filter(c => !c.collected)
    .find(c => c.mesh.position.distanceTo(pos) < 4);
  if (nearCol) {
    collectHint.style.display = 'block';
    collectHint.textContent = '⭐ Yaklaş — otomatik toplanır!';
  } else {
    collectHint.style.display = 'none';
  }

  // Emote balonu
  const sc = worldToScreen(pos.x, pos.y + 2.8, pos.z);
  emote.updateBubblePosition(sc.x, sc.y);

  // Dünya animasyonu
  world.update(time);

  // Minimap (her kare)
  const minimapNPCs = questSystem.getMinimapNPCInfo(npcs, npcData);
  minimap.setNPCs(minimapNPCs);
  const collectibleDots = world.collectibles
    .filter(c => !c.collected)
    .map(c => ({ x: c.mesh.position.x, z: c.mesh.position.z }));
  minimap.setCollectibles(collectibleDots);
  minimap.update(pos.x, pos.z, player.facingAngle);

  engine.render();
}
