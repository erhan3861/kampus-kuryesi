import * as THREE from 'three';

// NPC konumları (npcs.json ile senkron) — minimap hedefi için
const NPC_POSITIONS = {
  npc_kutuphaneci: [  0, -28],
  npc_fen_hoca:    [ 24, -17],
  npc_sanat_hoca:  [ 30,   5],
  npc_asci:        [  0,  28],
  npc_beden_hoca:  [-24,  17],
  npc_mudur:       [-28,   0],
  npc_bahcivan:    [ 10,  -8],
};

export class QuestSystem {
  constructor(questData, dialogue, world, hud, audio, stats, learningLog = null) {
    this.allQuests   = questData;
    this.dialogue    = dialogue;
    this.world       = world;
    this.hud         = hud;
    this.audio       = audio;
    this.stats       = stats;        // PlayerStats
    this.learningLog = learningLog;  // LearningLog (isteğe bağlı)

    this.activeQuests    = new Map();   // id → state
    this.completedQuests = new Set();
    this.inventory       = new Set();
    this.badges          = [];

    this._collectibleMeshes = new Map();
    this._exploreTarget     = null;
    this._minimapTarget     = null;   // { x, z, label }
    this._onMinimapUpdate   = null;   // callback
  }

  onMinimapUpdate(fn) { this._onMinimapUpdate = fn; }

  _setMinimapTarget(x, z, label) {
    this._minimapTarget = { x, z, label };
    if (this._onMinimapUpdate) this._onMinimapUpdate(this._minimapTarget);
  }

  _clearMinimapTarget() {
    this._minimapTarget = null;
    if (this._onMinimapUpdate) this._onMinimapUpdate(null);
  }

  // ── QUERY ────────────────────────────────────────────────────────────────────
  getAvailableFor(npcId) {
    return this.allQuests.filter(q => {
      if (q.giverNpc !== npcId) return false;
      if (this.activeQuests.has(q.id) || this.completedQuests.has(q.id)) return false;
      if (q.prerequisites?.some(p => !this.completedQuests.has(p))) return false;
      return true;
    });
  }

  getActiveFor(npcId) {
    return [...this.activeQuests.values()].filter(state => {
      const q = this.allQuests.find(x => x.id === state.id);
      if (!q) return false;
      if (q.type === 'delivery' && !state.hasItem && q.targetNpc === npcId) return true;
      if (q.type === 'delivery' &&  state.hasItem && (q.returnToNpc ?? q.giverNpc) === npcId) return true;
      if (q.type === 'collect'  &&  state.collected >= q.collectCount && q.targetNpc === npcId) return true;
      if (q.type === 'project') {
        const step = q.steps[state.currentStep];
        if (step?.targetNpc === npcId) return true;
      }
      return false;
    });
  }

  // ── ANA ETKİLEŞİM ────────────────────────────────────────────────────────────
  interactNPC(npcId, npcs) {
    const npcRaw  = npcs.find(n => n.id === npcId);
    const npcName = npcRaw?.name ?? 'Hoca';

    // Aktif teslim var mı?
    const actives = this.getActiveFor(npcId);
    if (actives.length > 0) {
      const state = actives[0];
      const q = this.allQuests.find(x => x.id === state.id);
      this._handleActive(q, state, npcId, npcName, npcs);
      return;
    }

    // Yeni görev teklif et
    const available = this.getAvailableFor(npcId);
    if (available.length > 0) {
      const q = available[0];
      this.dialogue.showSequence(npcName, [...(q.dialogueStart ?? [])], () => {
        this._startQuest(q, npcs);
      });
      return;
    }

    // Boşta selamlama
    const greets = npcRaw?.greetings ?? ['Merhaba!'];
    this.dialogue.showSequence(npcName, [greets[Math.floor(Math.random() * greets.length)]], null);
  }

