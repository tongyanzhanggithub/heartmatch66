import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Check, X, FileQuestion, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const TABS = [
  { key: '待审', label: '待审核', color: 'text-amber-600' },
  { key: '待补', label: '待补材料', color: 'text-blue-600' },
  { key: '拒绝', label: '已拒绝', color: 'text-red-500' },
];

function InfoItem({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="text-sm">
      <span className="text-gray-400">{label}：</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

function AuditCard({ guest, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [flags, setFlags] = useState(() => {
    try { return typeof guest.audit_flags === 'string' ? JSON.parse(guest.audit_flags || '{}') : (guest.audit_flags || {}); }
    catch { return {}; }
  });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const age = guest.birth_year ? new Date().getFullYear() - guest.birth_year : null;

  async function act(decision) {
    if ((decision === '拒绝' || decision === '待补') && !reason.trim()) {
      alert(decision === '拒绝' ? '请填写拒绝原因' : '请注明需要补充什么材料');
      return;
    }
    setBusy(true);
    try {
      await onAction(guest.id, decision, reason.trim(), flags);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${guest.gender === '男' ? 'bg-blue-500' : 'bg-pink-500'}`}>
          {guest.gender === '男' ? '♂' : '♀'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">
            {guest.nickname}
            {guest.real_name && <span className="ml-2 text-xs font-normal text-gray-400">（{guest.real_name}）</span>}
            {guest.apply_event_title && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                📱 扫码报名：{guest.apply_event_title}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400">
            {age ? `${age}岁` : ''} {guest.district || ''} {guest.occupation || ''} {guest.circle ? `· ${guest.circle}` : ''}
            　提交于 {guest.created_at?.slice(0, 16)}
          </p>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="btn-secondary btn-sm">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 详情
        </button>
      </div>

      {/* 之前的审核记录 */}
      {guest.audit_reason && (
        <div className="mt-2 text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-500">
          上次审核（{guest.audited_at?.slice(0, 16)}）：{guest.audit_reason}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {/* 照片 */}
          {(() => {
            let photos = [];
            try { photos = guest.photos ? JSON.parse(guest.photos) : []; } catch { /* ignore */ }
            return photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photos.map(name => (
                  <a key={name} href={`/uploads/${name}`} target="_blank" rel="noreferrer"
                    className="block w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                    <img src={`/uploads/${name}`} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            );
          })()}

          {/* 基本与条件 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
            <InfoItem label="出生日期" value={guest.birth_date || guest.birth_year} />
            <InfoItem label="出生时辰" value={guest.birth_time} />
            <InfoItem label="出生地" value={guest.birth_place} />
            <InfoItem label="籍贯" value={guest.hometown} />
            <InfoItem label="学历" value={guest.education} />
            <InfoItem label="毕业院校" value={guest.school} />
            <InfoItem label="工作类型" value={guest.work_type} />
            <InfoItem label="婚况" value={guest.marital} />
            <InfoItem label="身高" value={guest.height ? `${guest.height}cm` : null} />
            <InfoItem label="体型" value={guest.body_type} />
            <InfoItem label="收入" value={guest.income} />
            <InfoItem label="住房" value={guest.housing} />
            <InfoItem label="车辆" value={guest.car} />
            <InfoItem label="微信" value={guest.contact} />
            <InfoItem label="手机" value={guest.phone} />
            <InfoItem label="证件后四位" value={guest.id_last4} />
            <InfoItem label="来源" value={guest.source_channel} />
            <InfoItem label="MBTI" value={guest.mbti} />
            <InfoItem label="恋爱意向" value={guest.intention} />
            <InfoItem label="家庭计划" value={guest.family_plan} />
            <InfoItem label="约会方式" value={guest.preferred_date} />
          </div>

          {/* 标签 */}
          {(guest.personality_tags || guest.sport_tags || guest.lifestyle_tags || guest.value_tags || guest.interests) && (
            <div className="space-y-1 pt-2 border-t border-gray-50">
              <InfoItem label="个性" value={guest.personality_tags?.split(',').join('、')} />
              <InfoItem label="运动" value={guest.sport_tags?.split(',').join('、')} />
              <InfoItem label="生活方式" value={guest.lifestyle_tags?.split(',').join('、')} />
              <InfoItem label="价值观" value={guest.value_tags?.split(',').join('、')} />
              <InfoItem label="兴趣爱好" value={guest.interests} />
            </div>
          )}

          {/* 介绍与择偶 */}
          <div className="space-y-1 pt-2 border-t border-gray-50">
            <InfoItem label="一句话介绍" value={guest.one_liner} />
            <InfoItem label="自我介绍" value={guest.self_intro} />
            <InfoItem label="关系观" value={guest.relationship_value} />
            <InfoItem label="期望年龄" value={guest.pref_age_min || guest.pref_age_max ? `${guest.pref_age_min || '?'}-${guest.pref_age_max || '?'}岁` : null} />
            <InfoItem label="期望身高" value={guest.pref_height_min ? `${guest.pref_height_min}cm以上` : null} />
            <InfoItem label="期望圈层" value={guest.pref_circle} />
            <InfoItem label="期望学历" value={guest.pref_education} />
            <InfoItem label="期望收入" value={guest.pref_income} />
            <InfoItem label="期望婚况" value={guest.pref_marital} />
            <InfoItem label="接受异地" value={guest.accept_long_distance} />
            <InfoItem label="接受带孩" value={guest.accept_children} />
            <InfoItem label="同城优先" value={guest.same_city_only} />
            <InfoItem label="择偶要求" value={guest.preferences} />
            {guest.dealbreakers && (
              <p className="text-sm"><span className="text-red-400">⛔ 不能接受：</span><span className="text-red-600">{guest.dealbreakers}</span></p>
            )}
          </div>

          {/* 快问快答 */}
          {guest.qa_answers && (() => {
            try {
              const qa = JSON.parse(guest.qa_answers);
              const questions = ['什么瞬间会让你心动？', '你理想中的相处模式是？', '你的周末一般怎么过？'];
              return qa.some(a => a) && (
                <div className="space-y-1 pt-2 border-t border-gray-50">
                  {qa.map((a, i) => a && (
                    <p key={i} className="text-sm"><span className="text-gray-400">Q: {questions[i]}</span> <span className="text-gray-700">{a}</span></p>
                  ))}
                </div>
              );
            } catch { return null; }
          })()}

          {/* 材料与承诺 */}
          <div className="space-y-1 pt-2 border-t border-gray-50">
            <InfoItem label="可提供材料" value={guest.credentials?.split(',').join('、')} />
            <InfoItem label="感兴趣专场" value={guest.interested_events?.split(',').join('、')} />
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className={`badge ${guest.single_promise ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                {guest.single_promise ? '✓ 单身承诺' : '✗ 未签单身承诺'}
              </span>
              <span className={`badge ${guest.agree_disclaimer ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                {guest.agree_disclaimer ? '✓ 免责协议' : '✗ 未签免责协议'}
              </span>
              <span className={`badge ${guest.display_consent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {guest.display_consent ? '✓ 同意脱敏展示' : '— 未授权脱敏展示'}
              </span>
              <span className={`badge ${guest.portrait_consent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {guest.portrait_consent ? '✓ 同意肖像宣传' : '— 未授权肖像宣传'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 核验勾选 */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-gray-400">核验：</span>
        {[['real_name', '实名'], ['id_card', '证件'], ['single_promise', '单身承诺']].map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={!!flags[key]}
              onChange={e => setFlags(f => ({ ...f, [key]: e.target.checked }))}
              className="w-4 h-4 accent-green-600" />
            {label}
          </label>
        ))}
        <span className="text-xs text-gray-300">（核验后即删证件，只留勾选标记）</span>
      </div>

      {/* 操作区 */}
      <div className="mt-3 flex gap-2 items-center flex-wrap">
        <input className="input flex-1 min-w-40 text-sm" placeholder="审核意见 / 拒绝原因 / 待补材料说明"
          value={reason} onChange={e => setReason(e.target.value)} />
        {guest.audit_status !== '通过' && (
          <button className="btn bg-green-600 text-white hover:bg-green-700" disabled={busy}
            onClick={() => act('通过')}>
            <Check size={15} /> 通过入库
          </button>
        )}
        {guest.audit_status === '待审' && (
          <button className="btn bg-blue-500 text-white hover:bg-blue-600" disabled={busy}
            onClick={() => act('待补')}>
            <FileQuestion size={15} /> 待补
          </button>
        )}
        {guest.audit_status !== '拒绝' ? (
          <button className="btn-danger" disabled={busy} onClick={() => act('拒绝')}>
            <X size={15} /> 拒绝
          </button>
        ) : (
          <button className="btn-secondary" disabled={busy} onClick={() => act('待审')}>
            <RotateCcw size={15} /> 重新审核
          </button>
        )}
      </div>
    </div>
  );
}

export default function Audit() {
  const [tab, setTab] = useState('待审');
  const [guests, setGuests] = useState([]);
  const [counts, setCounts] = useState({});
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  async function load() {
    const [list, ...countResults] = await Promise.all([
      api.get('/guests', { params: { audit_status: tab } }),
      ...TABS.map(t => api.get('/guests', { params: { audit_status: t.key } })),
    ]);
    setGuests(list.data);
    setCounts(Object.fromEntries(TABS.map((t, i) => [t.key, countResults[i].data.length])));
  }

  useEffect(() => { load(); }, [tab]);

  async function handleAction(id, decision, reason, flags) {
    try {
      const { data } = await api.post(`/guests/${id}/audit`, { decision, reason, audit_flags: flags });
      setToast(
        decision === '通过' ? (data.autoRegistered
          ? `✅ 已通过，并自动加入「${data.autoRegistered}」报名名单`
          : '✅ 已通过，嘉宾进入嘉宾库')
        : decision === '拒绝' ? '🚫 已拒绝'
        : decision === '待补' ? '📋 已标记待补材料'
        : '↩️ 已退回待审'
      );
      setTimeout(() => setToast(''), 2500);
      load();
      window.dispatchEvent(new Event('audit-changed'));
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">嘉宾审核</h2>
        <button className="btn-secondary btn-sm" onClick={() => navigate('/guests')}>前往嘉宾库 →</button>
      </div>
      <p className="text-sm text-gray-400 -mt-2">新报名嘉宾在此审核：核验材料 → 通过入库 / 待补材料 / 拒绝。通过后才进入嘉宾库参与活动与匹配。</p>

      {/* Tabs */}
      <div className="card flex gap-1 p-1.5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
            <span className={`ml-1.5 ${tab === t.key ? 'text-white/80' : t.color}`}>
              {counts[t.key] ?? ''}
            </span>
          </button>
        ))}
      </div>

      {toast && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2.5 text-sm">{toast}</div>
      )}

      {/* List */}
      <div className="space-y-3">
        {guests.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            {tab === '待审' ? '🎉 没有待审核的嘉宾' : `暂无${tab}记录`}
          </div>
        ) : guests.map(g => (
          <AuditCard key={`${g.id}-${g.audit_status}`} guest={g} onAction={handleAction} />
        ))}
      </div>
    </div>
  );
}
