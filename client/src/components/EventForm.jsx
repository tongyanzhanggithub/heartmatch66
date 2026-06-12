import { useState } from 'react';
import api from '../api';
import { X } from 'lucide-react';

const CIRCLES = ['体制内', '教师', '医护', '金融', '互联网', '法律', '混合', '其他'];
const STATUSES = ['筹备', '报名中', '进行中', '已结束', '取消'];

export default function EventForm({ event, onClose }) {
  const [form, setForm] = useState({
    title: event?.title || '',
    circle_type: event?.circle_type || '',
    date_time: event?.date_time || '',
    location: event?.location || '',
    quota_male: event?.quota_male ?? 10,
    quota_female: event?.quota_female ?? 10,
    price_male: event?.price_male ?? 0,
    price_female: event?.price_female ?? 0,
    status: event?.status || '筹备',
    notes: event?.notes || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (event?.id) await api.put(`/events/${event.id}`, form);
      else await api.post('/events', form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">{event ? '编辑活动' : '新建活动'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">活动名称 *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">圈层类型</label>
              <select className="input" value={form.circle_type} onChange={e => set('circle_type', e.target.value)}>
                <option value="">请选择</option>
                {CIRCLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">活动状态</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">活动时间</label>
              <input className="input" type="datetime-local" value={form.date_time} onChange={e => set('date_time', e.target.value)} />
            </div>
            <div>
              <label className="label">地点</label>
              <input className="input" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-blue-50 rounded-xl p-4">
            <div>
              <label className="label">男生名额</label>
              <input className="input" type="number" min={0} value={form.quota_male} onChange={e => set('quota_male', +e.target.value)} />
            </div>
            <div>
              <label className="label">女生名额</label>
              <input className="input" type="number" min={0} value={form.quota_female} onChange={e => set('quota_female', +e.target.value)} />
            </div>
            <div>
              <label className="label">男生票价（¥）</label>
              <input className="input" type="number" min={0} step={0.01} value={form.price_male} onChange={e => set('price_male', +e.target.value)} />
            </div>
            <div>
              <label className="label">女生票价（¥）</label>
              <input className="input" type="number" min={0} step={0.01} value={form.price_female} onChange={e => set('price_female', +e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">备注</label>
            <textarea className="input h-20 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

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
