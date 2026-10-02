/* ===========================================================
   scenes.js — 三维现场：场景、人物、可点击发言
   -----------------------------------------------------------
   交互方式：不是线性翻页，而是
     intro  → 开场旁白（自动）
     topics → 点击会场中的任意人物，听他发言（可反复点）
     climax → 关键人物都发言后自动触发的会议结论
   =========================================================== */

const CAST = [
  { id: 'bogu', name: '博古', role: '中共临时中央负责人', short: '博古',
    seat: [-2.05, 0, Math.PI / 2], uniform: '#6f7681', cap: true, glasses: true },
  { id: 'zhou', name: '周恩来', role: '中央政治局常委 · 红军总政委', short: '周恩来',
    seat: [-0.85, -0.98, 0], uniform: '#7c8288', cap: true },
  { id: 'mao', name: '毛泽东', role: '中央政治局委员', short: '毛泽东',
    seat: [0.32, -0.98, 0], uniform: '#767b80', cap: false },
  { id: 'luofu', name: '张闻天', role: '中央政治局常委', short: '张闻天',
    seat: [1.45, -0.98, 0], uniform: '#727981', cap: true, glasses: true },
  { id: 'wang', name: '王稼祥', role: '红军总政治部主任', short: '王稼祥',
    seat: [1.92, 0.98, Math.PI], uniform: '#787f86', cap: true, glasses: true },
  { id: 'li', name: '李德', role: '共产国际军事顾问', short: '李德',
    seat: [-1.42, 0.98, Math.PI], uniform: '#5f6874', cap: false }
];

/* 每个可点击人物的发言（topic） */
const TONGDAO_TOPICS = {
  bogu: { label: '博古：按原定计划北上', lines: [
    { who: 'bogu', cam: 'close', text: '按原定计划，我们继续北上湘西，与红二、六军团会合，在那里重建根据地。' },
    { who: 'bogu', cam: 'close', text: '这个方案是共产国际同意的，不能因为一次失利就动摇。' }
  ] },
  li: { label: '李德：必须执行原定方案', lines: [
    { who: 'li', cam: 'close', text: '必须执行原定方案。我们还有三万人，集中兵力，完全可以打出一条路来。' },
    { who: 'li', cam: 'close', text: '放弃湘西，就是放弃既定的战略方向。' }
  ] },
  zhou: { label: '周恩来：侦察报告', lines: [
    { who: 'zhou', cam: 'close', text: '可侦察员刚刚报告：湘西方向，敌人已经集结了十几万兵力，正在等着我们去钻口袋。' },
    { who: 'zhou', cam: 'close', text: '我们的部队已经极度疲惫，再打这种硬仗，恐怕撑不住。' }
  ] },
  mao: { label: '毛泽东：改向贵州', lines: [
    { who: 'mao', cam: 'close', text: '不能再去湘西了。敌人张好了网，我们只剩下三万人，再撞上去，就是全军覆没。' },
    { who: 'mao', cam: 'close', text: '贵州方向，敌人兵力薄弱。我们应当果断改向贵州，打几个胜仗，让部队喘一口气。' },
    { who: 'mao', cam: 'close', text: '打仗要拣弱的打，走路要走敌人想不到的路——先活下来，才有以后。' }
  ] },
  luofu: { label: '张闻天：赞成改变方向', lines: [
    { who: 'luofu', cam: 'close', text: '我赞成毛泽东同志的意见。明知是口袋还要往里钻，那不是勇敢，是拿红军的前途冒险。' }
  ] },
  wang: { label: '王稼祥：支持毛泽东', lines: [
    { who: 'wang', cam: 'close', text: '我也支持。红军不能再这样硬拼下去了，必须换一个打法。' }
  ] }
};

