const router = require('express').Router();
const db = require('../db');

/**
 * 客观化匹配引擎 v2
 * - 双向评分：A对B的满意度 × B对A的满意度，取调和平均（惩罚单边匹配）
 * - 硬性条件：带孩/同城等结构化冲突直接排除；dealbreakers 文本标红警告
 * - 缺失维度剔除：双方信息不全的维度不计分，按已评估维度归一化，并报告覆盖率
 * - 共性维度：性格/生活/价值观/运动标签交集、恋爱意向、家庭计划、约会偏好、兴趣关键词、MBTI 轻量契合、异地接受度
 */

const EDU_ORDER = ['高中及以下', '大专', '本科', '硕士', '博士'];
const INCOME_ORDER = ['5万以下', '5-10万', '10-20万', '20-50万', '50万以上'];

// MBTI 经典"黄金互补"组合（每个类型的常见理想搭配）
const MBTI_GOLDEN = {
  INTJ: 'ENFP', ENFP: 'INTJ', INFJ: 'ENTP', ENTP: 'INFJ', INFP: 'ENFJ', ENFJ: 'INFP',
  INTP: 'ENTJ', ENTJ: 'INTP', ISTJ: 'ESFP', ESFP: 'ISTJ', ISFJ: 'ESTP', ESTP: 'ISFJ',
  ISTP: 'ESFJ', ESFJ: 'ISTP', ISFP: 'ESTJ', ESTJ: 'ISFP',
};
// 自由文本分词（兴趣等）：按常见分隔符切，去空
const splitTokens = s => String(s || '').split(/[,，、/\s·]+/).map(x => x.trim()).filter(Boolean);

const age = g => (g.birth_year ? new Date().getFullYear() - g.birth_year : null);

// ── 单向评分：seeker 的期望 vs candidate 的条件 ──
// 每个维度：有期望+有数据才评估；返回 {score, max} 或 null（跳过）
function dimAge(seeker, candidate) {
  const a = age(candidate);
  if (!seeker.pref_age_min && !seeker.pref_age_max) return null;
  if (!a) return { skipped: '对方年龄未知' };
  const min = seeker.pref_age_min || 18, max = seeker.pref_age_max || 60;
  if (a >= min && a <= max) return { score: 100, note: `${a}岁，在期望的${min}-${max}岁内` };
  const gap = Math.min(Math.abs(a - min), Math.abs(a - max));
  return { score: Math.max(0, 100 - gap * 18), note: `${a}岁，超出期望范围${gap}岁` };
}

function dimHeight(seeker, candidate) {
  if (!seeker.pref_height_min && !seeker.pref_height_max) return null;
  if (!candidate.height) return { skipped: '对方身高未填' };
  const min = seeker.pref_height_min || 0, max = seeker.pref_height_max || 250;
  if (candidate.height >= min && candidate.height <= max) {
    return { score: 100, note: `${candidate.height}cm，符合期望` };
  }
  const gap = Math.min(Math.abs(candidate.height - min), Math.abs(candidate.height - max));
  return { score: Math.max(0, 100 - gap * 10), note: `${candidate.height}cm，差${gap}cm` };
}

function dimCircle(seeker, candidate) {
  if (!seeker.pref_circle) return null;
  if (!candidate.circle) return { skipped: '对方圈层未填' };
  // 圈层支持多值（CSV）：任一期望圈层与对方任一圈层匹配即视为符合
  const prefs = seeker.pref_circle.split(',').filter(Boolean);
  const circles = candidate.circle.split(',').filter(Boolean);
  const hit = prefs.some(p => circles.some(c => c === p || c.includes(p) || p.includes(c)));
  if (hit) {
    return { score: 100, note: `${circles.join('/')}，符合期望圈层` };
  }
  return { score: 20, note: `期望${prefs.join('/')}，对方是${circles.join('/')}` };
}

function dimEducation(seeker, candidate) {
  if (!seeker.pref_education) return null;
  if (!candidate.education) return { skipped: '对方学历未填' };
  const prefIdx = EDU_ORDER.indexOf(seeker.pref_education);
  const candIdx = EDU_ORDER.indexOf(candidate.education);
  if (candIdx < 0 || prefIdx < 0) return { skipped: '学历无法比较' };
  if (candIdx >= prefIdx) return { score: 100, note: `${candidate.education}，达到期望` };
  return { score: Math.max(0, 100 - (prefIdx - candIdx) * 35), note: `${candidate.education}，低于期望的${seeker.pref_education}` };
}

