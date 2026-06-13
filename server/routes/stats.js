const router = require('express').Router();
const db = require('../db');

// 仅主账号可查看业绩看板（涉及全员操作数据）
router.use((req, res, next) => {
  if (req.admin?.username !== 'admin') {
    return res.status(403).json({ error: '仅主账号可查看业绩看板' });
  }
  next();
});

// GET /api/stats/staff?from=YYYY-MM-DD&to=YYYY-MM-DD
// 综合业绩：牵线成交 + 跟进 + 审核 + 运营操作量 + 活跃度（按账号汇总）
router.get('/staff', (req, res) => {
  const { from, to } = req.query;
  // 时间过滤片段（三张表都有 created_at 列，可复用）
  const clauses = [], params = [];
  if (from) { clauses.push('date(created_at) >= date(?)'); params.push(from); }
  if (to) { clauses.push('date(created_at) <= date(?)'); params.push(to); }
  const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';

  const byUser = {};
  const ensure = (u) => {
    const key = u || '(未知)';
    if (!byUser[key]) {
      byUser[key] = {
        username: key, is_main: key === 'admin',
        intro_total: 0, intro_success: 0, intro_ongoing: 0,
        followups: 0, audits: 0, ops_total: 0, actions: {}, last_active: null,
      };
    }
    return byUser[key];
  };

  // 账号清单（即便没产生数据也展示）
  for (const a of db.prepare('SELECT username FROM admin ORDER BY id').all()) ensure(a.username);

  // 牵线成交（按牵线创建时间过滤）
  for (const r of db.prepare(`
    SELECT introduced_by u, COUNT(*) total,
      SUM(CASE WHEN status = '已成功' THEN 1 ELSE 0 END) success,
      SUM(CASE WHEN status IN ('已交换微信','已约见','交往中') THEN 1 ELSE 0 END) ongoing
    FROM introductions${where} GROUP BY introduced_by`).all(...params)) {
    const x = ensure(r.u);
    x.intro_total = r.total; x.intro_success = r.success; x.intro_ongoing = r.ongoing;
  }

  // 跟进条数
  for (const r of db.prepare(`SELECT created_by u, COUNT(*) n FROM follow_ups${where} GROUP BY created_by`).all(...params)) {
    ensure(r.u).followups = r.n;
  }

  // 运营操作量（按动作细分，审核单独计）
  for (const r of db.prepare(`SELECT username u, action, COUNT(*) n FROM op_logs${where} GROUP BY username, action`).all(...params)) {
    const x = ensure(r.u);
    x.ops_total += r.n;
    x.actions[r.action] = r.n;
    if (r.action.startsWith('审核')) x.audits += r.n;
  }

  // 最近活跃（不受时间过滤，反映账号当前活跃度）
  for (const r of db.prepare('SELECT username u, MAX(created_at) t FROM op_logs GROUP BY username').all()) {
    if (byUser[r.u]) byUser[r.u].last_active = r.t;
  }

  const staff = Object.values(byUser).map(s => ({
    ...s,
    success_rate: s.intro_total > 0 ? Math.round((s.intro_success / s.intro_total) * 100) : 0,
  })).sort((a, b) =>
    b.intro_success - a.intro_success || b.ops_total - a.ops_total || b.followups - a.followups
  );

  // 团队汇总
  const sum = (k) => staff.reduce((s, x) => s + x[k], 0);
  res.json({
    range: { from: from || null, to: to || null },
    totals: {
      intro_total: sum('intro_total'), intro_success: sum('intro_success'),
      success_rate: sum('intro_total') > 0 ? Math.round((sum('intro_success') / sum('intro_total')) * 100) : 0,
      followups: sum('followups'), audits: sum('audits'), ops_total: sum('ops_total'),
      active_staff: staff.filter(s => s.ops_total > 0 || s.intro_total > 0).length,
    },
    staff,
  });
});

module.exports = router;
