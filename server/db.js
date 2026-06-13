const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// DB 路径可由环境变量覆盖；生产用 DB_PATH 指向已挂载的持久化卷（如 /app/server/data/data.db），
// 否则默认 server/data.db（本地开发）。确保所在目录存在。
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    real_name TEXT,
    gender TEXT NOT NULL CHECK(gender IN ('男','女')),
    birth_year INTEGER,
    district TEXT,
    occupation TEXT,
    circle TEXT,
    education TEXT,
    marital TEXT,
    height INTEGER,
    contact TEXT,
    audit_status TEXT NOT NULL DEFAULT '待审' CHECK(audit_status IN ('待审','通过','拒绝','待补')),
    audit_flags TEXT DEFAULT '{}',
    preferences TEXT,
    notes TEXT,
    -- 扩展信息
    self_intro TEXT,
    interests TEXT,
    income TEXT,
    -- 择偶条件（结构化）
    pref_age_min INTEGER,
    pref_age_max INTEGER,
    pref_height_min INTEGER,
    pref_height_max INTEGER,
    pref_education TEXT,
    pref_income TEXT,
    pref_circle TEXT,
    pref_district TEXT,
    pref_marital TEXT,
    blacklisted INTEGER NOT NULL DEFAULT 0,
    blacklist_reason TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    circle_type TEXT,
    date_time TEXT,
    location TEXT,
    quota_male INTEGER NOT NULL DEFAULT 0,
    quota_female INTEGER NOT NULL DEFAULT 0,
    price_male REAL NOT NULL DEFAULT 0,
    price_female REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '筹备' CHECK(status IN ('筹备','报名中','进行中','已结束','取消')),
    notes TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id),
    guest_id INTEGER NOT NULL REFERENCES guests(id),
    sign_up_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    source TEXT,
    audit_status TEXT NOT NULL DEFAULT '待审' CHECK(audit_status IN ('待审','通过','拒绝')),
    paid INTEGER NOT NULL DEFAULT 0,
    attended INTEGER NOT NULL DEFAULT 0,
    matched_with INTEGER REFERENCES guests(id),
    notes TEXT,
    UNIQUE(event_id, guest_id)
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL UNIQUE REFERENCES guests(id),
    level TEXT DEFAULT '普通会员',
    start_date TEXT,
    expire_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS member_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    amount REAL NOT NULL DEFAULT 0,
    paid_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS op_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT,
    method TEXT,
    path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL UNIQUE REFERENCES events(id),
    registered INTEGER DEFAULT 0,
    attended INTEGER DEFAULT 0,
    male_attended INTEGER DEFAULT 0,
    female_attended INTEGER DEFAULT 0,
    matches INTEGER DEFAULT 0,
    revenue_male REAL DEFAULT 0,
    revenue_female REAL DEFAULT 0,
    revenue_other REAL DEFAULT 0,
    cost REAL DEFAULT 0,
    acquisition_cost REAL DEFAULT 0,
    satisfaction REAL,
    went_well TEXT,
    improve TEXT,
    actions TEXT,
    cases TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 牵线/约见记录：相亲转化闭环的核心，从「已牵线」到「已成功/已告吹」的全过程
  CREATE TABLE IF NOT EXISTS introductions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_a INTEGER NOT NULL REFERENCES guests(id),
    guest_b INTEGER NOT NULL REFERENCES guests(id),
    event_id INTEGER REFERENCES events(id),
    status TEXT NOT NULL DEFAULT '已牵线'
      CHECK(status IN ('已牵线','已交换微信','已约见','交往中','已成功','已告吹')),
    match_score INTEGER,
    introduced_by TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 跟进时间线：可挂在嘉宾或牵线上，next_date 用于「今日待跟进」提醒
  CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL CHECK(target_type IN ('guest','intro')),
    target_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    next_date TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 成功案例库：脱敏宣传素材，可由「已成功」的牵线沉淀而来
  CREATE TABLE IF NOT EXISTS success_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    introduction_id INTEGER REFERENCES introductions(id),
    title TEXT,
    story TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    happened_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_intro_status ON introductions(status);
  CREATE INDEX IF NOT EXISTS idx_followup_target ON follow_ups(target_type, target_id);
  CREATE INDEX IF NOT EXISTS idx_followup_next ON follow_ups(next_date, done);
