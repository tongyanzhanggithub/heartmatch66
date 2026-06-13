import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Save } from 'lucide-react';

function NumInput({ label, value, onChange, prefix = '' }) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-2 text-gray-400 text-sm">{prefix}</span>}
        <input className={`input text-sm ${prefix ? 'pl-6' : ''}`} type="number" min={0} step={0.01}
          value={value ?? ''} onChange={e => onChange(e.target.value === '' ? 0 : +e.target.value)} />
      </div>
    </div>
  );
}

export default function Reviews() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState({
    registered: 0, attended: 0, male_attended: 0, female_attended: 0, matches: 0,
    revenue_male: 0, revenue_female: 0, revenue_other: 0, cost: 0, acquisition_cost: 0,
    satisfaction: '', went_well: '', improve: '', actions: '', cases: '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  useEffect(() => {
    // 串行加载，避免两个请求各自 setForm 竞态：有存档以存档为准，没存档才按报名统计预填
    (async () => {
      const ev = await api.get(`/events/${eventId}`);
      setEvent(ev.data);
      const rev = await api.get(`/reviews/event/${eventId}`);
      if (rev.data) {
        setForm(rev.data);
      } else {
        const s = ev.data.stats;
        setForm(f => ({
          ...f,
          registered: s.total,
          attended: s.attended,
          male_attended: s.attended_male,
          female_attended: s.attended_female,
          matches: s.matched_marked || 0,
          // 票房按「已付费且审核通过」人数 × 票价自动计算
          revenue_male: ev.data.price_male * (s.paid_male || 0),
          revenue_female: ev.data.price_female * (s.paid_female || 0),
        }));
      }
    })();
  }, [eventId]);

  async function save() {
    setError('');
    try {
      await api.post(`/reviews/event/${eventId}`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || '保存失败');
    }
  }

  if (!event) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  const revenue = (form.revenue_male || 0) + (form.revenue_female || 0) + (form.revenue_other || 0);
  const netProfit = revenue - (form.cost || 0);
  const attendRate = form.registered > 0 ? ((form.attended / form.registered) * 100).toFixed(1) : '-';

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/events/${eventId}`)} className="btn-secondary btn-sm">
          <ArrowLeft size={14} /> 返回
        </button>
        <h2 className="text-xl font-bold text-gray-900 flex-1">复盘 · {event.title}</h2>
        <button className="btn-primary" onClick={save}>
          <Save size={14} /> {saved ? '已保存 ✓' : '保存'}
        </button>
      </div>

      {/* Auto-calculated summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '总收入', value: `¥${revenue.toFixed(0)}`, color: 'text-green-600' },
          { label: '净利润', value: `¥${netProfit.toFixed(0)}`, color: netProfit >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: '到场率', value: `${attendRate}%`, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Activity data */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-800">活动数据</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NumInput label="报名人数" value={form.registered} onChange={v => set('registered', v)} />
          <NumInput label="到场人数" value={form.attended} onChange={v => set('attended', v)} />
          <NumInput label="匹配对数" value={form.matches} onChange={v => set('matches', v)} />
          <NumInput label="男生到场" value={form.male_attended} onChange={v => set('male_attended', v)} />
          <NumInput label="女生到场" value={form.female_attended} onChange={v => set('female_attended', v)} />
          <NumInput label="满意度评分（1-10）" value={form.satisfaction} onChange={v => set('satisfaction', v)} />
        </div>
      </div>

      {/* Finance */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-800">财务录入 <span className="text-xs font-normal text-gray-400">（票房已按「已付费×票价」预填，可修改）</span></h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NumInput label="男生票房" value={form.revenue_male} onChange={v => set('revenue_male', v)} prefix="¥" />
          <NumInput label="女生票房" value={form.revenue_female} onChange={v => set('revenue_female', v)} prefix="¥" />
          <NumInput label="其他收入" value={form.revenue_other} onChange={v => set('revenue_other', v)} prefix="¥" />
          <NumInput label="总成本" value={form.cost} onChange={v => set('cost', v)} prefix="¥" />
          <NumInput label="获客投入" value={form.acquisition_cost} onChange={v => set('acquisition_cost', v)} prefix="¥" />
        </div>
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div><p className="text-gray-400 text-xs">收入合计</p><p className="font-bold text-gray-900">¥{revenue.toFixed(2)}</p></div>
          <div><p className="text-gray-400 text-xs">成本合计</p><p className="font-bold text-gray-900">¥{(form.cost||0).toFixed(2)}</p></div>
          <div><p className="text-gray-400 text-xs">单场净利</p><p className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>¥{netProfit.toFixed(2)}</p></div>
        </div>
      </div>

      {/* Retrospective */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-800">复盘问题</h3>
        {[
          { key: 'went_well', label: '✅ 做得好的' },
          { key: 'improve', label: '⚠️ 待改进的' },
          { key: 'actions', label: '📋 行动项' },
          { key: 'cases', label: '💑 成功案例' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="label text-xs">{label}</label>
            <textarea className="input h-20 resize-none text-sm" value={form[key] || ''}
              onChange={e => set(key, e.target.value)} placeholder="填写内容..." />
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </div>
  );
}