const ZUNYI_TOPICS = {
  bogu: { label: '博古：作主报告', lines: [
    { who: 'bogu', cam: 'close', text: '……第五次反“围剿”之所以失败，主要是敌人力量过于强大，客观条件不具备。' },
    { who: 'bogu', cam: 'close', text: '我们在军事上已经尽了最大努力。湘江的损失，责任不能完全由中央来负。' }
  ] },
  zhou: { label: '周恩来：主动承担责任', lines: [
    { who: 'zhou', cam: 'close', text: '我作为红军总政委，对军事指挥上的失误负有责任。' },
    { who: 'zhou', cam: 'close', text: '第五次反“围剿”的作战方针，确实存在问题。这一点，我必须讲清楚。' }
  ] },
  luofu: { label: '张闻天：反对“左”倾军事路线', lines: [
    { who: 'luofu', cam: 'close', text: '我不同意博古同志的报告。问题的根本，在于军事路线——是“左”倾教条主义那一套，把我们拖到了今天。' }
  ] },
  mao: { label: '毛泽东：批判错误的军事指挥', lines: [
    { who: 'mao', cam: 'close', text: '第五次反“围剿”，我们放弃了前几次反“围剿”行之有效的运动战，去和敌人拼消耗、打阵地战。' },
    { who: 'mao', cam: 'close', text: '堡垒对堡垒，以集中对集中——用我们的短处，去对敌人的长处。这样打仗，怎么会不失败？' },
    { who: 'mao', cam: 'close', text: '中国革命战争的规律，要靠我们自己从战争中学习。' }
  ] },
  wang: { label: '王稼祥：必须改变领导', lines: [
    { who: 'wang', cam: 'close', text: '我支持毛泽东同志的意见。红军不能再由这样的人指挥下去了，必须马上改变领导。' }
  ] },
  li: { label: '李德：为原方案辩护', lines: [
    { who: 'li', cam: 'close', text: '我的方案没有错，是部队执行不力，是敌我力量对比太悬殊。' },
    { who: 'li', cam: 'close', text: '（会场上一片沉默。没有人再为他辩护。）' }
  ] }
};

