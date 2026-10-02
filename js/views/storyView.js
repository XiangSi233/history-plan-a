/* ===========================================================
   storyView.js — 剧情模式视图：背景 / 立绘 / 章节进度
   =========================================================== */
import { CAST_INFO } from '../data/story.js';
import { $, el } from '../util/dom.js';

const POSITIONS = ['left', 'center', 'right'];

export class StoryView {
  constructor() {
    this.bg = $('#storyBg');
    this.stage = $('#storySprites');
    this.noEl = $('#storyNo');
    this.titleEl = $('#storyTitle');
    this.placeEl = $('#storyPlace');
    this.barEl = $('#storyBar');
    this.pctEl = $('#storyPct');
    this.dotsEl = $('#chapDots');
    this.hintEl = $('#storyHint');
    this.slots = {};        // 位置 -> 人物 id
    this.nodes = new Map(); // 人物 id -> DOM
  }

  /* ---------- 打开一章 ---------- */
  open(chapter) {
    this.bg.style.opacity = 0;
    const img = new Image();
    img.onload = () => {
      this.bg.style.backgroundImage = `url("${chapter.bg}")`;
      this.bg.style.opacity = 1;
    };
    img.src = chapter.bg;
    this.noEl.textContent = chapter.no;
    this.titleEl.textContent = chapter.title;
    this.placeEl.textContent = chapter.place || '';
    this.clearSprites();
  }

  /* ---------- 立绘 ---------- */
  clearSprites() {
    this.stage.innerHTML = '';
    this.nodes.clear();
    this.slots = {};
  }

  _node(id) {
    if (this.nodes.has(id)) return this.nodes.get(id);
    const info = CAST_INFO[id] || { name: id };
    const n = el('img', 'spr');
    n.src = `assets/chara/${id}.webp`;
    n.alt = info.name;
    n.draggable = false;
    this.stage.appendChild(n);
    this.nodes.set(id, n);
    return n;
  }

  /** 让人物出现在某个位置（同一位置只留一个人） */
  enter(id, pos = 'center') {
    if (!id) { this.setSpeaker(null); return; }
    if (!POSITIONS.includes(pos)) pos = 'center';
    const cur = this.slots[pos];
    if (cur && cur !== id) {
      const old = this.nodes.get(cur);
      if (old) { old.classList.remove('is-in', 'is-speak'); }
      delete this.slots[pos];
      // 让位者稍后移除，避免叠影
      if (old) setTimeout(() => { if (!Object.values(this.slots).includes(cur)) old.remove(), this.nodes.delete(cur); }, 600);
    }
    // 该人物若在别的位置，先撤下
    for (const p of POSITIONS) if (this.slots[p] === id && p !== pos) delete this.slots[p];
    this.slots[pos] = id;
    const n = this._node(id);
    POSITIONS.forEach(p => n.classList.toggle('spr--' + p, p === pos));
    requestAnimationFrame(() => n.classList.add('is-in'));
    this.setSpeaker(id);
  }

  setSpeaker(id) {
    this.nodes.forEach((n, k) => n.classList.toggle('is-speak', k === id));
  }

  /* ---------- 中途切换背景（带淡入淡出） ---------- */
  setBg(src) {
    if (this._bgSrc === src) return;
    this._bgSrc = src;
    const img = new Image();
    img.onload = () => {
      this.bg.style.opacity = 0;
      setTimeout(() => {
        this.bg.style.backgroundImage = `url("${src}")`;
        this.bg.style.opacity = 1;
      }, 260);
    };
    img.src = src;
  }

  /* ---------- 跨学科知识卡 ---------- */
  showGeo(card, onClose) {
    const box = document.getElementById('geoCard');
    document.getElementById('geoTag').textContent = card.subject || '地理';
    document.getElementById('geoTitle').textContent = card.title || '';
    const body = document.getElementById('geoBody');
    let html = '';
    if (card.img) html += `<img src="${card.img}" alt="${card.title || ''}" draggable="false">`;
    if (card.quote) html += `<p class="q">${card.quote}</p>`;
    if (card.points?.length) html += '<ul>' + card.points.map(p => `<li>${p}</li>`).join('') + '</ul>';
    body.innerHTML = html;
    const vn = document.getElementById('vn');       // 知识卡期间收起对话框
    if (vn) vn.hidden = true;
    box.hidden = false;
    this._geoClose = onClose;
    const btn = document.getElementById('geoNext');
    btn.onclick = () => { box.hidden = true; const cb = this._geoClose; this._geoClose = null; cb?.(); };
    this.hintVisible(false);
  }

  geoOpen() { return !document.getElementById('geoCard').hidden; }
  closeGeo() {
    const box = document.getElementById('geoCard');
    if (box.hidden) return false;
    box.hidden = true;
    const cb = this._geoClose; this._geoClose = null; cb?.();
    return true;
  }

  /* ---------- 操作提示 ---------- */
  hintVisible(v) {
    clearTimeout(this._hintT);
    this.hintEl.classList.toggle('is-hidden', !v);
    if (v) this._hintT = setTimeout(() => this.hintEl.classList.add('is-hidden'), 9000);
  }

  /* ---------- 进度 ---------- */
  setProgress(ci, total, cleared) {
    const n = cleared ? cleared.size : ci;
    this.barEl.style.width = `${Math.round(n / total * 100)}%`;
    this.pctEl.textContent = `第 ${ci + 1} / ${total} 章 · 已通关 ${n}`;
    this.dotsEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = el('i');
      if (cleared && cleared.has('ch' + i)) d.className = 'done';
      if (i === ci) d.className += ' cur';
      this.dotsEl.appendChild(d);
    }
  }

  /* ---------- 进入三维现场的提示 ---------- */
  showEnterPrompt(text, onEnter) {
    const box = el('div', 'enterbox');
    box.id = 'enterBox';
    box.innerHTML = `<div class="enterbox__ring">▶</div>
      <p style="font-family:var(--serif);letter-spacing:.1em;color:var(--paper)">${text || '进入三维现场'}</p>
      <button class="btn btn--primary" id="enterBtn" style="margin-top:16px;pointer-events:auto">进入现场 ▶</button>`;
    this.stage.parentElement.appendChild(box);
    box.querySelector('#enterBtn').addEventListener('click', () => {
      this.hideEnterPrompt();
      onEnter();
    });
  }

  hideEnterPrompt() {
    document.getElementById('enterBox')?.remove();
  }
}
