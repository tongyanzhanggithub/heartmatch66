const router = require('express').Router();
const db = require('../db');

// 列表查询（带牵线与双方昵称）
const LIST_SQL = `
  SELECT c.*,
    ga.nickname AS a_nickname, ga.gender AS a_gender,
    gb.nickname AS b_nickname, gb.gender AS b_gender
  FROM success_cases c
  LEFT JOIN introductions i ON c.introduction_id = i.id
  LEFT JOIN guests ga ON i.guest_a = ga.id
  LEFT JOIN guests gb ON i.guest_b = gb.id
`;

// GET /api/cases?public=1  —— 成功案例列表
router.get('/', (req, res) => {
  let sql = LIST_SQL;
  const params = [];
  if (req.query.public === '1') { sql += ' WHERE c.is_public = 1'; }
  sql += ' ORDER BY COALESCE(c.happened_at, c.created_at) DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/cases/candidates —— 已成功但还没沉淀成案例的牵线
router.get('/candidates', (req, res) => {
  const rows = db.prepare(`
    SELECT i.id, i.updated_at, ga.nickname AS a_nickname, gb.nickname AS b_nickname
    FROM introductions i
    JOIN guests ga ON i.guest_a = ga.id
    JOIN guests gb ON i.guest_b = gb.id
    WHERE i.status = '已成功'
      AND NOT EXISTS (SELECT 1 FROM success_cases c WHERE c.introduction_id = i.id)
    ORDER BY i.updated_at DESC
  `).all();
  res.json(rows);
});

// POST /api/cases
router.post('/', (req, res) => {
  const { introduction_id, title, story, is_public, happened_at } = req.body;
  if (!story || !story.trim()) return res.status(400).json({ error: '请填写案例内容' });
  const info = db.prepare(`
    INSERT INTO success_cases (introduction_id, title, story, is_public, happened_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(introduction_id || null, title || null, story.trim(), is_public ? 1 : 0, happened_at || null);
  res.status(201).json(db.prepare(LIST_SQL + ' WHERE c.id = ?').get(info.lastInsertRowid));
});

// PUT /api/cases/:id
router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM success_cases WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '案例不存在' });
  const fields = ['title', 'story', 'is_public', 'happened_at', 'introduction_id'];
  const updates = [], values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(f === 'is_public' ? (req.body[f] ? 1 : 0) : req.body[f]); }
  }
  if (updates.length === 0) return res.status(400).json({ error: '无更新内容' });
  values.push(req.params.id);
  db.prepare(`UPDATE success_cases SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare(LIST_SQL + ' WHERE c.id = ?').get(req.params.id));
});

// DELETE /api/cases/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM success_cases WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
