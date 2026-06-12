const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// 登录防爆破：同一用户名连续失败5次锁定15分钟（内存计数，重启即清零）
const failures = new Map();
const MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000;

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请填写用户名和密码' });

  const rec = failures.get(username);
  if (rec && rec.count >= MAX_FAILS && Date.now() - rec.last < LOCK_MS) {
    const mins = Math.ceil((LOCK_MS - (Date.now() - rec.last)) / 60000);
    return res.status(429).json({ error: `失败次数过多，请 ${mins} 分钟后再试` });
  }

  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    const cur = failures.get(username) || { count: 0, last: 0 };
    failures.set(username, { count: cur.count + 1, last: Date.now() });
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  failures.delete(username);

  const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: admin.username });
});

module.exports = router;
