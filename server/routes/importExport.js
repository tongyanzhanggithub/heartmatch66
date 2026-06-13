const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 中文表头 ↔ 数据库字段映射
const FIELD_MAP = [
  ['编号', 'id'],
  ['昵称', 'nickname'],
  ['真实姓名', 'real_name'],
  ['性别', 'gender'],
  ['出生年份', 'birth_year'],
  ['出生日期', 'birth_date'],
  ['出生时辰', 'birth_time'],
  ['出生地', 'birth_place'],
  ['所在区', 'district'],
  ['籍贯', 'hometown'],
  ['职业', 'occupation'],
  ['工作类型', 'work_type'],
  ['毕业院校', 'school'],
  ['圈层', 'circle'],
  ['学历', 'education'],
  ['婚况', 'marital'],
  ['身高', 'height'],
  ['体型', 'body_type'],
  ['年收入', 'income'],
  ['住房', 'housing'],
  ['车辆', 'car'],
  ['微信号', 'contact'],
  ['手机号', 'phone'],
  ['身份证后四位', 'id_last4'],
  ['一句话介绍', 'one_liner'],
  ['自我介绍', 'self_intro'],
  ['兴趣爱好', 'interests'],
  ['MBTI', 'mbti'],
  ['恋爱意向', 'intention'],
  ['家庭计划', 'family_plan'],
  ['关系观', 'relationship_value'],
  ['约会方式', 'preferred_date'],
  ['个性标签', 'personality_tags'],
  ['运动偏好', 'sport_tags'],
  ['生活方式标签', 'lifestyle_tags'],
  ['生活习惯描述', 'lifestyle_desc'],
  ['价值观标签', 'value_tags'],
  ['快问快答', 'qa_answers'],
  ['期望年龄最小', 'pref_age_min'],
  ['期望年龄最大', 'pref_age_max'],
  ['期望身高最低', 'pref_height_min'],
  ['期望身高最高', 'pref_height_max'],
  ['期望学历', 'pref_education'],
  ['期望收入', 'pref_income'],
  ['期望圈层', 'pref_circle'],
  ['期望地区', 'pref_district'],
  ['期望婚况', 'pref_marital'],
  ['接受异地', 'accept_long_distance'],
  ['接受带孩', 'accept_children'],
  ['同城优先', 'same_city_only'],
  ['不能接受的事', 'dealbreakers'],
  ['择偶要求', 'preferences'],
  ['可提供核验材料', 'credentials'],
  ['感兴趣的专场', 'interested_events'],
  ['来源渠道', 'source_channel'],
  ['审核状态', 'audit_status'],
  ['核验项目', 'audit_flags'],
  ['照片', 'photos'],
  ['单身承诺', 'single_promise'],
  ['免责协议', 'agree_disclaimer'],
  ['脱敏展示授权', 'display_consent'],
  ['肖像案例授权', 'portrait_consent'],
  ['红娘标签', 'admin_tags'],
  ['红娘备注', 'notes'],
  ['审核意见', 'audit_reason'],
  ['审核时间', 'audited_at'],
  ['黑名单', 'blacklisted'],
  ['拉黑原因', 'blacklist_reason'],
  ['录入时间', 'created_at'],
];
const CN2DB = Object.fromEntries(FIELD_MAP.map(([cn, dbf]) => [cn, dbf]));
const BOOL_FIELDS = ['single_promise', 'agree_disclaimer', 'display_consent', 'portrait_consent', 'blacklisted'];
const INT_FIELDS = ['birth_year', 'height', 'pref_age_min', 'pref_age_max', 'pref_height_min', 'pref_height_max'];

// 出生日期规范化：支持 Excel 日期序列号、YYYY-M-D / YYYY/M/D / YYYY.M.D。
// 返回标准 YYYY-MM-DD；无法识别为合法日期则返回 null（避免脏数据导致命理排盘崩溃）。
function normalizeBirthDate(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    // 1900-2100 的数字是误填进日期列的年份，交给上层抠出 birth_year，不当日期
    if (v >= 1900 && v <= 2100) return null;
    if (v > 10000) { // 合理的 Excel 日期序列号
      const o = XLSX.SSF.parse_date_code(v);
      if (o && o.y) v = `${o.y}-${o.m}-${o.d}`;
      else return null;
    } else return null;
  }
  const s = String(v).trim().replace(/[./]/g, '-');
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// 核验项目：JSON {real_name,id_card,single_promise} ↔ 可读的「实名,证件,单身承诺」
const FLAG_LABELS = [['real_name', '实名'], ['id_card', '证件'], ['single_promise', '单身承诺']];
function flagsToText(json) {
  let f = {};
  try { f = JSON.parse(json || '{}'); } catch { /* 忽略脏数据 */ }
  return FLAG_LABELS.filter(([k]) => f[k]).map(([, label]) => label).join(',');
}
function textToFlags(text) {
  const parts = String(text).split(/[,，、\s]+/);
  return JSON.stringify(Object.fromEntries(FLAG_LABELS.map(([k, label]) => [k, parts.includes(label)])));
}

