const router = require('express').Router();
const db = require('../db');
const { matchPair } = require('./matching');

// List events
router.get('/', (req, res) => {
  const { status, circle_type } = req.query;
  let sql = 'SELECT * FROM events WHERE deleted = 0';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (circle_type) { sql += ' AND circle_type = ?'; params.push(circle_type); }
  sql += ' ORDER BY date_time DESC';
  res.json(db.prepare(sql).all(...params));
});

// Get single event with stats
router.get('/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!event) return res.status(404).json({ error: '活动不存在' });

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN r.audit_status='通过' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN r.audit_status='通过' AND g.gender='男' THEN 1 ELSE 0 END) as approved_male,
      SUM(CASE WHEN r.audit_status='通过' AND g.gender='女' THEN 1 ELSE 0 END) as approved_female,
      SUM(CASE WHEN r.attended=1 THEN 1 ELSE 0 END) as attended,
      SUM(CASE WHEN r.attended=1 AND g.gender='男' THEN 1 ELSE 0 END) as attended_male,
      SUM(CASE WHEN r.attended=1 AND g.gender='女' THEN 1 ELSE 0 END) as attended_female,
      SUM(CASE WHEN r.audit_status='待审' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN r.paid=1 AND r.audit_status='通过' AND g.gender='男' THEN 1 ELSE 0 END) as paid_male,
      SUM(CASE WHEN r.paid=1 AND r.audit_status='通过' AND g.gender='女' THEN 1 ELSE 0 END) as paid_female,
      SUM(CASE WHEN r.matched_with IS NOT NULL THEN 1 ELSE 0 END) as matched_marked
    FROM registrations r JOIN guests g ON r.guest_id = g.id
    WHERE r.event_id = ?
  `).get(req.params.id);

  const registrations = db.prepare(`
    SELECT r.*, g.nickname, g.gender, g.circle, g.occupation, g.audit_status as guest_audit_status,
           g.blacklisted
    FROM registrations r JOIN guests g ON r.guest_id = g.id
    WHERE r.event_id = ? ORDER BY r.sign_up_at DESC
  `).all(req.params.id);

  res.json({ ...event, stats, registrations });
});

// 智能荐人：从嘉宾库为活动推荐人选
// 排序逻辑：与已通过的异性报名者的平均双向匹配分 > 圈层契合 > 资料完整度
router.get('/:id/recommend', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!event) return res.status(404).json({ error: '活动不存在' });

  const gender = req.query.gender; // 可选：只推荐某性别
  const registeredIds = db.prepare('SELECT guest_id FROM registrations WHERE event_id = ?')
    .all(event.id).map(r => r.guest_id);

  let sql = "SELECT * FROM guests WHERE deleted = 0 AND audit_status = '通过' AND blacklisted = 0";
  const params = [];
  if (gender) { sql += ' AND gender = ?'; params.push(gender); }
  if (registeredIds.length) sql += ` AND id NOT IN (${registeredIds.map(() => '?').join(',')})`;
  const candidates = db.prepare(sql).all(...params, ...registeredIds);

  // 已通过报名者（按性别分组，用于互配评分）
  const approved = db.prepare(`
    SELECT g.* FROM registrations r JOIN guests g ON r.guest_id = g.id
    WHERE r.event_id = ? AND r.audit_status = '通过'
  `).all(event.id);

  const PROFILE_FIELDS = ['birth_year','height','circle','education','income','district',
    'pref_age_min','lifestyle_tags','value_tags','intention','self_intro'];

  const results = candidates.map(c => {
    const opposite = approved.filter(a => a.gender !== c.gender);
    let avgScore = null, basis = 'profile';
    if (opposite.length > 0) {
      const scores = opposite.map(o => matchPair(c, o))
        .filter(m => !m.excluded && m.score !== null)
        .map(m => m.score);
      if (scores.length > 0) {
        avgScore = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);
        basis = 'match';
      }
    }
    const completeness = PROFILE_FIELDS.filter(f => c[f]).length / PROFILE_FIELDS.length;
    const circleMatch = !!(event.circle_type && c.circle &&
      (c.circle.includes(event.circle_type) || event.circle_type.includes(c.circle)));
    // 排序键：匹配分优先，无匹配分时按资料完整度折算
    const sortKey = (avgScore ?? Math.round(completeness * 60)) + (circleMatch ? 15 : 0);
    return { guest: c, avg_match: avgScore, basis, circle_match: circleMatch,
      completeness: Math.round(completeness * 100), sort_key: sortKey };
  }).sort((a, b) => b.sort_key - a.sort_key);

  res.json({
    event: { id: event.id, title: event.title, circle_type: event.circle_type },
    has_approved_opposite: approved.length > 0,
    results: results.slice(0, 50),
  });
});

// Create event
router.post('/', (req, res) => {
  const { title, circle_type, date_time, location, quota_male, quota_female, price_male, price_female, status, notes } = req.body;
  if (!title) return res.status(400).json({ error: '活动名称必填' });

  const result = db.prepare(`
    INSERT INTO events (title, circle_type, date_time, location, quota_male, quota_female, price_male, price_female, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, circle_type || null, date_time || null, location || null,
    quota_male || 0, quota_female || 0, price_male || 0, price_female || 0,
    status || '筹备', notes || null);

  res.status(201).json(db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid));
});

// Update event
router.put('/:id', (req, res) => {
  const event = db.prepare('SELECT id FROM events WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!event) return res.status(404).json({ error: '活动不存在' });

  const fields = ['title','circle_type','date_time','location','quota_male','quota_female','price_male','price_female','status','notes'];
  const updates = [], values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (updates.length === 0) return res.status(400).json({ error: '无更新内容' });
  values.push(req.params.id);
  db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id));
});

// Soft delete
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE events SET deleted = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