  // ── GÖREV BAŞLATMA ────────────────────────────────────────────────────────────
  _startQuest(q, npcs) {
    const state = { id: q.id, type: q.type };

    if (q.type === 'delivery') {
      state.hasItem = false;
      const [tx, tz] = NPC_POSITIONS[q.targetNpc] ?? [0, 0];
      this._setMinimapTarget(tx, tz, '📦');
      const hint = `${this._npcName(q.targetNpc, npcs)}'ya git`;
      this.hud.addQuest(q, hint, () => this._skipQuest(q.id, npcs));
    }

    if (q.type === 'quiz') {
      state.questionIndex = 0;
      // Quiz zaten diyalogda yapılır; minimap hedefi yok
      this._clearMinimapTarget();
      this.hud.addQuest(q, 'Soruları yanıtla', null);
      this.activeQuests.set(q.id, state);
      this._askQuestion(q, state, npcs);
      if (this.audio) this.audio.play('quest_start');
      return;
    }

    if (q.type === 'collect') {
      state.collected = 0;
      this._spawnCollectibles(q);
      // İlk koleksiyon noktasına hedef koy
      const first = q.collectiblePositions?.[0];
      if (first) this._setMinimapTarget(first[0], first[2], '⭐');
      this.hud.addQuest(q, `0/${q.collectCount} ${q.collectLabel} toplandı`, () => this._skipQuest(q.id, npcs));
    }

    if (q.type === 'project') {
      state.currentStep = 0;
      const step = q.steps[0];
      const [tx, tz] = NPC_POSITIONS[step.targetNpc] ?? [0, 0];
      this._setMinimapTarget(tx, tz, '🎯');
      this.hud.addQuest(q, step.description, () => this._skipQuest(q.id, npcs));
    }

    if (q.type === 'explore') {
      state.reached = false;
      this._exploreTarget = {
        questId: q.id,
        position: new THREE.Vector3(...(q.targetPosition ?? [0, 0, 0])),
        radius: q.targetRadius ?? 3,
      };
      this._setMinimapTarget(q.targetPosition[0], q.targetPosition[2], '🌟');
      this.hud.addQuest(q, q.hint, () => this._skipQuest(q.id, npcs));
    }

    this.activeQuests.set(q.id, state);
    if (this.audio) this.audio.play('quest_start');
  }

  // ── AKTİF GÖREV EYLEM ────────────────────────────────────────────────────────
  _handleActive(q, state, npcId, npcName, npcs) {
    if (q.type === 'delivery') {
      if (!state.hasItem && q.targetNpc === npcId) {
        const lines = q.dialoguePickup ?? ['Al bakalım!'];
        this.dialogue.showSequence(npcName, lines, () => {
          state.hasItem = true;
          this.inventory.add(q.itemLabel);
          this.hud.setInventoryItem(q.itemLabel);
          const returnId = q.returnToNpc ?? q.giverNpc;
          const [rx, rz] = NPC_POSITIONS[returnId] ?? [0, 0];
          this._setMinimapTarget(rx, rz, '📦');
          const hint = `${q.itemLabel} → ${this._npcName(returnId, npcs)}'ya götür`;
          this.hud.updateQuestHint(q.id, hint, () => this._skipQuest(q.id, npcs));
          if (this.audio) this.audio.play('pickup');
        });
        return;
      }
      const returnId = q.returnToNpc ?? q.giverNpc;
      if (state.hasItem && returnId === npcId) {
        this.dialogue.showSequence(npcName, q.dialogueComplete ?? ['Teşekkürler!'], () => {
          this.inventory.delete(q.itemLabel);
          this.hud.setInventoryItem(null);
          this._clearMinimapTarget();
          this._completeQuest(q, state, npcs);
        });
      }
    }

    if (q.type === 'collect' && state.collected >= q.collectCount) {
      this.dialogue.showSequence(npcName, q.dialogueComplete ?? ['Teşekkürler!'], () => {
        this._clearMinimapTarget();
        this._completeQuest(q, state, npcs);
      });
    }

    if (q.type === 'project') {
      const step = q.steps[state.currentStep];
      this.dialogue.showSequence(npcName, step.dialogue, () => {
        if (step.action === 'pickup') {
          this.inventory.add(step.itemLabel);
          this.hud.setInventoryItem(step.itemLabel);
          if (this.audio) this.audio.play('pickup');
        } else if (step.action === 'deliver') {
          this.inventory.delete(step.itemLabel);
          this.hud.setInventoryItem(null);
        }
        state.currentStep++;
        if (state.currentStep >= q.steps.length) {
          this._clearMinimapTarget();
          this._completeQuest(q, state, npcs);
        } else {
          const next = q.steps[state.currentStep];
          const [nx, nz] = NPC_POSITIONS[next.targetNpc] ?? [0, 0];
          this._setMinimapTarget(nx, nz, '🎯');
          this.hud.updateQuestHint(q.id, next.description, () => this._skipQuest(q.id, npcs));
        }
      });
    }
  }

