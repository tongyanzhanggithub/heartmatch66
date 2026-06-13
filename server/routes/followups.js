const router = require('express').Router();
const db = require('../db');

// GET /api/followups?target_type=guest|intro&target_id=  —— 某对象的跟进时间线
router.get('/', (req, res) => {
  const { target_type, target_id } = req.query;
  if (!['guest', 'intro'].includes(target_type) || !target_id) {
    return res.status(400).json({ error: '参数错误' });
  }
  const rows = db.prepare(
    'SELECT * FROM follow_ups WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC'
  ).all(target_type, target_id);
  res.json(rows);
});

// GET /api/followups/pending —— 今日及逾期待跟进（仪表盘提醒用）
router.get('/pending', (req, res) => {
  const rows = db.prepare(`
    SELECT f.*,
      g.nickname  AS guest_nickname,
      ia.nickname AS intro_a, ib.nickname AS intro_b
    FROM follow_ups f
    LEFT JOIN guests g          ON f.target_type = 'guest' AND f.target_id = g.id
    LEFT JOIN introductions i   ON f.target_type = 'intro' AND f.target_id = i.id
    LEFT JOIN guests ia         ON i.guest_a = ia.id
    LEFT JOIN guests ib         ON i.guest_b = ib.id
    WHERE f.done = 0 AND f.next_date IS NOT NULL
      AND date(f.next_date) <= date('now','localtime')
    ORDER BY f.next_date ASC
  `).all();
  res.json(rows);
});

// POST /api/followups —— 新增一条跟进
router.post('/', (req, res) => {
  const { target_type, target_id, content, next_date } = req.body;
  if (!['guest', 'intro'].includes(target_type) || !target_id) {
    return res.status(400).json({ error: '跟进对象无效' });
  }
  if (!content || !content.trim()) return res.status(400).json({ error: '请填写跟进内容' });

  const info = db.prepare(`
    INSERT INTO follow_ups (target_type, target_id, content, next_date, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(target_type, target_id, content.trim(), next_date || null, req.admin?.username || null);
  res.status(201).json(db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/followups/:id —— 标记完成 / 改下次日期 / 改内容
router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM follow_ups WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '跟进记录不存在' });

  const fields = ['content', 'next_date', 'done'];
  const updates = [], values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(f === 'done' ? (req.body[f] ? 1 : 0) : req.body[f]); }
  }
  if (updates.length === 0) return res.status(400).json({ error: '无更新内容' });
  values.push(req.params.id);
  db.prepare(`UPDATE follow_ups SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(req.params.id));
});

// DELETE /api/followups/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM follow_ups WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
