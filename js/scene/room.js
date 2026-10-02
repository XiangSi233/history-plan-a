/* ===========================================================
   room.js — 程序化搭建「会议室」三维现场
   =========================================================== */
import * as THREE from 'three';
import {
  woodTexture, brickTexture, plasterTexture, paperTexture,
  nightWindowTexture, glowTexture, dotTexture
} from './textures.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

/* ---------------- 人物（坐姿，默认朝 +z） ---------------- */
export function buildFigure(cfg, opts = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();      // 内层：承载呼吸 / 点头动画
  g.add(body);
  g.userData.body = body;
  const uniColor = new THREE.Color(cfg.uniform || '#767b80');
  const darkColor = uniColor.clone().multiplyScalar(0.72);
  const M = {
    uni: new THREE.MeshStandardMaterial({ color: uniColor, roughness: .93, metalness: .02 }),
    dark: new THREE.MeshStandardMaterial({ color: darkColor, roughness: .95 }),
    skin: new THREE.MeshStandardMaterial({ color: 0x9d7a5c, roughness: .88 }),
    boot: new THREE.MeshStandardMaterial({ color: 0x2b2620, roughness: .95 }),
    cap: new THREE.MeshStandardMaterial({ color: darkColor, roughness: .9 }),
    star: new THREE.MeshStandardMaterial({ color: 0xa81f27, roughness: .6, emissive: 0x2a0507 })
  };
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true;
    body.add(m);
    return m;
  };

  // 小腿 / 大腿 / 鞋（坐姿：髋在椅面，膝盖朝前，小腿垂下）
  for (const s of [-1, 1]) {
    add(box(.14, .44, .15), M.dark, s * .105, .26, .42);              // 小腿
    add(box(.16, .16, .44), M.uni, s * .105, .475, .20);              // 大腿
    add(box(.15, .09, .26), M.boot, s * .105, .045, .46);             // 鞋
  }
  add(box(.32, .16, .30), M.uni, 0, .50, .02);                         // 髋
  const torso = add(box(.42, .54, .28), M.uni, 0, .80, -.01, .06);     // 躯干（略前倾）
  add(box(.435, .055, .295), M.dark, 0, .565, -.01, .06);              // 腰带
  // 手臂（前臂搭在桌上）
  for (const s of [-1, 1]) {
    add(box(.13, .15, .19), M.uni, s * .245, 1.115, 0);                // 肩
    add(box(.12, .33, .14), M.uni, s * .25, .955, .06, -.55);          // 上臂
    add(box(.11, .30, .12), M.uni, s * .23, .80, .29, -1.25);          // 前臂
    add(box(.10, .08, .13), M.skin, s * .22, .70, .44);                // 手
  }
  add(new THREE.CylinderGeometry(.05, .056, .10, 10), M.skin, 0, 1.075, .02);   // 颈
  if (cfg.face) {
    /* ---- 真人照片贴在 3D 头部上（程序化头形 + 柱面包裹贴图）---- */
    const tex = new THREE.TextureLoader().load(cfg.face);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const faceMat = new THREE.MeshStandardMaterial({
      map: tex, roughness: .8, metalness: 0,
      emissive: 0xffe0bc, emissiveMap: tex, emissiveIntensity: .85
    });

    // 单位球 → 头形：收下颌 / 收额头 / 后脑略压扁
    const shape = (geo) => {
      const pa = geo.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        let x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
        const jaw = 1 - .34 * Math.pow(Math.max(0, -y), 1.35);   // 下颌收窄
        const fore = 1 - .13 * Math.pow(Math.max(0, y), 1.8);    // 额头略收
        x *= jaw * fore;
        if (z < 0) z *= .88;                                     // 后脑压扁
        pa.setXYZ(i, x, y, z);
      }
      geo.computeVertexNormals();
      return geo;
    };

    const THMAX = .86;      // 照片横向覆盖到左右各约 49°
    const U_SPAN = .76, V_SPAN = .88;

    // 正面半球：按角度包裹照片
    const front = shape(new THREE.SphereGeometry(1, 34, 26, 0, Math.PI));
    const fp = front.attributes.position, fuv = front.attributes.uv;
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i), y = fp.getY(i), z = fp.getZ(i);
      const th = Math.atan2(x, Math.max(1e-5, z));
      const u = .5 + (th / (2 * THMAX)) * U_SPAN;
      const v = .5 + y * V_SPAN * .5;
      fuv.setXY(i, Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v)));
    }
    fuv.needsUpdate = true;

    const head = new THREE.Mesh(front, faceMat);
    head.castShadow = true;
    // 后脑半球：深色头发
    const back = new THREE.Mesh(
      shape(new THREE.SphereGeometry(1, 26, 22, Math.PI, Math.PI)),
      new THREE.MeshStandardMaterial({ color: 0x1c1916, roughness: .95 })
    );
    back.castShadow = true;

    const headGrp = new THREE.Group();
    headGrp.add(head, back);
    headGrp.position.set(0, 1.205, .012);
    headGrp.scale.set(.116 * .96, .116 * 1.14, .116 * 1.0);
    body.add(headGrp);
    g.userData.head = headGrp;
    g.userData.faceMat = faceMat;
  } else {
    const head = add(new THREE.SphereGeometry(.105, 18, 16), M.skin, 0, 1.20, .015);
    head.scale.set(1, 1.08, 1.02);
    if (cfg.cap !== false) {
      add(new THREE.CylinderGeometry(.118, .122, .07, 18), M.cap, 0, 1.29, .005);
      add(box(.19, .02, .09), M.cap, 0, 1.262, .10);
      add(box(.038, .038, .02), M.star, 0, 1.292, .118);
    } else {
      // 后梳的头发
      const hair = add(new THREE.SphereGeometry(.109, 18, 16), M.dark, 0, 1.215, .008);
      hair.scale.set(1.02, .8, 1.03);
    }
    if (cfg.glasses) {
      add(box(.16, .026, .012), M.boot, 0, 1.212, .106);
    }
  }
  if (opts.back) {
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  }
  return g;
}

