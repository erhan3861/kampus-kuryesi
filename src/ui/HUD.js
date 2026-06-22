export class HUD {
  constructor(totalQuests) {
    this.totalQuests      = totalQuests;
    this._activeQuests    = new Map();   // id → { q, hint }
    this._completedQuests = new Set();
    this._questNames      = new Map();   // id → title  (tamamlananlar için)
    this._logOpen         = false;
    this._onSkipQuest     = null;        // callback(questId)
    this._buildUI();
  }

  // ── UI İNŞA ─────────────────────────────────────────────────────────────────
  _buildUI() {
    /* ─ Üst bar ─ */
    const top = document.createElement('div');
    top.style.cssText = `
      position:fixed; top:10px; left:50%; transform:translateX(-50%);
      display:flex; gap:10px; align-items:center; z-index:300; pointer-events:none;
    `;

    // Görev sayısı
    this.progressPill = this._pill('#f6c90e', '#f6c90e33');
    this.progressPill.textContent = `🎒 0/${this.totalQuests}`;

    // Level
    this.levelPill = this._pill('#b48eff', '#b48eff33');
    this.levelPill.textContent = '⚡ Lv.1';

    top.append(this.progressPill, this.levelPill);
    document.body.appendChild(top);

    /* ─ Sol üst: can + XP bar + joker + skip ─ */
    this.statsBox = document.createElement('div');
    this.statsBox.style.cssText = `
      position:fixed; top:10px; left:10px; z-index:300;
      background:rgba(0,0,0,0.72); border:1px solid rgba(255,255,255,0.12);
      border-radius:12px; padding:8px 12px; min-width:150px;
      display:flex; flex-direction:column; gap:5px; pointer-events:none;
    `;

    // Can
    this.hpRow = document.createElement('div');
    this.hpRow.style.display = 'flex'; this.hpRow.style.gap = '4px';

    // XP bar
    this.xpBarWrap = document.createElement('div');
    this.xpBarWrap.style.cssText = `
      height:7px; background:#333; border-radius:4px; overflow:hidden; position:relative;
    `;
    this.xpBarFill = document.createElement('div');
    this.xpBarFill.style.cssText = `
      height:100%; background:#7bc67e; width:0%; transition:width 0.4s; border-radius:4px;
    `;
    this.xpBarWrap.appendChild(this.xpBarFill);

    this.xpLabel = document.createElement('div');
    this.xpLabel.style.cssText = 'color:#7bc67e; font-size:0.72rem;';
    this.xpLabel.textContent = '0 / 150 XP';

    // Joker + skip satırı
    this.powerRow = document.createElement('div');
    this.powerRow.style.cssText = 'display:flex; gap:6px; align-items:center;';

    this.jokerEl = document.createElement('span');
    this.jokerEl.style.cssText = 'font-size:0.78rem; color:#f6c90e;';
    this.jokerEl.textContent = '🃏 ×2';

    this.skipEl = document.createElement('span');
    this.skipEl.style.cssText = 'font-size:0.78rem; color:#ff9999;';
    this.skipEl.textContent = '⏭ ×1';

    this.powerRow.append(this.jokerEl, this.skipEl);
    this.statsBox.append(this.hpRow, this.xpBarWrap, this.xpLabel, this.powerRow);
    document.body.appendChild(this.statsBox);

    /* ─ Envanter ─ */
    this.inventoryEl = document.createElement('div');
    this.inventoryEl.style.cssText = `
      position:fixed; top:90px; left:10px; z-index:300;
      background:rgba(0,0,0,0.8); color:#fff; padding:6px 12px;
      border-radius:10px; font-size:0.9rem; border:1px solid #f6c90e;
      display:none; pointer-events:none;
    `;
    document.body.appendChild(this.inventoryEl);

    /* ─ Görev Defteri butonu ─ */
    const logBtn = document.createElement('button');
    logBtn.textContent = '📋';
    logBtn.title = 'Görev Defteri (Tab)';
    logBtn.style.cssText = `
      position:fixed; top:10px; right:10px; z-index:300;
      width:44px; height:44px; background:rgba(0,0,0,0.75);
      border:2px solid #f6c90e; border-radius:50%;
      color:#f6c90e; font-size:1.3rem; cursor:pointer;
    `;
    logBtn.onclick = () => this.toggleLog();
    document.body.appendChild(logBtn);

    /* ─ Görev Defteri paneli ─ */
    this.logPanel = document.createElement('div');
    this.logPanel.style.cssText = `
      position:fixed; top:62px; right:10px; width:310px; max-height:68vh;
      background:rgba(8,6,3,0.95); border:2px solid #f6c90e;
      border-radius:14px; z-index:299; display:none;
      overflow-y:auto; padding:14px;
      box-shadow:0 4px 20px rgba(0,0,0,0.6);
    `;
    this.logInner = document.createElement('div');
    this.logPanel.innerHTML = `<h3 style="color:#f6c90e;margin:0 0 10px;font-size:0.95rem;">📋 Görev Defteri</h3>`;
    this.logPanel.appendChild(this.logInner);
    document.body.appendChild(this.logPanel);

    /* ─ Aktif görev ipucu (sol alt) ─ */
    this.activeHint = document.createElement('div');
    this.activeHint.style.cssText = `
      position:fixed; bottom:160px; left:205px; z-index:300;
      max-width:260px; pointer-events:none;
    `;
    document.body.appendChild(this.activeHint);

    /* ─ Bildirim alanı ─ */
    this.notifArea = document.createElement('div');
    this.notifArea.style.cssText = `
      position:fixed; top:64px; left:50%; transform:translateX(-50%);
      z-index:400; pointer-events:none;
      display:flex; flex-direction:column; gap:6px; align-items:center;
    `;
    document.body.appendChild(this.notifArea);

    /* ─ Kontrol ipucu ─ */
    const ctrl = document.createElement('div');
    ctrl.style.cssText = `
      position:fixed; bottom:10px; right:10px; z-index:200;
      background:rgba(0,0,0,0.45); color:#999; padding:5px 10px;
      border-radius:8px; font-size:0.68rem; pointer-events:none; line-height:1.7;
    `;
    ctrl.innerHTML = 'WASD Hareket &nbsp;|&nbsp; [E] Etkileşim<br>Q/E ok tuşu → kamera &nbsp;|&nbsp; [Tab] Görevler';
    document.body.appendChild(ctrl);

    /* ─ Ölüm / yeniden başla ─ */
    this.deathScreen = document.createElement('div');
    this.deathScreen.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.88);
      display:none; flex-direction:column; align-items:center; justify-content:center;
      z-index:950; color:#fff;
    `;
    this.deathScreen.innerHTML = `
      <div style="font-size:3rem;">💔</div>
      <h2 style="color:#ff5555;margin:12px 0;">Canın tükendi!</h2>
      <p style="color:#ccc;margin-bottom:20px;">Ama pes etme, tekrar deneyebilirsin.</p>
      <button onclick="location.reload()" style="
        padding:10px 28px; background:#e63946; color:#fff; border:none;
        border-radius:20px; font-size:1rem; font-weight:bold; cursor:pointer;">
        Tekrar Başla
      </button>
    `;
    document.body.appendChild(this.deathScreen);

    window.addEventListener('keydown', e => {
      if (e.code === 'Tab') { e.preventDefault(); this.toggleLog(); }
    });

    this._renderHP(3, 3);
  }

  _pill(color, bg) {
    const el = document.createElement('div');
    el.style.cssText = `
      background:${bg}; color:${color}; padding:5px 14px;
      border-radius:18px; font-size:0.85rem; font-weight:bold; border:1px solid ${color}55;
    `;
    return el;
  }

  // ── STATS GÜNCELLEME ─────────────────────────────────────────────────────────
  updateStats(stats) {
    this._renderHP(stats.hp, stats.maxHP);
    const pct = Math.min(100, (stats.xp / stats.xpToNext) * 100);
    this.xpBarFill.style.width = `${pct}%`;
    this.xpLabel.textContent = `${stats.xp} / ${stats.xpToNext} XP`;
    this.levelPill.textContent = `⚡ Lv.${stats.level}`;
    this.jokerEl.textContent = `🃏 ×${stats.jokers}`;
    this.skipEl.textContent  = `⏭ ×${stats.skips}`;
  }

  _renderHP(hp, maxHP) {
    this.hpRow.innerHTML = '';
    for (let i = 0; i < maxHP; i++) {
      const h = document.createElement('span');
      h.style.cssText = 'font-size:1rem; transition:filter 0.2s;';
      h.textContent = i < hp ? '❤️' : '🖤';
      this.hpRow.appendChild(h);
    }
  }

  showDeath() {
    this.deathScreen.style.display = 'flex';
  }

  // ── GÖREV SİSTEMİ ARAYÜZÜ ───────────────────────────────────────────────────
  addQuest(q, hint, onSkip) {
    this._activeQuests.set(q.id, { q, hint });
    this._questNames.set(q.id, q.title);
    if (onSkip) this._onSkipQuest = { id: q.id, fn: onSkip };
    this._renderActiveHint();
    this._renderLog();
    this.showNotification(`📋 Yeni Görev: ${q.title}`, '#f6c90e');
  }

  updateQuestHint(questId, hint, onSkip) {
    const e = this._activeQuests.get(questId);
    if (e) {
      e.hint = hint;
      if (onSkip) this._onSkipQuest = { id: questId, fn: onSkip };
      this._renderActiveHint();
      this._renderLog();
    }
  }

  completeQuest(questId, reward) {
    const e = this._activeQuests.get(questId);
    const title = e?.q?.title || this._questNames.get(questId) || questId;
    this._activeQuests.delete(questId);
    this._completedQuests.add({ id: questId, title });
    if (this._onSkipQuest?.id === questId) this._onSkipQuest = null;
    this._renderActiveHint();
    this._renderLog();
    this._updateProgress();
    const xpStr = reward?.xp ? ` +${reward.xp} XP` : '';
    const bdg   = reward?.badge ? ` ${reward.badge}` : '';
    this.showNotification(`✅ ${title}${bdg}${xpStr}`, '#7bc67e');
  }

  _updateProgress() {
    this.progressPill.textContent = `🎒 ${this._completedQuests.size}/${this.totalQuests}`;
  }

  setInventoryItem(label) {
    if (label) {
      this.inventoryEl.textContent = `🎒 ${label}`;
      this.inventoryEl.style.display = 'block';
    } else {
      this.inventoryEl.style.display = 'none';
    }
  }

  // ── AKTİF GÖREV İPUCU ───────────────────────────────────────────────────────
  _renderActiveHint() {
    this.activeHint.innerHTML = '';
    this._activeQuests.forEach(({ q, hint }) => {
      const card = document.createElement('div');
      card.style.cssText = `
        background:rgba(0,0,0,0.78); border-left:3px solid #f6c90e;
        border-radius:8px; padding:8px 10px; margin-bottom:6px; color:#fff; font-size:0.82rem;
      `;
      card.innerHTML = `<div style="color:#f6c90e;font-weight:bold;margin-bottom:3px;">${q.title}</div>${hint}`;

      // Pas geç butonu
      if (this._onSkipQuest?.id === q.id) {
        const skipBtn = document.createElement('button');
        skipBtn.textContent = '⏭ Pas Geç';
        skipBtn.style.cssText = `
          margin-top:5px; padding:3px 10px; background:#cc3333; color:#fff;
          border:none; border-radius:8px; font-size:0.72rem; cursor:pointer;
          pointer-events:all;
        `;
        skipBtn.onclick = () => {
          const cb = this._onSkipQuest;
          if (cb) cb.fn();
        };
        card.appendChild(skipBtn);
      }
      this.activeHint.appendChild(card);
    });
  }

  // ── GÖREV DEFTERİ ────────────────────────────────────────────────────────────
  toggleLog() {
    this._logOpen = !this._logOpen;
    this.logPanel.style.display = this._logOpen ? 'block' : 'none';
    if (this._logOpen) this._renderLog();
  }

  _renderLog() {
    this.logInner.innerHTML = '';

    if (this._activeQuests.size === 0 && this._completedQuests.size === 0) {
      this.logInner.innerHTML = '<p style="color:#777;font-size:0.82rem;">Henüz görev yok. Hocalarla konuş!</p>';
      return;
    }

    if (this._activeQuests.size > 0) {
      this._sectionHeader('Aktif Görevler', '#f6c90e');
      this._activeQuests.forEach(({ q, hint }) => {
        const el = document.createElement('div');
        el.style.cssText = `
          background:#1a160a; border-radius:8px; padding:10px; margin-bottom:8px;
          border:1px solid #f6c90e33;
        `;
        el.innerHTML = `
          <div style="color:#fff;font-weight:bold;font-size:0.88rem;">${q.title}</div>
          <div style="color:#999;font-size:0.78rem;margin-top:3px;">${q.description}</div>
          <div style="color:#f6c90e;font-size:0.76rem;margin-top:4px;">↪ ${hint}</div>
          <div style="color:#aaa;font-size:0.72rem;margin-top:2px;">💡 ${q.hint || ''}</div>
        `;
        this.logInner.appendChild(el);
      });
    }

    if (this._completedQuests.size > 0) {
      this._sectionHeader('Tamamlananlar', '#7bc67e');
      this._completedQuests.forEach(entry => {
        const el = document.createElement('div');
        el.style.cssText = 'color:#7bc67e;font-size:0.82rem;margin-bottom:3px;text-decoration:line-through;opacity:0.65;';
        el.textContent = `✓ ${entry.title || entry.id}`;
        this.logInner.appendChild(el);
      });
    }
  }

  _sectionHeader(text, color) {
    const h = document.createElement('div');
    h.style.cssText = `color:${color};font-size:0.75rem;font-weight:bold;
      margin:0 0 6px;text-transform:uppercase;letter-spacing:0.06em;`;
    h.textContent = text;
    this.logInner.appendChild(h);
  }

  // ── BİLDİRİM ─────────────────────────────────────────────────────────────────
  showNotification(text, color = '#f6c90e') {
    const el = document.createElement('div');
    el.style.cssText = `
      background:rgba(0,0,0,0.88); color:${color}; padding:9px 18px;
      border-radius:18px; font-size:0.9rem; font-weight:bold;
      border:1px solid ${color}55; animation:notifFade 3s forwards;
    `;
    el.textContent = text;
    this.notifArea.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }

  // ── ZAFEr EKRANI ─────────────────────────────────────────────────────────────
  // learningStats: { totalCorrect, totalWrong, totalJoker, totalQ, elapsedMin }
  showVictory(totalXP, badges, stats, learningStats = null) {
    const ov = document.createElement('div');
    ov.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.88);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      z-index:900; color:#fff; animation:fadeIn 1s; overflow-y:auto; padding:20px 0;
    `;

    const acc = learningStats && learningStats.totalQ - learningStats.totalJoker > 0
      ? Math.round(learningStats.totalCorrect / (learningStats.totalQ - learningStats.totalJoker) * 100)
      : null;

    const learningBlock = learningStats ? `
      <div style="background:#0d0d1a;border:1px solid #b48eff;border-radius:12px;
        padding:14px 20px;margin-top:14px;text-align:left;min-width:240px;max-width:340px;">
        <div style="color:#b48eff;font-size:0.85rem;font-weight:bold;margin-bottom:8px;">
          📊 Öğrenim Özeti
        </div>
        <div style="font-size:0.82rem;color:#ccc;line-height:1.9;">
          ✅ Doğru: <strong style="color:#7bc67e;">${learningStats.totalCorrect}</strong>
          &nbsp;&nbsp;❌ Yanlış: <strong style="color:#e74c3c;">${learningStats.totalWrong}</strong>
          &nbsp;&nbsp;🃏 Joker: <strong style="color:#f6c90e;">${learningStats.totalJoker}</strong>
          <br>
          ${acc !== null ? `🎯 Başarı oranı: <strong style="color:#7bc67e;">${acc}%</strong><br>` : ''}
          ⏱ Oyun süresi: <strong>${learningStats.elapsedMin} dk</strong>
        </div>
        <div style="font-size:0.72rem;color:#555;margin-top:8px;">
          Detaylı rapor için <kbd style="background:#222;padding:1px 5px;border-radius:4px;">Ctrl+T</kbd>
        </div>
      </div>` : '';

    ov.innerHTML = `
      <div style="font-size:3.5rem;">🎉</div>
      <h1 style="font-size:2rem;color:#f6c90e;margin:10px 0 4px;">Tebrikler!</h1>
      <p style="color:#ccc;margin-bottom:14px;">Kampüsün en iyi kuryesi oldun!</p>
      <div style="background:#12100a;border:2px solid #f6c90e;border-radius:16px;
        padding:20px 36px;text-align:center;min-width:240px;">
        <div style="font-size:1.6rem;color:#f6c90e;font-weight:bold;">⭐ ${totalXP} XP</div>
        <div style="color:#b48eff;margin:4px 0;">⚡ Seviye ${stats?.level ?? 1}</div>
        <div style="font-size:1.3rem;margin:8px 0;">${badges.map(b=>b.icon).join(' ')}</div>
        ${badges.map(b=>`<div style="font-size:0.85rem;color:#7bc67e;">${b.icon} ${b.name}</div>`).join('')}
      </div>
      ${learningBlock}
      <button onclick="location.reload()" style="
        margin-top:22px; padding:11px 30px; background:#f6c90e;
        color:#1a1a1a; border:none; border-radius:22px; font-size:1rem;
        font-weight:bold; cursor:pointer;">Tekrar Oyna</button>
    `;
    document.body.appendChild(ov);
  }
}
