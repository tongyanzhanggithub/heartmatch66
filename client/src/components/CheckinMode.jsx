import { useState } from 'react';
import api from '../api';
import { X, Search, Check } from 'lucide-react';

// 全屏现场签到模式：大按钮、大字、触屏友好
export default function CheckinMode({ event, onUpdate, onClose }) {
  const [keyword, setKeyword] = useState('');
  const [busy, setBusy] = useState(null);

  const regs = (event.registrations || []).filter(r => r.audit_status === '通过');
  const filtered = keyword
    ? regs.filter(r => r.nickname.includes(keyword))
    : regs;
  const attended = regs.filter(r => r.attended).length;
  const rate = regs.length > 0 ? Math.round((attended / regs.length) * 100) : 0;
  const attendedM = regs.filter(r => r.attended && r.gender === '男').length;
  const attendedF = regs.filter(r => r.attended && r.gender === '女').length;

  async function toggle(reg) {
    setBusy(reg.id);
    try {
      await api.put(`/registrations/${reg.id}`, { attended: reg.attended ? 0 : 1 });
      await onUpdate();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* 顶部统计条 */}
      <div className="bg-gradient-to-r from-primary-600 to-pink-500 text-white px-5 py-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg truncate">{event.title} · 现场签到</h2>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
            <X size={20} />
          </button>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-4xl font-black">{attended}<span className="text-xl font-normal opacity-70"> / {regs.length}</span></p>
            <p className="text-xs opacity-70">已到场</p>
          </div>
          <div>
            <p className="text-4xl font-black">{rate}<span className="text-xl font-normal opacity-70">%</span></p>
            <p className="text-xs opacity-70">到场率</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm">♂ {attendedM} 人 · ♀ {attendedF} 人</p>
            <p className="text-xs opacity-70">男女到场</p>
          </div>
        </div>
        {/* 进度条 */}
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${rate}%` }} />
        </div>
      </div>

      {/* 搜索 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
          <input
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder="搜索昵称快速签到..."
            value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
      </div>

      {/* 名单 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-10">{keyword ? '没有匹配的嘉宾' : '暂无已通过的报名'}</p>
        ) : filtered.map(r => (
          <button key={r.id} onClick={() => toggle(r)} disabled={busy === r.id}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-98 text-left ${
              r.attended
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}>
            <span className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 ${r.gender === '男' ? 'bg-blue-500' : 'bg-pink-500'}`}>
              {r.nickname.slice(0, 1)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-gray-900">{r.nickname}</p>
              <p className="text-sm text-gray-400">
                {r.gender} {r.circle ? `· ${r.circle}` : ''} {r.paid ? '· 已付款' : '· ⚠️未付款'}
              </p>
            </div>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all ${
              r.attended ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-300'
            }`}>
              <Check size={28} strokeWidth={3} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