`);

// Migrations: add new columns if they don't exist
const guestCols = db.prepare("PRAGMA table_info(guests)").all().map(c => c.name);
const newGuestCols = [
  ['self_intro', 'TEXT'],
  ['interests', 'TEXT'],
  ['income', 'TEXT'],
  ['pref_age_min', 'INTEGER'],
  ['pref_age_max', 'INTEGER'],
  ['pref_height_min', 'INTEGER'],
  ['pref_height_max', 'INTEGER'],
  ['pref_education', 'TEXT'],
  ['pref_income', 'TEXT'],
  ['pref_circle', 'TEXT'],
  ['pref_district', 'TEXT'],
  ['pref_marital', 'TEXT'],
  // 参考嘉宾资料卡模板补充
  ['phone', 'TEXT'],
  ['hometown', 'TEXT'],
  ['body_type', 'TEXT'],
  ['housing', 'TEXT'],
  ['car', 'TEXT'],
  ['one_liner', 'TEXT'],
  ['accept_long_distance', 'TEXT'],
  ['accept_children', 'TEXT'],
  ['single_promise', 'INTEGER'],
  ['display_consent', 'INTEGER'],
  // 参考运营方案审核标准与合规三件套补充
  ['id_last4', 'TEXT'],
  ['credentials', 'TEXT'],
  ['agree_disclaimer', 'INTEGER'],
  ['portrait_consent', 'INTEGER'],
  ['source_channel', 'TEXT'],
  ['interested_events', 'TEXT'],
  // 命理模块：完整出生日期与时辰
  ['birth_date', 'TEXT'],
  ['birth_time', 'TEXT'],
  // 审核闭环：审核意见与时间
  ['audit_reason', 'TEXT'],
  ['audited_at', 'TEXT'],
  // 参考小程序资料模型扩充
  ['work_type', 'TEXT'],
  ['school', 'TEXT'],
  ['mbti', 'TEXT'],
  ['intention', 'TEXT'],
  ['relationship_value', 'TEXT'],
  ['lifestyle_desc', 'TEXT'],
  ['family_plan', 'TEXT'],
  ['preferred_date', 'TEXT'],
  ['dealbreakers', 'TEXT'],
  ['personality_tags', 'TEXT'],
  ['sport_tags', 'TEXT'],
  ['lifestyle_tags', 'TEXT'],
  ['value_tags', 'TEXT'],
  ['qa_answers', 'TEXT'],
  ['same_city_only', 'TEXT'],
  // 八字精准化：出生地（真太阳时参考）
  ['birth_place', 'TEXT'],
  // 红娘自定义标签（管理后台打标）
  ['admin_tags', 'TEXT'],
  // 嘉宾照片（JSON 数组，存 uploads/ 下的文件名）
  ['photos', 'TEXT'],
  // 扫码报名来源活动：审核通过时自动加入该活动报名
  ['apply_event_id', 'INTEGER'],
];
for (const [col, type] of newGuestCols) {
  if (!guestCols.includes(col)) {
    db.exec(`ALTER TABLE guests ADD COLUMN ${col} ${type}`);
  }
}

// Seed admin user if not exists
const existing = db.prepare('SELECT id FROM admin WHERE username = ?').get(process.env.ADMIN_USERNAME || 'admin');
if (!existing) {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@2024!', 10);
  db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)').run(
    process.env.ADMIN_USERNAME || 'admin',
    hash
  );
}

module.exports = db;
module.exports.DB_PATH = DB_PATH;
