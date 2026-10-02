/* ===========================================================
   sceneView.js — 三维现场：渲染、可转动视角、人物名牌
   =========================================================== */
import * as THREE from 'three';
import { buildStage } from '../scene/room.js';
import { clamp, damp, el } from '../util/dom.js';

const CAM_START = { x: 0, y: 2.05, z: 4.55 };
const EYE = new THREE.Vector3();

export class SceneView {
  constructor({ canvas, nametags, onTap, onFigureTap }) {
    this.canvas = canvas;
    this.nametagsEl = nametags;
    this.onTap = onTap;
    this.onFigureTap = onFigureTap;

    this.yaw = 0; this.pitch = -0.15;
    this.targetYaw = 0; this.targetPitch = -0.15;
    this.dolly = CAM_START.z;
    this.targetDolly = CAM_START.z;
    this.dragging = false;
    this.moved = 0;
    this.running = false;
    this.tags = new Map();
    this.ok = false;
    this._hover = null;
    this.interactive = true;   // 是否允许「点击人物」
  }

  setInteractive(v) {
    this.interactive = !!v;
    if (!v) this.setHover(null);
    this.nametagsEl.classList.toggle('is-locked', !v);
  }

  init() {
    if (this.ok) return true;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas, antialias: true,
        powerPreference: 'high-performance', alpha: false
      });
    } catch (e) {
      console.warn('WebGL 不可用', e);
      return false;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
    this.camera.position.set(CAM_START.x, CAM_START.y, CAM_START.z);

    this._bindPointer();
    this._bindResize();
    this.ok = true;
    return true;
  }

  /* ---------------- 载入某个场景 ---------------- */
  load(sceneDef) {
    if (!this.init()) return false;
    this.disposeStage();
    this.clearTags();
    this.stage = buildStage(this.scene, sceneDef.env || {}, sceneDef.cast || []);
    this.resetView();
    sceneDef.cast?.forEach(c => this._addTag(c));
    this.resize();
    return true;
  }

  disposeStage() {
    if (!this.stage) return;
    this.scene.remove(this.stage.root);
    this.stage.root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
    this.stage = null;
  }

  /* ---------------- 名牌 ---------------- */
  _addTag(c) {
    const n = el('div', 'ntag');
    n.innerHTML = `<span class="ntag__name">${c.short || c.name}<i class="ntag__heard">✓</i></span><span class="ntag__dot"></span>`;
    n.dataset.id = c.id;
    n.style.pointerEvents = 'auto';
    n.style.cursor = 'pointer';
    n.title = `点击：听${c.short || c.name}发言`;
    n.addEventListener('click', e => { e.stopPropagation(); this.onFigureTap?.(c.id); });
    n.addEventListener('pointerenter', () => this.setHover(c.id));
    n.addEventListener('pointerleave', () => this.setHover(null));
    this.nametagsEl.appendChild(n);
    this.tags.set(c.id, n);
  }
  clearTags() {
    this.tags.forEach(n => n.remove());
    this.tags.clear();
  }
  setSpeaker(id) {
    this.tags.forEach((n, k) => n.classList.toggle('is-speaking', k === id));
    this.stage?.setSpeaker?.(id);
  }
  setHeard(id) {
    this.tags.get(id)?.classList.add('is-heard');
  }
  clearHeard() {
    this.tags.forEach(n => n.classList.remove('is-heard'));
  }
  setHover(id) {
    if (this._hover === id) return;
    this._hover = id;
    this.tags.forEach((n, k) => n.classList.toggle('is-hover', k === id));
    this.canvas.style.cursor = id ? 'pointer' : '';
  }

  /* ---------------- 屏幕空间拾取人物（宽松命中，便于点选） ---------------- */
  pickFigure(cx, cy) {
    if (!this.stage) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return null;
    const v = new THREE.Vector3();
    let best = null, bestD = Infinity;
    for (const [id, c] of this.stage.characters) {
      v.copy(c.world); v.y += 0.06; v.project(this.camera);
      if (v.z > 1 || v.z < -1) continue;
      const bx = (v.x * 0.5 + 0.5) * rect.width + rect.left;
      const by = (-v.y * 0.5 + 0.5) * rect.height + rect.top;
      v.copy(c.world); v.y += 1.48; v.project(this.camera);
      const tx = (v.x * 0.5 + 0.5) * rect.width + rect.left;
      const ty = (-v.y * 0.5 + 0.5) * rect.height + rect.top;
      const x0 = Math.min(bx, tx) - 34, x1 = Math.max(bx, tx) + 34;
      const y0 = Math.min(by, ty) - 14, y1 = Math.max(by, ty) + 14;
      if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
        const d = this.camera.position.distanceTo(c.world);
        if (d < bestD) { bestD = d; best = id; }
      }
    }
    return best;
  }

  /* ---------------- 视角 ---------------- */
  resetView() {
    this.targetYaw = 0; this.targetPitch = -0.15;
    this.targetDolly = CAM_START.z;
    this.yaw = 0; this.pitch = -0.15;
  }

  lookAtCharacter(id, user = false) {
    const c = this.stage?.characters.get(id);
    if (!c) return;
    const target = c.world.clone();
    target.y = c.headY + 0.12;
    const dir = target.sub(this.camera.position).normalize();
    this.targetPitch = clamp(Math.asin(clamp(dir.y, -1, 1)), -0.45, 0.45);
    this.targetYaw = Math.atan2(dir.x, -dir.z);
    // 取最短转向
    let d = this.targetYaw - this.yaw;
    while (d > Math.PI) { this.targetYaw -= Math.PI * 2; d = this.targetYaw - this.yaw; }
    while (d < -Math.PI) { this.targetYaw += Math.PI * 2; d = this.targetYaw - this.yaw; }
    if (user) this.dragging = false;
  }

  lookWide() {
    this.targetYaw = 0;
    this.targetPitch = -0.15;
  }

  _bindPointer() {
    const c = this.canvas;
    let lastX = 0, lastY = 0, down = false;
    const downFn = e => {
      if (e.button !== undefined && e.button !== 0) return;
      down = true; this.dragging = true; this.moved = 0;
      lastX = e.clientX; lastY = e.clientY;
      this.canvas.setPointerCapture?.(e.pointerId);
      this.canvas.parentElement?.classList.add('is-dragging');
    };
    const moveFn = e => {
      if (!down) {
        // 悬停高亮可点击的人物（仅自由探索阶段）
        if (this.interactive) this.setHover(this.pickFigure(e.clientX, e.clientY));
        return;
      }
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      this.yaw -= dx * 0.0026;
      this.pitch -= dy * 0.0021;
      this.pitch = clamp(this.pitch, -0.5, 0.42);
      this.yaw = clamp(this.yaw, -1.5, 1.5);
      this.targetYaw = this.yaw; this.targetPitch = this.pitch;
    };
    const upFn = e => {
      if (!down) return;
      down = false; this.dragging = false;
      this.canvas.parentElement?.classList.remove('is-dragging');
      if (this.moved < 7) {
        const id = this.pickFigure(e.clientX, e.clientY);
        if (id) this.onFigureTap?.(id);
        else this.onTap?.();
      }
    };
    c.addEventListener('pointerdown', downFn);
    c.addEventListener('pointermove', moveFn);
    c.addEventListener('pointerup', upFn);
    c.addEventListener('pointercancel', upFn);
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.targetDolly = clamp(this.targetDolly + e.deltaY * 0.0022, 2.6, 5.4);
    }, { passive: false });
    // 触屏双指缩放
    let pinch = null;
    c.addEventListener('touchmove', e => {
      if (e.touches.length !== 2) return;
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinch != null) this.targetDolly = clamp(this.targetDolly + (pinch - dist) * 0.01, 2.6, 5.4);
      pinch = dist;
    }, { passive: true });
    c.addEventListener('touchend', () => { pinch = null; });
  }

  _bindResize() {
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(onResize);
      this._ro.observe(this.canvas.parentElement || this.canvas);
    }
  }

  resize() {
    if (!this.renderer) return;
    const parent = this.canvas.parentElement || document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._w = w; this._h = h;
  }

  /* ---------------- 渲染循环 ---------------- */
  start() {
    if (!this.ok || this.running) return;
    this.running = true;
    this._last = performance.now();
    const loop = () => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - this._last) / 1000);
      this._last = now;
      this.t = (this.t || 0) + dt;
      this._render(dt, this.t);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _render(dt, t) {
    // 平滑跟随
    this.yaw = damp(this.yaw, this.targetYaw, 6, dt);
    this.pitch = damp(this.pitch, this.targetPitch, 6, dt);
    this.dolly = damp(this.dolly, this.targetDolly, 5, dt);

    // 呼吸感（轻微手持晃动）
    const yawR = this.yaw + Math.sin(t * 0.21) * 0.0065 + Math.sin(t * 0.53) * 0.0022;
    const pitchR = this.pitch + Math.sin(t * 0.27 + 1.3) * 0.0042;
    const bobY = Math.sin(t * 0.62) * 0.006 + Math.sin(t * 0.31) * 0.004;

    this.camera.position.set(CAM_START.x, CAM_START.y + bobY, this.dolly);
    const cp = Math.cos(pitchR);
    EYE.set(
      this.camera.position.x + Math.sin(yawR) * cp,
      this.camera.position.y + Math.sin(pitchR),
      this.camera.position.z - Math.cos(yawR) * cp
    );
    this.camera.lookAt(EYE);

    this.stage?.update(dt, t, this.camera);
    this._updateTags();
    this.renderer.render(this.scene, this.camera);
  }

  _updateTags() {
    if (!this.stage) return;
    const w = this._w || 1, h = this._h || 1;
    const v = new THREE.Vector3();
    for (const [id, c] of this.stage.characters) {
      const tag = this.tags.get(id);
      if (!tag) continue;
      v.copy(c.world); v.y = c.headY + 0.30;
      v.project(this.camera);
      const behind = v.z > 1 || v.z < -1;
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      const inView = !behind && x > -80 && x < w + 80 && y > -40 && y < h + 40;
      tag.classList.toggle('is-on', inView);
      if (inView) tag.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    }
  }
}
