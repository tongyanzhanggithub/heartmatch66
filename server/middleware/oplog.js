const db = require('../db');

// 把请求翻译成人类可读的操作描述
function describe(req) {
  const { method, body } = req;
  const p = req.baseUrl + req.path; // e.g. /api/guests/5/audit
  const id = (p.match(/\/(\d+)/) || [])[1];

  // 嘉宾
  if (p.startsWith('/api/guests-io')) {
    if (p.includes('/import')) return ['导入嘉宾', `批量导入 Excel/CSV 文件`];
    if (p.includes('/export')) return ['导出嘉宾库', `格式 ${req.query.format || 'xlsx'}`];
    return null;
  }
  if (p.startsWith('/api/guests')) {
    if (p.includes('/audit')) return ['审核嘉宾', `嘉宾#${id} → ${body.decision}${body.reason ? `（${body.reason}）` : ''}`];
    if (method === 'POST') return ['新建嘉宾', `「${body.nickname || '?'}」(${body.gender || '?'})`];
    if (method === 'PUT') {
      if (body.blacklisted === 1) return ['拉黑嘉宾', `嘉宾#${id}：${body.blacklist_reason || ''}`];
      if (body.blacklisted === 0) return ['移出黑名单', `嘉宾#${id}`];
      if (body.admin_tags !== undefined && Object.keys(body).length === 1) return ['修改标签', `嘉宾#${id} → ${body.admin_tags || '(清空)'}`];
      return ['修改嘉宾资料', `嘉宾#${id}`];
    }
    if (method === 'DELETE') return ['删除嘉宾', `嘉宾#${id}`];
    return null;
  }

  // 活动
  if (p.startsWith('/api/events')) {
    if (method === 'POST') return ['新建活动', `「${body.title || '?'}」`];
    if (method === 'PUT') return ['修改活动', `活动#${id}`];
    if (method === 'DELETE') return ['删除活动', `活动#${id}`];
    return null;
  }

  // 报名
  if (p.startsWith('/api/registrations')) {
    if (p.includes('/batch-attend')) return ['批量签到', `${(body.ids || []).length} 人`];
    if (p.includes('/batch')) return ['批量添加报名', `活动#${body.event_id}，${(body.guest_ids || []).length} 人`];
    if (method === 'POST') return ['添加报名', `嘉宾#${body.guest_id} → 活动#${body.event_id}`];
    if (method === 'PUT') {
      if (body.audit_status) return ['审核报名', `报名#${id} → ${body.audit_status}`];
      if (body.attended !== undefined) return [body.attended ? '签到' : '取消签到', `报名#${id}`];
      if (body.paid !== undefined) return [body.paid ? '标记已付款' : '标记未付款', `报名#${id}`];
      return ['修改报名', `报名#${id}`];
    }
    if (method === 'DELETE') return ['移除报名', `报名#${id}`];
    return null;
  }

  // 复盘
  if (p.startsWith('/api/reviews')) {
    if (method === 'POST') return ['保存复盘', `活动#${(p.match(/event\/(\d+)/) || [])[1]}`];
    return null;
  }

  return null;
}

// 写日志（不阻塞请求，失败静默）
function writeLog(username, action, detail, method, path) {
  try {
    db.prepare('INSERT INTO op_logs (username, action, detail, method, path) VALUES (?, ?, ?, ?, ?)')
      .run(username, action, detail || null, method, path);
  } catch (e) {
    console.error('[oplog]', e.message);
  }
}

// 中间件：在响应成功后记录写操作（GET 中只记导出）
function oplog(req, res, next) {
  const isWrite = ['POST', 'PUT', 'DELETE'].includes(req.method);
  const isExport = req.method === 'GET' && req.path.includes('/export');
  if (!isWrite && !isExport) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return; // 失败的操作不记
    const desc = describe(req);
    if (!desc) return;
    writeLog(req.admin?.username || '未知', desc[0], desc[1], req.method, req.baseUrl + req.path);
  });
  next();
}

module.exports = { oplog, writeLog };
