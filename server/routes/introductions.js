const router = require('express').Router();
const db = require('../db');

const STATUSES = ['已牵线', '已交换微信', '已约见', '交往中', '已成功', '已告吹'];

// 列表查询（带双方昵称/性别、活动名）
const LIST_SQL = `
  SELECT i.*,
    ga.nickname AS a_nickname, ga.gender AS a_gender,
    gb.nickname AS b_nickname, gb.gender AS b_gender,
    e.title AS event_title
  FROM introductions i
  JOIN guests ga ON i.guest_a = ga.id
  JOIN guests gb ON i.guest_b = gb.id
  LEFT JOIN events e ON i.event_id = e.id
`;

// GET /api/introductions?status=&guest_id=&keyword=
router.get('/', (req, res) => {
  const { status, guest_id, keyword } = req.query;
  let sql = LIST_SQL + ' WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND i.status = ?'; params.push(status); }
  if (guest_id) { sql += ' AND (i.guest_a = ? OR i.guest_b = ?)'; params.push(guest_id, guest_id); }
  if (keyword) { sql += ' AND (ga.nickname LIKE ? OR gb.nickname LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  sql += ' ORDER BY i.updated_at DESC, i.id DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/introductions/stats/funnel —— 转化漏斗（按状态计数）
router.get('/stats/funnel', (req, res) => {
  const rows = db.prepare('SELECT status, COUNT(*) AS n FROM introductions GROUP BY status').all();
  const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
  for (const r of rows) counts[r.status] = r.n;
  const total = STATUSES.reduce((s, k) => s + counts[k], 0);
  const success = counts['已成功'];
  res.json({
    counts, total, success,
    success_rate: total > 0 ? Math.round((success / total) * 100) : 0,
  });
});

// GET /api/introductions/:id —— 详情（含双方资料与跟进时间线）
router.get('/:id', (req, res) => {
  const intro = db.prepare(LIST_SQL + ' WHERE i.id = ?').get(req.params.id);
  if (!intro) return res.status(404).json({ error: '牵线记录不存在' });
  intro.follow_ups = db.prepare(
    "SELECT * FROM follow_ups WHERE target_type = 'intro' AND target_id = ? ORDER BY created_at DESC"
  ).all(intro.id);
  res.json(intro);
});

// POST /api/introductions —— 新建牵线
router.post('/', (req, res) => {
  const { guest_a, guest_b, event_id, match_score, notes } = req.body;
  if (!guest_a || !guest_b) return res.status(400).json({ error: '请选择两位嘉宾' });
  if (Number(guest_a) === Number(guest_b)) return res.status(400).json({ error: '不能给同一个人牵线' });

  const ga = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(guest_a);
  const gb = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(guest_b);
  if (!ga || !gb) return res.status(404).json({ error: '嘉宾不存在' });
  if (ga.blacklisted || gb.blacklisted) {
    return res.status(400).json({ error: `⚠️ ${(ga.blacklisted ? ga.nickname : gb.nickname)} 在黑名单中，不能牵线` });
  }

  // 防重复：同一对未结束的牵线只保留一条
  const dup = db.prepare(`
    SELECT id, status FROM introductions
    WHERE ((guest_a = ? AND guest_b = ?) OR (guest_a = ? AND guest_b = ?))
      AND status NOT IN ('已成功','已告吹')
  `).get(guest_a, guest_b, guest_b, guest_a);
  if (dup) return res.status(409).json({ error: `这两位已有进行中的牵线（${dup.status}）`, id: dup.id });

  const info = db.prepare(`
    INSERT INTO introductions (guest_a, guest_b, event_id, match_score, introduced_by, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guest_a, guest_b, event_id || null, match_score ?? null, req.admin?.username || null, notes || null);

  res.status(201).json({ id: info.lastInsertRowid, a_nickname: ga.nickname, b_nickname: gb.nickname });
});

// PUT /api/introductions/:id —— 更新状态/备注/活动
router.put('/:id', (req, res) => {
  const intro = db.prepare('SELECT * FROM introductions WHERE id = ?').get(req.params.id);
  if (!intro) return res.status(404).json({ error: '牵线记录不存在' });

  if (req.body.status && !STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: '无效的状态' });
  }

  const fields = ['status', 'notes', 'event_id', 'match_score'];
  const updates = [], values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (updates.length === 0) return res.status(400).json({ error: '无更新内容' });
  updates.push("updated_at = datetime('now','localtime')");
  values.push(req.params.id);
  db.prepare(`UPDATE introductions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare(LIST_SQL + ' WHERE i.id = ?').get(req.params.id));
});

// DELETE /api/introductions/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM introductions WHERE id = ?').run(req.params.id);
  db.prepare("DELETE FROM follow_ups WHERE target_type = 'intro' AND target_id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
module.exports.STATUSES = STATUSES;
