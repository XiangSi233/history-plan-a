/* ===========================================================
   mapView.js — 长征路线图视图
   =========================================================== */
import { STOPS, ROUTE, MAP_SIZE } from '../data/lesson.js';
import { $, el, smoothPath, richText, toast, clamp } from '../util/dom.js';

const KIND_CLASS = { start: 'mk--start', battle: 'mk--battle', meeting: 'mk--meeting', pass: 'mk--pass', join: 'mk--meeting' };
/* 标签方位：避开点位密集区（b 下 / t 上 / l 左 / r 右） */
const LABEL_POS = {
  ruijin: 'r', yudu: 't', blockade: 'b', xiangjiang: 'b', tongdao: 'b', wujiang: 't',
  zunyi: 'b', chishui: 'l', jinsha: 'r', dadu: 'l', luding: 'r', xueshan: 'l',
  caodi: 'l', lazikou: 'r', wuqi: 't', huining: 'b'
};

export class MapView {
  constructor({ onEnterScene, onAllExplored }) {
    this.onEnterScene = onEnterScene;
    this.onAllExplored = onAllExplored;
    this.explored = new Set();
    this.current = null;
    this.markerEls = new Map();
    this.tlEls = new Map();

    this.markers = $('#markers');
    this.timeline = $('#timelineTrack');
    this.svg = $('.mapwrap__route');
    this.routeLine = $('#routeLine');
    this.routeHalo = $('#routeHalo');
    this.routeDraw = $('#routeDraw');
    this.card = $('#infocard');
    this.progress = $('#mapProgress');
    this.tip = $('#mapTip');

    this._buildRoute();
    this._buildMarkers();
    this._buildTimeline();
    this._bindCard();
    this._initPanZoom();
    this.progress.textContent = `已探索 0 / ${STOPS.length}`;
    this.revealTo(0, true);
  }

  /* ---------- 鼠标拖拽平移 + 滚轮缩放 ---------- */
  _initPanZoom() {
    const wrap = $('#mapwrap');
    const zoom = $('#mapzoom');
    this.z = 1; this.tx = 0; this.ty = 0;
    this.dragged = false;

    const apply = () => {
      zoom.style.transform = `translate(${this.tx.toFixed(1)}px,${this.ty.toFixed(1)}px) scale(${this.z.toFixed(4)})`;
      wrap.style.setProperty('--mk', (1 / this.z).toFixed(4));
    };
    const clampPan = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      const mw = w * this.z, mh = h * this.z;
      this.tx = clamp(this.tx, w - mw, 0);
      this.ty = clamp(this.ty, h - mh, 0);
    };
    this.resetZoom = () => { this.z = 1; this.tx = 0; this.ty = 0; apply(); };

