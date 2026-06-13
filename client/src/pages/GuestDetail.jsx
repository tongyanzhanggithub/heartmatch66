import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import GuestForm from '../components/GuestForm';
import { ArrowLeft, Edit, Trash2, AlertTriangle, ImageDown, HeartHandshake, MessageCircle } from 'lucide-react';
import { generateGuestCard } from '../utils/cards';
import FollowUps from '../components/FollowUps';

const INTRO_STATUS_COLOR = {
  '已牵线': 'bg-gray-100 text-gray-600', '已交换微信': 'bg-sky-100 text-sky-700',
  '已约见': 'bg-indigo-100 text-indigo-700', '交往中': 'bg-pink-100 text-pink-700',
  '已成功': 'bg-green-100 text-green-700', '已告吹': 'bg-red-50 text-red-500',
};

// 该嘉宾的牵线情况
function GuestIntroductions({ guestId }) {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  useEffect(() => {
    api.get('/introductions', { params: { guest_id: guestId } }).then(r => setList(r.data));
  }, [guestId]);
  if (list.length === 0) return null;
  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><HeartHandshake size={16} className="text-pink-500" /> 牵线情况</h3>
      <div className="space-y-2">
        {list.map(i => {
          const partner = i.guest_a === Number(guestId) ? i.b_nickname : i.a_nickname;
          const partnerId = i.guest_a === Number(guestId) ? i.guest_b : i.guest_a;
          return (
            <div key={i.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
              <button className="text-sm font-medium text-gray-800 hover:text-primary-600" onClick={() => navigate(`/guests/${partnerId}`)}>
                ♥ {partner}
              </button>
              <div className="flex items-center gap-2">
                {i.match_score != null && <span className="text-xs text-purple-500">{i.match_score}分</span>}
                <span className={`badge ${INTRO_STATUS_COLOR[i.status]}`}>{i.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const AUDIT_COLORS = { '待审': 'bg-amber-100 text-amber-700', '通过': 'bg-green-100 text-green-700', '拒绝': 'bg-red-100 text-red-600', '待补': 'bg-gray-100 text-gray-600' };

function Field({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

const WX_COLORS = { '金':'bg-yellow-100 text-yellow-700', '木':'bg-green-100 text-green-700', '水':'bg-blue-100 text-blue-700', '火':'bg-red-100 text-red-600', '土':'bg-amber-100 text-amber-800' };

// 常用红娘标签快捷选项
const QUICK_TAGS = ['优质嘉宾', '高意向', '需跟进', '颜值高', '条件好', '性格好', '回复慢', '挑剔', '急婚', '观望中', '老会员', '转介绍来源'];

function AdminTags({ guest, onSaved }) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const tags = (guest.admin_tags || '').split(',').filter(Boolean);

  async function save(next) {
    await api.put(`/guests/${guest.id}`, { admin_tags: next.join(',') });
    onSaved();
  }

  function addTag(t) {
    const tag = t.trim();
    if (!tag || tags.includes(tag)) return;
    save([...tags, tag]);
    setInput('');
    setAdding(false);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">🏷️ 红娘标签</h3>
        <button className="btn-secondary btn-sm" onClick={() => setAdding(v => !v)}>{adding ? '收起' : '+ 加标签'}</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && !adding && <span className="text-xs text-gray-300">暂无标签，点右上角添加</span>}
        {tags.map(t => (
          <span key={t} className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-sm border border-primary-100">
            {t}
            <button onClick={() => save(tags.filter(x => x !== t))}
              className="text-primary-300 hover:text-red-500 font-bold" title="移除">×</button>
          </span>
        ))}
      </div>
      {adding && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input className="input flex-1 text-sm" placeholder="输入自定义标签，回车添加" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag(input)} autoFocus />
            <button className="btn-primary btn-sm" onClick={() => addTag(input)}>添加</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.filter(t => !tags.includes(t)).map(t => (
              <button key={t} onClick={() => addTag(t)}
                className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200">
                + {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FortuneCard({ guestId }) {
  const [fortune, setFortune] = useState(null);
  useEffect(() => {
    api.get(`/fortune/guest/${guestId}`).then(r => setFortune(r.data)).catch(() => {});
  }, [guestId]);

  if (!fortune?.bazi) return null;
  const b = fortune.bazi;

  return (
    <div className="card bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        🔮 命理信息
        {b.precision === 'year' && <span className="text-xs font-normal text-gray-400">（仅有出生年份，信息有限）</span>}
      </h3>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="badge bg-purple-100 text-purple-700">属{b.shengxiao}</span>
        {b.xingzuo && <span className="badge bg-indigo-100 text-indigo-700">{b.xingzuo}座（{b.xingzuo_element}象）</span>}
        <span className="badge bg-white/80 text-gray-600">纳音：{b.nayin}</span>
        {b.day_master && <span className="badge bg-white/80 text-gray-600">日主：{b.day_master}</span>}
      </div>

      {b.pillars.day && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[['年柱', b.pillars.year], ['月柱', b.pillars.month], ['日柱', b.pillars.day], ['时柱', b.pillars.time || '—']].map(([label, val]) => (
            <div key={label} className="bg-white/70 rounded-lg py-2 text-center">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-bold text-gray-800 text-lg tracking-wider">{val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-gray-400">五行：</span>
        {Object.entries(b.wuxing).map(([wx, n]) => (
          <span key={wx} className={`badge ${WX_COLORS[wx]} ${n === 0 ? 'opacity-40' : ''}`}>{wx} ×{n}</span>
        ))}
        {b.missing.length > 0 && <span className="text-gray-400">缺{b.missing.join('、')}</span>}
      </div>
      {b.lunar_date && <p className="text-xs text-gray-400 mt-2">农历：{b.lunar_date}</p>}
    </div>
  );
}

export default function GuestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guest, setGuest] = useState(null);
  const [editing, setEditing] = useState(false);

  async function load() {
    const { data } = await api.get(`/guests/${id}`);
    setGuest(data);
  }

  useEffect(() => { load(); }, [id]);

  async function del() {
    if (!confirm('确定删除该嘉宾？（软删除，数据保留）')) return;
    await api.delete(`/guests/${id}`);
    navigate('/guests');
  }

  async function toggleBlacklist() {
    if (guest.blacklisted) {
      if (!confirm(`将「${guest.nickname}」移出黑名单？`)) return;
      await api.put(`/guests/${id}`, { blacklisted: 0, blacklist_reason: '' });
    } else {
      const reason = prompt(`将「${guest.nickname}」拉入黑名单\n请填写原因（如：已婚隐瞒 / 骚扰 / 多次失约）：`);
      if (reason === null) return;
      if (!reason.trim()) { alert('必须填写拉黑原因'); return; }
      await api.put(`/guests/${id}`, { blacklisted: 1, blacklist_reason: reason.trim() });
    }
    load();
  }

  if (!guest) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  let flags = {};
  try { flags = typeof guest.audit_flags === 'string' ? JSON.parse(guest.audit_flags || '{}') : (guest.audit_flags || {}); } catch { /* 脏数据兜底为空 */ }
  const age = guest.birth_year ? new Date().getFullYear() - guest.birth_year : null;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/guests')} className="btn-secondary btn-sm"><ArrowLeft size={14} /> 返回</button>
        <h2 className="text-xl font-bold text-gray-900 flex-1">{guest.nickname}</h2>
        <button className="btn-secondary" onClick={() => {
          if (!guest.display_consent) {
            alert('⚠️ 该嘉宾未勾选「同意脱敏展示」授权，不能生成对外卡片。\n请先取得本人同意并在编辑中勾选授权。');
            return;
          }
          generateGuestCard(guest);
        }}><ImageDown size={14} /> 脱敏卡</button>
        <button className="btn-secondary" onClick={() => setEditing(true)}><Edit size={14} /> 编辑</button>
        <button className={guest.blacklisted ? 'btn-secondary' : 'btn bg-gray-700 text-white hover:bg-gray-800'} onClick={toggleBlacklist}>
          {guest.blacklisted ? '移出黑名单' : '🚫 拉黑'}
        </button>
        <button className="btn-danger" onClick={del}><Trash2 size={14} /> 删除</button>
      </div>

      {guest.blacklisted && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          <AlertTriangle size={16} /> 黑名单：{guest.blacklist_reason || '已标记'}
        </div>
      )}

      {(() => {
        let photos = [];
        try { photos = guest.photos ? JSON.parse(guest.photos) : []; } catch { /* 忽略脏数据 */ }
        return photos.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">📷 照片</h3>
            <div className="flex flex-wrap gap-3">
              {photos.map(name => (
                <a key={name} href={`/uploads/${name}`} target="_blank" rel="noreferrer"
                  className="block w-28 h-28 rounded-xl overflow-hidden border border-gray-200 hover:ring-2 hover:ring-primary-300 transition-shadow">
                  <img src={`/uploads/${name}`} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">基本信息</h3>
          <span className={`badge ${AUDIT_COLORS[guest.audit_status]}`}>{guest.audit_status}</span>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="性别" value={guest.gender} />
          <Field label="年龄" value={age ? `${age}岁（${guest.birth_year}年）` : null} />
          <Field label="所在区" value={guest.district} />
          <Field label="职业" value={guest.occupation} />
          <Field label="圈层" value={guest.circle?.split(',').join('、')} />
          <Field label="学历" value={guest.education} />
          <Field label="婚况" value={guest.marital} />
          <Field label="身高" value={guest.height ? `${guest.height}cm` : null} />
          <Field label="体型" value={guest.body_type} />
          <Field label="籍贯" value={guest.hometown} />
          <Field label="年收入" value={guest.income} />
          <Field label="住房" value={guest.housing} />
          <Field label="车辆" value={guest.car} />
          <Field label="录入时间" value={guest.created_at?.slice(0,10)} />
        </dl>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">核验项目</p>
          <div className="flex gap-3">
            {[['real_name', '实名'], ['id_card', '证件'], ['single_promise', '单身承诺']].map(([key, label]) => (
              <span key={key} className={`badge ${flags[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {flags[key] ? '✓' : '✗'} {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <AdminTags guest={guest} onSaved={load} />

      <GuestIntroductions guestId={id} />

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MessageCircle size={16} className="text-primary-500" /> 跟进记录</h3>
        <FollowUps targetType="guest" targetId={id} />
      </div>

      {/* 性格与生活 */}
      {(guest.mbti || guest.attachment_style || guest.intention || guest.personality_tags || guest.lifestyle_tags || guest.value_tags || guest.sport_tags || guest.qa_answers) && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900">性格与生活</h3>
          <div className="flex flex-wrap gap-2">
            {guest.mbti && <span className="badge bg-violet-100 text-violet-700">MBTI: {guest.mbti}</span>}
            {guest.attachment_style && <span className="badge bg-fuchsia-100 text-fuchsia-700">🔗 依恋·{guest.attachment_style}</span>}
            {guest.intention && <span className="badge bg-rose-100 text-rose-700">💍 {guest.intention}</span>}
            {guest.family_plan && <span className="badge bg-sky-100 text-sky-700">👶 {guest.family_plan}</span>}
            {guest.preferred_date && <span className="badge bg-teal-100 text-teal-700">☕ 喜欢{guest.preferred_date}</span>}
            {guest.work_type && <span className="badge bg-gray-100 text-gray-600">{guest.work_type}</span>}
            {guest.school && <span className="badge bg-gray-100 text-gray-600">🎓 {guest.school}</span>}
          </div>
          {[['个性', guest.personality_tags], ['运动', guest.sport_tags], ['生活', guest.lifestyle_tags], ['价值观', guest.value_tags]].map(([label, tags]) => tags && (
            <div key={label} className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-400 w-12">{label}</span>
              {tags.split(',').filter(Boolean).map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-xs text-gray-600">{t}</span>
              ))}
            </div>
          ))}
          {guest.relationship_value && <Field label="关系观" value={guest.relationship_value} />}
          {guest.dealbreakers && (
            <div className="bg-red-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-red-400 text-xs">⛔ 绝对不能接受：</span>
              <span className="text-red-700">{guest.dealbreakers}</span>
            </div>
          )}
          {guest.qa_answers && (() => {
            try {
              const qa = JSON.parse(guest.qa_answers);
              const questions = ['什么瞬间会让你心动？', '你理想中的相处模式是？', '你的周末一般怎么过？'];
              return qa.some(a => a) && (
                <div className="space-y-2 pt-2 border-t border-gray-50">
                  {qa.map((a, i) => a && (
                    <div key={i}>
                      <p className="text-xs text-gray-400">Q: {questions[i]}</p>
                      <p className="text-sm text-gray-700">A: {a}</p>
                    </div>
                  ))}
                </div>
              );
            } catch { return null; }
          })()}
        </div>
      )}

      <FortuneCard guestId={id} />

      {(guest.preferences || guest.notes || guest.contact || guest.self_intro || guest.one_liner) && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900">详细信息</h3>
          {guest.contact && <Field label="联系方式（微信）" value={guest.contact} />}
          {guest.phone && <Field label="手机号" value={guest.phone} />}
          {guest.one_liner && <Field label="一句话介绍" value={guest.one_liner} />}
          {guest.self_intro && <Field label="自我介绍" value={guest.self_intro} />}
          {guest.interests && <Field label="兴趣爱好" value={guest.interests} />}
          {guest.preferences && <Field label="择偶要求" value={guest.preferences} />}
          {guest.accept_long_distance && <Field label="接受异地" value={guest.accept_long_distance} />}
          {guest.accept_children && <Field label="接受带孩" value={guest.accept_children} />}
          {guest.same_city_only && <Field label="同城优先" value={guest.same_city_only} />}
          {guest.id_last4 && <Field label="身份证后四位" value={guest.id_last4} />}
          {guest.credentials && <Field label="可提供核验材料" value={guest.credentials.split(',').join('、')} />}
          {guest.interested_events && <Field label="感兴趣的专场" value={guest.interested_events.split(',').join('、')} />}
          {guest.source_channel && <Field label="来源渠道" value={guest.source_channel} />}
          {guest.notes && <Field label="红娘备注" value={guest.notes} />}
          <div className="flex gap-3 pt-1 flex-wrap">
            <span className={`badge ${guest.single_promise ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {guest.single_promise ? '✓' : '✗'} 单身承诺
            </span>
            <span className={`badge ${guest.agree_disclaimer ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {guest.agree_disclaimer ? '✓' : '✗'} 免责协议
            </span>
            <span className={`badge ${guest.display_consent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {guest.display_consent ? '✓' : '✗'} 脱敏展示授权
            </span>
            <span className={`badge ${guest.portrait_consent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {guest.portrait_consent ? '✓' : '✗'} 肖像案例授权
            </span>
          </div>
        </div>
      )}

      {guest.history?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">参与历史</h3>
          <div className="space-y-2">
            {guest.history.map(h => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                <span className="font-medium text-gray-800">{h.title}</span>
                <div className="flex items-center gap-3 text-gray-500">
                  <span>{h.date_time?.slice(0,10)}</span>
                  <span className={`badge ${h.attended ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {h.attended ? '已到场' : '未到场'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && <GuestForm guest={guest} onClose={() => { setEditing(false); load(); }} />}
    </div>
  );
}
