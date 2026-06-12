import { useState } from 'react';
import api from '../api';
import { X } from 'lucide-react';

const CIRCLES = ['体制内', '教师', '医护', '金融', '互联网', '法律', '艺术传媒', '创业', '其他'];
const EDUCATIONS = ['高中及以下', '大专', '本科', '硕士', '博士'];
const MARITALS = ['未婚', '离异', '丧偶'];
const AUDIT_STATUSES = ['待审', '通过', '拒绝', '待补'];
const INCOMES = ['5万以下', '5-10万', '10-20万', '20-50万', '50万以上'];

const BLANK = {
  nickname: '', real_name: '', gender: '女',
  birth_year: '', district: '', occupation: '', circle: '',
  education: '', marital: '未婚', height: '', contact: '',
  birth_date: '', birth_time: '',
  display_consent: 0, portrait_consent: 0,
  audit_status: '待审',
  audit_flags: { real_name: false, id_card: false, single_promise: false },
  preferences: '', notes: '', self_intro: '', interests: '', income: '',
  pref_age_min: '', pref_age_max: '', pref_height_min: '', pref_height_max: '',
  pref_education: '', pref_income: '', pref_circle: '', pref_district: '', pref_marital: '',
};

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pt-2 border-t border-gray-100">{title}</h4>
      {children}
    </div>
  );
}

