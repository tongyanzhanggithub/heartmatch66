import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import EventForm from '../components/EventForm';
import QRCode from 'qrcode';
import { ArrowLeft, Edit, Trash2, Plus, Check, X, ClipboardList, Sparkles, UserCheck, QrCode } from 'lucide-react';
import AddRegistrationModal from '../components/AddRegistrationModal';
import RecommendModal from '../components/RecommendModal';
import CheckinMode from '../components/CheckinMode';

const STATUS_COLORS = { '筹备': 'bg-gray-100 text-gray-600', '报名中': 'bg-blue-100 text-blue-700', '进行中': 'bg-green-100 text-green-700', '已结束': 'bg-gray-100 text-gray-500', '取消': 'bg-red-100 text-red-600' };

// 活动专属报名二维码：嘉宾扫码 → 报名页自动关联该活动
function QrModal({ event, onClose }) {
  const [dataUrl, setDataUrl] = useState('');
  const link = `${window.location.origin}/apply/?event=${event.id}`;

  useEffect(() => {
    QRCode.toDataURL(link, { width: 480, margin: 2 }).then(setDataUrl);
  }, [link]);

  function download() {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `报名二维码_${event.title}.png`;
    a.click();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-96 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 mb-1">{event.title}</h3>
        <p className="text-xs text-gray-400 mb-3">嘉宾扫码填报名表，审核通过后自动加入本活动名单</p>
        {dataUrl && <img src={dataUrl} alt="报名二维码" className="w-64 h-64 mx-auto rounded-lg border border-gray-100" />}
        {event.status !== '报名中' && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">
            ⚠️ 当前活动状态为「{event.status}」，扫码后不会关联本活动。请先将活动状态改为「报名中」。
          </p>
        )}
        <div className="flex items-center gap-2 mt-4 bg-gray-50 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-500 truncate flex-1 text-left">{link}</span>
          <button className="text-xs text-primary-600 shrink-0 font-medium"
            onClick={() => { navigator.clipboard.writeText(link); alert('链接已复制'); }}>复制</button>
        </div>
        <div className="flex gap-2 justify-center mt-4">
          <button className="btn-secondary text-sm" onClick={onClose}>关闭</button>
          <button className="btn-primary text-sm" onClick={download} disabled={!dataUrl}>下载二维码</button>
        </div>
      </div>
    </div>
  );
}
const REG_AUDIT_COLORS = { '待审': 'bg-amber-100 text-amber-700', '通过': 'bg-green-100 text-green-700', '拒绝': 'bg-red-100 text-red-600' };

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showAddReg, setShowAddReg] = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);
  const [checkinMode, setCheckinMode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await api.get(`/events/${id}`);
      setEvent(data);
    } catch { navigate('/events'); }
  }

  useEffect(() => { load(); }, [id]);

  async function del() {
    if (!confirm('确定删除该活动？')) return;
    await api.delete(`/events/${id}`);
    navigate('/events');
  }

  async function updateReg(regId, updates) {
    setError('');
    try {
      await api.put(`/registrations/${regId}`, updates);
      load();
    } catch (err) {
      setError(err.response?.data?.error || '操作失败');
    }
  }

  async function deleteReg(regId) {
    if (!confirm('确定移除该报名？')) return;
    await api.delete(`/registrations/${regId}`);
    load();
  }

  if (!event) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  const { stats } = event;
  const maleRate = event.quota_male > 0 ? Math.round((stats.approved_male / event.quota_male) * 100) : 0;
  const femaleRate = event.quota_female > 0 ? Math.round((stats.approved_female / event.quota_female) * 100) : 0;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/events')} className="btn-secondary btn-sm"><ArrowLeft size={14} /> 返回</button>
        <h2 className="text-xl font-bold text-gray-900 flex-1">{event.title}</h2>
        <button className="btn bg-green-600 text-white hover:bg-green-700 btn-sm" onClick={() => setCheckinMode(true)}>
          <UserCheck size={14} /> 签到模式
        </button>
        <button className="btn bg-purple-600 text-white hover:bg-purple-700 btn-sm" onClick={() => setShowRecommend(true)}>
          <Sparkles size={14} /> 智能荐人
        </button>
        <button className="btn-secondary btn-sm" onClick={() => setShowQr(true)}>
          <QrCode size={14} /> 报名二维码
        </button>
        <button className="btn-secondary btn-sm" onClick={() => navigate(`/reviews/${id}`)}><ClipboardList size={14} /> 复盘/财务</button>
        <button className="btn-secondary" onClick={() => setEditing(true)}><Edit size={14} /> 编辑</button>
        <button className="btn-danger" onClick={del}><Trash2 size={14} /> 删除</button>
      </div>

      {/* Event info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <span className={`badge ${STATUS_COLORS[event.status]}`}>{event.status}</span>
          {event.circle_type && <span className="text-sm text-gray-500">{event.circle_type}</span>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {event.date_time && <div><p className="text-xs text-gray-400">时间</p><p className="text-gray-800">{event.date_time?.slice(0,16)}</p></div>}
          {event.location && <div><p className="text-xs text-gray-400">地点</p><p className="text-gray-800">{event.location}</p></div>}
          <div><p className="text-xs text-gray-400">男生名额/票价</p><p className="text-gray-800">{event.quota_male}人 / ¥{event.price_male}</p></div>
          <div><p className="text-xs text-gray-400">女生名额/票价</p><p className="text-gray-800">{event.quota_female}人 / ¥{event.price_female}</p></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '报名总数', value: stats.total },
          { label: '审核通过', value: stats.approved },
          { label: '已到场', value: stats.attended },
          { label: '待审核', value: stats.pending, color: stats.pending > 0 ? 'text-amber-600' : '' },
        ].map(({ label, value, color = '' }) => (
          <div key={label} className="card text-center py-3">
            <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Gender ratio */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3">男女比例</h3>
        <div className="space-y-3">
          {[
            { label: '男生', approved: stats.approved_male, quota: event.quota_male, rate: maleRate, color: 'bg-blue-500' },
            { label: '女生', approved: stats.approved_female, quota: event.quota_female, rate: femaleRate, color: 'bg-pink-500' },
          ].map(({ label, approved, quota, rate, color }) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-800 font-medium">{approved} / {quota} 名 ({rate}%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(rate, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registrations */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">报名名单</h3>
          <button className="btn-primary btn-sm" onClick={() => setShowAddReg(true)}><Plus size={14} /> 添加报名</button>
        </div>
        {error && <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">{error}</div>}
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['昵称', '性别', '圈层', '审核', '付款', '签到', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {event.registrations?.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">暂无报名</td></tr>
            ) : event.registrations?.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                  {r.blacklisted ? '⚠️ ' : ''}{r.nickname}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-600">{r.gender}</td>
                <td className="px-4 py-2.5 text-sm text-gray-500">{r.circle || '-'}</td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${REG_AUDIT_COLORS[r.audit_status]}`}>{r.audit_status}</span>
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => updateReg(r.id, { paid: r.paid ? 0 : 1 })}
                    className={`badge cursor-pointer ${r.paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.paid ? '已付' : '未付'}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => updateReg(r.id, { attended: r.attended ? 0 : 1 })}
                    className={`badge cursor-pointer ${r.attended ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.attended ? '✓ 到场' : '未到'}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {r.audit_status === '待审' && (
                      <>
                        <button onClick={() => updateReg(r.id, { audit_status: '通过' })}
                          className="p-1 text-green-600 hover:bg-green-50 rounded" title="通过"><Check size={14} /></button>
                        <button onClick={() => updateReg(r.id, { audit_status: '拒绝' })}
                          className="p-1 text-red-500 hover:bg-red-50 rounded" title="拒绝"><X size={14} /></button>
                      </>
                    )}
                    <button onClick={() => deleteReg(r.id)}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="移除"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <EventForm event={event} onClose={() => { setEditing(false); load(); }} />}
      {showAddReg && <AddRegistrationModal eventId={id} onClose={() => { setShowAddReg(false); load(); }} />}
      {showRecommend && <RecommendModal eventId={id} onClose={() => { setShowRecommend(false); load(); }} />}
      {checkinMode && <CheckinMode event={event} onUpdate={load} onClose={() => setCheckinMode(false)} />}
      {showQr && <QrModal event={event} onClose={() => setShowQr(false)} />}
    </div>
  );
}
