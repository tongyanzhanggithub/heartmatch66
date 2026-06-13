import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { HeartHandshake, Plus, Search, X, Trash2, ChevronDown, ChevronUp, MessageSquarePlus } from 'lucide-react';
import FollowUps from '../components/FollowUps';

const STATUSES = ['已牵线', '已交换微信', '已约见', '交往中', '已成功', '已告吹'];
const STATUS_META = {
  '已牵线':   { color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  '已交换微信': { color: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  '已约见':   { color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  '交往中':   { color: 'bg-pink-100 text-pink-700', dot: 'bg-pink-500' },
  '已成功':   { color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  '已告吹':   { color: 'bg-red-50 text-red-500', dot: 'bg-red-400' },
};

// 新建牵线弹窗：各选一位男女嘉宾
function NewIntroModal({ onClose }) {
  const [guests, setGuests] = useState([]);
  const [a, setA] = useState(null);   // 男
  const [b, setB] = useState(null);   // 女
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/guests', { params: { audit_status: '通过', blacklisted: 'false' } }).then(r => setGuests(r.data));
  }, []);

  async function submit() {
    if (!a || !b) { setError('请各选一位嘉宾'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/introductions', { guest_a: a.id, guest_b: b.id, notes });
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || '创建失败');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => onClose(false)}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">新建牵线</h3>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 overflow-y-auto">
          <GuestPicker label="♂ 男方" color="blue" guests={guests.filter(g => g.gender === '男')} value={a} onChange={setA} />
          <GuestPicker label="♀ 女方" color="pink" guests={guests.filter(g => g.gender === '女')} value={b} onChange={setB} />
        </div>
        <div className="px-4 pb-2">
          <input className="input text-sm" placeholder="牵线备注（可选，如：活动现场聊得来）" value={notes} onChange={e => setNotes(e.target.value)} />
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => onClose(false)}>取消</button>
          <button className="btn-primary" disabled={!a || !b || saving} onClick={submit}>{saving ? '创建中...' : '确认牵线'}</button>
        </div>
      </div>
    </div>
  );
}

function GuestPicker({ label, color, guests, value, onChange }) {
  const [kw, setKw] = useState('');
  const filtered = guests.filter(g => !kw || g.nickname.includes(kw) || (g.occupation || '').includes(kw));
  return (
    <div className={`border-2 rounded-xl p-3 ${color === 'blue' ? 'border-blue-100' : 'border-pink-100'}`}>
      <p className={`text-sm font-semibold mb-2 ${color === 'blue' ? 'text-blue-700' : 'text-pink-700'}`}>{label}</p>
      {value ? (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-sm font-medium">{value.nickname} {value.occupation ? `· ${value.occupation}` : ''}</span>
          <button className="text-xs text-gray-400 hover:text-red-500" onClick={() => onChange(null)}>重选</button>
        </div>
      ) : (
        <>
          <input className="input text-sm mb-2" placeholder="搜索昵称/职业" value={kw} onChange={e => setKw(e.target.value)} />
          <div className="max-h-40 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
            {filtered.length === 0 ? <p className="text-center text-xs text-gray-400 py-3">无结果</p>
              : filtered.map(g => (
                <div key={g.id} onClick={() => onChange(g)} className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm flex justify-between">
                  <span>{g.nickname}</span>
                  <span className="text-xs text-gray-400">{g.birth_year ? `${new Date().getFullYear() - g.birth_year}岁` : ''} {g.circle || ''}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function IntroCard({ intro, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const meta = STATUS_META[intro.status];

  async function setStatus(status) { await api.put(`/introductions/${intro.id}`, { status }); onChange(); }
  async function del() { if (!confirm('删除这条牵线记录？相关跟进也会删除。')) return; await api.delete(`/introductions/${intro.id}`); onChange(); }

  return (
    <div className="card">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 flex items-center gap-1.5 flex-wrap">
            <button className="hover:text-primary-600" onClick={() => navigate(`/guests/${intro.guest_a}`)}>{intro.a_nickname}</button>
            <HeartHandshake size={15} className="text-pink-400" />
            <button className="hover:text-primary-600" onClick={() => navigate(`/guests/${intro.guest_b}`)}>{intro.b_nickname}</button>
            {intro.match_score != null && <span className="text-xs text-purple-500 font-normal">匹配 {intro.match_score} 分</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {intro.introduced_by ? `${intro.introduced_by} 牵线` : ''} · {intro.created_at?.slice(0, 16)}
            {intro.event_title ? ` · 来自「${intro.event_title}」` : ''}
          </p>
        </div>
        <select value={intro.status} onChange={e => setStatus(e.target.value)}
          className={`text-sm rounded-lg px-2.5 py-1.5 font-medium border-0 cursor-pointer ${meta.color}`}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setExpanded(v => !v)} className="btn-secondary btn-sm">
          {expanded ? <ChevronUp size={14} /> : <MessageSquarePlus size={14} />} 跟进
        </button>
        <button onClick={del} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
      </div>

      {intro.notes && <p className="text-sm text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-1.5">📝 {intro.notes}</p>}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <FollowUps targetType="intro" targetId={intro.id} />
        </div>
      )}
    </div>
  );
}

export default function Introductions() {
  const [list, setList] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const params = {};
    if (status) params.status = status;
    if (keyword) params.keyword = keyword;
    const [l, f] = await Promise.all([
      api.get('/introductions', { params }),
      api.get('/introductions/stats/funnel'),
    ]);
    setList(l.data);
    setFunnel(f.data);
  }
  useEffect(() => { load(); }, [status, keyword]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HeartHandshake size={20} className="text-pink-500" /> 牵线记录
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">从牵线到成功的全过程跟踪 —— 相亲转化的核心闭环</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> 新建牵线</button>
      </div>

      {/* 转化漏斗 */}
      {funnel && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">转化漏斗</h3>
            <span className="text-sm text-gray-500">成功率 <strong className="text-green-600 text-base">{funnel.success_rate}%</strong>（{funnel.success}/{funnel.total}）</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(status === s ? '' : s)}
                className={`rounded-xl py-2.5 text-center transition-all border ${status === s ? 'border-primary-400 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <p className="text-xl font-bold text-gray-900">{funnel.counts[s]}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />{s}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 筛选 */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => setStatus('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!status ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>全部</button>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input className="input pl-8 text-sm" placeholder="搜索嘉宾昵称" value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        {status && <span className="text-xs text-gray-400">筛选中：{status}</span>}
      </div>

      {/* 列表 */}
      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            {status || keyword ? '没有符合条件的牵线记录' : '还没有牵线记录 —— 点右上角「新建牵线」，或在匹配页一键牵线'}
          </div>
        ) : list.map(i => <IntroCard key={i.id} intro={i} onChange={load} />)}
      </div>

      {showNew && <NewIntroModal onClose={changed => { setShowNew(false); if (changed) load(); }} />}
    </div>
  );
}
