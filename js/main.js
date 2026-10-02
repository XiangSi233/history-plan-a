/* ===========================================================
   main.js — 应用主控
   视图切换 / 地图交互 / 三维现场「点击人物发言」/ 键盘操作
   =========================================================== */
import { STOPS } from './data/lesson.js';
import { SCENES } from './data/scenes.js';
import { MapView } from './views/mapView.js';
import { SceneView } from './views/sceneView.js';
import { SummaryView } from './views/summaryView.js';
import { Dialogue } from './ui/dialogue.js';
import { Quiz } from './ui/quiz.js';
import { StoryView } from './views/storyView.js';
import { CHAPTERS, CAST_INFO } from './data/story.js';
import { $, $$, el, toast } from './util/dom.js';

const app = { view: 'title', sceneDef: null, hintTimer: null };

/* ===========================================================
   视图切换
   =========================================================== */
function go(name) {
  if (app.view === name) return;
  const from = app.view;
  app.view = name;
  $$('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + name));
  if (name !== 'scene') {
    app.scene3d?.stop();
    app.dialogue?.hide();
    if (from === 'scene') app.scene3d?.setSpeaker(null);
  }
  if (from === 'story' && name !== 'story') app.storyView?.hideEnterPrompt();
  if (name !== 'story') app.quiz?.hide();
  if (name === 'scene') {
    app.scene3d?.resize();
    app.scene3d?.start();
  }
  if (name === 'summary' && from !== 'summary') app.summary?.reset();
  document.body.dataset.view = name;
}

/* ===========================================================
   三维现场：自由探索式会话
   =========================================================== */
const session = {
  def: null,
  heard: new Set(),
  phase: 'idle',            // intro | free | climax | done

  start(def) {
    this.def = def;
    this.heard = new Set();
    this.heardByUser = false;
    this.phase = 'intro';
    app.scene3d.clearHeard();
    app.scene3d.setInteractive(false);
    app.dialogue.queueLines(def.intro, () => this.toPrompt());
  },

  /* 自由探索：提示 + 可点击的人物按钮 */
  toPrompt() {
    if (this.phase === 'climax' || this.phase === 'done') return;
    // 关键人物都发言过了 → 进入会议结论
    if (this.requireDone()) { this.climax(); return; }
    this.phase = 'free';
    app.scene3d.setInteractive(true);
    app.scene3d.setSpeaker(null);

    const def = this.def;
    const need = def.require || [];
    const heardN = need.filter(k => this.heard.has(k)).length;
    const buttons = (def.cast || [])
      .filter(c => def.topics?.[c.id])
      .map(c => ({
        label: def.topics[c.id].label,
        done: this.heard.has(c.id),
        onClick: () => this.speak(c.id)
      }));

    app.dialogue.prompt(
      `${def.task || '点击人物听他发言'}　<b>${heardN} / ${need.length}</b>　`
      + `<span style="opacity:.7">（也可以直接点击画面里的人物，或拖动鼠标环视会场）</span>`,
      { plate: '会场', role: '自由探索', buttons }
    );
  },

  requireDone() {
    const need = this.def?.require || [];
    return need.length > 0 && need.every(k => this.heard.has(k));
  },

  /* 点击某个人物 → 他发言 */
  speak(id) {
    if (!this.def || !this.def.topics?.[id]) return;
    if (this.phase === 'intro' || this.phase === 'climax' || this.phase === 'done') return;
    if (app.dialogue.mode === 'queue') return;      // 正在播台词，先听完
    const topic = this.def.topics[id];
    if (!this.heard.has(id)) { this.heard.add(id); app.scene3d.setHeard(id); }
    this.phase = 'speak';
    app.scene3d.setInteractive(false);
    app.scene3d.setSpeaker(id);
    app.scene3d.lookAtCharacter(id);

    const lines = topic.lines.map(l => ({ ...l, cam: l.cam || 'close', who: l.who || id }));
    // 同一人物再次点击时，只重复最后一句（避免学生反复点击刷屏）
    const play = this.heard.has(id) && topic._played ? lines.slice(-1) : lines;
    topic._played = true;
    app.dialogue.queueLines(play, () => { this.phase = 'free'; this.toPrompt(); });
  },

  /* 会议结论 */
  climax() {
    this.phase = 'climax';
    app.scene3d.setInteractive(false);
    app.dialogue.queueLines(this.def.climax, () => this.finish());
  },

  finish() {
    this.phase = 'done';
    app.map.markExplored(this.def.stopId);
    // 从剧情模式进来的：现场结束就回到剧情，继续往下播
    if (story.fromScene) { story.resumeFromScene(); return; }
    app.dialogue.prompt(
      '本场结束。<br>你可以在右侧「史料档案」里查看与会址、人物和纪录片片段。',
      {
        plate: '会议结束', role: this.def.title,
        buttons: [
          { label: '返回长征路线图，继续探索下一站', done: true, onClick: () => { $('#archive').hidden = true; go('map'); } },
          { label: '重看这一场', onClick: () => this.start(this.def) }
        ]
      }
    );
  },

  /* 自动演示：把开场 + 全部发言 + 结论串成一条线播放（适合课堂投屏） */
  playAll() {
    const def = this.def;
    if (!def) return;
    this.heard = new Set((def.cast || []).filter(c => def.topics?.[c.id]).map(c => c.id));
    app.scene3d.setInteractive(false);
    const topics = Object.values(def.topics || {}).flatMap(t => t.lines);
    app.dialogue.setAuto(true);
    this.phase = 'climax';
    app.dialogue.queueLines([...def.intro, ...topics, ...def.climax], () => this.finish());
  }
};

/* ===========================================================
   剧情模式：章节推进 → 旁白/对话 → 3D 现场 → 答题关卡 → 下一章
   =========================================================== */
const story = {
  ci: 0, cleared: new Set(), segs: [], si: 0, fromScene: false,

  start(ci = 0) {
    this.ci = Math.max(0, Math.min(CHAPTERS.length - 1, ci));
    this.fromScene = false;
    const ch = CHAPTERS[this.ci];
    app.dialogue.bindCast((ch.cast || []).map(id => ({ id, ...CAST_INFO[id] })));
    app.storyView.open(ch);
    app.storyView.setProgress(this.ci, CHAPTERS.length, this.cleared);
    app.storyView.hintVisible(true);
    this.segs = splitSegments(ch.script);
    this.si = 0;
    go('story');
    this.nextSegment();
  },

  nextSegment() {
    const seg = this.segs[this.si];
    if (!seg) { this.askQuiz(); return; }
    if (seg.setBg) {                       // 中途换背景
      app.storyView.setBg(seg.setBg);
      this.si++; this.nextSegment(); return;
    }
    if (seg.geo) {                         // 跨学科知识卡
      app.storyView.showGeo(seg.geo, () => { this.si++; this.nextSegment(); });
      return;
    }
    if (seg.enterScene) {
      app.storyView.showEnterPrompt(seg.text, () => {
        this.fromScene = true;
        enterScene(seg.enterScene);
      });
      return;
    }
    app.dialogue.queueLines(seg.lines, () => { this.si++; this.nextSegment(); });
  },

  /* 从三维现场回到剧情，继续往下播 */
  resumeFromScene() {
    this.fromScene = false;
    go('story');
    app.storyView.setProgress(this.ci, CHAPTERS.length, this.cleared);
    this.si++;
    setTimeout(() => this.nextSegment(), 240);
  },

  askQuiz() {
    const ch = CHAPTERS[this.ci];
    const list = Array.isArray(ch.quiz) ? ch.quiz : [ch.quiz];
    const total = list.length;
    const step = (i) => {
      if (i >= total) {                    // 本章全部答对 → 通关
        this.cleared.add(ch.id);
        app.storyView.setProgress(this.ci, CHAPTERS.length, this.cleared);
        if (this.ci < CHAPTERS.length - 1) {
          toast(`第 ${this.ci + 1} 章通关，进入下一章`, 'ok');
          this.start(this.ci + 1);
        } else {
          toast('全部章节完成！长征的意义，你已经走了一遍', 'ok');
          setTimeout(() => go('summary'), 700);
        }
        return;
      }
      app.quiz.show(list[i], {
        label: `${ch.no} · ${ch.title}` + (total > 1 ? `　第 ${i + 1} / ${total} 题` : ''),
        nextLabel: i < total - 1 ? '下一题 →' : '继续剧情 →',
        onPass: () => step(i + 1)
      });
    };
    step(0);
  },

  stop() {
    app.storyView.hideEnterPrompt();
    app.quiz.hide();
    app.storyView.clearSprites();
  }
};

/* 把剧本按「进入三维现场」切成若干段 */
function splitSegments(script) {
  const segs = []; let cur = [];
  const flush = () => { if (cur.length) { segs.push({ lines: cur }); cur = []; } };
  script.forEach(raw => {
    let l = raw;
    if (l.bg) {                        // 这一行之前先换背景
      flush();
      segs.push({ setBg: l.bg });
      l = { ...l }; delete l.bg;
    }
    if (l.geo) { flush(); segs.push({ geo: l.geo }); return; }
    if (l.enterScene) { flush(); segs.push({ enterScene: l.enterScene, text: l.text }); return; }
    cur.push(l);
  });
  flush();
  return segs;
}

function enterScene(sceneId) {
  const def = SCENES[sceneId];
  if (!def) { toast('该地点暂时没有三维现场'); return; }

  if (!app.scene3d) {
    app.scene3d = new SceneView({
      canvas: $('#sceneCanvas'),
      nametags: $('#nametags'),
      onTap: () => {
        if (session.phase === 'free') { app.scene3d.lookWide(); app.scene3d.targetDolly = 4.6; }
        else app.dialogue.advance();
      },
      onFigureTap: id => session.speak(id)
    });
  }
  const ok = app.scene3d.load(def);
  if (!ok) { toast('当前浏览器不支持 WebGL，无法打开三维现场', 'bad'); return; }

  app.sceneDef = def;
  $('#scenePlace').textContent = def.place || '';
  $('#sceneTitle').textContent = def.title || '';
  $('#archive').hidden = true;
  buildArchive(def);
  app.dialogue.bindCast(def.cast);
  app.dialogue.setAuto(false);

  go('scene');
  app.scene3d.resize();
  session.start(def);
  // 从剧情进来的，把返回按钮文案换成「返回剧情」
  const backBtn = document.querySelector('[data-act="back-map"]');
  if (backBtn) backBtn.textContent = story.fromScene ? '← 返回剧情' : '← 返回路线图';

  const hint = $('#sceneHint');
  hint.classList.remove('is-hidden');
  clearTimeout(app.hintTimer);
  app.hintTimer = setTimeout(() => hint.classList.add('is-hidden'), 11000);
}

function buildArchive(def) {
  const list = $('#archiveList');
  list.innerHTML = '';
  (def.archive || []).forEach(it => {
    const n = el('div', 'arch-item');
    const media = it.type === 'video'
      ? `<video controls preload="none" playsinline src="${it.src}"></video>`
      : `<img src="${it.src}" alt="${it.title}" loading="lazy" draggable="false">`;
    n.innerHTML = `<h4>${it.title}</h4>${media}${it.text ? `<p>${it.text}</p>` : ''}`;
    list.appendChild(n);
  });
}

/* ===========================================================
   启动
   =========================================================== */
function boot() {
  app.map = new MapView({
    onEnterScene: enterScene,
    onAllExplored: () => toast('十六个地点全部探索完成，去看看「课堂小结」吧', 'ok')
  });
  app.summary = new SummaryView();
  app.storyView = new StoryView();
  app.quiz = new Quiz();

  app.dialogue = new Dialogue({
    onFocus: (id, line) => {
      if (app.view === 'scene') {
        app.scene3d?.setSpeaker(id);
        if (id) app.scene3d?.lookAtCharacter(id);
      } else if (app.view === 'story' && app.storyView) {
        if (id) app.storyView.enter(id, line?.pos);
        else app.storyView.setSpeaker(null);
      }
    },
    onCam: (mode, id) => {
      if (!app.scene3d) return;
      if (mode === 'wide') { app.scene3d.lookWide(); app.scene3d.targetDolly = 4.7; }
      else if (mode === 'mid') { if (id) app.scene3d.lookAtCharacter(id); app.scene3d.targetDolly = 3.75; }
      else if (mode === 'close') { if (id) app.scene3d.lookAtCharacter(id); app.scene3d.targetDolly = 2.95; }
    },
    onChoice: ch => { if (ch.toast) toast(ch.toast, 'ok'); }
  });

  /* 剧情模式：点画面任意处也能翻页（galgame 习惯） */
  document.getElementById('view-story').addEventListener('click', e => {
    if (app.view !== 'story') return;
    if (e.target.closest('#geoCard')) return;      // 知识卡自己处理
    if (e.target.closest('#vn, #quiz, #enterBox, button, .chapdots, .storytop')) return;
    app.dialogue.advance();
  });

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'start-story') { story.stop(); story.start(0); }
    else if (act === 'story-exit') { story.stop(); go('title'); }
    else if (act === 'start') go('map');
    else if (act === 'home') go('title');
    else if (act === 'goto-summary') go('summary');
    else if (act === 'back-map') {
      $('#archive').hidden = true;
      if (story.fromScene && app.view === 'scene') story.resumeFromScene();
      else go('map');
    }
    else if (act === 'toggle-archive') { const a = $('#archive'); a.hidden = !a.hidden; }
    else if (act === 'replay') { app.dialogue.setAuto(false); session.start(app.sceneDef); }
    else if (act === 'play-all') session.playAll();
    else if (act === 'check-sort') app.summary.check();
    else if (act === 'reset-sort') { app.summary.reset(); toast('已重做，再来一次'); }
  });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (app.view === 'scene') {
      if ([' ', 'Enter', 'ArrowRight'].includes(e.key)) { e.preventDefault(); app.dialogue.advance(); }
      else if (e.key === 'Escape') { $('#archive').hidden = true; go('map'); }
      else if (e.key === 'a' || e.key === 'A') app.dialogue.setAuto(!app.dialogue.auto);
      else if (e.key >= '1' && e.key <= '6') {
        const c = (app.sceneDef?.cast || [])[Number(e.key) - 1];
        if (c) session.speak(c.id);
      }
    } else if (app.view === 'map') {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const cur = STOPS.findIndex(s => s.id === app.map.current?.id);
        const next = cur < 0
          ? (e.key === 'ArrowRight' ? 0 : STOPS.length - 1)
          : (cur + (e.key === 'ArrowRight' ? 1 : -1) + STOPS.length) % STOPS.length;
        app.map.select(STOPS[next].id, true);
      } else if (e.key === 'Escape') app.map.closeCard();
    } else if (app.view === 'story') {
      if (app.storyView?.geoOpen()) {          // 知识卡优先
        if ([' ', 'Enter', 'Escape'].includes(e.key)) { e.preventDefault(); app.storyView.closeGeo(); }
        return;
      }
      const quizOpen = !document.getElementById('quiz').hidden;
      const enterBox = document.getElementById('enterBox');

      if (quizOpen) {
        /* 答题中：1-4 选选项，回车/空格继续 */
        const all = [...document.querySelectorAll('.qopt')];
        const n = '1234'.indexOf(e.key);
        if (n >= 0 && all[n] && !all[n].classList.contains('is-locked')) {
          e.preventDefault(); all[n].click();
        } else if ([' ', 'Enter'].includes(e.key)) {
          e.preventDefault();
          const next = document.getElementById('quizNext');
          if (next && !next.hidden) next.click();
        }
      } else if (enterBox) {
        /* 停在「进入现场」提示上：回车/空格直接进 */
        if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); document.getElementById('enterBtn')?.click(); }
        else if (e.key === 'Escape') { story.stop(); go('title'); }
      } else {
        /* 正常剧情：空格 / 回车 / → / ↓ / PageDown 都能翻页 */
        if ([' ', 'Enter', 'ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key)) {
          e.preventDefault();
          app.dialogue.advance();
        } else if (e.key === 'a' || e.key === 'A') {
          app.dialogue.setAuto(!app.dialogue.auto);
        } else if (e.key === 'Escape') {
          story.stop(); go('title');
        }
      }
    } else if (app.view === 'title' && (e.key === 'Enter' || e.key === ' ')) {
      go('map');
    } else if (app.view === 'summary' && e.key === 'Escape') {
      go('map');
    }
  });

  const hide = () => {
    $('#boot').classList.add('is-done');
    setTimeout(() => { $('#boot').style.display = 'none'; }, 700);
  };
  if (document.readyState === 'complete') setTimeout(hide, 260);
  else window.addEventListener('load', () => setTimeout(hide, 260));

  /* URL 直达：#map / #summary / #scene=zunyi */
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (hash.startsWith('scene=')) setTimeout(() => enterScene(hash.slice(6)), 120);
  else if (hash === 'story') setTimeout(() => story.start(0), 120);
  else if (hash === 'map' || hash === 'summary') setTimeout(() => go(hash), 120);

  window.__APP__ = app;
  window.__SESSION__ = session;
  app.story = story;   // 方便调试与外部调用
}
boot();
