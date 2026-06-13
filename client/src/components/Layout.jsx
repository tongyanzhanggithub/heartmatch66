import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, CalendarDays, LogOut, Heart, Sparkles, Tag, ScrollText, UserCog, KeyRound, BadgeCheck, HeartHandshake, Trophy, BarChart3, Menu, X } from 'lucide-react';
import api from '../api';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/audit', icon: UserCheck, label: '嘉宾审核', badge: true },
  { to: '/guests', icon: Users, label: '嘉宾管理', sub: '库内嘉宾（已通过）' },
  { to: '/tags', icon: Tag, label: '标签分群', sub: '按标签/圈层看人' },
  { to: '/members', icon: BadgeCheck, label: '会员名单', sub: '缴费会员管理' },
  { to: '/events', icon: CalendarDays, label: '活动管理' },
  { to: '/introductions', icon: HeartHandshake, label: '牵线记录', sub: '转化闭环 · 跟进追踪' },
  { to: '/cases', icon: Trophy, label: '成功案例', sub: '脱单故事 · 宣传素材' },
  { to: '/guests', icon: Sparkles, label: 'AI 智能匹配', sub: '在嘉宾列表点击匹配', dim: true },
  { to: '/hepan', icon: Heart, label: '八字合盘', sub: '缘分测算 · 星座契合' },
  { to: '/staff', icon: BarChart3, label: '业绩看板', sub: '成员综合贡献', adminOnly: true },
  { to: '/oplogs', icon: ScrollText, label: '操作记录', sub: '账号操作审计', adminOnly: true },
  { to: '/accounts', icon: UserCog, label: '账号管理', sub: '子账号与密码', adminOnly: true },
];

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (form.new_password !== form.confirm) return setError('两次输入的新密码不一致');
    setSaving(true);
    try {
      await api.put('/accounts/me/password', {
        old_password: form.old_password,
        new_password: form.new_password,
      });
      alert('✅ 密码已修改，下次登录请使用新密码');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '修改失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-xl p-6 w-80 space-y-3 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><KeyRound size={16} /> 修改密码</h3>
        <input type="password" className="input text-sm" placeholder="旧密码" required
          value={form.old_password} onChange={e => setForm(f => ({ ...f, old_password: e.target.value }))} />
        <input type="password" className="input text-sm" placeholder="新密码（至少 8 位）" required minLength={8}
          value={form.new_password} onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))} />
        <input type="password" className="input text-sm" placeholder="再次输入新密码" required
          value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>取消</button>
          <button type="submit" className="btn-primary text-sm" disabled={saving}>{saving ? '保存中...' : '确认修改'}</button>
        </div>
      </form>
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [showPwd, setShowPwd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-cream">
      {/* 移动端遮罩：点击关闭抽屉 */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar：桌面常驻，移动端为可滑出抽屉 */}
      <aside className={`w-56 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 left-0 z-40 shadow-sm
        transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
          <img src="/favicon.svg" alt="半日相知" className="w-9 h-9 rounded-lg shrink-0" />
          <div className="leading-tight flex-1">
            <span className="font-bold text-gray-800 text-lg tracking-wide">半日相知</span>
            <p className="text-[11px] text-gray-400 mt-0.5">遇见真正聊得来的人</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600" aria-label="关闭菜单">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.filter(item => !item.adminOnly || localStorage.getItem('username') === 'admin')
            .map(({ to, icon: Icon, label, sub, badge, dim }) => (
            <NavLink
              key={label} to={to}
              onClick={() => setSidebarOpen(false)}
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
        <div className="p-3 border-t border-gray-100 space-y-0.5">
          <button onClick={() => setShowPwd(true)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
            <KeyRound size={16} /> 修改密码
          </button>
          <button onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
            <LogOut size={16} /> 退出登录
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:ml-56 min-h-screen flex flex-col">
        {/* 移动端顶栏：汉堡按钮 + 品牌 + 待审角标 */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 flex items-center gap-3 px-4 h-14">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600" aria-label="打开菜单"><Menu size={22} /></button>
          <img src="/favicon.svg" alt="" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-gray-800">半日相知</span>
          {pendingCount > 0 && (
            <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </header>
        <main className="flex-1 min-w-0">
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  );
}
