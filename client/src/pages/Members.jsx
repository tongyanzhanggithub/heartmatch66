import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { BadgeCheck, Plus, Search, X, Wallet, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

const LEVELS = ['普通会员', '月卡', '季卡', '半年卡', '年卡', '至尊会员'];
const STATUS_COLORS = { '有效': 'bg-green-100 text-green-700', '已到期': 'bg-gray-100 text-gray-500' };

// 添加 / 编辑会员弹窗
function MemberForm({ member, onClose }) {
  const [keyword, setKeyword] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [guest, setGuest] = useState(null);
  const [form, setForm] = useState({
    level: member?.level || '普通会员',
    fee: '',
    start_date: member?.start_date || new Date().toISOString().slice(0, 10),
    expire_date: member?.expire_date || '',
    notes: member?.notes || '',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (member || keyword.trim().length < 1) { setCandidates([]); return; }
    const t = setTimeout(async () => {
      const { data } = await api.get('/guests', { params: { keyword } });
      setCandidates(data.slice(0, 8));
    }, 300);
    return () => clearTimeout(t);
  }, [keyword, member]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      if (member) {
        await api.put(`/members/${member.id}`, {
          level: form.level, start_date: form.start_date,
          expire_date: form.expire_date, notes: form.notes,
        });
      } else {
        if (!guest) return setError('请先搜索并选择嘉宾');
        await api.post('/members', { guest_id: guest.id, ...form });
      }
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || '保存失败');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => onClose(false)}>
      <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{member ? `编辑会员 · ${member.nickname}` : '添加会员'}</h3>
          <button type="button" onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {!member && (
          <div>
            <label className="label">选择嘉宾（搜索昵称/微信/手机）</label>
            {guest ? (
              <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
                <span className={guest.gender === '男' ? 'text-blue-500' : 'text-pink-500'}>{guest.gender === '男' ? '♂' : '♀'}</span>
                <span className="text-sm font-medium flex-1">{guest.nickname}{guest.occupation ? ` · ${guest.occupation}` : ''}</span>
                <button type="button" className="text-xs text-gray-400 hover:text-red-500" onClick={() => setGuest(null)}>换人</button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-3 text-gray-400" />
                <input className="input pl-8" placeholder="输入关键词搜索嘉宾..." value={keyword}
                  onChange={e => setKeyword(e.target.value)} autoFocus />
                {candidates.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {candidates.map(c => (
                      <button type="button" key={c.id} onClick={() => { setGuest(c); setKeyword(''); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center gap-2">
                        <span className={c.gender === '男' ? 'text-blue-500' : 'text-pink-500'}>{c.gender === '男' ? '♂' : '♀'}</span>
                        {c.nickname}
                        <span className="text-xs text-gray-400">{c.occupation || ''} {c.birth_year ? `${new Date().getFullYear() - c.birth_year}岁` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label">会员类型</label>
          <input className="input" list="member-levels" value={form.level} onChange={e => set('level', e.target.value)} />
          <datalist id="member-levels">
            {LEVELS.map(l => <option key={l} value={l} />)}
          </datalist>
        </div>

        {!member && (
          <div>
            <label className="label">入会缴费金额（元，可为空）</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="如：1999"
              value={form.fee} onChange={e => set('fee', e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">开始日期</label>
            <input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="label">到期日期（空 = 长期）</label>
            <input className="input" type="date" value={form.expire_date} onChange={e => set('expire_date', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">备注</label>
          <input className="input" placeholder="如：朋友介绍入会，含 3 次一对一" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => onClose(false)}>取消</button>
          <button type="submit" className="btn-primary">{member ? '保存' : '添加'}</button>
        </div>
      </form>
    </div>
  );
}

// 续费弹窗
function RenewForm({ member, onClose }) {
  const [amount, setAmount] = useState('');
  const [expire, setExpire] = useState(member.expire_date || '');
  const [note, setNote] = useState('续费');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post(`/members/${member.id}/payments`, { amount, note, expire_date: expire || undefined });
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || '操作失败');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => onClose(false)}>
      <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-80 space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Wallet size={16} /> 缴费 / 续费 · {member.nickname}</h3>
        <div>
          <label className="label">金额（元）</label>
          <input className="input" type="number" min="0.01" step="0.01" required autoFocus
            value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label">新到期日（可选，续费顺延用）</label>
          <input className="input" type="date" value={expire} onChange={e => setExpire(e.target.value)} />
        </div>
        <div>
          <label className="label">备注</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={() => onClose(false)}>取消</button>
          <button type="submit" className="btn-primary text-sm">记账</button>
        </div>
      </form>
    </div>
  );
}

// 缴费记录展开行
function PaymentHistory({ memberId }) {
  const [payments, setPayments] = useState(null);
  useEffect(() => {
    api.get(`/members/${memberId}`).then(r => setPayments(r.data.payments));
  }, [memberId]);

  if (!payments) return <div className="px-4 py-3 text-xs text-gray-400">加载中...</div>;
  if (payments.length === 0) return <div className="px-4 py-3 text-xs text-gray-400">暂无缴费记录</div>;
  return (
    <div className="px-6 py-2 bg-cream/60">
      {payments.map(p => (
        <div key={p.id} className="flex items-center gap-4 py-1.5 text-xs text-gray-600">
          <span className="text-gray-400 w-32">{p.paid_at?.slice(0, 16)}</span>
          <span className="font-semibold text-primary-700 w-20">¥{p.amount}</span>
          <span>{p.note || ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function Members() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [renewing, setRenewing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    const { data } = await api.get('/members', { params: { keyword, status } });
    setList(data);
  }
  useEffect(() => { load(); }, [keyword, status]);

  async function remove(m) {
    if (!confirm(`将「${m.nickname}」移出会员名单？\n缴费记录会一并删除，嘉宾资料保留。`)) return;
    await api.delete(`/members/${m.id}`);
    load();
  }

  const totalPaid = list.reduce((s, m) => s + (m.total_paid || 0), 0);
  const activeCount = list.filter(m => m.status === '有效').length;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BadgeCheck size={20} className="text-primary-500" /> 会员名单
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">缴费会员集中管理：入会、续费、到期一目了然</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => setAdding(true)}>
          <Plus size={16} /> 添加会员
        </button>
      </div>

      {/* 汇总 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '会员总数', value: list.length },
          { label: '当前有效', value: activeCount },
          { label: '累计缴费', value: `¥${totalPaid.toFixed(0)}` },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center py-3">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* 筛选 */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input className="input pl-8 text-sm" placeholder="搜索昵称 / 微信 / 手机 / 类型..."
            value={keyword} onChange={e => setKeyword(e.target.value)} />
        </div>
        <select className="input w-32 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="有效">有效</option>
          <option value="已到期">已到期</option>
        </select>
      </div>

      {/* 列表 */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['昵称', '性别', '会员类型', '累计缴费', '开始', '到期', '状态', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">暂无会员，点右上角「添加会员」</td></tr>
            ) : list.map(m => (
              <>
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <button className="text-sm font-medium text-gray-900 hover:text-primary-600"
                      onClick={() => navigate(`/guests/${m.guest_id}`)}>{m.nickname}</button>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{m.gender}</td>
                  <td className="px-4 py-2.5"><span className="badge bg-primary-50 text-primary-700">{m.level}</span></td>
                  <td className="px-4 py-2.5">
                    <button className="text-sm font-semibold text-gray-800 hover:text-primary-600 inline-flex items-center gap-1"
                      onClick={() => setExpanded(expanded === m.id ? null : m.id)} title="查看缴费记录">
                      ¥{m.total_paid}
                      {expanded === m.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{m.start_date || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{m.expire_date || '长期'}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${STATUS_COLORS[m.status]}`}>{m.status}</span></td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => setRenewing(m)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="缴费/续费"><Wallet size={14} /></button>
                      <button onClick={() => setEditing(m)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="编辑"><Pencil size={14} /></button>
                      <button onClick={() => remove(m)} className="p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded" title="移出会员"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                {expanded === m.id && (
                  <tr key={`${m.id}-pay`}>
                    <td colSpan={8} className="p-0 border-t border-gray-50"><PaymentHistory memberId={m.id} /></td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <MemberForm onClose={ok => { setAdding(false); if (ok) load(); }} />}
      {editing && <MemberForm member={editing} onClose={ok => { setEditing(null); if (ok) load(); }} />}
      {renewing && <RenewForm member={renewing} onClose={ok => { setRenewing(null); if (ok) load(); }} />}
    </div>
  );
}
