const router = require('express').Router();
const db = require('../db');
const { Solar, Lunar } = require('lunar-javascript');

// 稳定随机：同一对组合每次抽到同一句话术（按双方id做种子）
function seededPick(arr, seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

// ── 工具 ────────────────────────────────────────────
const SHICHEN = { '子时':0, '丑时':2, '寅时':4, '卯时':6, '辰时':8, '巳时':10, '午时':12, '未时':14, '申时':16, '酉时':18, '戌时':20, '亥时':22 };

const XINGZUO_ELEMENT = {
  '白羊':'火','狮子':'火','射手':'火',
  '金牛':'土','处女':'土','摩羯':'土',
  '双子':'风','天秤':'风','水瓶':'风',
  '巨蟹':'水','天蝎':'水','双鱼':'水',
};

// 生肖关系表
const LIUHE = { '鼠':'牛','牛':'鼠','虎':'猪','猪':'虎','兔':'狗','狗':'兔','龙':'鸡','鸡':'龙','蛇':'猴','猴':'蛇','马':'羊','羊':'马' };
const SANHE = [['鼠','龙','猴'], ['牛','蛇','鸡'], ['虎','马','狗'], ['兔','羊','猪']];
const XIANGCHONG = { '鼠':'马','马':'鼠','牛':'羊','羊':'牛','虎':'猴','猴':'虎','兔':'鸡','鸡':'兔','龙':'狗','狗':'龙','蛇':'猪','猪':'蛇' };
const XIANGHAI = { '鼠':'羊','羊':'鼠','牛':'马','马':'牛','虎':'蛇','蛇':'虎','兔':'龙','龙':'兔','猴':'猪','猪':'猴','鸡':'狗','狗':'鸡' };

// 天干五合
const GAN_HE = { '甲':'己','己':'甲','乙':'庚','庚':'乙','丙':'辛','辛':'丙','丁':'壬','壬':'丁','戊':'癸','癸':'戊' };
// 五行生克
const SHENG = { '木':'火','火':'土','土':'金','金':'水','水':'木' };
const KE = { '木':'土','土':'水','水':'火','火':'金','金':'木' };

function countWuXing(ec) {
  const counts = { '金':0, '木':0, '水':0, '火':0, '土':0 };
  const all = [ec.getYearWuXing(), ec.getMonthWuXing(), ec.getDayWuXing(), ec.getTimeWuXing()].join('');
  for (const ch of all) if (counts[ch] !== undefined) counts[ch]++;
  return counts;
}

function buildBazi(guest) {
  // 优先用完整生日；脏数据（格式不合法）或只有出生年时降级
  let solar, precision;
  const rawDate = guest.birth_date ? String(guest.birth_date).trim() : '';
  const validDate = /^\d{4}-\d{1,2}-\d{1,2}$/.test(rawDate);
  // 兜底年份：优先 birth_year，缺失时尝试从（哪怕脏的）birth_date 抠出 4 位年份
  const yearMatch = rawDate.match(/^(\d{4})/);
  const fallbackYear = guest.birth_year || (yearMatch ? parseInt(yearMatch[1]) : null);

  try {
    if (validDate) {
      const [y, m, d] = rawDate.split('-').map(Number);
      let hour = 12, minute = 0;
      const exact = guest.birth_time && guest.birth_time.match(/^(\d{1,2}):(\d{2})$/);
      if (exact) {
        // 精确时间 HH:mm，时柱最准
        hour = parseInt(exact[1]); minute = parseInt(exact[2]);
      } else if (guest.birth_time && SHICHEN[guest.birth_time] !== undefined) {
        hour = SHICHEN[guest.birth_time];
      } else if (guest.birth_time && /^\d{1,2}/.test(guest.birth_time)) {
        hour = parseInt(guest.birth_time);
      }
      solar = Solar.fromYmdHms(y, m, d, hour, minute, 0);
      precision = guest.birth_time ? 'full' : 'date';
    } else if (fallbackYear) {
      solar = Solar.fromYmdHms(fallbackYear, 6, 15, 12, 0, 0);
      precision = 'year';
    } else {
      return null;
    }
  } catch {
    // 排盘失败（脏数据）：尽量按年份兜底，仍失败则放弃
    if (!fallbackYear) return null;
    try {
      solar = Solar.fromYmdHms(fallbackYear, 6, 15, 12, 0, 0);
      precision = 'year';
    } catch { return null; }
  }

  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const wuxing = countWuXing(ec);
  const missing = Object.entries(wuxing).filter(([, v]) => v === 0).map(([k]) => k);
  const dominant = Object.entries(wuxing).sort((a, b) => b[1] - a[1])[0][0];

  return {
    precision, // full=有时辰 date=有日期 year=仅年份
    solar_date: precision === 'year' ? String(fallbackYear) : rawDate,
    lunar_date: precision !== 'year' ? `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}` : null,
    pillars: {
      year: ec.getYear(), month: precision !== 'year' ? ec.getMonth() : null,
      day: precision !== 'year' ? ec.getDay() : null,
      time: precision === 'full' ? ec.getTime() : null,
    },
    day_master: precision !== 'year' ? ec.getDayGan() : null,
    nayin: ec.getYearNaYin(),
    wuxing, missing, dominant,
    shengxiao: lunar.getYearShengXiao(),
    xingzuo: precision !== 'year' ? solar.getXingZuo() : null,
    xingzuo_element: precision !== 'year' ? XINGZUO_ELEMENT[solar.getXingZuo()] : null,
    birth_place: guest.birth_place || null,
  };
}

// ── 单人命理 ────────────────────────────────────────
router.get('/guest/:id', (req, res) => {
  const guest = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!guest) return res.status(404).json({ error: '嘉宾不存在' });
  const bazi = buildBazi(guest);
  if (!bazi) return res.json({ error: '未填写出生日期，无法排盘', bazi: null });
  res.json({ guest: { id: guest.id, nickname: guest.nickname, gender: guest.gender }, bazi });
});

