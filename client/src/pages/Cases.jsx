import { useEffect, useState } from 'react';
import api from '../api';
import { Trophy, Plus, X, Pencil, Trash2, Heart, Globe, Lock } from 'lucide-react';

function CaseForm({ initial, onClose }) {
  const editing = !!initial?.id;
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState({
    introduction_id: initial?.introduction_id || '',
    title: initial?.title || '',
    story: initial?.story || '',
    happened_at: initial?.happened_at || new Date().toISOString().slice(0, 10),
    is_public: initial?.is_public ? 1 : 0,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!editing) api.get('/cases/candidates').then(r => setCandidates(r.data));
  }, [editing]);

  async function submit() {
    if (!form.story.trim()) { setError('请填写案例内容'); return; }
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/cases/${initial.id}`, form);
      else await api.post('/cases', form);
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || '保存失败');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => onClose(false)}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">{editing ? '编辑成功案例' : '新增成功案例'}</h3>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {!editing && candidates.length > 0 && (
            <div>
              <label className="label">关联牵线（已成功，可选）</label>
              <select className="input" value={form.introduction_id} onChange={e => set('introduction_id', e.target.value)}>
                <option value="">不关联</option>
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>{c.a_nickname} ♥ {c.b_nickname}（{c.updated_at?.slice(0, 10)}）</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">案例标题</label>
            <input className="input" placeholder="如：白领专场牵手成功" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label className="label">案例内容 *</label>
            <textarea className="input h-32 resize-none" placeholder="脱敏描述他们如何相识、相处、走到一起..."
              value={form.story} onChange={e => set('story', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">成功日期</label>
              <input className="input" type="date" value={form.happened_at} onChange={e => set('happened_at', e.target.value)} />
            </div>
            <div>
              <label className="label">对外公开</label>
              <button type="button" onClick={() => set('is_public', form.is_public ? 0 : 1)}
                className={`input flex items-center gap-2 ${form.is_public ? 'text-green-600' : 'text-gray-400'}`}>
                {form.is_public ? <><Globe size={15} /> 可作宣传素材</> : <><Lock size={15} /> 仅内部</>}
              </button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => onClose(false)}>取消</button>
            <button className="btn-primary" disabled={saving} onClick={submit}>{saving ? '保存中...' : '保存'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Cases() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await api.get('/cases');
    setList(data);
  }
  useEffect(() => { load(); }, []);

  async function del(c) {
    if (!confirm('删除这个成功案例？')) return;
    await api.delete(`/cases/${c.id}`);
    load();
  }

  const publicCount = list.filter(c => c.is_public).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" /> 成功案例库
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">沉淀脱单成功故事，标记「可公开」的即是最好的宣传素材</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> 新增案例</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-3"><p className="text-2xl font-bold text-gray-900">{list.length}</p><p className="text-xs text-gray-400 mt-1">成功案例</p></div>
        <div className="card text-center py-3"><p className="text-2xl font-bold text-green-600">{publicCount}</p><p className="text-xs text-gray-400 mt-1">可对外宣传</p></div>
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            还没有成功案例 —— 牵线状态改为「已成功」后，可在此沉淀故事
          </div>
        ) : list.map(c => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{c.title || '成功案例'}</h3>
                  {c.is_public
                    ? <span className="badge bg-green-100 text-green-700 inline-flex items-center gap-1"><Globe size={11} /> 可公开</span>
                    : <span className="badge bg-gray-100 text-gray-400 inline-flex items-center gap-1"><Lock size={11} /> 内部</span>}
                </div>
                {(c.a_nickname || c.b_nickname) && (
                  <p className="text-sm text-pink-600 mt-1 flex items-center gap-1.5">
                    {c.a_nickname} <Heart size={12} fill="currentColor" /> {c.b_nickname}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">{c.story}</p>
                {c.happened_at && <p className="text-xs text-gray-400 mt-2">🎉 {c.happened_at}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(c)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><Pencil size={14} /></button>
                <button onClick={() => del(c)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNew && <CaseForm onClose={ok => { setShowNew(false); if (ok) load(); }} />}
      {editing && <CaseForm initial={editing} onClose={ok => { setEditing(null); if (ok) load(); }} />}
    </div>
  );
}
