import { useEffect, useState } from 'react';
import api from '../api';
import { X, Sparkles, UserPlus } from 'lucide-react';

export default function RecommendModal({ eventId, onClose }) {
  const [data, setData] = useState(null);
  const [gender, setGender] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState(null);

  async function load() {
    const { data } = await api.get(`/events/${eventId}/recommend`, { params: gender ? { gender } : {} });
    setData(data);
    setSelected(new Set());
  }

  useEffect(() => { load(); }, [gender]);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function batchAdd() {
    setAdding(true);
    try {
      const { data: r } = await api.post('/registrations/batch', {
        event_id: eventId, guest_ids: [...selected],
      });
      setResult(r);
      load();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" /> 智能荐人
            {data?.event.circle_type && <span className="text-xs font-normal text-gray-400">圈层：{data.event.circle_type}</span>}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-3 flex items-center gap-3 border-b border-gray-50">
          {['', '女', '男'].map(g => (
            <button key={g} onClick={() => setGender(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${gender === g ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              {g === '' ? '全部' : g === '女' ? '♀ 女嘉宾' : '♂ 男嘉宾'}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            {data?.has_approved_opposite ? '按与已报名异性的互配分排序' : '暂无异性报名，按资料完整度排序'}
          </span>
        </div>

        {result && (
          <div className="mx-6 mt-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✅ 已添加 {result.added} 人{result.skipped.length > 0 && `，跳过 ${result.skipped.length} 人（${result.skipped.map(s => s.reason).join('；')}）`}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {!data ? (
            <p className="text-center text-gray-400 py-8">分析中...</p>
          ) : data.results.length === 0 ? (
            <p className="text-center text-gray-400 py-8">库内没有可推荐的嘉宾了</p>
          ) : data.results.map(({ guest: g, avg_match, basis, circle_match, completeness }) => {
            const age = g.birth_year ? new Date().getFullYear() - g.birth_year : null;
            const checked = selected.has(g.id);
            return (
              <label key={g.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? 'border-primary-300 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(g.id)}
                  className="w-4 h-4 accent-primary-600" />
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${g.gender === '男' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                  {g.gender === '男' ? '♂' : '♀'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {g.nickname}
                    {circle_match && <span className="ml-2 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">圈层匹配</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {age ? `${age}岁` : ''} {g.circle || ''} {g.occupation || ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {basis === 'match' ? (
                    <>
                      <p className="text-lg font-bold text-purple-600">{avg_match}</p>
                      <p className="text-xs text-gray-300">互配均分</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-500">{completeness}%</p>
                      <p className="text-xs text-gray-300">资料完整度</p>
                    </>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">已选 {selected.size} 人</span>
          <button className="btn-primary" disabled={selected.size === 0 || adding} onClick={batchAdd}>
            <UserPlus size={15} /> {adding ? '添加中...' : `批量加入报名（${selected.size}）`}
          </button>
        </div>
      </div>
    </div>
  );
}
