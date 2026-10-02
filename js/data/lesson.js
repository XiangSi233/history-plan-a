/* ===========================================================
   lesson.js — 本课内容数据（统编版八年级上册 第15课）
   坐标 x/y 为地图图片像素坐标（底图 1052 × 757）
   =========================================================== */

export const MAP_SIZE = { w: 1052, h: 757 };

/* 路线走向（含转折点，用于绘制发光路线） */
export const ROUTE = [
  [748, 640], [700, 630], [668, 662], [645, 656], [600, 662], [560, 650],
  [520, 650], [490, 634], [445, 602], [420, 596], [405, 578], [392, 560],
  [368, 554], [348, 550], [322, 538], [302, 528], [272, 546], [232, 570],
  [190, 586], [140, 592], [96, 588], [78, 588], [92, 545], [122, 505],
  [162, 478], [196, 462], [228, 452], [210, 426], [188, 402], [172, 362],
  [178, 322], [200, 292], [230, 286], [258, 282], [300, 250], [342, 198],
  [382, 150], [418, 108]
];

/* 每个地点的路线进度索引（对应 ROUTE 中的位置） */
const RP = { ruijin: 0, yudu: 1, blockade: 3, xiangjiang: 5, tongdao: 8, wujiang: 11,
  zunyi: 13, chishui: 15, jinsha: 21, dadu: 24, luding: 26, xueshan: 28,
  caodi: 31, lazikou: 33, wuqi: 37, huining: 37 };

