const router = require('express').Router();
const db = require('../db');

// 会员状态：无到期日 = 长期有效；否则按今天判断
const STATUS_SQL = `CASE
  WHEN m.expire_date IS NULL OR m.expire_date = '' THEN '有效'
  WHEN date(m.expire_date) >= date('now','localtime') THEN '有效'
  ELSE '已到期'
END AS status`;

// 会员列表（含嘉宾信息与累计缴费）
router.get('/', (req, res) => {
  const { keyword, status } = req.query;
  let sql = `
    SELECT m.*, g.nickname, g.gender, g.contact, g.phone, g.occupation, g.circle,
      IFNULL((SELECT SUM(amount) FROM member_payments p WHERE p.member_id = m.id), 0) AS total_paid,
      ${STATUS_SQL}
    FROM members m JOIN guests g ON m.guest_id = g.id
    WHERE g.deleted = 0`;
  const params = [];
  if (keyword) {
    sql += ' AND (g.nickname LIKE ? OR g.contact LIKE ? OR g.phone LIKE ? OR m.level LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  let rows = db.prepare(sql + ' ORDER BY m.created_at DESC').all(...params);
  if (status) rows = rows.filter(r => r.status === status);
  res.json(rows);
});

// 单个会员详情 + 缴费记录
router.get('/:id', (req, res) => {
  const member = db.prepare(`
    SELECT m.*, g.nickname, g.gender, ${STATUS_SQL}
    FROM members m JOIN guests g ON m.guest_id = g.id WHERE m.id = ?
  `).get(req.params.id);
  if (!member) return res.status(404).json({ error: '会员不存在' });
  member.payments = db.prepare('SELECT * FROM member_payments WHERE member_id = ? ORDER BY paid_at DESC').all(member.id);
  res.json(member);
});

// 添加会员（可同时录入首笔缴费）
router.post('/', (req, res) => {
  const { guest_id, level, fee, start_date, expire_date, notes, fee_note } = req.body;
  if (!guest_id) return res.status(400).json({ error: '请选择嘉宾' });

  const guest = db.prepare('SELECT * FROM guests WHERE id = ? AND deleted = 0').get(guest_id);
  if (!guest) return res.status(404).json({ error: '嘉宾不存在' });
  if (guest.blacklisted) return res.status(400).json({ error: `⚠️ 该嘉宾在黑名单中：${guest.blacklist_reason || ''}` });
  if (db.prepare('SELECT id FROM members WHERE guest_id = ?').get(guest_id)) {
    return res.status(409).json({ error: `「${guest.nickname}」已是会员` });
  }

  const amount = parseFloat(fee) || 0;
  const create = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO members (guest_id, level, start_date, expire_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(guest_id, level || '普通会员', start_date || new Date().toISOString().slice(0, 10), expire_date || null, notes || null);
    if (amount > 0) {
      db.prepare('INSERT INTO member_payments (member_id, amount, note) VALUES (?, ?, ?)')
        .run(info.lastInsertRowid, amount, fee_note || '入会缴费');
    }
    return info.lastInsertRowid;
  });
  const id = create();
  res.status(201).json({ id, nickname: guest.nickname });
});

// 续费/补缴：记一笔缴费，可同时顺延到期日
router.post('/:id/payments', (req, res) => {
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: '会员不存在' });

  const amount = parseFloat(req.body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: '请填写缴费金额' });

  const renew = db.transaction(() => {
    db.prepare('INSERT INTO member_payments (member_id, amount, note) VALUES (?, ?, ?)')
      .run(member.id, amount, req.body.note || '续费');
    if (req.body.expire_date) {
      db.prepare('UPDATE members SET expire_date = ? WHERE id = ?').run(req.body.expire_date, member.id);
    }
  });
  renew();
  res.json({ ok: true });
});

// 修改会员信息（类型/起止/备注）
router.put('/:id', (req, res) => {
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: '会员不存在' });

  const fields = ['level', 'start_date', 'expire_date', 'notes'];
  const updates = [], values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f] || null); }
  }
  if (updates.length === 0) return res.status(400).json({ error: '无更新内容' });
  values.push(req.params.id);
  db.prepare(`UPDATE members SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

// 移除会员（缴费记录级联删除，嘉宾本身保留）
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
