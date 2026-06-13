import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api';
import { Users, CalendarDays, TrendingUp, Clock, AlertCircle, Repeat } from 'lucide-react';

const PIE_COLORS = ['#e07b54', '#e9a23b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#6366f1', '#14b8a6', '#a3a3a3'];

function StatCard({ icon: Icon, label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

const STATUS_LABELS = { '筹备': '筹备中', '报名中': '报名中', '进行中': '进行中', '已结束': '已结束', '取消': '已取消' };
const STATUS_COLORS = { '筹备': 'bg-gray-100 text-gray-600', '报名中': 'bg-blue-100 text-blue-700', '进行中': 'bg-green-100 text-green-700', '已结束': 'bg-gray-100 text-gray-500', '取消': 'bg-red-100 text-red-600' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.get('/dashboard').then(r => setData(r.data)); }, []);

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">仪表盘</h2>

      {/* Alerts */}
      {(data.pendingAudit > 0 || data.pendingReg > 0) && (
        <div className="flex gap-3 flex-wrap">
          {data.pendingAudit > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800 cursor-pointer hover:bg-amber-100" onClick={() => navigate('/audit')}>
              <AlertCircle size={16} /> {data.pendingAudit} 名嘉宾待审核
            </div>
          )}
          {data.pendingReg > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-800">
              <Clock size={16} /> {data.pendingReg} 条报名待审核
            </div>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="通过嘉宾总数" value={data.totalGuests}
          sub={`男 ${data.totalMale} / 女 ${data.totalFemale}`} color="primary" />
        <StatCard icon={CalendarDays} label="活动总场次" value={data.totalEvents} color="blue" />
        <StatCard icon={TrendingUp} label="累计净利润" value={`¥${(data.totalNetProfit || 0).toFixed(0)}`} color="green" />
        <StatCard icon={Clock} label="待处理事项" value={data.pendingAudit + data.pendingReg}
          sub="嘉宾审核 + 报名审核" color="amber" />
      </div>

      {/* Charts */}
      {data.monthlyStats?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">月度净利润趋势</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={v => `¥${v?.toFixed(0)}`} />
                <Bar dataKey="net_profit" fill="#e07b54" radius={[4,4,0,0]} name="净利润" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">月度到场率趋势</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip formatter={v => v ? `${v.toFixed(1)}%` : '-'} />
                <Line dataKey="attend_rate" stroke="#3b82f6" strokeWidth={2} dot name="到场率" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 运营分析：来源渠道 / 年龄分布 / 复购 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.sourceChannels?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-2">嘉宾来源渠道</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.sourceChannels} dataKey="count" nameKey="channel"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.sourceChannels.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [`${v} 人`, name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.ageDistribution?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-2">库内嘉宾年龄分布</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={v => `${v} 人`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="male" fill="#3b82f6" radius={[4,4,0,0]} name="男" />
                <Bar dataKey="female" fill="#ec4899" radius={[4,4,0,0]} name="女" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {data.repeatStats?.repeatRate !== null && data.repeatStats?.attendedOnce > 0 && (
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600">
            <Repeat size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.repeatStats.repeatRate}%</p>
            <p className="text-sm text-gray-500">复购率（到场 2 场以上嘉宾占比）</p>
            <p className="text-xs text-gray-400">
              到场过活动的 {data.repeatStats.attendedOnce} 人中，有 {data.repeatStats.attendedRepeat} 人参加了 2 场及以上
            </p>
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {data.upcomingEvents?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">近期活动</h3>
          <div className="space-y-2">
            {data.upcomingEvents.map(e => (
              <div key={e.id} onClick={() => navigate(`/events/${e.id}`)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100">
                <div>
                  <span className="font-medium text-sm text-gray-900">{e.title}</span>
                  {e.circle_type && <span className="ml-2 text-xs text-gray-400">{e.circle_type}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {e.date_time && <span className="text-xs text-gray-400">{e.date_time?.slice(0,16)}</span>}
                  <span className={`badge ${STATUS_COLORS[e.status]}`}>{STATUS_LABELS[e.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
