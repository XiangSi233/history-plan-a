/* ===========================================================
   quiz.js — 答题关卡：答对才能推进剧情
   =========================================================== */
import { $, el } from '../util/dom.js';

export class Quiz {
  constructor({ onPass } = {}) {
    this.onPass = onPass || (() => {});
    this.wrap = $('#quiz');
    this.qEl = $('#quizQ');
    this.optsEl = $('#quizOpts');
    this.tipEl = $('#quizTip');
    this.nextBtn = $('#quizNext');
    this.chapterEl = $('#quizChapter');
    this.scoreEl = $('#quizScore');
    this.totalRight = 0;
    this.totalAsked = 0;
    this.nextBtn.addEventListener('click', () => {
      const cb = this._done;
      this._done = null;
      this.hide();
      cb?.();
    });
  }

  scoreText() { return `答题正确 ${this.totalRight} / ${this.totalAsked}`; }

  show(quiz, { label = '', onPass, nextLabel = '继续剧情 →' } = {}) {
    this._done = onPass || this.onPass;
    this._nextLabel = nextLabel;
    this.cur = quiz;
    this.wrongCount = 0;
    this.answered = false;
    this.totalAsked++;
    // 答题时收起对话框，避免两层 UI 打架
    const vn = document.getElementById('vn');
    if (vn) vn.hidden = true;
    this.wrap.hidden = false;
    this.chapterEl.textContent = label;
    this.qEl.textContent = quiz.q;
    this.tipEl.textContent = '选出你认为正确的答案。';
    this.tipEl.className = 'quiz__tip';
    this.nextBtn.hidden = true;
    this.scoreEl.textContent = this.totalRight ? `已答对 ${this.totalRight} 题` : '';

    this.optsEl.innerHTML = '';
    quiz.options.forEach((txt, i) => {
      const b = el('button', 'qopt');
      b.innerHTML = `<i>${'ABCD'[i]}</i><span>${txt}</span>`;
      b.addEventListener('click', () => this.pick(i, b));
      this.optsEl.appendChild(b);
    });
  }

  pick(i, btn) {
    if (this.answered) return;
    const q = this.cur;
    if (i === q.answer) {
      this.answered = true;
      btn.classList.add('is-right');
      [...this.optsEl.children].forEach((b, k) => {
        b.classList.add('is-locked');
        if (k === q.answer) b.classList.add('is-right');
      });
      this.totalRight++;
      this.tipEl.className = 'quiz__tip is-ok';
      this.tipEl.textContent = '回答正确 ✓　' + (q.tip || '');
      this.nextBtn.hidden = false;
      this.nextBtn.textContent = this._nextLabel || '继续剧情 →';
      this.scoreEl.textContent = `已答对 ${this.totalRight} 题`;
      this.nextBtn.focus?.();
    } else {
      this.wrongCount++;
      btn.classList.add('is-wrong');
      btn.classList.add('is-locked');
      this.tipEl.className = 'quiz__tip is-bad';
      this.tipEl.textContent = q.hint || '再想一想——回到课文里找依据。';
    }
  }

  hide() { this.wrap.hidden = true; }
}
