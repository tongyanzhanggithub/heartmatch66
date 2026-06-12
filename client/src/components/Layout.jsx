import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, CalendarDays, LogOut, Heart, Sparkles, Tag, ScrollText } from 'lucide-react';
import api from '../api';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/audit', icon: UserCheck, label: '嘉宾审核', badge: true },
  { to: '/guests', icon: Users, label: '嘉宾管理', sub: '库内嘉宾（已通过）' },
  { to: '/tags', icon: Tag, label: '标签分群', sub: '按标签/圈层看人' },
  { to: '/events', icon: CalendarDays, label: '活动管理' },
  { to: '/guests', icon: Sparkles, label: 'AI 智能匹配', sub: '在嘉宾列表点击匹配', dim: true },
  { to: '/hepan', icon: Heart, label: '八字合盘', sub: '缘分测算 · 星座契合' },
  { to: '/oplogs', icon: ScrollText, label: '操作记录', sub: '账号操作审计', adminOnly: true },
];

export default function Layout() {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  async function loadPending() {
    try {
      const { data } = await api.get('/guests/stats/pending');
      setPendingCount(data.pending);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadPending();
    const timer = setInterval(loadPending, 60000);
    window.addEventListener('audit-changed', loadPending);
    return () => { clearInterval(timer); window.removeEventListener('audit-changed', loadPending); };
  }, []);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10 shadow-sm">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <Heart className="text-primary-600" size={22} fill="currentColor" />
          <span className="font-bold text-gray-800 text-base leading-tight">相亲活动<br/>管理后台</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {nav.filter(item => !item.adminOnly || localStorage.getItem('username') === 'admin')
            .map(({ to, icon: Icon, label, sub, badge, dim }) => (
            <NavLink
              key={label} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive && !dim ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              <Icon size={18} className={dim ? 'text-purple-500' : ''} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {label}
                  {badge && pendingCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </div>
                {sub && <div className="text-xs text-gray-400 font-normal">{sub}</div>}
              </div>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
            <LogOut size={16} /> 退出登录
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-56 min-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
