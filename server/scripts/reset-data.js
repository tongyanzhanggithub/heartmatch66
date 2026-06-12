// 一键清空业务数据（保留管理员账号），上线前清理测试数据用
// 用法：cd server && node scripts/reset-data.js --yes
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

if (!process.argv.includes('--yes')) {
  console.log('⚠️  此操作将删除全部嘉宾、活动、报名、复盘数据（管理员账号保留）！');
  console.log('确认请运行：node scripts/reset-data.js --yes');
  process.exit(0);
}

const db = require('../db');
const { runBackup } = require('../backup');

// 清空前先备份一次，给自己留后悔药
runBackup();

const tx = db.transaction(() => {
  db.prepare('DELETE FROM reviews').run();
  db.prepare('DELETE FROM registrations').run();
  db.prepare('DELETE FROM events').run();
  db.prepare('DELETE FROM guests').run();
  // 重置自增ID
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('guests','events','registrations','reviews')").run();
});
tx();

console.log('✅ 数据已清空（已先自动备份到 server/backups/），管理员账号保留。');
