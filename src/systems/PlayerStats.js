export class PlayerStats {
  constructor({ maxHP = 3, maxJoker = 2, onDead, onUpdate } = {}) {
    this.maxHP      = maxHP;
    this.hp         = maxHP;
    this.maxJoker   = maxJoker;
    this.jokers     = maxJoker;   // quiz sorusunu pas geçer
    this.xp         = 0;
    this.level      = 1;
    this.xpToNext   = 150;
    this.skips      = 1;          // görev atlama hakkı (pas geç)

    this._onDead   = onDead   || (() => {});
    this._onUpdate = onUpdate || (() => {});
  }

  // ── XP & Level ──────────────────────────────────────────────────────────────
  addXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp      -= this.xpToNext;
      this.level   += 1;
      this.xpToNext = Math.floor(this.xpToNext * 1.4);
      // seviye atlandığında 1 joker kazan
      this.jokers   = Math.min(this.maxJoker + this.level - 1, this.jokers + 1);
      this._onUpdate('levelup', this.level);
    }
    this._onUpdate('xp', this.xp);
  }

  // ── Can ──────────────────────────────────────────────────────────────────────
  loseHP(amount = 1) {
    this.hp = Math.max(0, this.hp - amount);
    this._onUpdate('hp', this.hp);
    if (this.hp <= 0) this._onDead();
  }

  gainHP(amount = 1) {
    this.hp = Math.min(this.maxHP + Math.floor(this.level / 3), this.hp + amount);
    this._onUpdate('hp', this.hp);
  }

  // ── Joker (quiz pas geç) ────────────────────────────────────────────────────
  useJoker() {
    if (this.jokers <= 0) return false;
    this.jokers--;
    this._onUpdate('joker', this.jokers);
    return true;
  }

  // ── Görev Atlama ─────────────────────────────────────────────────────────────
  canSkipQuest() { return this.skips > 0; }

  useSkip() {
    if (this.skips <= 0) return false;
    this.skips--;
    this._onUpdate('skip', this.skips);
    return true;
  }

  // Yanlış quiz cevabı: can azalt
  onWrongAnswer() {
    this.loseHP(1);
  }

  getSummary() {
    return { hp: this.hp, maxHP: this.maxHP, xp: this.xp, xpToNext: this.xpToNext,
             level: this.level, jokers: this.jokers, skips: this.skips };
  }
}
