import { useEffect, useState } from 'react';
import api from '../api';
import { X, Search } from 'lucide-react';

export default function AddRegistrationModal({ eventId, onClose }) {
  const [guests, setGuests] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [gender, setGender] = useState('');
  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function search() {
    const params = { audit_status: '通过' };
    if (keyword) params.keyword = keyword;
    if (gender) params.gender = gender;
    const { data } = await api.get('/guests', { params });
    setGuests(data);
  }

  useEffect(() => { search(); }, [keyword, gender]);

  async function submit() {
    if (!selected) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/registrations', { event_id: eventId, guest_id: selected.id, source });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '添加失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">添加报名</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input className="input pl-8 text-sm" placeholder="搜索昵称/职业" value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>
            <select className="input w-28 text-sm" value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">性别</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>

          <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
            {guests.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">无结果</p>
            ) : guests.map(g => (
              <div key={g.id} onClick={() => setSelected(g)}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${selected?.id === g.id ? 'bg-primary-50 border-l-2 border-primary-500' : ''}`}>
                <div>
                  <span className="text-sm font-medium text-gray-900">{g.nickname}</span>
                  <span className="ml-2 text-xs text-gray-400">{g.gender} · {g.circle || ''}</span>
                </div>
                {g.blacklisted && <span className="text-xs text-red-500">⚠️黑名单</span>}
              </div>
            ))}
          </div>

          {selected && (
            <div className="bg-primary-50 rounded-lg px-4 py-2.5 text-sm text-primary-800">
              已选：{selected.nickname}（{selected.gender}）
            </div>
          )}

          <div>
            <label className="label text-xs">来源渠道（可选）</label>
            <input className="input text-sm" placeholder="如：微信推荐、朋友介绍" value={source} onChange={e => setSource(e.target.value)} />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={onClose}>取消</button>
            <button className="btn-primary" onClick={submit} disabled={!selected || loading}>
              {loading ? '添加中...' : '确认添加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
