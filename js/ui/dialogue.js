/* ===========================================================
   dialogue.js — 对话引擎
   支持三种状态：
     queue(lines)  逐句播放（打字机），点击继续，播完回调
     prompt(html)  驻足提示（例如「点击人物听他发言」+ 可点按钮）
     choice(items) 分支选择（内嵌在 queue 的某一项里）
   =========================================================== */
import { $, richText } from '../util/dom.js';

const SPEED = 24;
const PAUSE = { '。': 220, '！': 220, '？': 220, '，': 100, '、': 100, '；': 140, '：': 140, '—': 80 };

export class Dialogue {
  constructor({ onFocus, onCam, onChoice }) {
    this.onFocus = onFocus || (() => {});
    this.onCam = onCam || (() => {});
    this.onChoice = onChoice || (() => {});

    this.vn = $('#vn');
    this.plate = $('#vnPlate');
    this.nameEl = $('#vnName');
    this.roleEl = $('#vnRole');
    this.box = $('#vnBox');
    this.textEl = $('#vnText');
    this.choicesEl = $('#vnChoices');
    this.countEl = $('#vnCount');
    this.nextEl = $('#vnNext');
    this.autoBtn = $('#vnAuto');

    this.castMap = {};
    this.queue = [];
    this.qi = 0;
    this.onQueueDone = null;
    this.typing = false;
    this.auto = false;
    this.mode = 'idle';           // idle | queue | choice | prompt
    this._timers = [];

    this.box.addEventListener('click', e => {
      if (e.target.closest('.vn__choice')) return;
      this.advance();
    });
    $('#vnSkip').addEventListener('click', e => { e.stopPropagation(); this.finishTyping(); });
    this.autoBtn.addEventListener('click', e => { e.stopPropagation(); this.setAuto(!this.auto); });
  }

  bindCast(cast) {
    this.castMap = {};
    (cast || []).forEach(c => { this.castMap[c.id] = c; });
  }

  show() { this.vn.hidden = false; }
  hide() { this._clearTimers(); this.vn.hidden = true; this.mode = 'idle'; }

  setAuto(v) {
    this.auto = v;
    this.autoBtn.classList.toggle('is-on', v);
    if (v && this.mode === 'queue' && !this.typing) this._scheduleAuto();
  }

  _clearTimers() {
    this._timers.forEach(t => { clearTimeout(t); cancelAnimationFrame(t); });
    this._timers = [];
  }
  _later(fn, ms) { const t = setTimeout(fn, ms); this._timers.push(t); return t; }
  _frame(fn) { const t = requestAnimationFrame(fn); this._timers.push(t); return t; }

  /* ---------------- 线性队列 ---------------- */
  queueLines(lines, onDone) {
    this.show();
    this.queue = lines.slice();
    this.qi = 0;
    this.onQueueDone = onDone || null;
    this.mode = 'queue';
    this._showCurrent();
  }

  advance() {
    if (this.mode === 'choice') return;             // 等待选择
    if (this.mode === 'prompt' || this.mode === 'idle') return;
    if (this.typing) { this.finishTyping(); return; }
    this.qi++;
    if (this.qi >= this.queue.length) {
      this.mode = 'idle';
      const cb = this.onQueueDone; this.onQueueDone = null;
      if (cb) cb();
      return;
    }
    this._showCurrent();
  }

  _showCurrent() {
    this._clearTimers();
    const line = this.queue[this.qi];
    if (!line) { this.mode = 'idle'; const cb = this.onQueueDone; this.onQueueDone = null; cb?.(); return; }
    if (line.choices) { this._showChoices(line.choices); return; }

    this.mode = 'queue';
    this.choicesEl.hidden = true;
    this.choicesEl.innerHTML = '';
    this.box.classList.remove('is-choice');

    const narr = !!line.narr || !line.who;
    const c = this.castMap[line.who];
    this.vn.classList.toggle('is-narration', narr);
    this.plate.classList.toggle('is-narration', narr);
    this.nameEl.textContent = narr ? '旁白' : (c?.name || line.who);
    this.roleEl.textContent = narr ? '' : (c?.role || '');
    this.plate.style.visibility = 'visible';
    this.countEl.textContent = `${this.qi + 1} / ${this.queue.length}`;

    this.onFocus(narr ? null : line.who, line);
    if (line.cam) this.onCam(line.cam, line.who);
    this._type(line.text || '');
  }