function dimIncome(seeker, candidate) {
  if (!seeker.pref_income) return null;
  if (!candidate.income) return { skipped: '对方收入未填' };
  const prefIdx = INCOME_ORDER.indexOf(seeker.pref_income);
  const candIdx = INCOME_ORDER.indexOf(candidate.income);
  if (candIdx < 0 || prefIdx < 0) return { skipped: '收入无法比较' };
  if (candIdx >= prefIdx) return { score: 100, note: `${candidate.income}，达到期望` };
  return { score: Math.max(0, 100 - (prefIdx - candIdx) * 35), note: `${candidate.income}，低于期望的${seeker.pref_income}` };
}

function dimDistrict(seeker, candidate) {
  if (!seeker.pref_district) return null;
  if (!candidate.district) return { skipped: '对方区域未填' };
  if (candidate.district.includes(seeker.pref_district) || seeker.pref_district.includes(candidate.district)) {
    return { score: 100, note: `${candidate.district}，符合期望区域` };
  }
  return { score: 40, note: `期望${seeker.pref_district}，对方在${candidate.district}` };
}

function dimMarital(seeker, candidate) {
  if (!seeker.pref_marital || seeker.pref_marital === '不限') return null;
  if (!candidate.marital) return { skipped: '对方婚况未填' };
  if (candidate.marital === seeker.pref_marital) return { score: 100, note: `${candidate.marital}，符合期望` };
  // 未婚要求 vs 离异：明显不符；其他算部分
  return { score: 15, note: `期望${seeker.pref_marital}，对方${candidate.marital}` };
}

const DIMENSIONS = [
  ['年龄', dimAge], ['身高', dimHeight], ['圈层', dimCircle],
  ['学历', dimEducation], ['收入', dimIncome], ['区域', dimDistrict], ['婚况', dimMarital],
];

// 单向：返回 { pct, evaluated, total_possible, details[], skipped[] }
function directionalScore(seeker, candidate) {
  const details = [], skipped = [];
  let sum = 0, count = 0;
  for (const [label, fn] of DIMENSIONS) {
    const r = fn(seeker, candidate);
    if (r === null) continue; // seeker 无此期望，不算
    if (r.skipped) { skipped.push({ label, reason: r.skipped }); continue; }
    sum += r.score;
    count++;
    details.push({ label, score: r.score, note: r.note });
  }
  return {
    pct: count > 0 ? Math.round(sum / count) : null, // null = 完全无可评估维度
    evaluated: count,
    details, skipped,
  };
}

// ── 硬性条件检查 ──
function hardConflicts(a, b) {
  const conflicts = [];
  // 带孩：a 不接受带孩 且 b 离异带孩
  if (a.accept_children === '不接受' && b.marital === '离异带孩') {
    conflicts.push(`${a.nickname}明确不接受带孩，而${b.nickname}离异带孩`);
  }
  if (b.accept_children === '不接受' && a.marital === '离异带孩') {
    conflicts.push(`${b.nickname}明确不接受带孩，而${a.nickname}离异带孩`);
  }
  // 同城：要求同城优先 且 对方在外地
  if (a.same_city_only?.startsWith('是') && b.district === '外地') {
    conflicts.push(`${a.nickname}要求同城，而${b.nickname}在外地`);
  }
  if (b.same_city_only?.startsWith('是') && a.district === '外地') {
    conflicts.push(`${b.nickname}要求同城，而${a.nickname}在外地`);
  }
  return conflicts;
}

// dealbreakers 文本红旗：无法结构化判断的，提示人工注意
function redFlags(a, b) {
  const flags = [];
  if (a.dealbreakers) flags.push({ who: a.nickname, text: a.dealbreakers, against: b.nickname });
  if (b.dealbreakers) flags.push({ who: b.nickname, text: b.dealbreakers, against: a.nickname });
  return flags;
}

// ── 共性维度 ──
function tagOverlap(a, b, field) {
  const ta = (a[field] || '').split(',').filter(Boolean);
  const tb = (b[field] || '').split(',').filter(Boolean);
  if (!ta.length || !tb.length) return null;
  const common = ta.filter(t => tb.includes(t));
  return { common, ratio: common.length / Math.min(ta.length, tb.length) };
}