export const STOPS = [
{
  id: 'ruijin', name: '瑞金出发', title: '战略转移的开始', date: '1934年10月',
  place: '江西 · 瑞金', kind: 'start', x: 748, y: 640, routeAt: RP.ruijin,
  lead: '1934年10月，中央红军8万多人从瑞金、于都等地出发，开始战略转移。',
  points: [
    '目的：进行战略转移，保存革命力量',
    '出发地点：江西瑞金',
    '人数：中央红军8万多人（红一方面军）',
    '直接原因：红军第五次反“围剿”失利'
  ],
  photo: { src: 'assets/photo/assembly.webp', caption: '红军部队集会（历史照片）' },
  extra: [
    '根本原因：博古、李德等“左”倾错误'
  ]
},
{
  id: 'yudu', name: '于都集结', title: '夜渡于都河', date: '1934年10月',
  place: '江西 · 于都', kind: 'start', x: 700, y: 630, routeAt: RP.yudu,
  lead: '1934年10月17日起，中央红军分别从于都河8个渡口渡河，踏上远征之路。',
  points: [
    '于都是中央红军长征的集结出发地',
    '当地群众献出门板、床板架设浮桥',
    '“一送红军下南山，秋风细雨缠绵绵”'
  ],
  photo: { src: 'assets/photo/see-off.webp', caption: '《十送红军》——群众送别红军（油画）' }
},
{
  id: 'blockade', name: '突破封锁线', title: '连破四道封锁线', date: '1934年11月',
  place: '赣南 — 湘南', kind: 'battle', x: 645, y: 656, routeAt: RP.blockade,
  lead: '国民党军在红军西进路上设下四道封锁线，红军连续苦战，损失惨重。',
  points: [
    '红军连续突破敌人四道封锁线',
    '由于“大搬家”式转移，行军迟缓，伤亡很大',
    '为后续湘江血战埋下隐患'
  ],
  photo: { src: 'assets/event/break-blockade.webp', caption: '突破敌人封锁线（油画）' }
},
{
  id: 'xiangjiang', name: '血战湘江', title: '湘江战役', date: '1934年11月—12月',
  place: '广西 · 全州、兴安一带', kind: 'battle', x: 560, y: 650, routeAt: RP.xiangjiang,
  lead: '湘江战役后，红军总人数由出发时的8.6万人锐减至3万余人。',
  points: [
    '冲破第四道封锁线，渡过湘江',
    '挫败了蒋介石企图歼灭红军于湘江以东的阴谋',
    '中央红军损失惨重，只剩下3万多人',
    '当地流传：“三年不饮湘江水，十年不食湘江鱼”'
  ],
  photo: { src: 'assets/event/xiangjiang-map.webp', caption: '湘江战役位置示意图（《长征路线图》局部）' }
},
{
  id: 'tongdao', name: '通道转兵', title: '往湘西，还是往贵州？', date: '1934年12月',
  place: '湖南 · 通道', kind: 'meeting', x: 445, y: 602, routeAt: RP.tongdao,
  lead: '湘江之后，红军已不足3万人。下一步走向哪里，关系全军生死。',
  points: [
    '博古、李德主张：按原计划北上湘西，与红二、六军团会合',
    '毛泽东主张：改向敌人力量薄弱的贵州前进',
    '敌人已在湘西布下重兵，北上等于自投罗网',
    '通道会议采纳毛泽东的建议，改向贵州——史称“通道转兵”'
  ],
  photo: { src: 'assets/map/route-simple.webp', caption: '长征路线示意图（注意湘西方向敌军重兵）' },
  scene: 'tongdao'
},
{
  id: 'wujiang', name: '强渡乌江', title: '天险乌江', date: '1935年1月',
  place: '贵州 · 乌江江界河渡口', kind: 'battle', x: 392, y: 560, routeAt: RP.wujiang,
  lead: '红军以竹筏强渡乌江天险，打开了通往遵义的大门。',
  points: [
    '乌江素称天险，两岸悬崖峭壁',
    '红军扎竹筏、架浮桥，冒着火力强渡成功',
    '1935年1月7日，红军攻占遵义城'
  ],
  photo: { src: 'assets/event/river-crossing.webp', caption: '强渡乌江（绘画）' }
},
{
  id: 'zunyi', name: '遵义会议', title: '遵义会议', date: '1935年1月15日—17日',
  place: '贵州 · 遵义（原黔军师长柏辉章公馆）', kind: 'meeting', x: 348, y: 550, routeAt: RP.zunyi,
  lead: '中共中央在遵义召开政治局扩大会议，集中解决军事和组织上的错误，成为党史上生死攸关的转折点。',
  points: [
    '① 集中全力解决博古等人在军事和组织上“左”的错误',
    '② 肯定毛泽东的正确军事主张',
    '③ 增选毛泽东为中央政治局常委',
    '④ 取消博古、李德的军事最高指挥权',
    '会后分工：张闻天负总责；周恩来、毛泽东、王稼祥组成军事指挥小组'
  ],
  photo: { src: 'assets/photo/zunyi-site-old.webp', caption: '遵义会议会址（历史照片）' },
  scene: 'zunyi'
},
{
  id: 'chishui', name: '四渡赤水', title: '四渡赤水出奇兵', date: '1935年1月—3月',
  place: '贵州、四川、云南边境 · 赤水河', kind: 'battle', x: 302, y: 528, routeAt: RP.chishui,
  lead: '红军四次渡过赤水河，佯攻贵阳、威逼昆明，打乱了敌人的“追剿”计划。',
  points: [
    '毛泽东指挥红军机动灵活，声东击西',
    '佯攻贵阳、威逼昆明，调动敌人',
    '打乱了敌人的“追剿”计划，红军由被动变主动'
  ],
  photo: { src: 'assets/event/four-crossings.webp', caption: '赤水河两岸态势（《长征路线图》局部）' }
},
{
  id: 'jinsha', name: '巧渡金沙江', title: '巧渡金沙江', date: '1935年4月—5月',
  place: '云南 · 禄劝皎平渡', kind: 'battle', x: 78, y: 588, routeAt: RP.jinsha,
  lead: '红军在皎平渡用7只小船，昼夜不停用了9天9夜渡过金沙江，跳出了敌人的重重包围。',
  points: [
    '红军先头部队智取皎平渡渡口',
    '仅靠7只木船，9天9夜渡完全军',
    '从此跳出了几十万敌军的重重包围'
  ],
  photo: { src: 'assets/event/jinsha-river.webp', caption: '巧渡金沙江（油画）' }
},
{
  id: 'dadu', name: '强渡大渡河', title: '强渡大渡河', date: '1935年5月',
  place: '四川 · 安顺场', kind: 'battle', x: 162, y: 478, routeAt: RP.dadu,
  lead: '蒋介石扬言要让红军做“石达开第二”，红军十七勇士强渡大渡河成功。',
  points: [
    '安顺场渡口只有一条小船',
    '十七勇士冒着枪林弹雨强渡成功',
    '为后续部队打开通路，粉碎了敌人的妄想'
  ],
  photo: { src: 'assets/event/force-dadu.webp', caption: '强渡大渡河（油画）' }
},
{
  id: 'luding', name: '飞夺泸定桥', title: '飞夺泸定桥', date: '1935年5月',
  place: '四川 · 泸定桥', kind: 'battle', x: 228, y: 452, routeAt: RP.luding,
  lead: '22名突击队员冒着弹雨，攀着13根铁索夺下泸定桥。',
  points: [
    '红军一昼夜奔袭240里，抢在敌人增援之前到达',
    '22名勇士冒着火力攀铁索过河',
    '夺桥成功，红军主力得以顺利北上'
  ],
  photo: { src: 'assets/event/luding-bridge.webp', caption: '飞夺泸定桥（油画）' }
},
{
  id: 'xueshan', name: '翻越雪山', title: '翻越夹金山', date: '1935年6月',
  place: '四川 · 夹金山（大雪山）', kind: 'pass', x: 188, y: 402, routeAt: RP.xueshan,
  lead: '红军翻越海拔4000多米的夹金山，这是长征中翻越的第一座大雪山。',
  points: [
    '山上空气稀薄，风雪交加，气温骤降',
    '红军战士大多穿着单衣草鞋',
    '翻过雪山后，红一、红四方面军在懋功会师'
  ],
  photo: { src: 'assets/event/snow-mountain.webp', caption: '翻越雪山（油画）' }
},
{
  id: 'caodi', name: '穿越草地', title: '穿越松潘草地', date: '1935年8月',
  place: '四川 · 松潘草地', kind: 'pass', x: 200, y: 292, routeAt: RP.caodi,
  lead: '茫茫草地人烟罕至，沼泽遍布，红军以野菜、皮带充饥，走出了草地。',
  points: [
    '草地泥沼遍布，一脚踩空即可能陷落',
    '粮食断绝，靠野菜、草根、皮带充饥',
    '“半截皮带”“金色的鱼钩”的故事就发生在这里'
  ],
  photo: { src: 'assets/event/grassland.webp', caption: '过草地（油画）' }
},
{
  id: 'lazikou', name: '突破腊子口', title: '突破腊子口', date: '1935年9月',
  place: '甘肃 · 腊子口', kind: 'battle', x: 258, y: 282, routeAt: RP.lazikou,
  lead: '腊子口是甘南天险，红军攀绝壁、投手榴弹，一举突破，打开了北上通道。',
  points: [
    '腊子口两山夹峙，宽仅30余米，素称“天险”',
    '红军正面强攻、侧后攀崖奇袭',
    '打开了红军北上甘南的通道'
  ],
  photo: { src: 'assets/event/lazikou.webp', caption: '腊子口战役纪念碑' }
},
{
  id: 'wuqi', name: '吴起镇会师', title: '到达陕北', date: '1935年10月',
  place: '陕西 · 吴起镇', kind: 'join', x: 418, y: 108, routeAt: RP.wuqi,
  lead: '1935年10月，中央红军到达陕北吴起镇，与陕北红军胜利会师，中央红军长征胜利结束。',
  points: [
    '中央红军历时一年，行程二万五千里',
    '与陕北红军会师，建立了新的革命大本营',
    '“长征是宣言书，长征是宣传队，长征是播种机”'
  ],
  photo: { src: 'assets/photo/mao-zhou.webp', caption: '长征到达陕北后的毛泽东、周恩来（1935年）' }
},
{
  id: 'huining', name: '会宁会师', title: '三大主力会师 · 长征胜利', date: '1936年10月',
  place: '甘肃 · 会宁、将台堡', kind: 'join', x: 300, y: 165, routeAt: RP.huining,
  lead: '1936年10月，红一、红二、红四方面军在甘肃会宁、将台堡会师，宣告红军长征胜利结束。',
  points: [
    '红军三大主力会师，长征胜利结束',
    '粉碎了国民党反动派消灭红军的企图',
    '保存了党和红军的基干力量，使中国革命转危为安',
    '播下了革命种子，铸就了长征精神，打开了中国革命的新局面'
  ],
  photo: { src: 'assets/event/join-forces.webp', caption: '红军三大主力会师（油画）' }
}
];

/* 课堂活动：给长征事件排序（正确答案按先后） */
export const SORT_ANSWER = [
  '开始长征（1934.10）',
  '突破四道封锁线（1934.11）',
  '血战湘江（1934.11—12）',
  '强渡乌江·攻占遵义（1935.01）',
  '四渡赤水（1935.01—03）',
  '巧渡金沙江（1935.04—05）',
  '强渡大渡河·飞夺泸定桥（1935.05）',
  '翻雪山·过草地（1935.06—08）',
  '突破腊子口·吴起镇会师（1935.09—10）',
  '会宁会师（1936.10）'
];
