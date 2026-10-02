/* ===========================================================
   textures.js — 程序化生成纹理（不依赖任何外部贴图，便于离线部署）
   =========================================================== */
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, x: c.getContext('2d') };
}
function finish(c, repX = 1, repY = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);

/* 木地板 / 木桌面 */
export function woodTexture(base = '#5a3a22', dark = '#38220f', repeat = [4, 4]) {
  const { c, x } = canvas(512, 512);
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  const plank = 64;
  for (let i = 0; i < 512 / plank; i++) {
    const y = i * plank;
    const tone = rnd(-14, 14);
    x.fillStyle = shade(base, tone);
    x.fillRect(0, y, 512, plank - 2);
    // 木纹
    for (let g = 0; g < 46; g++) {
      x.strokeStyle = `rgba(${20 + rnd(0, 40)},${12 + rnd(0, 26)},${6 + rnd(0, 16)},${rnd(.05, .22)})`;
      x.lineWidth = rnd(.6, 1.8);
      x.beginPath();
      const yy = y + rnd(2, plank - 4);
      x.moveTo(0, yy);
      for (let px = 0; px <= 512; px += 32) x.lineTo(px, yy + Math.sin((px + g * 40) * .03) * rnd(1, 4));
      x.stroke();
    }
    // 板缝
    x.fillStyle = dark; x.globalAlpha = .85; x.fillRect(0, y + plank - 2, 512, 2); x.globalAlpha = 1;
    // 钉子
    for (const nx of [18, 494]) {
      x.fillStyle = 'rgba(20,14,8,.55)';
      x.beginPath(); x.arc(nx, y + plank / 2, 2.2, 0, 7); x.fill();
    }
  }
  // 整体脏旧
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(0,0,0,${rnd(.01, .06)})`;
    x.fillRect(rnd(0, 512), rnd(0, 512), rnd(1, 40), rnd(1, 3));
  }
  return finish(c, repeat[0], repeat[1]);
}

/* 灰砖墙 */
export function brickTexture(repeat = [3, 2]) {
  const { c, x } = canvas(512, 512);
  x.fillStyle = '#2b2f35'; x.fillRect(0, 0, 512, 512);
  const bw = 86, bh = 38, gap = 5;
  for (let row = 0, y = 0; y < 512; y += bh + gap, row++) {
    const off = (row % 2) * (bw + gap) / 2;
    for (let bx = -bw; bx < 512 + bw; bx += bw + gap) {
      const g = rnd(-10, 12);
      x.fillStyle = shade('#4a4d52', g);
      x.fillRect(bx + off, y, bw, bh);
      x.fillStyle = `rgba(255,255,255,${rnd(.01, .05)})`;
      x.fillRect(bx + off, y, bw, 3);
      x.fillStyle = `rgba(0,0,0,${rnd(.05, .16)})`;
      x.fillRect(bx + off, y + bh - 3, bw, 3);
    }
  }
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = `rgba(0,0,0,${rnd(.01, .05)})`;
    x.fillRect(rnd(0, 512), rnd(0, 512), rnd(1, 26), rnd(1, 4));
  }
  return finish(c, repeat[0], repeat[1]);
}

/* 石灰墙面（带污渍） */
export function plasterTexture(repeat = [3, 2]) {
  const { c, x } = canvas(512, 512);
  x.fillStyle = '#6a6558'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const g = x.createRadialGradient(rnd(0, 512), rnd(0, 512), 1, rnd(0, 512), rnd(0, 512), rnd(30, 140));
    g.addColorStop(0, `rgba(${rnd(30, 70) | 0},${rnd(28, 62) | 0},${rnd(22, 50) | 0},${rnd(.05, .2)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  }
  // 裂纹
  for (let i = 0; i < 16; i++) {
    x.strokeStyle = `rgba(20,16,12,${rnd(.1, .3)})`; x.lineWidth = rnd(.5, 1.4);
    x.beginPath();
    let px = rnd(0, 512), py = rnd(0, 512);
    x.moveTo(px, py);
    for (let s = 0; s < 12; s++) { px += rnd(-30, 30); py += rnd(-24, 30); x.lineTo(px, py); }
    x.stroke();
  }
  return finish(c, repeat[0], repeat[1]);
}

/* 纸张 / 地图纸 */
export function paperTexture(repeat = [1, 1]) {
  const { c, x } = canvas(256, 256);
  x.fillStyle = '#d8cbaa'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 600; i++) {
    x.fillStyle = `rgba(${rnd(120, 190) | 0},${rnd(100, 170) | 0},${rnd(70, 130) | 0},${rnd(.03, .12)})`;
    x.fillRect(rnd(0, 256), rnd(0, 256), rnd(2, 30), rnd(1, 6));
  }
  return finish(c, repeat[0], repeat[1]);
}

/* 夜空中的窗（冷蓝，带一点微光） */
export function nightWindowTexture() {
  const { c, x } = canvas(256, 256);
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#16304f');
  g.addColorStop(.55, '#0e2038');
  g.addColorStop(1, '#071324');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  // 远山剪影
  x.fillStyle = 'rgba(4,10,18,.85)';
  x.beginPath(); x.moveTo(0, 210);
  for (let px = 0; px <= 256; px += 16) x.lineTo(px, 200 - Math.sin(px * .06) * 22 - rnd(0, 12));
  x.lineTo(256, 256); x.lineTo(0, 256); x.closePath(); x.fill();
  // 星
  for (let i = 0; i < 70; i++) {
    x.fillStyle = `rgba(220,235,255,${rnd(.15, .7)})`;
    x.fillRect(rnd(0, 256), rnd(0, 150), rnd(.8, 1.8), rnd(.8, 1.8));
  }
  const t = finish(c, 1, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* 圆形柔光（灯光光晕 / 尘埃） */
export function glowTexture(inner = 'rgba(255,205,140,.95)', mid = 'rgba(255,150,60,.35)') {
  const { c, x } = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(.35, mid);
  g.addColorStop(1, 'rgba(255,120,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* 单色小圆点（粒子） */
export function dotTexture() {
  const { c, x } = canvas(32, 32);
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,235,200,.9)');
  g.addColorStop(1, 'rgba(255,220,170,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}
