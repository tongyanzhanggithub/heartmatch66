const router = require('express').Router();
const db = require('../db');

// Add registration (can pass guest_id or create from list)
router.post('/', (req, res) => {
  const { event_id, guest_id, source, notes } = req.body;
  if (!event_id || !guest_id) return res.status(400).json({ error: '活动和嘉宾必填' });

  const event = db.prepare('SELECT * FROM events WHERE id = ? AND deleted = 0').get(event_id);
  if (!event) return res.status(404).json({ error: '活动不存在' });

  const guest = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(guest_id);
  if (!guest) return res.status(404).json({ error: '嘉宾不存在' });

  if (guest.blacklisted) return res.status(400).json({ error: '⚠️ 该嘉宾在黑名单中：' + (guest.blacklist_reason || '') });

  // Check quota
  const approved = db.prepare(`
    SELECT COUNT(*) as cnt FROM registrations r JOIN guests g ON r.guest_id = g.id
    WHERE r.event_id = ? AND r.audit_status = '通过' AND g.gender = ?
  `).get(event_id, guest.gender);
  const quota = guest.gender === '男' ? event.quota_male : event.quota_female;
  if (quota > 0 && approved.cnt >= quota) {
    return res.status(400).json({ error: `${guest.gender}生名额已满 (${quota}人)` });
  }

  try {
    const result = db.prepare(`
      INSERT INTO registrations (event_id, guest_id, source, notes)
      VALUES (?, ?, ?, ?)
    `).run(event_id, guest_id, source || null, notes || null);
    res.status(201).json(db.prepare('SELECT * FROM registrations WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '该嘉宾已报名此活动' });
    throw e;
  }
});

// Update registration (audit, paid, attended, matched_with)
router.put('/:id', (req, res) => {
  const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
  if (!reg) return res.status(404).json({ error: '报名记录不存在' });

  const fields = ['audit_status','paid','attended','matched_with','source','notes'];
  const updates = [], values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (updates.length === 0) return res.status(400).json({ error: '无更新内容' });

  // If approving, check quota
  if (req.body.audit_status === '通过' && reg.audit_status !== '通过') {
    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(reg.guest_id);
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(reg.event_id);
    const approved = db.prepare(`
      SELECT COUNT(*) as cnt FROM registrations r JOIN guests g ON r.guest_id = g.id
      WHERE r.event_id = ? AND r.audit_status = '通过' AND g.gender = ? AND r.id != ?
    `).get(reg.event_id, guest.gender, reg.id);
    const quota = guest.gender === '男' ? event.quota_male : event.quota_female;
    if (quota > 0 && approved.cnt >= quota) {
      return res.status(400).json({ error: `${guest.gender}生名额已满，无法审核通过` });
    }
  }

  values.push(req.params.id);
  db.prepare(`UPDATE registrations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id));
});

// Delete registration
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// 批量添加报名（智能荐人用）
router.post('/batch', (req, res) => {
  const { event_id, guest_ids } = req.body;
  if (!event_id || !Array.isArray(guest_ids)) return res.status(400).json({ error: '参数错误' });

  const event = db.prepare('SELECT * FROM events WHERE id = ? AND deleted = 0').get(event_id);
  if (!event) return res.status(404).json({ error: '活动不存在' });

  const results = { added: 0, skipped: [] };
  for (const gid of guest_ids) {
    const guest = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(gid);
    if (!guest) { results.skipped.push({ id: gid, reason: '嘉宾不存在' }); continue; }
    if (guest.blacklisted) { results.skipped.push({ id: gid, reason: `${guest.nickname}在黑名单` }); continue; }
    const exists = db.prepare('SELECT id FROM registrations WHERE event_id = ? AND guest_id = ?').get(event_id, gid);
    if (exists) { results.skipped.push({ id: gid, reason: `${guest.nickname}已报名` }); continue; }
    db.prepare('INSERT INTO registrations (event_id, guest_id, source) VALUES (?, ?, ?)')
      .run(event_id, gid, '红娘推荐');
    results.added++;
  }
  res.json(results);
});

// Batch sign-in: update multiple attended at once
router.post('/batch-attend', (req, res) => {
  const { ids, attended } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be array' });
  const stmt = db.prepare('UPDATE registrations SET attended = ? WHERE id = ?');
  const update = db.transaction(() => ids.forEach(id => stmt.run(attended ? 1 : 0, id)));
  update();
  res.json({ ok: true, count: ids.length });
});

module.exports = router;
