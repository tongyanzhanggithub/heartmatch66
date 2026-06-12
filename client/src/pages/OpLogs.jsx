import { useEffect, useState } from 'react';
import api from '../api';
import { ScrollText, Search } from 'lucide-react';

const ACTION_COLORS = {
  '登录系统': 'bg-blue-50 text-blue-600',
  '新建嘉宾': 'bg-green-50 text-green-700',
  '审核嘉宾': 'bg-amber-50 text-amber-700',
  '拉黑嘉宾': 'bg-red-50 text-red-600',
  '删除嘉宾': 'bg-red-50 text-red-600',
  '删除活动': 'bg-red-50 text-red-600',
  '导出嘉宾库': 'bg-purple-50 text-purple-600',
  '导入嘉宾': 'bg-purple-50 text-purple-600',
};

export default function OpLogs() {
  const [data, setData] = useState({ logs: [], users: [] });
  const [username, setUsername] = useState('');
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/oplogs', { params: { username, keyword } });
      setData(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || '加载失败');
    }
  }

  useEffect(() => { load(); }, [username, keyword]);

  if (error) {
    return (
      <div className="card text-center py-12 max-w-lg">
        <p className="text-gray-400">🔒 {error}</p>
      </div>
    );
  }

  // 按日期分组
  const grouped = {};
  for (const log of data.logs) {
    const day = log.created_at?.slice(0, 10);
    (grouped[day] = grouped[day] || []).push(log);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ScrollText size={20} className="text-primary-500" /> 操作记录
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">所有账号的登录与增删改操作审计（仅主账号可见），最近 200 条</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <select className="input w-40 text-sm" value={username} onChange={e => setUsername(e.target.value)}>
          <option value="">全部账号</option>
          {data.users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input className="input pl-8 text-sm" placeholder="搜索操作内容..."
            value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        <span className="text-xs text-gray-400">{data.logs.length} 条</span>
      </div>

      {/* Timeline */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-12 text-gray-400">暂无操作记录</div>
      ) : Object.entries(grouped).map(([day, logs]) => (
        <div key={day} className="card p-0 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
            📅 {day}
          </div>
          <div className="divide-y divide-gray-50">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs text-gray-400 w-12 shrink-0">{log.created_at?.slice(11, 16)}</span>
                <span className="badge bg-gray-100 text-gray-700 shrink-0 font-mono">{log.username}</span>
                <span className={`badge shrink-0 ${ACTION_COLORS[log.action] || 'bg-gray-50 text-gray-600'}`}>
                  {log.action}
                </span>
                <span className="text-sm text-gray-600 truncate">{log.detail || ''}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
