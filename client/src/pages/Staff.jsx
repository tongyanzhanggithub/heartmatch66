import { useEffect, useState } from 'react';
import api from '../api';
import { BarChart3, HeartHandshake, MessageCircle, UserCheck, Activity, Crown, ChevronDown, ChevronUp } from 'lucide-react';

const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const RANGES = [
  { key: 'month', label: '本月' },
  { key: '30d', label: '近30天' },
  { key: 'all', label: '全部' },
];
function rangeParams(key) {
  const now = new Date();
  if (key === 'month') return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to: fmt(now) };
  if (key === '30d') return { from: fmt(new Date(Date.now() - 30 * 86400000)), to: fmt(now) };
  return {};
}

function StaffRow({ s }) {
  const [open, setOpen] = useState(false);
  const actionEntries = Object.entries(s.actions || {}).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <tr className="hover:bg-gray-50 border-t border-gray-50">
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-900">{s.username}</span>
            {s.is_main && <Crown size={13} className="text-amber-500" />}
          </div>
          <div className="text-xs text-gray-300">{s.last_active ? `最近 ${s.last_active.slice(5, 16)}` : '无操作记录'}</div>
        </td>
        <td className="px-3 py-2.5 text-center text-gray-700">{s.intro_total}</td>
        <td className="px-3 py-2.5 text-center">
          <span className="font-semibold text-green-600">{s.intro_success}</span>
          {s.intro_total > 0 && <span className="text-xs text-gray-400 ml-1">{s.success_rate}%</span>}
        </td>
        <td className="px-3 py-2.5 text-center text-gray-500">{s.intro_ongoing}</td>
        <td className="px-3 py-2.5 text-center text-gray-500">{s.followups}</td>
        <td className="px-3 py-2.5 text-center text-gray-500">{s.audits}</td>
        <td className="px-3 py-2.5 text-center">
          <button onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-1 text-gray-700 hover:text-primary-600"
            disabled={actionEntries.length === 0}>
            {s.ops_total}
            {actionEntries.length > 0 && (open ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </button>
        </td>
      </tr>
      {open && actionEntries.length > 0 && (
        <tr className="bg-gray-50/60">
          <td colSpan={7} className="px-4 py-2">
            <div className="flex flex-wrap gap-1.5">
              {actionEntries.map(([a, n]) => (
                <span key={a} className="text-xs bg-white border border-gray-100 rounded-full px-2 py-0.5 text-gray-500">
                  {a} <strong className="text-gray-700">{n}</strong>
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Staff() {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get('/stats/staff', { params: rangeParams(range) }).then(r => setData(r.data));
  }, [range]);

  const t = data?.totals;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary-500" /> 业绩看板
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">按成员看综合贡献：牵线成交、跟进、审核与运营操作量（社群运营 + 相亲撮合）</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${range === r.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 团队汇总 */}
      {t && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { icon: HeartHandshake, label: '牵线', value: t.intro_total, color: 'text-pink-600' },
            { icon: Crown, label: '成交', value: t.intro_success, color: 'text-green-600' },
            { icon: Activity, label: '成功率', value: `${t.success_rate}%`, color: 'text-emerald-600' },
            { icon: MessageCircle, label: '跟进', value: t.followups, color: 'text-sky-600' },
            { icon: UserCheck, label: '审核', value: t.audits, color: 'text-indigo-600' },
            { icon: BarChart3, label: '操作总数', value: t.ops_total, color: 'text-gray-700' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card text-center py-3">
              <Icon size={16} className={`mx-auto mb-1 ${color}`} />
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* 成员明细 */}
      <div className="card p-0 overflow-hidden">
        {!data ? (
          <p className="text-center text-gray-400 py-12">加载中...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-3 text-left">成员</th>
                <th className="px-3 py-3 text-center">牵线</th>
                <th className="px-3 py-3 text-center">成交</th>
                <th className="px-3 py-3 text-center">在跟进</th>
                <th className="px-3 py-3 text-center">跟进条</th>
                <th className="px-3 py-3 text-center">审核</th>
                <th className="px-3 py-3 text-center">操作总数</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map(s => <StaffRow key={s.username} s={s} />)}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-300 text-center">牵线/成交按「牵线创建时间」统计；操作量来自操作审计日志。点「操作总数」可展开动作明细。</p>
    </div>
  );
}
