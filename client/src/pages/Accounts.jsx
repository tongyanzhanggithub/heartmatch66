import { useEffect, useState } from 'react';
import api from '../api';
import { UserCog, Plus, KeyRound, Trash2, Crown } from 'lucide-react';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || '加载失败');
    }
  }

  useEffect(() => { load(); }, []);

  function flash(text) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  }

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/accounts', form);
      setForm({ username: '', password: '' });
      setCreating(false);
      flash('✅ 子账号已创建');
      load();
    } catch (err) {
      alert(err.response?.data?.error || '创建失败');
    }
  }

  async function resetPassword(acc) {
    const pwd = prompt(`重置「${acc.username}」的密码（至少 8 位）：`);
    if (!pwd) return;
    try {
      await api.put(`/accounts/${acc.id}/password`, { new_password: pwd });
      flash(`✅ 「${acc.username}」密码已重置`);
    } catch (err) {
      alert(err.response?.data?.error || '重置失败');
    }
  }

  async function remove(acc) {
    if (!confirm(`确定删除子账号「${acc.username}」？该账号将立即无法登录。`)) return;
    try {
      await api.delete(`/accounts/${acc.id}`);
      flash(`已删除「${acc.username}」`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || '删除失败');
    }
  }

  if (error) {
    return (
      <div className="card text-center py-12 max-w-lg">
        <p className="text-gray-400">🔒 {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog size={20} className="text-primary-500" /> 账号管理
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">创建子账号给助理红娘使用，所有操作会记入操作记录</p>
        </div>
        <button className="btn-primary flex items-center gap-1.5 text-sm" onClick={() => setCreating(v => !v)}>
          <Plus size={16} /> 新建子账号
        </button>
      </div>

      {msg && <div className="text-sm text-green-600">{msg}</div>}

      {creating && (
        <form onSubmit={create} className="card flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-40">
            <label className="text-xs text-gray-500 block mb-1">用户名（2-20 位字母/数字/下划线）</label>
            <input className="input text-sm" value={form.username} required
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-xs text-gray-500 block mb-1">初始密码（至少 8 位）</label>
            <input className="input text-sm" value={form.password} required minLength={8}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary text-sm">创建</button>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 px-4 py-3">
              <span className="font-mono text-sm font-semibold text-gray-800">{acc.username}</span>
              {acc.is_main ? (
                <span className="badge bg-amber-50 text-amber-700 flex items-center gap-1">
                  <Crown size={12} /> 主账号
                </span>
              ) : (
                <span className="badge bg-gray-100 text-gray-600">子账号</span>
              )}
              <div className="flex-1" />
              <button className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1"
                onClick={() => resetPassword(acc)}>
                <KeyRound size={14} /> 重置密码
              </button>
              {!acc.is_main && (
                <button className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                  onClick={() => remove(acc)}>
                  <Trash2 size={14} /> 删除
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
