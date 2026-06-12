// 添加/重置管理后台账号
// 用法：node scripts/add-admin.js <用户名> <密码>
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../db');

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.log('用法：node scripts/add-admin.js <用户名> <密码>');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
const existing = db.prepare('SELECT id FROM admin WHERE username = ?').get(username);
if (existing) {
  db.prepare('UPDATE admin SET password_hash = ? WHERE username = ?').run(hash, username);
  console.log(`已重置账号「${username}」的密码`);
} else {
  db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`已创建账号「${username}」`);
}