// ── 导出 ───────────────────────────────────────────
// GET /api/guests-io/export?format=xlsx|csv&audit_status=通过
router.get('/export', (req, res) => {
  const { format = 'xlsx', audit_status, gender } = req.query;

  let sql = 'SELECT * FROM guests WHERE deleted = 0';
  const params = [];
  if (audit_status) { sql += ' AND audit_status = ?'; params.push(audit_status); }
  if (gender) { sql += ' AND gender = ?'; params.push(gender); }
  sql += ' ORDER BY id ASC';
  const rows = db.prepare(sql).all(...params);

  const data = rows.map(r => {
    const out = {};
    for (const [cn, dbf] of FIELD_MAP) {
      let v = r[dbf];
      if (BOOL_FIELDS.includes(dbf)) v = v ? '是' : '否';
      if (dbf === 'audit_flags') v = flagsToText(v);
      out[cn] = v ?? '';
    }
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(data, { header: FIELD_MAP.map(([cn]) => cn) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '嘉宾库');

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    const csv = '﻿' + XLSX.utils.sheet_to_csv(ws); // BOM for Excel 中文
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="guests_${stamp}.csv"`);
    res.send(csv);
  } else {
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="guests_${stamp}.xlsx"`);
    res.send(buf);
  }
});

// 下载导入模板
router.get('/template', (req, res) => {
  const sample = {};
  for (const [cn] of FIELD_MAP) sample[cn] = '';
  sample['昵称'] = '小桃';
  sample['性别'] = '女';
  sample['出生年份'] = 1995;
  sample['所在区'] = '渝中区';
  sample['职业'] = '教师';
  sample['圈层'] = '教师';
  sample['学历'] = '本科';
  sample['婚况'] = '未婚';
  sample['身高'] = 165;
  sample['微信号'] = 'wx_xiaotao';
  sample['审核状态'] = '待审';
  delete sample['编号'];
  delete sample['录入时间'];

  const ws = XLSX.utils.json_to_sheet([sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '导入模板');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="guests_import_template.xlsx"');
  res.send(buf);
});

// ── 导入 ───────────────────────────────────────────
// POST /api/guests-io/import  (multipart, file=csv/xlsx)
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });

  let buf = req.file.buffer;
  // 剥掉 UTF-8 BOM（EF BB BF），否则带 BOM 的 CSV（如本系统导出的 CSV）会被 XLSX 解析错乱
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    buf = buf.subarray(3);
  }

  let wb;
  try {
    wb = XLSX.read(buf, { type: 'buffer', codepage: 65001 });
  } catch {
    return res.status(400).json({ error: '文件解析失败，请上传 CSV 或 Excel 文件' });
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (rows.length === 0) return res.status(400).json({ error: '文件中没有数据' });

  const results = { imported: 0, skipped: 0, errors: [] };

  const insert = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rec = {};
      for (const [cn, val] of Object.entries(row)) {
        const dbf = CN2DB[cn.trim()];
        if (!dbf || dbf === 'id' || dbf === 'created_at') continue;
        let v = typeof val === 'string' ? val.trim() : val;
        if (v === '') continue;
        if (BOOL_FIELDS.includes(dbf)) v = (v === '是' || v === '1' || v === 1 || v === true) ? 1 : 0;
        if (INT_FIELDS.includes(dbf)) { v = parseInt(v); if (isNaN(v)) continue; }
        if (dbf === 'birth_date') {
          const norm = normalizeBirthDate(v);
          if (!norm) {
            // 非法日期：能抠出 4 位年份就转存出生年份，否则丢弃该字段（不污染命理排盘）
            const yr = String(v).match(/(\d{4})/);
            if (yr && rec.birth_year == null) rec.birth_year = parseInt(yr[1]);
            continue;
          }
          v = norm;
        }
        if (dbf === 'audit_flags') v = textToFlags(v);
        if (dbf === 'photos') {
          const clean = require('../upload').sanitizePhotos(v);
          if (!clean || clean === '[]') continue;
          v = clean;
        }
        rec[dbf] = v;
      }

      if (!rec.nickname || !rec.gender) {
        results.skipped++;
        results.errors.push(`第${i + 2}行：缺少昵称或性别，已跳过`);
        continue;
      }
      if (rec.gender !== '男' && rec.gender !== '女') {
        results.skipped++;
        results.errors.push(`第${i + 2}行：性别须为「男」或「女」，已跳过`);
        continue;
      }
      if (rec.audit_status && !['待审', '通过', '拒绝', '待补'].includes(rec.audit_status)) {
        rec.audit_status = '待审';
      }

      // 去重：同昵称+性别+出生年 或 同微信号
      const dup = db.prepare(`
        SELECT id FROM guests WHERE deleted = 0 AND (
          (contact != '' AND contact IS NOT NULL AND contact = ?)
          OR (nickname = ? AND gender = ? AND IFNULL(birth_year,0) = IFNULL(?,0))
        )
      `).get(rec.contact || null, rec.nickname, rec.gender, rec.birth_year || null);
      if (dup) {
        results.skipped++;
        results.errors.push(`第${i + 2}行：「${rec.nickname}」已存在（ID ${dup.id}），已跳过`);
        continue;
      }

      const cols = Object.keys(rec);
      db.prepare(`INSERT INTO guests (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
        .run(...cols.map(c => rec[c]));
      results.imported++;
    }
  });

  try {
    insert();
  } catch (e) {
    return res.status(500).json({ error: '导入失败：' + e.message });
  }

  res.json(results);
});

module.exports = router;