  /* ---------------- 驻足提示（自由探索） ---------------- */
  prompt(html, { plate = '会场', role = '', buttons = null } = {}) {
    this._clearTimers();
    this.show();
    this.queue = []; this.qi = 0; this.onQueueDone = null;
    this.mode = 'prompt';
    this.typing = false;
    this.vn.classList.add('is-narration');
    this.plate.classList.add('is-narration');
    this.nameEl.textContent = plate;
    this.roleEl.textContent = role;
    this.plate.style.visibility = 'visible';
    this.countEl.textContent = '';
    this.nextEl.classList.add('is-off');
    this.textEl.innerHTML = html;
    this.onFocus(null);
    this.box.classList.add('is-choice');

    this.choicesEl.innerHTML = '';
    this.choicesEl.classList.toggle('is-grid', !!(buttons && buttons.length > 3));
    if (buttons && buttons.length) {
      this.choicesEl.hidden = false;
      buttons.forEach(b => {
        const el = document.createElement('button');
        el.className = 'vn__choice' + (b.done ? ' is-historic' : '');
        el.innerHTML = `<i>${b.done ? '✓' : '·'}</i><span>${richText(b.label)}</span>`;
        el.addEventListener('click', e => { e.stopPropagation(); b.onClick(); });
        this.choicesEl.appendChild(el);
      });
    } else {
      this.choicesEl.hidden = true;
    }
  }

  /* ---------------- 选择分支 ---------------- */
  _showChoices(choices) {
    this._clearTimers();
    this.mode = 'choice';
    const c = this.castMap[this.queue[this.qi]?.who];
    this.vn.classList.remove('is-narration');
    this.plate.classList.remove('is-narration');
    this.nameEl.textContent = '你的选择';
    this.roleEl.textContent = '';
    this.plate.style.visibility = 'visible';
    this.countEl.textContent = '';
    this.nextEl.classList.add('is-off');
    this.box.classList.add('is-choice');
    this.textEl.innerHTML = '面对眼前的分歧，你会站在哪一边？';
    this.choicesEl.innerHTML = '';
    this.choicesEl.classList.remove('is-grid');
    this.choicesEl.hidden = false;

    choices.forEach((ch, k) => {
      const b = document.createElement('button');
      b.className = 'vn__choice' + (ch.tone === 'historic' ? ' is-historic' : ch.tone === 'risky' ? ' is-risky' : '');
      b.innerHTML = `<i>${k + 1}</i><span>${richText(ch.text)}</span>`;
      b.addEventListener('click', e => { e.stopPropagation(); this._pick(ch); });
      this.choicesEl.appendChild(b);
    });
  }

  _pick(choice) {
    this.choicesEl.hidden = true;
    this.choicesEl.innerHTML = '';
    this.box.classList.remove('is-choice');
    this.onChoice(choice);
    // 用「反馈台词」替换掉选择项本身
    const replies = choice.reply || [];
    this.queue.splice(this.qi, 1, ...replies);
    if (replies.length === 0) { this.qi++; if (this.qi >= this.queue.length) { this.mode = 'idle'; const cb = this.onQueueDone; this.onQueueDone = null; cb?.(); return; } }
    this.mode = 'queue';
    this._showCurrent();
  }

  /* ---------------- 打字机 ---------------- */
  _type(text) {
    this.typing = true;
    this.nextEl.classList.add('is-off');
    const plain = String(text);
    let n = 0, last = performance.now();

    const step = () => {
      if (!this.typing) return;
      const now = performance.now();
      if (now - last >= SPEED) {
        last = now;
        n++;
        if (n > plain.length) { this._done(plain); return; }
        this.textEl.innerHTML = richText(plain.slice(0, n)) + '<span class="cursor"></span>';
        const wait = PAUSE[plain[n - 1]];
        if (wait) { this._later(() => this._frame(step), wait); return; }
      }
      this._frame(step);
    };
    if (!plain.length) { this._done(plain); return; }
    this._frame(step);
  }

  _done(plain) {
    this.typing = false;
    this.textEl.innerHTML = richText(plain);
    this.nextEl.classList.remove('is-off');
    if (this.auto) this._scheduleAuto();
  }

  finishTyping() {
    if (!this.typing) return;
    this._clearTimers();
    this.typing = false;
    this.textEl.innerHTML = richText(this.queue[this.qi]?.text || '');
    this.nextEl.classList.remove('is-off');
    if (this.auto) this._scheduleAuto();
  }

  _scheduleAuto() {
    if (this.mode !== 'queue') return;
    this._later(() => { if (this.auto) this.advance(); }, 1700);
  }
}