  // ── QUİZ ─────────────────────────────────────────────────────────────────────
  _askQuestion(q, state, npcs) {
    if (state.questionIndex >= q.questions.length) {
      this._completeQuest(q, state, npcs);
      return;
    }
    const qi      = q.questions[state.questionIndex];
    const npc     = npcs.find(n => n.id === q.giverNpc);
    const subject = q.subject ?? null;

    // Joker butonu ekle
    const jokerLabel = this.stats?.jokers > 0
      ? `🃏 Joker Kullan (${this.stats.jokers} kaldı)`
      : null;
    const options = [...qi.options];
    if (jokerLabel) options.push(jokerLabel);

    // Soru numarası
    const qNum = `[${state.questionIndex + 1}/${q.questions.length}] `;

    this.dialogue.show(npc?.name ?? 'Hoca', qNum + qi.question, options, (idx) => {
      // Joker seçildi
      if (jokerLabel && idx === options.length - 1) {
        const used = this.stats?.useJoker();
        if (used) {
          if (this.stats) this.hud.updateStats(this.stats.getSummary());
          this.learningLog?.record(q.id, q.subject, qi.question, false, true);
          this.dialogue.show(npc?.name ?? 'Hoca',
            `🃏 Joker kullandın! Doğru cevap: ${qi.options[qi.correctIndex]}`,
            [], null, { explanation: qi.explanation, subject });
          state.questionIndex++;
          setTimeout(() => this._askQuestion(q, state, npcs), 2200);
        }
        return;
      }

      if (idx === qi.correctIndex) {
        state.questionIndex++;
        this.learningLog?.record(q.id, q.subject, qi.question, true, false);
        // Doğru cevapta açıklama göster
        this.dialogue.show(npc?.name ?? 'Hoca', qi.correctResponse, [], null,
          { explanation: qi.explanation, subject });
        if (this.audio) this.audio.play('correct');
        setTimeout(() => this._askQuestion(q, state, npcs), 2200);
      } else {
        // Yanlış: can kaybet, öğrenme kaydına ekle
        this.learningLog?.record(q.id, q.subject, qi.question, false, false);
        if (this.stats) {
          this.stats.onWrongAnswer();
          this.hud.updateStats(this.stats.getSummary());
          if (this.stats.hp <= 0) { this.hud.showDeath(); return; }
        }
        this.dialogue.show(npc?.name ?? 'Hoca',
          `❌ ${qi.wrongResponse} (${this.stats ? `❤️ ${this.stats.hp}/${this.stats.maxHP}` : ''})`,
          options, (ci) => {
            if (ci === qi.correctIndex) {
              state.questionIndex++;
              this.learningLog?.record(q.id, q.subject, qi.question, true, false);
              this.dialogue.show(npc?.name ?? 'Hoca', qi.correctResponse, [], null,
                { explanation: qi.explanation, subject });
              if (this.audio) this.audio.play('correct');
              setTimeout(() => this._askQuestion(q, state, npcs), 2200);
            } else if (jokerLabel && ci === options.length - 1) {
              const used = this.stats?.useJoker();
              if (used) {
                if (this.stats) this.hud.updateStats(this.stats.getSummary());
                this.learningLog?.record(q.id, q.subject, qi.question, false, true);
                this.dialogue.show(npc?.name ?? 'Hoca',
                  `🃏 Joker! Doğru: ${qi.options[qi.correctIndex]}`, [], null,
                  { explanation: qi.explanation, subject });
                state.questionIndex++;
                setTimeout(() => this._askQuestion(q, state, npcs), 2200);
              }
            } else {
              if (this.stats) {
                this.stats.onWrongAnswer();
                this.hud.updateStats(this.stats.getSummary());
                if (this.stats.hp <= 0) { this.hud.showDeath(); }
              }
            }
          });
      }
    });
  }

  // ── KOLEKSİYON ───────────────────────────────────────────────────────────────
  _spawnCollectibles(q) {
    q.collectiblePositions?.forEach((pos, i) => {
      const id  = `${q.id}_c${i}`;
      const v3  = new THREE.Vector3(...pos);
      this.world.addCollectible(id, v3, 0xffd700);
      this._collectibleMeshes.set(id, { questId: q.id, index: i });
    });
  }

  checkCollectibles(playerPos) {
    // forEach içinde Map'i değiştirmek güvensiz — önce toplanacakları bul
    const toCollect = [];
    this._collectibleMeshes.forEach((info, id) => {
      const col = this.world.collectibles.find(c => c.id === id);
      if (!col || col.collected) return;
      if (col.mesh.position.distanceTo(playerPos) < 2.0) toCollect.push({ id, info });
    });

    toCollect.forEach(({ id, info }) => {
      const state = this.activeQuests.get(info.questId);
      if (!state) return;
      const q = this.allQuests.find(x => x.id === info.questId);

      // Sahne + minimap + map'ten sil
      this.world.removeCollectible(id);
      this._collectibleMeshes.delete(id);
      state.collected++;
      if (this.audio) this.audio.play('pickup');

      const remaining = q.collectCount - state.collected;

      if (remaining > 0) {
        // Minimap'te bir sonraki kitaba yönelt
        const nextKey = [...this._collectibleMeshes.keys()].find(k => k.startsWith(info.questId));
        if (nextKey) {
          const nc = this.world.collectibles.find(c => c.id === nextKey);
          if (nc) this._setMinimapTarget(nc.mesh.position.x, nc.mesh.position.z, '⭐');
        }
        this.hud.updateQuestHint(q.id,
          `${state.collected}/${q.collectCount} ${q.collectLabel} toplandı`);

      } else {
        // Hepsi toplandı
        this._clearMinimapTarget();

        if (q.autoComplete || !q.targetNpc) {
          // autoComplete veya targetNpc yoksa anında tamamla
          this.hud.showNotification(`🎉 Tüm ${q.collectLabel} toplandı!`, '#7bc67e');
          setTimeout(() => this._completeQuest(q, state, []), 600);
        } else {
          // NPC'ye götürme adımı varsa minimap'te göster
          const [tx, tz] = NPC_POSITIONS[q.targetNpc] ?? [0, 0];
          this._setMinimapTarget(tx, tz, '📦');
          this.hud.updateQuestHint(q.id,
            `✅ Hepsi toplandı! ${this._npcName(q.targetNpc, [])} 'ya götür.`);
          this.hud.showNotification(`✅ ${q.collectCount}/${q.collectCount} toplandı! NPC'ye dön.`, '#7bc67e');
        }
      }
    });
  }

