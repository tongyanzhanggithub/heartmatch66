import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Plus, Calendar, LayoutGrid, CalendarDays } from 'lucide-react';
import EventForm from '../components/EventForm';
import EventCalendar from '../components/EventCalendar';

const STATUS_COLORS = { '筹备': 'bg-gray-100 text-gray-600', '报名中': 'bg-blue-100 text-blue-700', '进行中': 'bg-green-100 text-green-700', '已结束': 'bg-gray-100 text-gray-500', '取消': 'bg-red-100 text-red-600' };

export default function Events() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [view, setView] = useState(localStorage.getItem('eventsView') || 'list');
  const navigate = useNavigate();

  function switchView(v) {
    setView(v);
    localStorage.setItem('eventsView', v);
  }

  async function load() {
    const params = {};
    if (filterStatus) params.status = filterStatus;
    const { data } = await api.get('/events', { params });
    setEvents(data);
  }

  useEffect(() => { load(); }, [filterStatus]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">活动管理</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> 新建活动</button>
      </div>

      <div className="card flex gap-2 items-center flex-wrap">
        {['', '筹备', '报名中', '进行中', '已结束', '取消'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {s || '全部'}
          </button>
        ))}
        <div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => switchView('list')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
            <LayoutGrid size={13} /> 列表
          </button>
          <button onClick={() => switchView('calendar')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
            <CalendarDays size={13} /> 日历
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <EventCalendar events={events} />
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length === 0 ? (
          <div className="col-span-3 text-center text-gray-400 py-12">暂无活动</div>
        ) : events.map(e => (
          <div key={e.id} onClick={() => navigate(`/events/${e.id}`)}
            className="card cursor-pointer hover:shadow-md transition-shadow hover:border-primary-200">
            <div className="flex items-start justify-between mb-3">
              <span className={`badge ${STATUS_COLORS[e.status]}`}>{e.status}</span>
              {e.circle_type && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{e.circle_type}</span>}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{e.title}</h3>
            <div className="space-y-1.5 text-sm text-gray-500">
              {e.date_time && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} /> {e.date_time?.slice(0,16)}
                </div>
              )}
              {e.location && <div className="text-xs text-gray-400">📍 {e.location}</div>}
              <div className="flex gap-4 mt-2 pt-2 border-t border-gray-50 text-xs">
                <span>男: <strong>{e.quota_male}</strong>名 ¥{e.price_male}</span>
                <span>女: <strong>{e.quota_female}</strong>名 ¥{e.price_female}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {showForm && <EventForm onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
}
