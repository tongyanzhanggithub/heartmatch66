const router = require('express').Router();
const db = require('../db');

// 仅主账号 admin 可查看操作记录
router.use((req, res, next) => {
  if (req.admin?.username !== 'admin') {
    return res.status(403).json({ error: '仅主账号可查看操作记录' });
  }
  next();
});

// GET /api/oplogs?username=&action=&limit=
router.get('/', (req, res) => {
  const { username, keyword } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);

  let sql = 'SELECT * FROM op_logs WHERE 1=1';
  const params = [];
  if (username) { sql += ' AND username = ?'; params.push(username); }
  if (keyword) { sql += ' AND (action LIKE ? OR detail LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const logs = db.prepare(sql).all(...params);
  const users = db.prepare('SELECT DISTINCT username FROM op_logs ORDER BY username').all().map(r => r.username);
  res.json({ logs, users });
});

module.exports = router;
