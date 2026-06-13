const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { writeLog } = require('../middleware/oplog');

const MAIN_ADMIN = 'admin';

function validPassword(pwd) {
  return typeof pwd === 'string' && pwd.length >= 8;
}

// 所有登录用户：修改自己的密码（需验证旧密码）
router.put('/me/password', (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) return res.status(400).json({ error: '请填写旧密码和新密码' });
  if (!validPassword(new_password)) return res.status(400).json({ error: '新密码至少 8 位' });

  const me = db.prepare('SELECT * FROM admin WHERE id = ?').get(req.admin.id);
  if (!me) return res.status(404).json({ error: '账号不存在' });
  if (!bcrypt.compareSync(old_password, me.password_hash)) {
    return res.status(401).json({ error: '旧密码错误' });
  }

  db.prepare('UPDATE admin SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(new_password, 10), me.id);
  writeLog(me.username, '修改密码', '本人修改登录密码', 'PUT', '/api/accounts/me/password');
  res.json({ ok: true });
});

// 以下接口仅主账号可用
router.use((req, res, next) => {
  if (req.admin?.username !== MAIN_ADMIN) {
    return res.status(403).json({ error: '仅主账号可管理账号' });
  }
  next();
});

// 账号列表
router.get('/', (req, res) => {
  const accounts = db.prepare('SELECT id, username FROM admin ORDER BY id').all();
  res.json(accounts.map(a => ({ ...a, is_main: a.username === MAIN_ADMIN })));
});

// 创建子账号
router.post('/', (req, res) => {
  const { username, password } = req.body;
  if (!username || !/^[\w.-]{2,20}$/.test(username)) {
    return res.status(400).json({ error: '用户名需 2-20 位字母、数字、下划线' });
  }
  if (!validPassword(password)) return res.status(400).json({ error: '密码至少 8 位' });
  if (db.prepare('SELECT id FROM admin WHERE username = ?').get(username)) {
    return res.status(409).json({ error: '用户名已存在' });
  }

  const info = db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)')
    .run(username, bcrypt.hashSync(password, 10));
  writeLog(req.admin.username, '创建子账号', `「${username}」`, 'POST', '/api/accounts');
  res.json({ id: info.lastInsertRowid, username });
});

// 重置子账号密码
router.put('/:id/password', (req, res) => {
  const { new_password } = req.body;
  if (!validPassword(new_password)) return res.status(400).json({ error: '新密码至少 8 位' });

  const target = db.prepare('SELECT * FROM admin WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: '账号不存在' });

  db.prepare('UPDATE admin SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(new_password, 10), target.id);
  writeLog(req.admin.username, '重置密码', `账号「${target.username}」`, 'PUT', `/api/accounts/${target.id}/password`);
  res.json({ ok: true });
});

// 删除子账号（主账号不可删）
router.delete('/:id', (req, res) => {
  const target = db.prepare('SELECT * FROM admin WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: '账号不存在' });
  if (target.username === MAIN_ADMIN) return res.status(400).json({ error: '主账号不可删除' });

  db.prepare('DELETE FROM admin WHERE id = ?').run(target.id);
  writeLog(req.admin.username, '删除子账号', `「${target.username}」`, 'DELETE', `/api/accounts/${target.id}`);
  res.json({ ok: true });
});

module.exports = router;
