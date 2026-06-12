import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Heart } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-pink-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mb-3">
            <Heart className="text-primary-600" size={28} fill="currentColor" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">相亲活动管理后台</h1>
          <p className="text-sm text-gray-500 mt-1">请登录以继续</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">用户名</label>
            <input className="input" type="text" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <div>
            <label className="label">密码</label>
            <input className="input" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