function commonalityScore(a, b) {
  const items = [];
  let sum = 0, count = 0;

  // 标签交集（三类）
  for (const [field, label] of [['personality_tags', '性格'], ['lifestyle_tags', '生活方式'], ['value_tags', '价值观'], ['sport_tags', '运动偏好']]) {
    const o = tagOverlap(a, b, field);
    if (!o) continue;
    const score = Math.round(Math.min(o.ratio * 1.4, 1) * 100);
    sum += score; count++;
    items.push({
      label, score,
      note: o.common.length ? `共同点：${o.common.join('、')}` : '双方选择无重合',
    });
  }

  // 恋爱意向一致性
  if (a.intention && b.intention) {
    const ORDER = ['一年内结婚', '两年内结婚', '先认真恋爱', '慢慢了解'];
    const ia = ORDER.indexOf(a.intention), ib = ORDER.indexOf(b.intention);
    if (ia >= 0 && ib >= 0) {
      const gap = Math.abs(ia - ib);
      const score = gap === 0 ? 100 : gap === 1 ? 70 : gap === 2 ? 35 : 10;
      sum += score; count++;
      items.push({
        label: '恋爱节奏', score,
        note: gap === 0 ? `双方都是「${a.intention}」，节奏一致`
            : gap >= 2 ? `一方「${a.intention}」一方「${b.intention}」，节奏差异大，需提前沟通`
            : `「${a.intention}」与「${b.intention}」，节奏接近`,
      });
    }
  }

  // 家庭计划一致性
  if (a.family_plan && b.family_plan && a.family_plan !== '还没想好' && b.family_plan !== '还没想好') {
    const conflict = (a.family_plan === '希望要孩子' && b.family_plan === '不要孩子') ||
                     (b.family_plan === '希望要孩子' && a.family_plan === '不要孩子');
    const score = conflict ? 5 : a.family_plan === b.family_plan ? 100 : 70;
    sum += score; count++;
    items.push({
      label: '家庭计划', score,
      note: conflict ? `「${a.family_plan}」vs「${b.family_plan}」——重大分歧，务必提前确认` : `${a.family_plan} / ${b.family_plan}`,
    });
  }

  // 约会方式偏好（单选，相同加分）
  if (a.preferred_date && b.preferred_date) {
    const same = a.preferred_date === b.preferred_date;
    const score = same ? 100 : 50;
    sum += score; count++;
    items.push({
      label: '约会偏好', score,
      note: same ? `都喜欢「${a.preferred_date}」` : `「${a.preferred_date}」/「${b.preferred_date}」，可互相尝试`,
    });
  }

  // MBTI 契合（轻量参考：黄金互补 > 同类型 > 按相通维度数）
  if (a.mbti && b.mbti && /^[EI][NS][TF][JP]$/.test(a.mbti) && /^[EI][NS][TF][JP]$/.test(b.mbti)) {
    let score, note;
    if (MBTI_GOLDEN[a.mbti] === b.mbti) { score = 100; note = `${a.mbti} × ${b.mbti}，MBTI 黄金互补组合`; }
    else if (a.mbti === b.mbti) { score = 75; note = `同为 ${a.mbti}，相处默契`; }
    else {
      let shared = 0;
      for (let i = 0; i < 4; i++) if (a.mbti[i] === b.mbti[i]) shared++;
      score = 40 + shared * 10;
      note = `${a.mbti} × ${b.mbti}，${shared} 个性格维度相通`;
    }
    sum += score; count++;
    items.push({ label: 'MBTI 契合', score, note });
  }

  // 兴趣爱好关键词重合（自由文本，含包含关系的宽松匹配）
  const ia = splitTokens(a.interests), ib = splitTokens(b.interests);
  if (ia.length && ib.length) {
    const common = [...new Set(ia.filter(t => ib.some(u => u === t || u.includes(t) || t.includes(u))))];
    const score = common.length ? Math.min(100, 55 + common.length * 20) : 40;
    sum += score; count++;
    items.push({ label: '兴趣', score, note: common.length ? `共同兴趣：${common.join('、')}` : '兴趣无明显重合' });
  }

  // 异地接受度（仅当一方外地、一方本地，构成异地时才评估）
  const longDistance = (a.district === '外地') !== (b.district === '外地');
  if (longDistance && (a.accept_long_distance || b.accept_long_distance)) {
    const reject = a.accept_long_distance === '不接受' || b.accept_long_distance === '不接受';
    const cautious = a.accept_long_distance === '看情况' || b.accept_long_distance === '看情况';
    const score = reject ? 10 : cautious ? 55 : 100;
    sum += score; count++;
    items.push({
      label: '异地接受度', score,
      note: reject ? '两人异地，且一方明确不接受异地' : cautious ? '两人异地，一方态度「看情况」，需提前沟通' : '两人异地，但双方接受异地',
    });
  }

  return { pct: count > 0 ? Math.round(sum / count) : null, evaluated: count, items };
}

