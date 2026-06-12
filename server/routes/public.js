const router = require('express').Router();
const db = require('../db');

// IP 限流：每个 IP 每小时最多提交 10 次（防脚本刷库）
const ipHits = new Map();
const WINDOW_MS = 60 * 60 * 1000, MAX_PER_WINDOW = 10;
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of ipHits) if (now - rec.start > WINDOW_MS) ipHits.delete(ip);
}, 10 * 60 * 1000);

// 公开报名接口，无需登录，提交后状态为「待审」
router.post('/submit', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  const rec = ipHits.get(ip);
  if (rec && Date.now() - rec.start < WINDOW_MS) {
    if (rec.count >= MAX_PER_WINDOW) {
      return res.status(429).json({ error: '提交过于频繁，请稍后再试' });
    }
    rec.count++;
  } else {
    ipHits.set(ip, { start: Date.now(), count: 1 });
  }

  const b = req.body;

  // 字段长度上限，防止超长内容塞库
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'string' && v.length > 2000) {
      return res.status(400).json({ error: `字段 ${k} 内容过长` });
    }
  }

  if (!b.nickname || !b.gender || !b.contact) {
    return res.status(400).json({ error: '昵称、性别和联系方式必填' });
  }
  if (!b.single_promise) {
    return res.status(400).json({ error: '请勾选单身承诺' });
  }
  if (!b.agree_disclaimer) {
    return res.status(400).json({ error: '请阅读并同意活动免责协议' });
  }

  // 防止重复提交：同一联系方式 24h 内只能提交一次
  const recent = db.prepare(`
    SELECT id FROM guests
    WHERE contact = ? AND deleted = 0
    AND created_at >= datetime('now', '-1 day', 'localtime')
  `).get(b.contact);
  if (recent) {
    return res.status(400).json({ error: '您已提交过报名，请耐心等待审核，勿重复提交' });
  }

  const cols = [
    'nickname', 'real_name', 'gender', 'birth_year', 'district', 'hometown',
    'occupation', 'circle', 'education', 'marital', 'height', 'body_type',
    'income', 'housing', 'car', 'contact', 'phone',
    'self_intro', 'one_liner', 'interests',
    'pref_age_min', 'pref_age_max', 'pref_height_min', 'pref_height_max',
    'pref_education', 'pref_income', 'pref_circle', 'pref_district', 'pref_marital',
    'accept_long_distance', 'accept_children', 'preferences',
    'single_promise', 'display_consent',
    'id_last4', 'credentials', 'agree_disclaimer', 'portrait_consent',
    'source_channel', 'interested_events', 'birth_date', 'birth_time', 'birth_place',
    'work_type', 'school', 'mbti', 'intention', 'relationship_value', 'lifestyle_desc',
    'family_plan', 'preferred_date', 'dealbreakers', 'personality_tags', 'sport_tags',
    'lifestyle_tags', 'value_tags', 'qa_answers', 'same_city_only',
  ];

  // 从完整生日自动推出出生年份
  if (b.birth_date && !b.birth_year) b.birth_year = parseInt(b.birth_date.slice(0, 4));

  const boolCols = ['single_promise', 'display_consent', 'agree_disclaimer', 'portrait_consent'];
  const values = cols.map(c => {
    if (boolCols.includes(c)) return b[c] ? 1 : 0;
    return b[c] || null;
  });

  const result = db.prepare(`
    INSERT INTO guests (${cols.join(',')}, audit_status)
    VALUES (${cols.map(() => '?').join(',')}, '待审')
  `).run(...values);

  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

module.exports = router;
