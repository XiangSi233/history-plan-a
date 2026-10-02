/* ===========================================================
   summaryView.js — 课堂小结页的「长征事件排序」活动
   =========================================================== */
import { SORT_ANSWER } from '../data/lesson.js';
import { $, el, shuffle, toast } from '../util/dom.js';

export class SummaryView {
  constructor() {
    this.pool = $('#sortPool');
    this.slots = $('#sortSlots');
    this.hint = $('#sortHint');
    this.answer = SORT_ANSWER;
    this.reset();
  }

  reset() {
    this.picked = [];
    this.pool.innerHTML = '';
    this.slots.innerHTML = '';
    this.hint.textContent = `按时间先后，依次点击下面的卡片（共 ${this.answer.length} 项）。`;
    this.hint.style.color = '';

    shuffle(this.answer).forEach(txt => {
      const b = el('button', 'chip', txt);
      b.dataset.value = txt;
      b.addEventListener('click', () => this.pick(txt));
      this.pool.appendChild(b);
    });
    for (let i = 0; i < this.answer.length; i++) {
      const li = el('li', '', '<span class="slotval">—</span>');
      this.slots.appendChild(li);
    }
  }

  pick(txt) {
    const chip = [...this.pool.children].find(c => c.dataset.value === txt && !c.classList.contains('is-used'));
    if (!chip) return;
    chip.classList.add('is-used');
    this.picked.push(txt);
    const li = this.slots.children[this.picked.length - 1];
    li.querySelector('.slotval').textContent = txt;
    li.dataset.value = txt;
    li.appendChild(this._undoBtn(txt));
    if (this.picked.length === this.answer.length) this.check(true);
  }

  _undoBtn(txt) {
    const b = el('button', '', '移除');
    b.addEventListener('click', e => {
      e.stopPropagation();
      const idx = this.picked.indexOf(txt);
      if (idx < 0) return;
      this.picked.splice(idx, 1);
      [...this.pool.children].find(c => c.dataset.value === txt)?.classList.remove('is-used');
      this._repaint();
    });
    return b;
  }

  _repaint() {
    [...this.slots.children].forEach((li, i) => {
      li.className = '';
      li.dataset.value = '';
      li.innerHTML = '<span class="slotval">—</span>';
      const v = this.picked[i];
      if (v) {
        li.dataset.value = v;
        li.querySelector('.slotval').textContent = v;
        li.appendChild(this._undoBtn(v));
      }
    });
  }

  check(auto = false) {
    if (this.picked.length < this.answer.length) {
      if (!auto) toast(`还差 ${this.answer.length - this.picked.length} 项没有排序`, 'bad');
      return;
    }
    let right = 0;
    [...this.slots.children].forEach((li, i) => {
      const ok = li.dataset.value === this.answer[i];
      li.classList.toggle('is-ok', ok);
      li.classList.toggle('is-bad', !ok);
      if (ok) right++;
    });
    if (right === this.answer.length) {
      toast('完全正确！长征的路线与顺序，你已经掌握了 🎉', 'ok');
      this.hint.textContent = '全部正确 ✓ 长征的进程：出发 → 血战湘江 → 遵义会议 → 四渡赤水 → 巧渡金沙江 → 强渡大渡河 · 飞夺泸定桥 → 翻雪山 · 过草地 → 腊子口 → 吴起镇 · 会宁会师';
      this.hint.style.color = '#8fd0a5';
    } else {
      toast(`正确 ${right} / ${this.answer.length} 项，红色的位置再想一想`, 'bad');
    }
  }
}