  // ── KEŞİF ────────────────────────────────────────────────────────────────────
  checkExplore(playerPos, npcs) {
    if (!this._exploreTarget) return;
    const et    = this._exploreTarget;
    const state = this.activeQuests.get(et.questId);
    if (!state) return;
    if (playerPos.distanceTo(et.position) < et.radius) {
      const q   = this.allQuests.find(x => x.id === et.questId);
      const npc = npcs.find(n => n.id === q.giverNpc);
      this._exploreTarget = null;
      this._clearMinimapTarget();
      this.dialogue.showSequence(npc?.name ?? 'Hoca',
        q.dialogueComplete ?? ['Buldun!'],
        () => this._completeQuest(q, state, npcs));
    }
  }

  // ── PAS GEÇ ──────────────────────────────────────────────────────────────────
  _skipQuest(questId, npcs) {
    if (!this.stats?.canSkipQuest()) {
      this.hud.showNotification('⏭ Pas geçme hakkın kalmadı!', '#ff5555');
      return;
    }
    const q = this.allQuests.find(x => x.id === questId);
    if (!q) return;
    const used = this.stats.useSkip();
    if (!used) return;
    this.hud.updateStats(this.stats.getSummary());
    const state = this.activeQuests.get(questId);
    // Envanterdeki eşyaları temizle
    if (state?.hasItem) { this.hud.setInventoryItem(null); this.inventory.clear(); }
    this._clearMinimapTarget();
    // Kolektible'ları temizle
    this._collectibleMeshes.forEach((info, id) => {
      if (info.questId === questId) {
        this.world.removeCollectible(id);
        this._collectibleMeshes.delete(id);
      }
    });
    if (this._exploreTarget?.questId === questId) this._exploreTarget = null;
    this._completeQuest(q, state ?? { id: questId, type: q.type }, npcs, true);
    this.hud.showNotification('⏭ Görev pas geçildi', '#ff9966');
  }

  // ── TAMAMLAMA ─────────────────────────────────────────────────────────────────
  _completeQuest(q, state, npcs, skipped = false) {
    this.activeQuests.delete(q.id);
    this.completedQuests.add(q.id);
    if (!skipped && q.reward) {
      const xp = q.reward.xp ?? 0;
      this.stats?.addXP(xp);
      if (this.stats) this.hud.updateStats(this.stats.getSummary());
      if (q.reward.badge) this.badges.push({ icon: q.reward.badge, name: q.reward.badgeName });
      // Can ödülü
      if (q.reward.hp) this.stats?.gainHP(q.reward.hp);
    }
    this.hud.completeQuest(q.id, skipped ? {} : q.reward);
    if (this.audio) this.audio.play('quest_complete');

    if (this.completedQuests.size >= this.allQuests.length) {
      const totalXP      = this.stats?.xp ?? 0;
      const learnSummary = this.learningLog?.getSummary() ?? null;
      setTimeout(() => this.hud.showVictory(totalXP, this.badges, this.stats?.getSummary(), learnSummary), 1500);
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────
  _npcName(id, npcs) {
    return npcs.find(n => n.id === id)?.name ?? id;
  }

  getMinimapNPCInfo(npcList, npcs) {
    return npcList.map(npc => ({
      id: npc.id,
      x: npc.group?.position.x ?? 0,
      z: npc.group?.position.z ?? 0,
      hasAvailableQuest: this.getAvailableFor(npc.id).length > 0,
      hasActiveQuest:    this.getActiveFor(npc.id).length > 0,
    }));
  }

  getTotalCompleted() { return this.completedQuests.size; }
  getTotalQuests()    { return this.allQuests.length; }
}
