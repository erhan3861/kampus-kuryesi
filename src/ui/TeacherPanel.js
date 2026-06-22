/**
 * TeacherPanel — Ctrl+T ile açılır, öğrenci performans raporu gösterir.
 * LearningLog'dan veri okur; oyun durumunu değiştirmez.
 * Yalnızca öğretmen / veli rolü için tasarlanmıştır.
 */
export class TeacherPanel {
  constructor(learningLog) {
    this.log     = learningLog;
    this.visible = false;
    this._build();
    this._bindKey();
  }

  _build() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.75);
      display:none; z-index:900; align-items:center; justify-content:center;
    `;

    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      background:#1a1a2e; border:2px solid #b48eff; border-radius:16px;
      padding:24px 28px; max-width:680px; width:90%; max-height:80vh;
      overflow-y:auto; color:#e0e0e0; font-family:monospace, sans-serif;
      box-shadow:0 8px 40px rgba(0,0,0,0.8);
    `;

    this.overlay.appendChild(this.panel);
    document.body.appendChild(this.overlay);

    // Kapat butonu
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.hide();
    });
  }

  _bindKey() {
    window.addEventListener('keydown', e => {
      if (e.ctrlKey && e.code === 'KeyT') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  show() {
    this.visible = true;
    this.overlay.style.display = 'flex';
    this._render();
  }

  hide() {
    this.visible = false;
    this.overlay.style.display = 'none';
  }

  _render() {
    const summary  = this.log.getSummary();
    const bySubj   = this.log.getBySubject();
    const records  = this.log.getRecords().slice(-20).reverse(); // son 20

    const acc = summary.totalQ - summary.totalJoker > 0
      ? Math.round(summary.totalCorrect / (summary.totalQ - summary.totalJoker) * 100)
      : 0;

    const barHTML = (val, max, color = '#7bc67e') => {
      const pct = max > 0 ? Math.min(100, Math.round(val / max * 100)) : 0;
      return `<div style="background:#333;border-radius:6px;height:8px;margin:4px 0 10px;">
        <div style="background:${color};width:${pct}%;height:8px;border-radius:6px;transition:width 0.4s;"></div>
      </div>`;
    };

    const subjectRows = bySubj.length > 0 ? bySubj.map(s => `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
          <span style="color:#b48eff;font-weight:bold;">📚 ${s.subject}</span>
          <span>${s.correct}✅ ${s.wrong}❌ ${s.joker}🃏  |
            ${s.accuracy !== null ? `<span style="color:#7bc67e;font-weight:bold;">%${s.accuracy}</span>` : '<em style="color:#888">—</em>'}</span>
        </div>
        ${barHTML(s.correct, s.total)}
      </div>
    `).join('') : '<p style="color:#666;font-size:0.85rem;">Henüz quiz yanıtlanmadı.</p>';

    const recordRows = records.length > 0 ? records.map(r => {
      const icon = r.usedJoker ? '🃏' : r.correct ? '✅' : '❌';
      const col  = r.usedJoker ? '#f6c90e' : r.correct ? '#7bc67e' : '#e74c3c';
      const q    = r.question.length > 60 ? r.question.slice(0, 60) + '…' : r.question;
      return `<div style="border-bottom:1px solid #2a2a3e;padding:5px 0;font-size:0.78rem;display:flex;gap:8px;align-items:center;">
        <span style="color:${col};min-width:20px;">${icon}</span>
        <span style="color:#b48eff;min-width:90px;">${r.subject}</span>
        <span style="color:#ccc;">${q}</span>
      </div>`;
    }).join('') : '<p style="color:#666;font-size:0.82rem;">Henüz yanıt yok.</p>';

    this.panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="margin:0;color:#b48eff;font-size:1.1rem;">📊 Öğretmen Paneli — Öğrenci Raporu</h2>
        <button id="tp-close" style="background:none;border:1px solid #b48eff;color:#b48eff;
          border-radius:8px;padding:4px 12px;cursor:pointer;font-size:0.85rem;">Kapat</button>
      </div>

      <div style="background:#0d0d1a;border-radius:10px;padding:14px 18px;margin-bottom:18px;
        display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center;">
        <div>
          <div style="font-size:1.5rem;font-weight:bold;color:#7bc67e;">${summary.totalCorrect}</div>
          <div style="font-size:0.72rem;color:#888;">Doğru</div>
        </div>
        <div>
          <div style="font-size:1.5rem;font-weight:bold;color:#e74c3c;">${summary.totalWrong}</div>
          <div style="font-size:0.72rem;color:#888;">Yanlış</div>
        </div>
        <div>
          <div style="font-size:1.5rem;font-weight:bold;color:#f6c90e;">${summary.totalJoker}</div>
          <div style="font-size:0.72rem;color:#888;">Joker</div>
        </div>
        <div>
          <div style="font-size:1.5rem;font-weight:bold;color:#b48eff;">${acc}%</div>
          <div style="font-size:0.72rem;color:#888;">Başarı</div>
        </div>
      </div>

      <div style="font-size:0.72rem;color:#555;margin-bottom:12px;">
        ⏱ Oyun süresi: ${summary.elapsedMin} dakika — Toplam soru: ${summary.totalQ}
      </div>

      <h3 style="color:#f6c90e;font-size:0.88rem;margin:0 0 10px;">Derse Göre Performans</h3>
      ${subjectRows}

      <h3 style="color:#f6c90e;font-size:0.88rem;margin:16px 0 8px;">Son Yanıtlar</h3>
      ${recordRows}

      <div style="margin-top:16px;padding:12px;background:#0d0d1a;border-radius:8px;
        border-left:3px solid #7bc67e;font-size:0.8rem;color:#aaa;line-height:1.6;">
        <strong style="color:#7bc67e;">Öğretmen Notu:</strong> Bu panel yalnızca
        <strong>Ctrl+T</strong> kısayoluyla açılır ve oyun verisini değiştirmez.
        Öğrenci bu paneli görüntüleyemez (gizli mod). Paneli PDF olarak kaydetmek için
        tarayıcının yazdır özelliğini kullanabilirsiniz.
      </div>
    `;

    document.getElementById('tp-close')?.addEventListener('click', () => this.hide());
  }
}
