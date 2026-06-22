export class Dialogue {
  constructor() {
    this.isOpen = false;
    this._resolve = null;
    this._typeInterval = null;
    this._onClose = null;
    this._buildUI();
  }

  _buildUI() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'dialogue-overlay';
    this.overlay.style.cssText = `
      position:fixed; bottom:0; left:0; right:0;
      display:none; z-index:500; padding:0 16px 16px;
      pointer-events:none;
    `;

    this.box = document.createElement('div');
    this.box.style.cssText = `
      background:rgba(20,15,10,0.92); border:2px solid #f6c90e;
      border-radius:16px; padding:18px 24px; max-width:720px;
      margin:0 auto; pointer-events:all; backdrop-filter:blur(4px);
      box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    `;

    // NPC name bar
    this.nameBar = document.createElement('div');
    this.nameBar.style.cssText = `
      color:#f6c90e; font-size:0.95rem; font-weight:bold;
      margin-bottom:10px; letter-spacing:0.05em;
    `;

    // Text area
    this.textEl = document.createElement('p');
    this.textEl.style.cssText = `
      color:#fff; font-size:1.05rem; line-height:1.6;
      min-height:3em; margin:0 0 14px;
    `;

    // Options
    this.optionsEl = document.createElement('div');
    this.optionsEl.style.cssText = `display:flex; flex-wrap:wrap; gap:8px;`;

    // Açıklama kutusu (doğru cevap sonrası gösterilir)
    this.explanationBox = document.createElement('div');
    this.explanationBox.style.cssText = `
      display:none; background:rgba(123,198,126,0.12); border-left:3px solid #7bc67e;
      border-radius:8px; padding:10px 14px; margin-top:10px; color:#c8f0c8;
      font-size:0.88rem; line-height:1.6;
    `;

    // Konu etiketi
    this.subjectTag = document.createElement('div');
    this.subjectTag.style.cssText = `
      display:inline-block; background:rgba(180,142,255,0.2); color:#b48eff;
      border-radius:10px; padding:2px 10px; font-size:0.72rem; font-weight:bold;
      margin-bottom:8px; display:none;
    `;

    // Close hint
    this.hint = document.createElement('div');
    this.hint.style.cssText = `color:#aaa; font-size:0.8rem; margin-top:8px; text-align:right;`;
    this.hint.textContent = '[E] veya dokunarak kapat';

    this.box.append(this.subjectTag, this.nameBar, this.textEl, this.optionsEl, this.explanationBox, this.hint);
    this.overlay.appendChild(this.box);
    document.body.appendChild(this.overlay);

    // Close on E
    window.addEventListener('keydown', e => {
      if ((e.code === 'KeyE' || e.code === 'Space') && this.isOpen && this.optionsEl.children.length === 0) {
        this.close();
      }
    });
  }

  _typewrite(text, cb) {
    clearInterval(this._typeInterval);
    this.textEl.textContent = '';
    let i = 0;
    this._typeInterval = setInterval(() => {
      this.textEl.textContent += text[i++];
      if (i >= text.length) {
        clearInterval(this._typeInterval);
        if (cb) cb();
      }
    }, 28);
  }

  // explanation: doğru cevaptan sonra gösterilecek eğitim notu
  // subject: "Matematik", "Fen" gibi ders etiketi
  show(npcName, text, options = [], onChoice, { explanation, subject } = {}) {
    this.isOpen = true;
    this.overlay.style.display = 'block';
    this.nameBar.textContent = `💬 ${npcName}`;
    this.optionsEl.innerHTML = '';
    this.explanationBox.style.display = 'none';
    this.hint.style.display = options.length ? 'none' : 'block';

    if (subject) {
      this.subjectTag.textContent = `📚 ${subject}`;
      this.subjectTag.style.display = 'inline-block';
    } else {
      this.subjectTag.style.display = 'none';
    }

    if (explanation) {
      this.explanationBox.innerHTML = `<strong>💡 Açıklama:</strong> ${explanation}`;
      this.explanationBox.style.display = 'block';
    }

    this._typewrite(text, () => {
      if (options.length) {
        options.forEach((opt, i) => {
          const btn = document.createElement('button');
          btn.textContent = opt;
          btn.style.cssText = `
            background:#f6c90e; color:#1a1a1a; border:none;
            border-radius:20px; padding:8px 18px; font-size:0.95rem;
            font-weight:bold; cursor:pointer; transition:transform 0.1s;
          `;
          btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
          btn.onmouseleave = () => btn.style.transform = '';
          btn.onclick = () => { if (onChoice) onChoice(i); };
          this.optionsEl.appendChild(btn);
        });
      }
    });
  }

  showSequence(npcName, lines, onDone) {
    let idx = 0;
    const showNext = () => {
      if (idx >= lines.length) {
        this.close();
        if (onDone) onDone();
        return;
      }
      const line = lines[idx++];
      if (typeof line === 'string') {
        this.show(npcName, line, [], null);
        this.hint.style.display = 'block';
        this.hint.textContent = idx < lines.length ? '[E] Devam et' : '[E] Kapat';
        const handler = e => {
          if (e.code === 'KeyE' || e.code === 'Space') {
            window.removeEventListener('keydown', handler);
            showNext();
          }
        };
        // Also allow tap
        const tapHandler = () => {
          if (this.isOpen) {
            this.box.removeEventListener('click', tapHandler);
            window.removeEventListener('keydown', handler);
            showNext();
          }
        };
        window.addEventListener('keydown', handler);
        this.box.addEventListener('click', tapHandler);
      }
    };
    showNext();
  }

  close() {
    clearInterval(this._typeInterval);
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.optionsEl.innerHTML = '';
    if (this._onClose) { this._onClose(); this._onClose = null; }
  }
}