    let down = false, moved = 0, lastX = 0, lastY = 0;
    wrap.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.infocard')) return;
      down = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      wrap.classList.add('is-panning');
      wrap.setPointerCapture?.(e.pointerId);
    });
    wrap.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      this.tx += dx; this.ty += dy;
      clampPan(); apply();
    });
    const up = () => {
      if (!down) return;
      down = false;
      wrap.classList.remove('is-panning');
      this.dragged = moved > 6;
      // 让本次 pointerup 之后的 click 先被忽略掉
      if (this.dragged) setTimeout(() => { this.dragged = false; }, 0);
    };
    wrap.addEventListener('pointerup', up);
    wrap.addEventListener('pointercancel', up);
    wrap.addEventListener('pointerleave', up);

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const r = wrap.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const old = this.z;
      const nz = clamp(old * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 3.4);
      if (nz === old) return;
      // 以光标位置为锚点缩放
      this.tx = cx - (cx - this.tx) * (nz / old);
      this.ty = cy - (cy - this.ty) * (nz / old);
      this.z = nz;
      clampPan(); apply();
    }, { passive: false });

    wrap.addEventListener('dblclick', e => {
      if (e.target.closest('.mk')) return;
      this.resetZoom();
    });
  }

  /* ---------- 路线 ---------- */
  _buildRoute() {
    const full = smoothPath(ROUTE);
    this.routeLine.setAttribute('d', full);
    this.routeHalo.setAttribute('d', full);

    // 用于测量「前 k 段」长度的隐藏路径
    const meas = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    meas.setAttribute('fill', 'none');
    this.svg.appendChild(meas);
    this._meas = meas;
    this._fullLen = this.routeLine.getTotalLength();
    this.routeDraw.setAttribute('d', full);
    this.routeDraw.style.strokeDasharray = `${this._fullLen}`;
    this.routeDraw.style.strokeDashoffset = `${this._fullLen}`;
  }

  /** 把路线点亮到 ROUTE 的第 k 个点 */
  revealTo(k, silent = false) {
    const sub = smoothPath(ROUTE.slice(0, Math.max(2, k + 1)));
    this._meas.setAttribute('d', sub);
    const len = this._meas.getTotalLength();
    const off = Math.max(0, this._fullLen - len);
    if (silent) this.routeDraw.style.transition = 'none';
    this.routeDraw.style.strokeDashoffset = `${off}`;
    if (silent) requestAnimationFrame(() => { this.routeDraw.style.transition = ''; });
  }

  /* ---------- 标记 ---------- */
  _buildMarkers() {
    STOPS.forEach((s, i) => {
      const m = el('button', `mk ${KIND_CLASS[s.kind] || ''} mk--lp-${LABEL_POS[s.id] || 'b'}`);
      m.style.left = (s.x / MAP_SIZE.w * 100) + '%';
      m.style.top = (s.y / MAP_SIZE.h * 100) + '%';
      m.title = `${s.date} ${s.title}`;
      m.innerHTML = `<span class="mk__n">${i + 1}</span>
        <span class="mk__label">${s.name}</span>
        ${s.scene ? '<span class="mk__badge">现场</span>' : ''}`;
      m.addEventListener('click', e => {
        e.stopPropagation();
        if (this.dragged) return;          // 拖拽地图时不要误触点位
        this.select(s.id, true);
      });
      this.markers.appendChild(m);
      this.markerEls.set(s.id, m);
    });
  }

  _buildTimeline() {
    STOPS.forEach((s, i) => {
      const t = el('button', 'tl' + (s.scene ? ' has-scene' : ''));
      t.innerHTML = `<span class="tl__n">第 ${String(i + 1).padStart(2, '0')} 站</span>
        <span class="tl__t">${s.name}</span><span class="tl__d">${s.date}</span>`;
      t.addEventListener('click', () => this.select(s.id, true));
      this.timeline.appendChild(t);
      this.tlEls.set(s.id, t);
    });
  }

  /* ---------- 事件卡 ---------- */
  _bindCard() {
    $('#cardEnter').addEventListener('click', () => {
      if (this.current && this.current.scene) this.onEnterScene(this.current.scene);
    });
    $('[data-act="close-card"]').addEventListener('click', () => this.closeCard());
    $('#mapwrap').addEventListener('click', () => {
      if (this.card.hidden) return;
      // 点击地图空白处收起卡片，但只在确实点到空白时
    });
  }

  select(id, reveal) {
    const s = STOPS.find(x => x.id === id);
    if (!s) return;
    this.current = s;

    this.markerEls.forEach((n, k) => n.classList.toggle('is-active', k === id));
    this.tlEls.forEach((n, k) => n.classList.toggle('is-active', k === id));
    if (reveal) this.revealTo(s.routeAt);

    this.explored.add(id);
    this.markerEls.get(id)?.classList.add('is-done');
    this.tlEls.get(id)?.classList.add('is-done');
    const total = STOPS.length;
    this.progress.textContent = `已探索 ${this.explored.size} / ${total}`;
    if (this.explored.size === total) this.onAllExplored?.();

    // 填充卡片
    $('#cardDate').textContent = s.date;
    $('#cardTitle').textContent = s.title;
    $('#cardPlace').textContent = s.place;
    let body = `<p class="lead">${richText(s.lead)}</p>`;
    if (s.points?.length) body += '<ul>' + s.points.map(p => `<li>${richText(p)}</li>`).join('') + '</ul>';
    if (s.extra?.length) body += '<ul>' + s.extra.map(p => `<li>${richText(p)}</li>`).join('') + '</ul>';
    $('#cardBody').innerHTML = body;

    const pw = $('#cardPhotoWrap');
    if (s.photo) {
      pw.hidden = false;
      $('#cardPhoto').src = s.photo.src;
      $('#cardPhoto').alt = s.photo.caption || s.title;
      $('#cardPhotoCap').textContent = s.photo.caption || '';
    } else {
      pw.hidden = true;
    }
    const enter = $('#cardEnter');
    enter.hidden = !s.scene;
    if (s.scene) enter.innerHTML = `进入现场 · ${s.title} <em>▶</em>`;

    this.card.hidden = false;
    this.tip.classList.add('is-hidden');
    // 时间轴滚动到可见
    this.tlEls.get(id)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  /* 只登记「已探索」，不打开卡片（用于三维现场结束后回填进度） */
  markExplored(id) {
    if (!id) return;
    this.explored.add(id);
    this.markerEls.get(id)?.classList.add('is-done');
    this.tlEls.get(id)?.classList.add('is-done');
    this.progress.textContent = `已探索 ${this.explored.size} / ${STOPS.length}`;
    if (this.explored.size === STOPS.length) this.onAllExplored?.();
  }

  closeCard() {
    this.card.hidden = true;
    this.current = null;
    this.markerEls.forEach(n => n.classList.remove('is-active'));
    this.tlEls.forEach(n => n.classList.remove('is-active'));
  }

  reset() {
    this.explored.clear();
    this.progress.textContent = `已探索 0 / ${STOPS.length}`;
    this.markerEls.forEach(n => n.classList.remove('is-done', 'is-active'));
    this.tlEls.forEach(n => n.classList.remove('is-done', 'is-active'));
    this.closeCard();
    this.revealTo(0);
    this.tip.classList.remove('is-hidden');
  }
}