// 调和平均：惩罚单边匹配
function harmonic(x, y) {
  if (x === 0 || y === 0) return 0;
  return Math.round((2 * x * y) / (x + y));
}

function matchPair(seeker, candidate) {
  const aToB = directionalScore(seeker, candidate);   // seeker 的期望 vs candidate
  const bToA = directionalScore(candidate, seeker);   // candidate 的期望 vs seeker
  const common = commonalityScore(seeker, candidate);
  const conflicts = hardConflicts(seeker, candidate);
  const flags = redFlags(seeker, candidate);

  // 总分：双向调和平均 75% + 共性 25%（任一部分无数据则按可用部分计算）
  let final = null;
  const hasDirectional = aToB.pct !== null && bToA.pct !== null;
  const oneDirectional = aToB.pct !== null ? aToB.pct : bToA.pct;

  if (hasDirectional && common.pct !== null) {
    final = Math.round(harmonic(aToB.pct, bToA.pct) * 0.75 + common.pct * 0.25);
  } else if (hasDirectional) {
    final = harmonic(aToB.pct, bToA.pct);
  } else if (oneDirectional !== null && common.pct !== null) {
    final = Math.round(oneDirectional * 0.6 + common.pct * 0.4);
  } else if (oneDirectional !== null) {
    final = oneDirectional;
  } else if (common.pct !== null) {
    final = common.pct;
  }

  const totalDims = aToB.evaluated + bToA.evaluated + common.evaluated;

  // 贝叶斯收缩校准：评估维度越少，分数越向中性值(50)收缩
  // 防止"只有3个维度全中=100分"排在"11个维度93分"之前
  const K = 4; // 收缩强度：相当于 K 个值为50的虚拟维度
  let calibrated = final;
  if (final !== null && totalDims > 0) {
    calibrated = Math.round((final * totalDims + 50 * K) / (totalDims + K));
  }

  return {
    score: calibrated,
    raw_score: final,
    excluded: conflicts.length > 0,
    conflicts,
    red_flags: flags,
    a_to_b: aToB,
    b_to_a: bToA,
    commonality: common,
    coverage: totalDims,
    mbti: { a: seeker.mbti || null, b: candidate.mbti || null }, // 仅展示参考
  };
}

// GET /api/matching/:guestId
router.get('/:guestId', (req, res) => {
  const seeker = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(req.params.guestId);
  if (!seeker) return res.status(404).json({ error: '嘉宾不存在' });

  const oppositeGender = seeker.gender === '男' ? '女' : '男';
  const candidates = db.prepare(
    "SELECT * FROM guests WHERE deleted = 0 AND gender = ? AND audit_status = '通过' AND blacklisted = 0 AND id != ?"
  ).all(oppositeGender, seeker.id);

  const all = candidates.map(c => ({ guest: c, ...matchPair(seeker, c) }));

  const results = all.filter(r => !r.excluded && r.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  const excluded = all.filter(r => r.excluded);
  const unscorable = all.filter(r => !r.excluded && r.score === null);

  res.json({
    seeker,
    results, excluded,
    unscorable: unscorable.map(r => ({ guest: r.guest })),
    note: '评分为双向匹配：同时衡量「对方符合Ta的期望」与「Ta符合对方的期望」，信息不全的维度不计分；总分已按信息覆盖度校准（资料越全分数越可信）。',
  });
});

module.exports = router;
module.exports.matchPair = matchPair;
