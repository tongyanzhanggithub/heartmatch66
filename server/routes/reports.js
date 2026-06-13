const router = require('express').Router();
const XLSX = require('xlsx');
const db = require('../db');

// 统一输出 xlsx / csv（前端用 blob 下载并自行命名，故此处文件名仅作兜底）
function sendSheet(res, rows, headers, sheetName, filename, format) {
  const data = rows.length ? rows : [Object.fromEntries(headers.map(h => [h, '']))];
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 中文文件名不能直接进 HTTP 头，用 RFC 5987 的 filename* 编码，并留 ASCII 兜底
  const disposition = (ext) =>
    `attachment; filename="report.${ext}"; filename*=UTF-8''${encodeURIComponent(`${filename}.${ext}`)}`;

  if (format === 'csv') {
    const csv = '﻿' + XLSX.utils.sheet_to_csv(ws); // BOM 让 Excel 正确识别中文
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', disposition('csv'));
    return res.send(csv);
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', disposition('xlsx'));
  res.send(buf);
}

// ── 活动报名表导出 ─────────────────────────────────
// GET /api/reports/event/:id/export?format=xlsx|csv
router.get('/event/:id/export', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ? AND deleted = 0').get(req.params.id);
  if (!event) return res.status(404).json({ error: '活动不存在' });

  const regs = db.prepare(`
    SELECT r.*, g.nickname, g.gender, g.birth_year, g.circle, g.occupation, g.education,
           g.height, g.district, g.contact, g.phone, g.marital
    FROM registrations r JOIN guests g ON r.guest_id = g.id
    WHERE r.event_id = ? AND g.deleted = 0
    ORDER BY g.gender DESC, r.sign_up_at ASC
  `).all(req.params.id);

  const year = new Date().getFullYear();
  const headers = ['昵称', '性别', '年龄', '圈层', '职业', '学历', '婚况', '身高', '所在区',
    '微信', '手机', '审核状态', '付款', '签到', '来源', '报名时间', '备注'];
  const rows = regs.map(r => ({
    '昵称': r.nickname,
    '性别': r.gender,
    '年龄': r.birth_year ? year - r.birth_year : '',
    '圈层': (r.circle || '').split(',').filter(Boolean).join('、'),
    '职业': r.occupation || '',
    '学历': r.education || '',
    '婚况': r.marital || '',
    '身高': r.height ? `${r.height}cm` : '',
    '所在区': r.district || '',
    '微信': r.contact || '',
    '手机': r.phone || '',
    '审核状态': r.audit_status,
    '付款': r.paid ? '已付' : '未付',
    '签到': r.attended ? '已到场' : '未到',
    '来源': r.source || '',
    '报名时间': r.sign_up_at || '',
    '备注': r.notes || '',
  }));

  const safeTitle = String(event.title).replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  sendSheet(res, rows, headers, '报名名单', `报名表_${safeTitle}`, req.query.format);
});

// ── 财务月报导出 ─────────────────────────────────
// GET /api/reports/finance/export?format=xlsx|csv&from=YYYY-MM&to=YYYY-MM
router.get('/finance/export', (req, res) => {
  const { from, to } = req.query;
  let sql = `
    SELECT strftime('%Y-%m', e.date_time) AS month,
      COUNT(*) AS events,
      SUM(r.registered) AS registered, SUM(r.attended) AS attended,
      SUM(r.revenue_male) AS rev_m, SUM(r.revenue_female) AS rev_f, SUM(r.revenue_other) AS rev_o,
      SUM(r.cost) AS cost, SUM(r.acquisition_cost) AS acq
    FROM reviews r JOIN events e ON r.event_id = e.id
    WHERE e.deleted = 0 AND e.date_time IS NOT NULL AND e.date_time != ''`;
  const params = [];
  if (from) { sql += " AND strftime('%Y-%m', e.date_time) >= ?"; params.push(from); }
  if (to) { sql += " AND strftime('%Y-%m', e.date_time) <= ?"; params.push(to); }
  sql += ' GROUP BY month ORDER BY month DESC';

  const months = db.prepare(sql).all(...params);

  const headers = ['月份', '活动场次', '报名人数', '到场人数', '到场率',
    '男生票房', '女生票房', '其他收入', '总收入', '总成本', '获客投入', '净利润'];

  const rows = months.map(m => {
    const revenue = (m.rev_m || 0) + (m.rev_f || 0) + (m.rev_o || 0);
    return {
      '月份': m.month,
      '活动场次': m.events,
      '报名人数': m.registered || 0,
      '到场人数': m.attended || 0,
      '到场率': m.registered > 0 ? `${Math.round((m.attended / m.registered) * 100)}%` : '-',
      '男生票房': m.rev_m || 0,
      '女生票房': m.rev_f || 0,
      '其他收入': m.rev_o || 0,
      '总收入': revenue,
      '总成本': m.cost || 0,
      '获客投入': m.acq || 0,
      '净利润': revenue - (m.cost || 0),
    };
  });

  // 合计行
  if (rows.length) {
    const sum = (k) => rows.reduce((s, r) => s + (typeof r[k] === 'number' ? r[k] : 0), 0);
    rows.push({
      '月份': '合计',
      '活动场次': sum('活动场次'),
      '报名人数': sum('报名人数'),
      '到场人数': sum('到场人数'),
      '到场率': '',
      '男生票房': sum('男生票房'),
      '女生票房': sum('女生票房'),
      '其他收入': sum('其他收入'),
      '总收入': sum('总收入'),
      '总成本': sum('总成本'),
      '获客投入': sum('获客投入'),
      '净利润': sum('净利润'),
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  sendSheet(res, rows, headers, '财务月报', `财务月报_${stamp}`, req.query.format);
});

module.exports = router;