export const SCENES = {

/* ======================= 通道转兵 ======================= */
tongdao: {
  id: 'tongdao', stopId: 'tongdao',
  title: '通道紧急会议',
  place: '湖南通道 · 1934年12月',
  task: '点击会场中的每个人物，听他们各自的主张',
  env: { w: 12, d: 10, h: 3.5, mood: 'dusk', map: false },
  cast: CAST,
  archive: [
    { src: 'assets/map/route-simple.webp', title: '长征路线示意图',
      text: '湘江战役后，红军只剩3万余人。图上可见湘西方向敌人已布满重兵，而贵州方向兵力薄弱。' },
    { src: 'assets/photo/chiang.webp', title: '蒋介石',
      text: '蒋介石判断红军将北上湘西与红二、六军团会合，遂在湘西布下重兵，张网以待。' },
    { src: 'assets/photo/base-areas.webp', title: '1929—1932年农村革命根据地分布示意图',
      text: '第五次反“围剿”失利后，中央革命根据地丧失，红军被迫战略转移。' }
  ],
  intro: [
    { narr: true, cam: 'wide', text: '1934年12月，湖南通道。湘江血战之后，中央红军由8.6万人锐减到3万余人。' },
    { narr: true, cam: 'wide', text: '下一步往哪里走？一间简陋的屋子里，一场决定全军命运的争论正在进行。' },
    { narr: true, cam: 'wide', text: '==拖动鼠标可以环视会场==，==点击任意一个人物==，听他们各自的主张。' }
  ],
  topics: TONGDAO_TOPICS,
  require: ['bogu', 'li', 'mao'],
  climax: [
    { narr: true, cam: 'wide', text: '两种意见针锋相对。红军的前途，此刻就压在这间屋子里的几个人肩上。' },
    { choices: [
        { text: '支持博古、李德：按原计划北上湘西，与红二、六军团会合',
          tone: 'risky',
          reply: [
            { narr: true, cam: 'wide', text: '若照此方案北上——湘西方向，国民党军已集结重兵，构筑了纵深堡垒线。' },
            { narr: true, cam: 'wide', text: '以疲惫之师、三万之众强攻，后果不堪设想。历史的事实是：这一方案被否决了。' },
            { narr: true, cam: 'wide', text: '如果一意孤行，红军很可能在湘西被围歼，中国革命的前途将不堪设想。' }
          ] },
        { text: '支持毛泽东：改向贵州，向敌人力量薄弱的地方去',
          tone: 'historic', toast: '历史的选择：改向贵州',
          reply: [
            { who: 'zhou', cam: 'close', text: '我同意毛泽东同志的意见。与其往敌人的口袋里钻，不如转向贵州。' },
            { who: 'wang', cam: 'close', text: '我也赞成。红军不能再这样硬拼下去了，必须改变打法。' },
            { who: 'luofu', cam: 'close', text: '那就这样定：部队转向贵州，先打几个胜仗，把敌人的部署打乱。' }
          ] }
      ] },
    { narr: true, cam: 'wide', text: '通道会议采纳了毛泽东的建议，红军改向敌人力量薄弱的贵州前进——史称==“通道转兵”==。' },
    { narr: true, cam: 'wide', text: '这一转向，使红军避免了钻进敌人的口袋阵，也为一个月后的遵义会议埋下了伏笔。' }
  ]
},

/* ======================= 遵义会议 ======================= */
zunyi: {
  id: 'zunyi', stopId: 'zunyi',
  title: '遵义会议',
  place: '贵州遵义 · 1935年1月15日—17日',
  task: '点击会场中的每个人物，听他们发言；关键人物发言完毕后，会议将进入表决',
  env: { w: 13, d: 11, h: 3.7, mood: 'night', map: true },
  cast: CAST,
  archive: [
    { src: 'assets/video/zunyi-clip.mp4', type: 'video', title: '纪录片片段（约2分52秒）',
      text: '遵义会议纪录片片段，含会议决议字幕。素材取自本课配套课件。' },
    { src: 'assets/photo/zunyi-site-old.webp', title: '遵义会议会址（历史照片）',
      text: '会址位于遵义老城子尹路，原为黔军第二十五军第二师师长柏辉章的私人官邸。' },
    { src: 'assets/photo/zunyi-site-1935.webp', title: '遵义会议会址（早期影像）',
      text: '会址是一栋砖木结构、中西合璧的两层楼房，遵义会议在楼上东侧的客厅里举行。' },
    { src: 'assets/photo/zunyi-site-now.webp', title: '遵义会议会址（现状）',
      text: '新中国成立后，会址按原貌修复，现为全国重点文物保护单位、爱国主义教育基地。' },
    { src: 'assets/photo/mao-zhou.webp', title: '毛泽东与周恩来',
      text: '遵义会议后，他们与王稼祥组成军事指挥小组，负责长征中的军事指挥。' },
    { src: 'assets/photo/bogu.webp', title: '博古（秦邦宪）',
      text: '时任中共临时中央负责人，在会上作主报告，强调客观困难，未认识“左”倾错误。' },
    { src: 'assets/photo/chiang.webp', title: '蒋介石',
      text: '蒋介石调集重兵围追堵截，妄图把红军消灭在长征途中。' }
  ],
  intro: [
    { narr: true, cam: 'wide', text: '1935年1月，红军攻占遵义。1月15日至17日，中共中央在这里召开政治局扩大会议。' },
    { narr: true, cam: 'wide', text: '会议室里，二楼的窗户透出昏黄的灯光。一场关系到党和红军生死存亡的会议，开始了。' },
    { narr: true, cam: 'wide', text: '==拖动鼠标环视会场==，==点击人物==听他们发言。听完全部关键发言后，会议进入表决。' }
  ],
  topics: ZUNYI_TOPICS,
  require: ['bogu', 'zhou', 'luofu', 'mao', 'wang'],
  climax: [
    { narr: true, cam: 'wide', text: '会议开了三天。经过激烈争论，与会多数同志逐渐站到了毛泽东这一边。' },
    { narr: true, cam: 'wide', text: '会议作出决议——' },
    { narr: true, cam: 'wide', text: '① 集中全力解决博古等人在军事上和组织上“左”的错误；② 肯定毛泽东的正确军事主张；③ 增选毛泽东为中央政治局常委；④ 取消博古、李德的军事最高指挥权。' },
    { narr: true, cam: 'wide', text: '会后不久，中央常委分工：张闻天负总责；周恩来、毛泽东、王稼祥组成军事指挥小组，负责长征中的军事指挥。' },
    { who: 'mao', cam: 'close', text: '中国的革命，要靠中国人自己来办。别人的经验要学，但不能照搬；仗怎么打，得看我们脚下的土地。' },
    { narr: true, cam: 'wide', text: '遵义会议，开始确立以毛泽东为主要代表的马克思主义正确路线在党中央的领导地位。' },
    { narr: true, cam: 'wide', text: '这是中国共产党历史上一个==生死攸关的转折点==，也是中国共产党从==幼年走向成熟==的标志。' }
  ]
}

};
