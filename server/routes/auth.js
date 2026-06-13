const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// 登录防爆破（内存计数，重启即清零）：
// - 同一用户名连续失败 5 次锁定 15 分钟
// - 同一 IP 连续失败 20 次锁定 15 分钟（防止换用户名撞库）
const failures = new Map();    // key: 用户名
const ipFailures = new Map();  // key: 客户端 IP
const MAX_FAILS = 5, IP_MAX_FAILS = 20, LOCK_MS = 15 * 60 * 1000;

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
}
function isLocked(map, key, max) {
  const rec = map.get(key);
  return !!(rec && rec.count >= max && Date.now() - rec.last < LOCK_MS);
}
function bumpFail(map, key) {
  const cur = map.get(key);
  // 锁定窗口已过则重新计数，给冷却后的用户重新发放尝试次数
  if (!cur || Date.now() - cur.last >= LOCK_MS) map.set(key, { count: 1, last: Date.now() });
  else map.set(key, { count: cur.count + 1, last: Date.now() });
}
// 定期清理过期计数，避免内存无限增长
setInterval(() => {
  const now = Date.now();
  for (const map of [failures, ipFailures]) {
    for (const [k, rec] of map) if (now - rec.last >= LOCK_MS) map.delete(k);
  }
}, 10 * 60 * 1000).unref();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请填写用户名和密码' });

  const ip = clientIp(req);
  if (isLocked(failures, username, MAX_FAILS) || isLocked(ipFailures, ip, IP_MAX_FAILS)) {
    const rec = isLocked(failures, username, MAX_FAILS) ? failures.get(username) : ipFailures.get(ip);
    const mins = Math.ceil((LOCK_MS - (Date.now() - rec.last)) / 60000);
    return res.status(429).json({ error: `失败次数过多，请 ${mins} 分钟后再试` });
  }

  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    bumpFail(failures, username);
    bumpFail(ipFailures, ip);
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  failures.delete(username);
  ipFailures.delete(ip);

  // 记录登录日志（主账号审计用）
  try {
    require('../middleware/oplog').writeLog(admin.username, '登录系统', null, 'POST', '/api/auth/login');
  } catch { /* 不影响登录 */ }

  const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: admin.username });
});

module.exports = router;