// ── 双人合盘 ────────────────────────────────────────
router.get('/hepan', (req, res) => {
  const { a, b } = req.query;
  const ga = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(a);
  const gb = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(b);
  if (!ga || !gb) return res.status(404).json({ error: '嘉宾不存在' });

  const ba = buildBazi(ga), bb = buildBazi(gb);
  if (!ba || !bb) return res.status(400).json({ error: '双方都需填写出生年份或日期才能合盘' });

  const sections = [];
  let score = 50; // 基础分
  const seed = `${ga.id}-${gb.id}`;

  // 1. 生肖关系（权重最高）— 话术库随机（同一对人话术固定）
  const sxA = ba.shengxiao, sxB = bb.shengxiao;
  let sxVerdict, sxDelta;
  if (LIUHE[sxA] === sxB) {
    sxDelta = 25;
    sxVerdict = seededPick([
      `${sxA}与${sxB}乃「六合」贵人属相——十二生肖里最被看好的组合，月老对你们格外上心`,
      `${sxA}遇${sxB}是教科书级的「六合」吉配，一个眼神就懂彼此，长辈见了都点头`,
      `「六合」属相天生一对！${sxA}与${sxB}相遇，是互为贵人的缘分，越处越旺`,
    ], seed);
  } else if (SANHE.some(g => g.includes(sxA) && g.includes(sxB) && sxA !== sxB)) {
    sxDelta = 20;
    sxVerdict = seededPick([
      `${sxA}与${sxB}为「三合」属相，老一辈说的"合得来"就是你们这种，配合默契天生搭档`,
      `「三合」吉配！${sxA}和${sxB}同属一个能量阵营，并肩做事一加一大于二`,
      `${sxA}与${sxB}三合相生，像老友重逢般自然，相处不累是你们最大的福气`,
    ], seed);
  } else if (XIANGCHONG[sxA] === sxB) {
    sxDelta = -15;
    sxVerdict = seededPick([
      `${sxA}与${sxB}属相「相冲」，就像火锅配冰淇淋——刺激归刺激，肠胃（脾气）得受得了`,
      `属相相冲不是判死刑，是提醒：${sxA}和${sxB}性格自带火花，吵架技术和哄人技术都要练`,
      `${sxA}遇${sxB}相冲，注定不是平淡剧本；若能互相包容，欢喜冤家也能白头`,
    ], seed);
  } else if (XIANGHAI[sxA] === sxB) {
    sxDelta = -8;
    sxVerdict = seededPick([
      `${sxA}与${sxB}属相「相害」，小摩擦难免，但说开了就没事——沟通是你们的必修课`,
      `相害属相像鞋里的小石子，硌脚但不致命；${sxA}和${sxB}多换位思考就能化解`,
    ], seed);
  } else if (sxA === sxB) {
    sxDelta = 8;
    sxVerdict = seededPick([
      `同为属${sxA}，像照镜子一样懂彼此，连吐槽的点都一样`,
      `两只${sxA}凑一对，生活节奏天然同步，连作息都不用磨合`,
    ], seed);
  } else {
    sxDelta = 5;
    sxVerdict = seededPick([
      `${sxA}与${sxB}属相平和，无冲无刑，是细水长流的安稳配置`,
      `${sxA}和${sxB}不冲不害，感情全看经营——平淡里见真章`,
    ], seed);
  }
  score += sxDelta;
  sections.push({ title: '生肖姻缘', score_delta: sxDelta, detail: sxVerdict });

  // 2. 五行互补
  const missA = ba.missing, missB = bb.missing;
  const complementA = missA.filter(x => bb.wuxing[x] >= 2);
  const complementB = missB.filter(x => ba.wuxing[x] >= 2);
  let wxDelta = 0, wxParts = [];
  if (complementA.length || complementB.length) {
    wxDelta += Math.min((complementA.length + complementB.length) * 6, 15);
    if (complementA.length) wxParts.push(`${gb.nickname}的${complementA.join('、')}旺，恰好补${ga.nickname}五行所缺`);
    if (complementB.length) wxParts.push(`${ga.nickname}的${complementB.join('、')}旺，恰好补${gb.nickname}五行所缺`);
  }
  if (SHENG[ba.dominant] === bb.dominant || SHENG[bb.dominant] === ba.dominant) {
    wxDelta += 8;
    wxParts.push(`两人主五行「${ba.dominant}」与「${bb.dominant}」相生，互相滋养成就`);
  } else if (KE[ba.dominant] === bb.dominant || KE[bb.dominant] === ba.dominant) {
    wxDelta -= 5;
    wxParts.push(`两人主五行「${ba.dominant}」与「${bb.dominant}」相克，强势一方需多让步`);
  } else if (ba.dominant === bb.dominant) {
    wxDelta += 4;
    wxParts.push(`两人主五行同为「${ba.dominant}」，气场相近、习性相通`);
  }
  if (!wxParts.length) wxParts.push('五行格局平稳，无明显互补也无冲克');
  score += wxDelta;
  sections.push({ title: '五行互补', score_delta: wxDelta, detail: wxParts.join('；') });

  // 3. 日柱天干合（需有完整日期）
  if (ba.day_master && bb.day_master) {
    let dgDelta, dgVerdict;
    if (GAN_HE[ba.day_master] === bb.day_master) {
      dgDelta = 15;
      dgVerdict = `两人日主「${ba.day_master}」「${bb.day_master}」天干五合——八字合盘中最看重的夫妻缘分指标，相互吸引、缘分深厚`;
    } else if (ba.day_master === bb.day_master) {
      dgDelta = 5;
      dgVerdict = `日主相同（${ba.day_master}），性格底色相似，像照镜子一样了解彼此`;
    } else {
      dgDelta = 0;
      dgVerdict = `日主「${ba.day_master}」与「${bb.day_master}」无特殊合化，平常心相处即可`;
    }
    score += dgDelta;
    sections.push({ title: '日柱姻缘（夫妻宫）', score_delta: dgDelta, detail: dgVerdict });
  }

  // 4. 星座契合（需有完整日期）
  if (ba.xingzuo && bb.xingzuo) {
    const eA = ba.xingzuo_element, eB = bb.xingzuo_element;
    let xzDelta, xzVerdict;
    const pair = [eA, eB].sort().join('');
    if (eA === eB) {
      xzDelta = 12; xzVerdict = `${ba.xingzuo}座 × ${bb.xingzuo}座，同属${eA}象星座，三观与处事方式天然合拍`;
    } else if (pair === '火风' || pair === '风火') {
      xzDelta = 10; xzVerdict = `${ba.xingzuo}座 × ${bb.xingzuo}座，火与风互相助燃，相处充满激情与新鲜感`;
    } else if (pair === '土水' || pair === '水土') {
      xzDelta = 10; xzVerdict = `${ba.xingzuo}座 × ${bb.xingzuo}座，水土相融，细水长流型的安稳组合`;
    } else if (pair === '火水' || pair === '水火') {
      xzDelta = -5; xzVerdict = `${ba.xingzuo}座 × ${bb.xingzuo}座，水火个性差异大，吸引归吸引，相处需技巧`;
    } else {
      xzDelta = 3; xzVerdict = `${ba.xingzuo}座 × ${bb.xingzuo}座，${eA}象与${eB}象组合，互有差异也互有吸引`;
    }
    score += xzDelta;
    sections.push({ title: '星座契合', score_delta: xzDelta, detail: xzVerdict });
  }

  score = Math.max(20, Math.min(99, score));
  const level = score >= 85 ? '天赐良缘' : score >= 70 ? '佳偶可成' : score >= 55 ? '中等缘分' : '需多磨合';

  // 彩蛋1：本月宜约会吉日（黄历宜「嫁娶/会亲友/订盟/纳采」的日子）
  const luckyDates = [];
  const today = new Date();
  for (let i = 1; i <= 30 && luckyDates.length < 3; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    try {
      const lunar = Lunar.fromDate(d);
      const yi = lunar.getDayYi();
      if (yi.some(x => ['嫁娶', '会亲友', '订盟', '纳采'].includes(x))) {
        const weekday = ['日','一','二','三','四','五','六'][d.getDay()];
        luckyDates.push({
          date: `${d.getMonth() + 1}月${d.getDate()}日（周${weekday}）`,
          yi: yi.filter(x => ['嫁娶','会亲友','订盟','纳采','出行'].includes(x)).join('、'),
        });
      }
    } catch { /* skip */ }
  }

  // 彩蛋2：缘分关键词（按双方五行与分数派生，同一对人固定）
  const KEYWORDS = {
    high: ['命中注定', '双向奔赴', '天时地利', '一拍即合', '相见恨晚'],
    mid: ['慢热升温', '细水长流', '日久生情', '稳中有进', '互补成长'],
    low: ['不打不相识', '欢喜冤家', '磨合出真情', '先友后爱'],
  };
  const pool = score >= 80 ? KEYWORDS.high : score >= 60 ? KEYWORDS.mid : KEYWORDS.low;
  const keyword = seededPick(pool, seed);

  res.json({
    a: { id: ga.id, nickname: ga.nickname, gender: ga.gender, bazi: ba },
    b: { id: gb.id, nickname: gb.nickname, gender: gb.gender, bazi: bb },
    score, level, sections,
    keyword,
    lucky_dates: luckyDates,
    note: '命理合盘仅供娱乐参考，感情幸福靠经营 💕',
  });
});

module.exports = router;