/* ---------------- 椅子 ---------------- */
function buildChair(mat, withBack = true) {
  const g = new THREE.Group();
  const add = (w, h, d, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(box(w, h, d), mat);
    m.position.set(x, y, z); m.rotation.x = rx;
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  };
  add(.44, .055, .42, 0, .44, 0);                // 坐面
  if (withBack) add(.44, .40, .05, 0, .66, -.19, -.08);   // 靠背
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(.05, .43, .05, sx * .19, .215, sz * .18);
  return g;
}

/* ---------------- 整场（房间 + 家具 + 灯光 + 人物） ---------------- */
export function buildStage(scene, env, cast) {
  const W = env.w || 12, D = env.d || 10, H = env.h || 3.6;
  const hw = W / 2, hd = D / 2;

  scene.background = new THREE.Color(0x04060a);
  scene.fog = new THREE.FogExp2(0x05070c, 0.038);

  const root = new THREE.Group();
  scene.add(root);

  /* ----- 材质 ----- */
  const floorMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4e3320', '#2a1a0c', [4, 3]), roughness: .82, metalness: .04 });
  const ceilMat = new THREE.MeshStandardMaterial({ map: plasterTexture([3, 3]), color: 0x6a6455, roughness: 1 });
  const wallMat = new THREE.MeshStandardMaterial({ map: plasterTexture([3, 2]), color: 0x8a8272, roughness: .98 });
  const brickMat = new THREE.MeshStandardMaterial({ map: brickTexture([4, 2]), color: 0x8f939a, roughness: .96 });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture('#5d3d22', '#33200e', [1, 1]), roughness: .7, metalness: .05 });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: .85 });

  /* ----- 地面 / 顶 ----- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  root.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H;
  root.add(ceil);

  /* ----- 墙 ----- */
  const wall = (geo, x, y, z, ry) => {
    const m = new THREE.Mesh(geo, wallMat);
    m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true;
    root.add(m); return m;
  };
  wall(new THREE.PlaneGeometry(W, H), 0, H / 2, -hd, 0);                 // 后墙（窗）
  wall(new THREE.PlaneGeometry(D, H), -hw, H / 2, 0, Math.PI / 2);       // 左墙
  const rightWall = wall(new THREE.PlaneGeometry(D, H), hw, H / 2, 0, -Math.PI / 2);
  rightWall.material = brickMat;
  wall(new THREE.PlaneGeometry(W, H), 0, H / 2, hd, Math.PI);            // 前墙（相机身后）

  // 踢脚线
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x2e2419, roughness: .9 });
  for (const [x, z, ry, len] of [[0, -hd + .02, 0, W], [-hw + .02, 0, Math.PI / 2, D], [hw - .02, 0, Math.PI / 2, D]]) {
    const m = new THREE.Mesh(box(len, .16, .04), skirtMat);
    m.position.set(x, .08, z); m.rotation.y = ry; root.add(m);
  }

  /* ----- 窗户（后墙）+ 冷光 ----- */
  const winTex = nightWindowTexture();
  const winMat = new THREE.MeshStandardMaterial({ map: winTex, emissive: 0x8fb6ee, emissiveMap: winTex, emissiveIntensity: .55, roughness: 1 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: .85 });
  const winXs = [-3.0, 0, 3.0];
  for (const wx of winXs) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.35), winMat);
    win.position.set(wx, 2.25, -hd + .03);
    root.add(win);
    // 窗框
    const fr = new THREE.Group();
    const bar = (w, h, d, x, y) => { const m = new THREE.Mesh(box(w, h, d), frameMat); m.position.set(x, y, 0); fr.add(m); };
    bar(1.78, .09, .08, 0, .72); bar(1.78, .09, .08, 0, -.72);
    bar(.09, 1.52, .08, -.86, 0); bar(.09, 1.52, .08, .86, 0);
    bar(.05, 1.35, .05, 0, 0); bar(1.6, .05, .05, 0, 0);
    fr.position.set(wx, 2.25, -hd + .05);
    root.add(fr);
  }

  /* ----- 门（左墙） ----- */
  const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture('#3a2616', '#1e1209', [1, 1]), roughness: .8 });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.25), doorMat);
  door.position.set(-hw + .03, 1.13, -1.6); door.rotation.y = Math.PI / 2;
  root.add(door);
  const doorFrame = new THREE.Mesh(box(.06, 2.4, 1.35), frameMat);
  doorFrame.position.set(-hw + .02, 1.2, -1.6);
  root.add(doorFrame);

  /* ----- 长桌 ----- */
  const TABLE_Y = .76, TL = 3.7, TW = 1.5;
  const table = new THREE.Group();
  const top = new THREE.Mesh(box(TL, .085, TW), woodMat);
  top.position.y = TABLE_Y; top.castShadow = true; top.receiveShadow = true;
  table.add(top);
  const apron = new THREE.Mesh(box(TL - .2, .12, TW - .2), woodMat);
  apron.position.y = TABLE_Y - .1; table.add(apron);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(box(.1, TABLE_Y - .04, .1), woodMat);
    leg.position.set(sx * (TL / 2 - .18), (TABLE_Y - .04) / 2, sz * (TW / 2 - .16));
    leg.castShadow = true; table.add(leg);
  }
  root.add(table);

  /* ----- 桌上道具：地图、纸张、茶碗、油灯 ----- */
  const paperMat = new THREE.MeshStandardMaterial({ map: paperTexture([1, 1]), color: 0xbfb49b, roughness: .95, side: THREE.DoubleSide });
  const rndRot = (a) => (Math.random() - .5) * a;
  const props = new THREE.Group();
  // 摊开的地图（用课件的长征路线图，呼应主题）
  const mapTex = new THREE.TextureLoader().load('assets/map/route-terrain.webp');
  mapTex.colorSpace = THREE.SRGBColorSpace;
  const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .76), new THREE.MeshStandardMaterial({ map: mapTex, color: 0xa79b85, roughness: .95 }));
  mapPlane.rotation.x = -Math.PI / 2; mapPlane.rotation.z = rndRot(.25);
  mapPlane.position.set(-.42, TABLE_Y + .045, .06); mapPlane.receiveShadow = true;
  props.add(mapPlane);
  // 散落纸张
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(.30, .22), paperMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = rndRot(1.1);
    p.position.set(.35 + rndRot(1.5), TABLE_Y + .045 + i * .001, rndRot(.9));
    p.receiveShadow = true; props.add(p);
  }
  // 茶碗
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: .35, metalness: .02 });
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.045, .035, .06, 14), cupMat);
    c.position.set(-1.35 + i * .92, TABLE_Y + .075, (i % 2 ? .48 : -.48));
    c.castShadow = true; props.add(c);
  }
  root.add(props);

  /* ----- 油灯 + 光源 ----- */
  const lampGroup = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a7434, roughness: .45, metalness: .75 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.10, .13, .05, 20), brass);
  base.position.y = TABLE_Y + .07; lampGroup.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.022, .03, .18, 12), brass);
  stem.position.y = TABLE_Y + .18; lampGroup.add(stem);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.055, .038, .05, 16), brass);
  bowl.position.y = TABLE_Y + .28; lampGroup.add(bowl);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffcf90, emissive: 0xff9a3c, emissiveIntensity: 1.9,
    transparent: true, opacity: .92, roughness: .2
  });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(.085, 18, 14), glassMat);
  glass.position.y = TABLE_Y + .36; lampGroup.add(glass);
  lampGroup.position.set(1.15, 0, -.12);
  root.add(lampGroup);

  const lampLight = new THREE.PointLight(0xffa855, 15, 20, 2);
  lampLight.position.set(1.15, TABLE_Y + .42, -.12);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(1024, 1024);
  lampLight.shadow.camera.near = .05;
  lampLight.shadow.camera.far = 14;
  lampLight.shadow.bias = -0.0025;
  root.add(lampLight);

  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .55 });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(1.25, 1.25, 1);
  glow.position.copy(lampLight.position);
  root.add(glow);

  /* ----- 环境光 / 补光 ----- */
  scene.add(new THREE.AmbientLight(0x33405e, .78));
  scene.add(new THREE.HemisphereLight(0x3a4e78, 0x1e1509, .52));
  const winLight = new THREE.DirectionalLight(0x7ea2d8, 1.05);
  winLight.position.set(-1.2, 2.9, -hd + .4);
  winLight.target.position.set(0, .8, 1.2);
  scene.add(winLight, winLight.target);
  const fill = new THREE.PointLight(0xff9c4a, 9, 14, 2);
  fill.position.set(-2.3, 1.65, 2.1);
  scene.add(fill);

  /* ----- 墙上挂图 ----- */
  if (env.map) {
    const wallMapTex = new THREE.TextureLoader().load('assets/map/route-simple.webp');
    wallMapTex.colorSpace = THREE.SRGBColorSpace;
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.85),
      new THREE.MeshStandardMaterial({ map: wallMapTex, roughness: .95 }));
    wm.position.set(hw - .04, 1.95, -1.4);
    wm.rotation.y = -Math.PI / 2;
    root.add(wm);
    const rod = new THREE.Mesh(box(.05, .05, 2.85), frameMat);
    rod.position.set(hw - .05, 2.9, -1.4);
    root.add(rod);
  }

  /* ----- 椅子 + 人物 ----- */
  const characters = new Map();
  const headLocalY = 1.215;
  for (const c of cast) {
    const [px, pz, ry] = c.seat;
    // 近侧（面向镜头、背对桌子）不放靠背，避免挡住视线
    const nearSide = Math.abs(Math.abs(ry) - Math.PI) < 0.2;
    const chair = buildChair(chairMat, !nearSide);
    chair.position.set(px, 0, pz);
    chair.rotation.y = ry;
    root.add(chair);

    const fig = buildFigure(c);
    fig.position.set(px, 0, pz);
    fig.rotation.y = ry;
    root.add(fig);
    characters.set(c.id, { cfg: c, group: fig, headY: headLocalY, seatYaw: ry, world: new THREE.Vector3() });
  }

  // 背景旁听者（不做名牌，只增加「开会」的现场感）
  const bgSeats = [
    [2.62, -.62, Math.PI * .78], [2.68, .62, Math.PI * 1.2],
    [-3.2, -.78, Math.PI * .32], [-3.25, .82, Math.PI * -.3]
  ];
  for (const [px, pz, ry] of bgSeats) {
    const chair = buildChair(chairMat, true);
    chair.position.set(px, 0, pz); chair.rotation.y = ry; root.add(chair);
    const f = buildFigure({ uniform: '#4b525c', cap: true }, { back: true });
    f.position.set(px, 0, pz); f.rotation.y = ry;
    root.add(f);
  }

  /* ----- 空气中的浮尘 ----- */
  const dustGeo = new THREE.BufferGeometry();
  const N = 260;
  const pos = new Float32Array(N * 3);
  const spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * W * .92;
    pos[i * 3 + 1] = Math.random() * H;
    pos[i * 3 + 2] = (Math.random() - .5) * D * .92;
    spd[i] = .012 + Math.random() * .028;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: dotTexture(), size: .028, transparent: true, opacity: .5,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  }));
  root.add(dust);

  /* ----- 每帧更新 ----- */
  let speakingId = null;
  function setSpeaker(id) { speakingId = id || null; }

  function update(dt, t, camera) {
    // 油灯闪烁
    const flick = 1 + Math.sin(t * 11.3) * .045 + Math.sin(t * 7.1 + 1.7) * .035 + Math.sin(t * 23.7) * .018;
    lampLight.intensity = 15 * flick;
    glassMat.emissiveIntensity = 1.9 * flick;
    glowMat.opacity = .48 + .1 * flick;
    fill.intensity = 9 * (.96 + .04 * flick);

    // 浮尘缓慢上升
    const p = dustGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] += spd[i] * dt;
      p[i * 3] += Math.sin(t * .3 + i) * .0007;
      if (p[i * 3 + 1] > H) p[i * 3 + 1] = 0;
    }
    dustGeo.attributes.position.needsUpdate = true;

    let idx = 0;
    const camYaw = camera ? Math.atan2(camera.position.x, camera.position.z) : 0;
    for (const [id, c] of characters) {
      c.group.getWorldPosition(c.world);
      const body = c.group.userData.body;
      // 发言者的人脸更亮一点
      const fm = c.group.userData.faceMat;
      if (fm) {
        const target = (id === speakingId) ? 1.2 : 0.85;
        fm.emissiveIntensity += (target - fm.emissiveIntensity) * Math.min(1, dt * 5);
      }
      if (body) {
        const phase = idx * 1.7;
        const spk = id === speakingId;
        // 呼吸
        body.position.y = Math.sin(t * 1.35 + phase) * 0.007;
        // 发言者略前倾并点头，其他人安静听
        const target = spk ? 0.055 + Math.sin(t * 3.1) * 0.022 : 0.012 + Math.sin(t * 0.9 + phase) * 0.006;
        body.rotation.x += (target - body.rotation.x) * Math.min(1, dt * 5);
        // 头部轻微摆动
        body.rotation.y = Math.sin(t * 0.7 + phase * 2) * (spk ? 0.05 : 0.02);
      }
      idx++;
    }
  }

  return { root, characters, lampLight, update, setSpeaker, env };
}
