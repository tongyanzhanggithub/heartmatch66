import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Check, Trash2, Clock } from 'lucide-react';

// 跟进时间线：可挂在嘉宾(target_type='guest')或牵线(target_type='intro')上
export default function FollowUps({ targetType, targetId }) {
  const [list, setList] = useState([]);
  const [content, setContent] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data } = await api.get('/followups', { params: { target_type: targetType, target_id: targetId } });
    setList(data);
  }
  useEffect(() => { load(); }, [targetType, targetId]);

  async function add(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setAdding(true);
    try {
      await api.post('/followups', { target_type: targetType, target_id: targetId, content, next_date: nextDate || null });
      setContent(''); setNextDate('');
      load();
    } finally { setAdding(false); }
  }
  async function toggleDone(f) { await api.put(`/followups/${f.id}`, { done: f.done ? 0 : 1 }); load(); }
  async function del(f) { if (!confirm('删除这条跟进记录？')) return; await api.delete(`/followups/${f.id}`); load(); }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex flex-wrap gap-2 items-end">
        <input className="input text-sm flex-1 min-w-48" placeholder="记录一条跟进，如：已加微信、约周六见面..."
          value={content} onChange={e => setContent(e.target.value)} />
        <div>
          <label className="text-xs text-gray-400 block mb-0.5">下次跟进日</label>
          <input className="input text-sm" type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} />
        </div>
        <button className="btn-primary btn-sm" disabled={adding || !content.trim()}><Plus size={14} /> 添加</button>
      </form>

      {list.length === 0 ? (
        <p className="text-xs text-gray-300 text-center py-2">暂无跟进记录</p>
      ) : (
        <div className="space-y-2">
          {list.map(f => (
            <div key={f.id} className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${f.done ? 'bg-gray-50 opacity-60' : 'bg-white border border-gray-100'}`}>
              <button type="button" onClick={() => toggleDone(f)} title={f.done ? '已完成' : '标记完成'}
                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${f.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}>
                {f.done && <Check size={11} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-gray-800 break-words ${f.done ? 'line-through' : ''}`}>{f.content}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{f.created_at?.slice(5, 16)}</span>
                  {f.created_by && <span>· {f.created_by}</span>}
                  {f.next_date && (
                    <span className={`inline-flex items-center gap-0.5 ${!f.done && f.next_date <= today ? 'text-red-500 font-medium' : 'text-amber-600'}`}>
                      <Clock size={11} /> 待跟进 {f.next_date}
                    </span>
                  )}
                </p>
              </div>
              <button type="button" onClick={() => del(f)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
