import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_DOT = {
  '筹备': 'bg-gray-400',
  '报名中': 'bg-blue-500',
  '进行中': 'bg-green-500',
  '已结束': 'bg-gray-300',
  '取消': 'bg-red-400',
};
const STATUS_CHIP = {
  '筹备': 'bg-gray-100 text-gray-600',
  '报名中': 'bg-blue-100 text-blue-700',
  '进行中': 'bg-green-100 text-green-700',
  '已结束': 'bg-gray-100 text-gray-400 line-through',
  '取消': 'bg-red-50 text-red-400 line-through',
};

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function EventCalendar({ events }) {
  const navigate = useNavigate();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // Map events to dates (date_time format: "2026-06-15T19:00" or similar)
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const e of events) {
      if (!e.date_time) continue;
      const key = e.date_time.slice(0, 10);
      (map[key] = map[key] || []).push(e);
    }
    return map;
  }, [events]);

  // Build calendar grid: weeks start Monday
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (first.getDay() + 6) % 7; // Monday = 0
    const arr = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const monthEvents = events.filter(e => e.date_time?.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
  const todayKey = ymd(today);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <span className="font-bold text-gray-900">{year}年{month + 1}月</span>
          <span className="ml-2 text-xs text-gray-400">{monthEvents.length} 场活动</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-gray-100">今天</button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
          <div key={d} className={`py-2 text-center text-xs font-medium ${i >= 5 ? 'text-pink-400' : 'text-gray-400'}`}>
            周{d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="min-h-24 border-b border-r border-gray-50 bg-gray-50/50" />;
          const key = ymd(date);
          const dayEvents = eventsByDate[key] || [];
          const isToday = key === todayKey;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <div key={i} className={`min-h-24 border-b border-r border-gray-50 p-1.5 ${isWeekend ? 'bg-pink-50/30' : ''} ${isToday ? 'bg-primary-50/60' : ''}`}>
              <div className={`text-xs mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                isToday ? 'bg-primary-600 text-white font-bold' : 'text-gray-400'
              }`}>
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.map(e => (
                  <div key={e.id} onClick={() => navigate(`/events/${e.id}`)}
                    title={`${e.title} ${e.date_time?.slice(11, 16) || ''} ${e.location || ''}`}
                    className={`px-1.5 py-1 rounded text-xs cursor-pointer hover:opacity-75 truncate ${STATUS_CHIP[e.status]}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUS_DOT[e.status]}`} />
                    {e.date_time?.slice(11, 16) && <span className="font-medium">{e.date_time.slice(11, 16)} </span>}
                    {e.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
        {Object.entries(STATUS_DOT).map(([status, dot]) => (
          <span key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${dot}`} /> {status}
          </span>
        ))}
      </div>
    </div>
  );
}
