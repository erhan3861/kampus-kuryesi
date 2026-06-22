/**
 * LearningLog — öğrenci performansını bellekte tutar.
 * localStorage kullanmaz; tüm veri JS değişkenlerinde yaşar.
 */
export class LearningLog {
  constructor() {
    this._startTime = Date.now();
    // { subject: { correct, wrong, joker, total, timeMs[] } }
    this._bySubject = {};
    // Ham kayıtlar — öğretmen paneli için
    this._records = [];
  }

  /**
   * @param {string} questId
   * @param {string} subject   ders adı (ör. "Matematik")
   * @param {string} question  soru metni
   * @param {boolean} correct  doğru mu?
   * @param {boolean} usedJoker  joker mi kullandı?
   */
  record(questId, subject, question, correct, usedJoker = false) {
    const subj = subject ?? 'Genel';
    if (!this._bySubject[subj]) {
      this._bySubject[subj] = { correct: 0, wrong: 0, joker: 0, total: 0, timeMs: [] };
    }
    const s = this._bySubject[subj];
    s.total++;
    if (usedJoker) { s.joker++; }
    else if (correct) { s.correct++; }
    else { s.wrong++; }

    this._records.push({
      ts: Date.now(),
      questId, subject: subj, question, correct, usedJoker,
    });
  }

  /** Derse göre istatistikler döner */
  getBySubject() {
    return Object.entries(this._bySubject).map(([subject, s]) => {
      const accuracy = s.total - s.joker > 0
        ? Math.round((s.correct / (s.total - s.joker)) * 100) : null;
      return { subject, ...s, accuracy };
    });
  }

  /** Genel özet */
  getSummary() {
    let totalCorrect = 0, totalWrong = 0, totalJoker = 0, totalQ = 0;
    for (const s of Object.values(this._bySubject)) {
      totalCorrect += s.correct;
      totalWrong  += s.wrong;
      totalJoker  += s.joker;
      totalQ      += s.total;
    }
    const elapsedMin = Math.round((Date.now() - this._startTime) / 60000);
    return { totalCorrect, totalWrong, totalJoker, totalQ, elapsedMin };
  }

  /** Ham kayıtları döner (öğretmen paneli için) */
  getRecords() { return [...this._records]; }
}
