const fs = require('fs');
const path = require('path');
const db = require('./db');

const BACKUP_DIR = path.join(__dirname, 'backups');
const KEEP = 30; // 保留最近30份

function runBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    // 把 WAL 日志合并进主文件，确保备份完整
    db.pragma('wal_checkpoint(TRUNCATE)');

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const dest = path.join(BACKUP_DIR, `data_${stamp}.db`);
    fs.copyFileSync(path.join(__dirname, 'data.db'), dest);

    // 清理旧备份
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('data_') && f.endsWith('.db'))
      .sort();
    while (files.length > KEEP) {
      fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
    }

    console.log(`[backup] 已备份 -> ${dest}（共保留 ${files.length} 份）`);
  } catch (e) {
    console.error('[backup] 备份失败:', e.message);
  }
}

function startBackupSchedule() {
  // 启动 1 分钟后先备份一次，之后每 24 小时一次
  setTimeout(runBackup, 60 * 1000);
  setInterval(runBackup, 24 * 60 * 60 * 1000);
}

module.exports = { runBackup, startBackupSchedule };
