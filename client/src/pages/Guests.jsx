import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Plus, Search, Sparkles, Download, Upload, FileSpreadsheet, Ban, Undo2, Heart, ImageDown, Pencil } from 'lucide-react';
import GuestForm from '../components/GuestForm';
import { generateGuestCard } from '../utils/cards';

function downloadBlob(data, filename) {
  const url = URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Guests() {
  const [tab, setTab] = useState(localStorage.getItem('guestsTab') || '女');
  const [guests, setGuests] = useState([]);
  const [counts, setCounts] = useState({ 男: 0, 女: 0, 黑名单: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [ioMsg, setIoMsg] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const filters = {
    keyword: searchParams.get('keyword') || '',
  };

  function switchTab(t) {
    setTab(t);
    localStorage.setItem('guestsTab', t);
  }

  function setFilter(key, val) {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    setSearchParams(p);
  }

  async function load() {
    const base = {};
    for (const [k, v] of searchParams) if (v) base[k] = v;

    const [male, female, black] = await Promise.all([
      api.get('/guests', { params: { ...base, gender: '男', audit_status: '通过', blacklisted: 'false' } }),
      api.get('/guests', { params: { ...base, gender: '女', audit_status: '通过', blacklisted: 'false' } }),
      api.get('/guests', { params: { ...base, blacklisted: 'true' } }),
    ]);
    setCounts({ 男: male.data.length, 女: female.data.length, 黑名单: black.data.length });
    setGuests(tab === '男' ? male.data : tab === '女' ? female.data : black.data);
  }

  useEffect(() => { load(); }, [searchParams.toString(), tab]);

  async function blacklist(g) {
    const reason = prompt(`将「${g.nickname}」拉入黑名单\n请填写原因（如：已婚隐瞒 / 骚扰 / 多次失约）：`);
    if (reason === null) return;
    if (!reason.trim()) { alert('必须填写拉黑原因'); return; }
    await api.put(`/guests/${g.id}`, { blacklisted: 1, blacklist_reason: reason.trim() });
    load();
  }

  async function unblacklist(g) {
    if (!confirm(`将「${g.nickname}」移出黑名单？`)) return;
    await api.put(`/guests/${g.id}`, { blacklisted: 0, blacklist_reason: '' });
    load();
  }

  async function exportFile(format) {
    const { data } = await api.get('/guests-io/export', { params: { format }, responseType: 'blob' });
    downloadBlob(data, `嘉宾库_${new Date().toISOString().slice(0,10)}.${format}`);
  }

  async function downloadTemplate() {
    const { data } = await api.get('/guests-io/template', { responseType: 'blob' });
    downloadBlob(data, '嘉宾导入模板.xlsx');
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setIoMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/guests-io/import', fd);
      setIoMsg({
        type: data.imported > 0 ? 'success' : 'warn',
        text: `导入完成：成功 ${data.imported} 条，跳过 ${data.skipped} 条`,
        errors: data.errors,
      });
      load();
    } catch (err) {
      setIoMsg({ type: 'error', text: err.response?.data?.error || '导入失败' });
    } finally {
      setImporting(false);
    }
  }

  const isBlackTab = tab === '黑名单';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">嘉宾管理</h2>
          <p className="text-xs text-gray-400 mt-0.5">库内嘉宾（已审核通过）· 黑名单单独管理</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary btn-sm" onClick={downloadTemplate} title="下载Excel导入模板">
            <FileSpreadsheet size={14} /> 模板
          </button>
          <button className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload size={14} /> {importing ? '导入中...' : '导入'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          <button className="btn-secondary btn-sm" onClick={() => exportFile('xlsx')}>
            <Download size={14} /> 导出Excel
          </button>
          <button className="btn-secondary btn-sm" onClick={() => exportFile('csv')}>
            <Download size={14} /> 导出CSV
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> 新建嘉宾</button>
        </div>
      </div>

      {ioMsg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          ioMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200'
          : ioMsg.type === 'warn' ? 'bg-amber-50 text-amber-700 border border-amber-200'
          : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <span>{ioMsg.text}</span>
            <button onClick={() => setIoMsg(null)} className="text-xs opacity-60 hover:opacity-100">关闭</button>
          </div>
          {ioMsg.errors?.length > 0 && (
            <ul className="mt-2 text-xs space-y-0.5 opacity-80 max-h-32 overflow-y-auto">
              {ioMsg.errors.map((e, i) => <li key={i}>· {e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Gender / Blacklist tabs */}
      <div className="card flex gap-1.5 p-1.5 items-center">
        <button onClick={() => switchTab('女')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tab === '女' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-600 hover:bg-pink-50'}`}>
          ♀ 女嘉宾 <span className={tab === '女' ? 'text-white/80' : 'text-pink-400'}>{counts['女']}</span>
        </button>
        <button onClick={() => switchTab('男')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tab === '男' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:bg-blue-50'}`}>
          ♂ 男嘉宾 <span className={tab === '男' ? 'text-white/80' : 'text-blue-400'}>{counts['男']}</span>
        </button>
        <button onClick={() => switchTab('黑名单')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tab === '黑名单' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
          🚫 黑名单 <span className={tab === '黑名单' ? 'text-white/80' : 'text-gray-400'}>{counts['黑名单']}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input className="input pl-8 text-sm" placeholder="全字段搜索：昵称 / 姓名 / 职业 / 圈层 / 区域 / 学校 / 标签 / 兴趣 / 微信 / 手机 / 备注..."
            value={filters.keyword} onChange={e => setFilter('keyword', e.target.value)} />
        </div>
        <span className="text-xs text-gray-400 shrink-0">共 {guests.length} 人</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className={`border-b ${isBlackTab ? 'bg-gray-800' : tab === '男' ? 'bg-blue-50 border-blue-100' : 'bg-pink-50 border-pink-100'}`}>
            <tr>
              {(isBlackTab
                ? ['昵称', '性别', '年龄', '圈层', '拉黑原因', '操作']
                : ['昵称', '年龄', '圈层', '职业', '学历', '身高', '所在区', '操作']
              ).map(h => (
                <th key={h} className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${isBlackTab ? 'text-gray-300' : tab === '男' ? 'text-blue-600' : 'text-pink-600'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {guests.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                {isBlackTab ? '黑名单为空，干干净净 ✨' : '暂无嘉宾'}
              </td></tr>
            ) : guests.map(g => {
              const age = g.birth_year ? new Date().getFullYear() - g.birth_year : null;
              return (
                <tr key={g.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/guests/${g.id}`)}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {g.nickname}
                    {g.admin_tags && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.admin_tags.split(',').filter(Boolean).slice(0, 3).map(t => (
                          <span key={t} className="px-1.5 py-0 rounded-full bg-primary-50 text-primary-600 text-xs font-normal">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  {isBlackTab ? (
                    <>
                      <td className="px-4 py-3 text-sm text-gray-600">{g.gender}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{age ? `${age}岁` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{g.circle || '-'}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{g.blacklist_reason || '-'}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button className="btn-secondary btn-sm" onClick={() => unblacklist(g)}>
                          <Undo2 size={12} /> 移出黑名单
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-gray-500">{age ? `${age}岁` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{g.circle || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{g.occupation || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{g.education || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{g.height ? `${g.height}cm` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{g.district || '-'}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => navigate(`/matching/${g.id}`)}
                            className="p-1.5 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100" title="AI 匹配">
                            <Sparkles size={14} />
                          </button>
                          <button onClick={() => navigate(`/hepan?guest=${g.id}`)}
                            className="p-1.5 rounded-lg text-rose-500 bg-rose-50 hover:bg-rose-100" title="八字合盘">
                            <Heart size={14} />
                          </button>
                          <button onClick={() => {
                              if (!g.display_consent) { alert('⚠️ 该嘉宾未授权脱敏展示，不能生成对外卡片'); return; }
                              generateGuestCard(g);
                            }}
                            className="p-1.5 rounded-lg text-teal-600 bg-teal-50 hover:bg-teal-100" title="生成脱敏卡">
                            <ImageDown size={14} />
                          </button>
                          <button onClick={() => setEditingGuest(g)}
                            className="p-1.5 rounded-lg text-gray-500 bg-gray-50 hover:bg-gray-100" title="编辑资料">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => blacklist(g)}
                            className="p-1.5 rounded-lg text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-600" title="拉入黑名单">
                            <Ban size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && <GuestForm onClose={() => { setShowForm(false); load(); }} />}
      {editingGuest && <GuestForm guest={editingGuest} onClose={() => { setEditingGuest(null); load(); }} />}
    </div>
  );
}
