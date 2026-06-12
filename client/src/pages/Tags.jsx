import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Tag, Sparkles, Plus, X, Search } from 'lucide-react';

// 批量打标弹窗：起标签名 → 勾人 → 应用
// mode='admin' 追加红娘标签；mode='circle' 设置圈层（单值，会覆盖原圈层）
function TagAssignModal({ guests, presetTag, mode = 'admin', onClose }) {
  const [tagName, setTagName] = useState(presetTag || '');
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const filtered = guests.filter(g =>
    !keyword || g.nickname.includes(keyword) || (g.occupation || '').includes(keyword) || (g.circle || '').includes(keyword)
  );

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function apply() {
    const tag = tagName.trim();
    if (!tag) { alert('请填写标签名'); return; }
    if (selected.size === 0) { alert('请至少勾选一位嘉宾'); return; }
    setSaving(true);
    try {
      for (const id of selected) {
        const g = guests.find(x => x.id === id);
        if (mode === 'circle') {
          await api.put(`/guests/${id}`, { circle: tag });
        } else {
          const tags = (g.admin_tags || '').split(',').filter(Boolean);
          if (!tags.includes(tag)) {
            await api.put(`/guests/${id}`, { admin_tags: [...tags, tag].join(',') });
          }
        }
      }
      onClose(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">
            {mode === 'circle' ? '👔 ' : '🏷️ '}
            {presetTag
              ? `把嘉宾${mode === 'circle' ? '划入圈层' : '加入'}「${presetTag}」`
              : mode === 'circle' ? '新建圈层并划入嘉宾' : '新建标签并打标'}
          </h3>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-4 space-y-3 border-b border-gray-50">
          {!presetTag && (
            <div>
              <label className="label">{mode === 'circle' ? '圈层名称' : '标签名称'}</label>
              <input className="input"
                placeholder={mode === 'circle' ? '如：高知硕博、海归、国企央企' : '如：小美、顶美、体制内优选'}
                value={tagName} onChange={e => setTagName(e.target.value)} autoFocus />
            </div>
          )}
          {mode === 'circle' && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              ⚠️ 圈层是单选属性：划入新圈层会替换嘉宾原来的圈层（列表中会显示其当前圈层）
            </p>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input className="input pl-8 text-sm" placeholder="搜索嘉宾昵称/职业/圈层"
              value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 divide-y divide-gray-50">
          {filtered.map(g => {
            const age = g.birth_year ? new Date().getFullYear() - g.birth_year : null;
            const checked = selected.has(g.id);
            const alreadyHas = tagName.trim() && (mode === 'circle'
              ? g.circle === tagName.trim()
              : (g.admin_tags || '').split(',').includes(tagName.trim()));
            return (
              <label key={g.id} className={`flex items-center gap-3 py-2.5 cursor-pointer ${alreadyHas ? 'opacity-40' : ''}`}>
                <input type="checkbox" checked={checked} disabled={alreadyHas}
                  onChange={() => toggle(g.id)} className="w-4 h-4 accent-primary-600" />
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${g.gender === '男' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                  {g.nickname.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {g.nickname} {alreadyHas && <span className="text-xs text-gray-400">（{mode === 'circle' ? '已在此圈层' : '已有此标签'}）</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {age ? `${age}岁` : ''} {mode === 'circle' && g.circle ? `当前圈层：${g.circle}` : g.circle || ''} {g.occupation || ''}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">已选 {selected.size} 人</span>
          <button className="btn-primary" disabled={saving} onClick={apply}>
            {saving ? '打标中...' : '确认打标'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tags() {
  const [guests, setGuests] = useState([]);
  const [activeTag, setActiveTag] = useState('');
  const [tagType, setTagType] = useState('admin');
  const [showAssign, setShowAssign] = useState(false);
  const [assignPreset, setAssignPreset] = useState('');
  const navigate = useNavigate();

  async function load() {
    const { data } = await api.get('/guests', { params: { audit_status: '通过' } });
    setGuests(data);
  }

  useEffect(() => { load(); }, []);

  const tagMap = useMemo(() => {
    const map = {};
    for (const g of guests) {
      const tags = tagType === 'admin'
        ? (g.admin_tags || '').split(',').filter(Boolean)
        : (g.circle ? [g.circle] : []);
      for (const t of tags) (map[t] = map[t] || []).push(g);
    }
    return map;
  }, [guests, tagType]);

  const sortedTags = Object.entries(tagMap).sort((a, b) => b[1].length - a[1].length);
  const shown = activeTag ? (tagMap[activeTag] || []) : [];

  async function removeFromTag(g) {
    if (tagType === 'circle') {
      if (!confirm(`把「${g.nickname}」移出圈层「${activeTag}」？（其圈层将清空，可稍后重新划入）`)) return;
      await api.put(`/guests/${g.id}`, { circle: '' });
    } else {
      if (!confirm(`把「${g.nickname}」从标签「${activeTag}」中移出？`)) return;
      const tags = (g.admin_tags || '').split(',').filter(Boolean).filter(t => t !== activeTag);
      await api.put(`/guests/${g.id}`, { admin_tags: tags.join(',') });
    }
    load();
  }

  function openAssign(preset = '') {
    setAssignPreset(preset);
    setShowAssign(true);
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Tag size={20} className="text-primary-500" /> 标签分群
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">自定义标签给嘉宾分群，如「小美」「顶美」「体制内优选」</p>
        </div>
        <button className="btn-primary" onClick={() => openAssign()}>
          <Plus size={16} /> {tagType === 'admin' ? '新建标签' : '新建圈层'}
        </button>
      </div>

      {/* 标签类型切换 */}
      <div className="card flex gap-1.5 p-1.5">
        <button onClick={() => { setTagType('admin'); setActiveTag(''); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tagType === 'admin' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          🏷️ 红娘标签
        </button>
        <button onClick={() => { setTagType('circle'); setActiveTag(''); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tagType === 'circle' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          👔 圈层
        </button>
      </div>

      {/* 标签云 */}
      <div className="card">
        {sortedTags.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {tagType === 'admin'
              ? '还没有标签 — 点右上角「新建标签」创建第一个分群吧'
              : '库内嘉宾还没有圈层信息'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {sortedTags.map(([tag, list]) => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  activeTag === tag
                    ? 'border-primary-500 bg-primary-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                }`}>
                {tag}
                <span className={`px-1.5 py-0 rounded-full text-xs ${activeTag === tag ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                  {list.length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 选中标签的人 */}
      {activeTag && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 bg-primary-50 border-b border-primary-100 flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-primary-800">「{activeTag}」 · {shown.length} 人</span>
            <div className="flex gap-2">
              <button className="btn-secondary btn-sm" onClick={() => openAssign(activeTag)}>
                <Plus size={12} /> {tagType === 'admin' ? '加人到此标签' : '划人到此圈层'}
              </button>
              <button className="text-xs text-primary-500 hover:text-primary-700" onClick={() => setActiveTag('')}>清除筛选</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {shown.map(g => {
              const age = g.birth_year ? new Date().getFullYear() - g.birth_year : null;
              return (
                <div key={g.id} onClick={() => navigate(`/guests/${g.id}`)}
                  className="border border-gray-100 rounded-xl p-3.5 cursor-pointer hover:shadow-md hover:border-primary-200 transition-all group">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${g.gender === '男' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                      {g.nickname.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{g.nickname}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {age ? `${age}岁` : ''} {g.circle || ''} {g.occupation || ''}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-0.5 shrink-0">
                      <button onClick={e => { e.stopPropagation(); navigate(`/matching/${g.id}`); }}
                        className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50" title="AI 匹配">
                        <Sparkles size={15} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeFromTag(g); }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50"
                        title={tagType === 'admin' ? '移出此标签' : '移出此圈层'}>
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                  {g.admin_tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.admin_tags.split(',').filter(Boolean).map(t => (
                        <span key={t} className={`px-1.5 py-0 rounded-full text-xs ${t === activeTag ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-gray-50 text-gray-400'}`}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!activeTag && sortedTags.length > 0 && (
        <p className="text-center text-sm text-gray-300">点击上方任意标签查看对应嘉宾</p>
      )}

      {showAssign && (
        <TagAssignModal guests={guests} presetTag={assignPreset} mode={tagType}
          onClose={changed => { setShowAssign(false); if (changed) load(); }} />
      )}
    </div>
  );
}
