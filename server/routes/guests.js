const router = require('express').Router();
const db = require('../db');

// List guests with filters
router.get('/', (req, res) => {
  const { gender, circle, audit_status, marital, district, keyword, blacklisted } = req.query;
  let sql = `SELECT g.*, e.title AS apply_event_title FROM guests g
    LEFT JOIN events e ON g.apply_event_id = e.id WHERE g.deleted = 0`;
  const params = [];

  if (gender) { sql += ' AND gender = ?'; params.push(gender); }
  if (circle) { sql += ' AND circle = ?'; params.push(circle); }
  if (audit_status) { sql += ' AND audit_status = ?'; params.push(audit_status); }
  if (marital) { sql += ' AND marital = ?'; params.push(marital); }
  if (district) { sql += ' AND district LIKE ?'; params.push(`%${district}%`); }
  if (blacklisted !== undefined) { sql += ' AND blacklisted = ?'; params.push(blacklisted === 'true' ? 1 : 0); }
  if (keyword) {
    // 全字段模糊搜索：昵称/姓名/职业/圈层/区域/籍贯/学校/标签/兴趣/介绍/备注/联系方式
    const searchFields = ['nickname', 'real_name', 'occupation', 'circle', 'district', 'hometown',
      'school', 'admin_tags', 'interests', 'one_liner', 'self_intro', 'notes',
      'contact', 'phone', 'education', 'work_type', 'personality_tags', 'lifestyle_tags', 'value_tags'];
    sql += ` AND (${searchFields.map(f => `g.${f} LIKE ?`).join(' OR ')})`;
    searchFields.forEach(() => params.push(`%${keyword}%`));
  }
  sql += ' ORDER BY g.created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// Get single guest
router.get('/:id', (req, res) => {
  const guest = db.prepare(`
    SELECT g.*, e.title AS apply_event_title FROM guests g
    LEFT JOIN events e ON g.apply_event_id = e.id
    WHERE g.id = ? AND g.deleted = 0
  `).get(req.params.id);
  if (!guest) return res.status(404).json({ error: '嘉宾不存在' });

  // Get participation history
  const history = db.prepare(`
    SELECT r.*, e.title, e.date_time, e.circle_type
    FROM registrations r JOIN events e ON r.event_id = e.id
    WHERE r.guest_id = ? ORDER BY r.sign_up_at DESC
  `).all(req.params.id);

  res.json({ ...guest, history });
});

// Create guest
router.post('/', (req, res) => {
  const {
    nickname, real_name, gender, birth_year, district, occupation, circle,
    education, marital, height, contact, audit_status, audit_flags, preferences, notes,
    self_intro, interests, income,
    pref_age_min, pref_age_max, pref_height_min, pref_height_max,
    pref_education, pref_income, pref_circle, pref_district, pref_marital,
  } = req.body;

  if (!nickname || !gender) return res.status(400).json({ error: '昵称和性别必填' });

  const result = db.prepare(`
    INSERT INTO guests (nickname, real_name, gender, birth_year, district, occupation, circle,
      education, marital, height, contact, audit_status, audit_flags, preferences, notes,
      self_intro, interests, income,
      pref_age_min, pref_age_max, pref_height_min, pref_height_max,
      pref_education, pref_income, pref_circle, pref_district, pref_marital)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nickname, real_name || null, gender, birth_year || null, district || null,
    occupation || null, circle || null, education || null, marital || null,
    height || null, contact || null, audit_status || '待审',
    JSON.stringify(audit_flags || {}), preferences || null, notes || null,
    self_intro || null, interests || null, income || null,
    pref_age_min || null, pref_age_max || null, pref_height_min || null, pref_height_max || null,
    pref_education || null, pref_income || null, pref_circle || null, pref_district || null, pref_marital || null,
  );

  const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(guest);
});

// Update guest
router.put('/:id', (req, res) => {
  const guest = db.prepare('SELECT id FROM guests WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!guest) return res.status(404).json({ error: '嘉宾不存在' });

  const fields = ['nickname','real_name','gender','birth_year','district','occupation','circle',
    'education','marital','height','contact','audit_status','audit_flags','preferences','notes',
    'self_intro','interests','income',
    'pref_age_min','pref_age_max','pref_height_min','pref_height_max',
    'pref_education','pref_income','pref_circle','pref_district','pref_marital',
    'phone','hometown','body_type','housing','car','one_liner',
    'accept_long_distance','accept_children','single_promise','display_consent',
    'id_last4','credentials','agree_disclaimer','portrait_consent',
    'source_channel','interested_events','birth_date','birth_time','birth_place',
    'work_type','school','mbti','intention','relationship_value','lifestyle_desc',
    'family_plan','preferred_date','dealbreakers','personality_tags','sport_tags',
    'lifestyle_tags','value_tags','qa_answers','same_city_only','admin_tags',
    'photos','blacklisted','blacklist_reason'];

  const { sanitizePhotos } = require('../upload');
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      if (f === 'audit_flags') values.push(JSON.stringify(req.body[f]));
      else if (f === 'photos') values.push(sanitizePhotos(req.body[f]));
      else values.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: '无更新内容' });

  values.push(req.params.id);
  db.prepare(`UPDATE guests SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id));
});

// 审核动作（闭环）：通过入库 / 待补 / 拒绝，记录原因和时间
router.post('/:id/audit', (req, res) => {
  const guest = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!guest) return res.status(404).json({ error: '嘉宾不存在' });

  const { decision, reason, audit_flags } = req.body;
  if (!['通过', '拒绝', '待补', '待审'].includes(decision)) {
    return res.status(400).json({ error: '无效的审核决定' });
  }
  if ((decision === '拒绝' || decision === '待补') && !reason) {
    return res.status(400).json({ error: decision === '拒绝' ? '拒绝必须填写原因' : '待补必须注明缺什么材料' });
  }

  const updates = ['audit_status = ?', "audited_at = datetime('now','localtime')", 'audit_reason = ?'];
  const values = [decision, reason || null];
  if (audit_flags !== undefined) {
    updates.push('audit_flags = ?');
    values.push(JSON.stringify(audit_flags));
  }
  values.push(req.params.id);
  db.prepare(`UPDATE guests SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  // 扫码报名的嘉宾审核通过后，自动加入来源活动的报名名单（报名仍走活动内审核）
  let autoRegistered = null;
  if (decision === '通过' && guest.apply_event_id && !guest.blacklisted) {
    const ev = db.prepare('SELECT * FROM events WHERE id = ? AND deleted = 0').get(guest.apply_event_id);
    const exists = db.prepare('SELECT id FROM registrations WHERE event_id = ? AND guest_id = ?')
      .get(guest.apply_event_id, guest.id);
    if (ev && !exists) {
      db.prepare('INSERT INTO registrations (event_id, guest_id, source) VALUES (?, ?, ?)')
        .run(ev.id, guest.id, '扫码报名');
      autoRegistered = ev.title;
    }
  }

  res.json({ ...db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id), autoRegistered });
});

// 待审计数（侧边栏角标用）
router.get('/stats/pending', (req, res) => {
  const pending = db.prepare("SELECT COUNT(*) c FROM guests WHERE deleted = 0 AND audit_status = '待审'").get().c;
  const supplement = db.prepare("SELECT COUNT(*) c FROM guests WHERE deleted = 0 AND audit_status = '待补'").get().c;
  res.json({ pending, supplement });
});

// Soft delete
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE guests SET deleted = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
