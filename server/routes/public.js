const router = require('express').Router();
const db = require('../db');
const { photoUpload, sanitizePhotos } = require('../upload');

// IP 限流：每个 IP 每小时最多提交 10 次（防脚本刷库）；照片上传单独计数，最多 30 张/时
const ipHits = new Map();
const WINDOW_MS = 60 * 60 * 1000, MAX_PER_WINDOW = 10;
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of ipHits) if (now - rec.start > WINDOW_MS) ipHits.delete(ip);
}, 10 * 60 * 1000);

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

function rateLimit(key, max) {
  const rec = ipHits.get(key);
  if (rec && Date.now() - rec.start < WINDOW_MS) {
    if (rec.count >= max) return false;
    rec.count++;
  } else {
    ipHits.set(key, { start: Date.now(), count: 1 });
  }
  return true;
}

// 报名页照片上传（无需登录），返回文件名供提交时回传
router.post('/photo', (req, res) => {
  if (!rateLimit(`photo:${clientIp(req)}`, 30)) {
    return res.status(429).json({ error: '上传过于频繁，请稍后再试' });
  }
  photoUpload.single('photo')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message || '上传失败' });
    if (!req.file) return res.status(400).json({ error: '未收到图片文件' });
    res.json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` });
  });
});

// 活动公开信息（扫码报名页展示用），只暴露非敏感字段
router.get('/event/:id', (req, res) => {
  const e = db.prepare(`
    SELECT id, title, circle_type, date_time, location, status, price_male, price_female
    FROM events WHERE id = ? AND deleted = 0
  `).get(req.params.id);
  if (!e) return res.status(404).json({ error: '活动不存在' });
  res.json({ ...e, open: e.status === '报名中' });
});

// 公开报名接口，无需登录，提交后状态为「待审」
router.post('/submit', (req, res) => {
  if (!rateLimit(clientIp(req), MAX_PER_WINDOW)) {
    return res.status(429).json({ error: '提交过于频繁，请稍后再试' });
  }

  const b = req.body;
  // 照片只接受本系统上传生成的文件名，最多 3 张
  b.photos = sanitizePhotos(b.photos) || null;

  // 扫码报名：仅记录真实存在且「报名中」的活动，无效则忽略不阻断报名
  const applyEventId = parseInt(b.apply_event_id, 10);
  b.apply_event_id = null;
  if (Number.isInteger(applyEventId) && applyEventId > 0) {
    const ev = db.prepare("SELECT id FROM events WHERE id = ? AND deleted = 0 AND status = '报名中'")
      .get(applyEventId);
    if (ev) b.apply_event_id = ev.id;
  }

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
    'lifestyle_tags', 'value_tags', 'qa_answers', 'same_city_only', 'photos', 'apply_event_id',
  ];

  // 从完整生日自动推出出生年份（仅当能解析出 4 位年份时，避免把 NaN 塞进 INTEGER 列）
  if (b.birth_date && !b.birth_year) {
    const yr = String(b.birth_date).match(/^(\d{4})/);
    b.birth_year = yr ? parseInt(yr[1]) : null;
  }

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