export default function GuestForm({ guest, onClose }) {
  const init = guest ? {
    ...BLANK, ...guest,
    audit_flags: guest.audit_flags
      ? (typeof guest.audit_flags === 'string' ? JSON.parse(guest.audit_flags) : guest.audit_flags)
      : BLANK.audit_flags,
  } : BLANK;

  const [form, setForm] = useState(init);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (guest?.id) await api.put(`/guests/${guest.id}`, form);
      else await api.post('/guests', form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">{guest ? '编辑嘉宾' : '新建嘉宾'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* 基本信息 */}
          <Section title="基本信息">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">昵称 / 代号 *</label>
                <input className="input" value={form.nickname} onChange={e => set('nickname', e.target.value)} required />
              </div>
              <div>
                <label className="label">真实姓名（加密）</label>
                <input className="input" value={form.real_name} onChange={e => set('real_name', e.target.value)} placeholder="仅管理员可见" />
              </div>
              <div>
                <label className="label">性别 *</label>
                <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)} required>
                  <option value="女">女</option>
                  <option value="男">男</option>
                </select>
              </div>
              <div>
                <label className="label">出生日期（用于八字合盘）</label>
                <input className="input" type="date" value={form.birth_date}
                  onChange={e => { set('birth_date', e.target.value); if (e.target.value) set('birth_year', +e.target.value.slice(0,4)); }} />
              </div>
              <div>
                <label className="label">出生时辰</label>
                <select className="input" value={form.birth_time} onChange={e => set('birth_time', e.target.value)}>
                  <option value="">不清楚</option>
                  {['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">出生年份（无完整生日时填）</label>
                <input className="input" type="number" min={1960} max={2010} value={form.birth_year} onChange={e => set('birth_year', e.target.value)} placeholder="如 1995" />
              </div>
              <div>
                <label className="label">所在区</label>
                <input className="input" value={form.district} onChange={e => set('district', e.target.value)} placeholder="如 朝阳区" />
              </div>
              <div>
                <label className="label">职业</label>
                <input className="input" value={form.occupation} onChange={e => set('occupation', e.target.value)} />
              </div>
              <div>
                <label className="label">圈层</label>
                <select className="input" value={form.circle} onChange={e => set('circle', e.target.value)}>
                  <option value="">请选择</option>
                  {CIRCLES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">学历</label>
                <select className="input" value={form.education} onChange={e => set('education', e.target.value)}>
                  <option value="">请选择</option>
                  {EDUCATIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="label">婚况</label>
                <select className="input" value={form.marital} onChange={e => set('marital', e.target.value)}>
                  {MARITALS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">身高（cm）</label>
                <input className="input" type="number" min={140} max={220} value={form.height} onChange={e => set('height', e.target.value)} />
              </div>
              <div>
                <label className="label">年收入</label>
                <select className="input" value={form.income} onChange={e => set('income', e.target.value)}>
                  <option value="">请选择</option>
                  {INCOMES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="label">联系方式（加密）</label>
                <input className="input" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="微信号" />
              </div>
            </div>
          </Section>

          {/* 自我介绍 */}
          <Section title="自我介绍 & 兴趣">
            <div className="space-y-3">
              <div>
                <label className="label">自我介绍</label>
                <textarea className="input h-20 resize-none" value={form.self_intro} onChange={e => set('self_intro', e.target.value)} placeholder="性格、生活状态、亮点..." />
              </div>
              <div>
                <label className="label">兴趣爱好</label>
                <input className="input" value={form.interests} onChange={e => set('interests', e.target.value)} placeholder="如：健身、旅行、摄影、烘焙" />
              </div>
            </div>
          </Section>

          {/* 择偶条件（结构化） */}
          <Section title="择偶条件（用于 AI 匹配）">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">期望年龄范围</label>
                <div className="flex gap-2 items-center">
                  <input className="input" type="number" min={18} max={60} placeholder="最小" value={form.pref_age_min} onChange={e => set('pref_age_min', e.target.value)} />
                  <span className="text-gray-400 text-sm">-</span>
                  <input className="input" type="number" min={18} max={60} placeholder="最大" value={form.pref_age_max} onChange={e => set('pref_age_max', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">期望身高范围（cm）</label>
                <div className="flex gap-2 items-center">
                  <input className="input" type="number" min={150} max={220} placeholder="最低" value={form.pref_height_min} onChange={e => set('pref_height_min', e.target.value)} />
                  <span className="text-gray-400 text-sm">-</span>
                  <input className="input" type="number" min={150} max={220} placeholder="最高" value={form.pref_height_max} onChange={e => set('pref_height_max', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">期望圈层</label>
                <select className="input" value={form.pref_circle} onChange={e => set('pref_circle', e.target.value)}>
                  <option value="">不限</option>
                  {CIRCLES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">期望学历（最低）</label>
                <select className="input" value={form.pref_education} onChange={e => set('pref_education', e.target.value)}>
                  <option value="">不限</option>
                  {EDUCATIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="label">期望收入（最低）</label>
                <select className="input" value={form.pref_income} onChange={e => set('pref_income', e.target.value)}>
                  <option value="">不限</option>
                  {INCOMES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="label">期望地区</label>
                <input className="input" value={form.pref_district} onChange={e => set('pref_district', e.target.value)} placeholder="如 朝阳区，不限留空" />
              </div>
              <div>
                <label className="label">期望婚况</label>
                <select className="input" value={form.pref_marital} onChange={e => set('pref_marital', e.target.value)}>
                  <option value="">不限</option>
                  {MARITALS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">其他择偶要求（文字补充）</label>
              <textarea className="input h-16 resize-none" value={form.preferences} onChange={e => set('preferences', e.target.value)} placeholder="自由填写..." />
            </div>
          </Section>

          {/* 审核 */}
          <Section title="审核状态">
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="label">审核状态</label>
                <select className="input w-36" value={form.audit_status} onChange={e => set('audit_status', e.target.value)}>
                  {AUDIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">核验项目</label>
                <div className="flex gap-4 mt-2">
                  {[['real_name', '实名✓'], ['id_card', '证件✓'], ['single_promise', '单身承诺✓']].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!form.audit_flags[key]}
                        onChange={e => set('audit_flags', { ...form.audit_flags, [key]: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-5 flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.display_consent}
                  onChange={e => set('display_consent', e.target.checked ? 1 : 0)}
                  className="w-4 h-4 accent-primary-600" />
                已授权脱敏展示
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.portrait_consent}
                  onChange={e => set('portrait_consent', e.target.checked ? 1 : 0)}
                  className="w-4 h-4 accent-primary-600" />
                已授权肖像/案例宣传
              </label>
            </div>
            <div className="mt-3">
              <label className="label">红娘备注</label>
              <textarea className="input h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </Section>

          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? '保存中...' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
