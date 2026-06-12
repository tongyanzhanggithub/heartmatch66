import { useEffect, useState } from 'react';
import api from '../api';
import { Heart, Sparkles, ImageDown, CalendarHeart } from 'lucide-react';
import { generateHepanCard } from '../utils/cards';

/* 旧版分享卡已迁移至 utils/cards.js
function _legacyShareCard(report) {
  const W = 750, H = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景渐变
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#fdf2f8');
  grad.addColorStop(0.5, '#fce7f3');
  grad.addColorStop(1, '#ede9fe');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 装饰圆
  ctx.fillStyle = 'rgba(236,72,153,0.08)';
  ctx.beginPath(); ctx.arc(80, 100, 130, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(W - 60, H - 120, 160, 0, 7); ctx.fill();

  ctx.textAlign = 'center';

  // 标题
  ctx.fillStyle = '#9d174d';
  ctx.font = 'bold 40px "Microsoft YaHei", sans-serif';
  ctx.fillText('🧧 八字合盘 · 缘分测算', W / 2, 110);

  // 双方名字
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 52px "Microsoft YaHei", sans-serif';
  ctx.fillText(`${report.a.nickname}  ♥  ${report.b.nickname}`, W / 2, 230);

  // 四柱（若有）
  ctx.font = '26px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#6b7280';
  const pa = report.a.bazi.pillars, pb = report.b.bazi.pillars;
  const fmtP = p => [p.year, p.month, p.day, p.time].filter(Boolean).join(' ');
  ctx.fillText(`${fmtP(pa)} · 属${report.a.bazi.shengxiao}${report.a.bazi.xingzuo ? ' · ' + report.a.bazi.xingzuo + '座' : ''}`, W / 2, 290);
  ctx.fillText(`${fmtP(pb)} · 属${report.b.bazi.shengxiao}${report.b.bazi.xingzuo ? ' · ' + report.b.bazi.xingzuo + '座' : ''}`, W / 2, 330);

  // 大分数
  ctx.fillStyle = '#ec4899';
  ctx.font = 'bold 200px "Microsoft YaHei", sans-serif';
  ctx.fillText(String(report.score), W / 2, 580);

  ctx.fillStyle = '#9d174d';
  ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
  ctx.fillText(`「${report.level}」`, W / 2, 660);

  // 缘分关键词
  if (report.keyword) {
    ctx.fillStyle = '#7c3aed';
    ctx.font = '34px "Microsoft YaHei", sans-serif';
    ctx.fillText(`✨ 缘分关键词：${report.keyword} ✨`, W / 2, 730);
  }

  // 各维度一行摘要
  ctx.font = '26px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#4b5563';
  let y = 800;
  for (const s of report.sections.slice(0, 4)) {
    const sign = s.score_delta > 0 ? '+' : '';
    ctx.fillText(`${s.title}　${sign}${s.score_delta}分`, W / 2, y);
    y += 42;
  }

  // 底部
  ctx.fillStyle = '#9ca3af';
  ctx.font = '22px "Microsoft YaHei", sans-serif';
  ctx.fillText('仅供娱乐参考 · 感情幸福靠经营 💕', W / 2, H - 36);

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `合盘_${report.a.nickname}x${report.b.nickname}.png`;
  a.click();
}
*/

function GuestPicker({ label, color, guests, value, onChange }) {
  const [keyword, setKeyword] = useState('');
  const filtered = guests.filter(g =>
    !keyword || g.nickname.includes(keyword) || (g.occupation || '').includes(keyword)
  );
  const selected = guests.find(g => g.id === value);

  return (
    <div className={`card border-2 ${color === 'blue' ? 'border-blue-100' : 'border-pink-100'}`}>
      <p className={`text-sm font-semibold mb-2 ${color === 'blue' ? 'text-blue-700' : 'text-pink-700'}`}>{label}</p>
      {selected ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">{selected.nickname}</p>
            <p className="text-xs text-gray-400">
              {selected.birth_year ? `${new Date().getFullYear() - selected.birth_year}岁` : ''} {selected.occupation || ''}
              {!selected.birth_date && <span className="text-amber-500 ml-1">（仅有年份，合盘精度有限）</span>}
            </p>
          </div>
          <button className="btn-secondary btn-sm" onClick={() => onChange(null)}>重选</button>
        </div>
      ) : (
        <>
          <input className="input text-sm mb-2" placeholder="搜索昵称/职业"
            value={keyword} onChange={e => setKeyword(e.target.value)} />
          <div className="max-h-44 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-4">无结果</p>
            ) : filtered.map(g => (
              <div key={g.id} onClick={() => onChange(g.id)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-50 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-800">{g.nickname}</span>
                <span className="text-xs text-gray-400">
                  {g.birth_year ? `${new Date().getFullYear() - g.birth_year}岁` : ''} {g.circle || ''}
                  {g.birth_date ? ' 📅' : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PillarRow({ label, bazi }) {
  if (!bazi.pillars.day) {
    return <p className="text-xs text-gray-400">年柱 {bazi.pillars.year} · 属{bazi.shengxiao}（仅年份）</p>;
  }
  return (
    <div className="flex gap-1.5 items-center flex-wrap text-sm">
      {[bazi.pillars.year, bazi.pillars.month, bazi.pillars.day, bazi.pillars.time].map((p, i) => (
        p ? <span key={i} className="bg-white/80 rounded px-2 py-0.5 font-bold text-gray-700 tracking-wider">{p}</span> : null
      ))}
      <span className="text-xs text-gray-400 ml-1">属{bazi.shengxiao}{bazi.xingzuo ? ` · ${bazi.xingzuo}座` : ''}</span>
    </div>
  );
}

export default function Hepan() {
  const [guests, setGuests] = useState([]);
  const [idA, setIdA] = useState(null);
  const [idB, setIdB] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/guests', { params: { audit_status: '通过' } }).then(r => {
      setGuests(r.data);
      // 支持从嘉宾列表带人跳转：/hepan?guest=ID
      const preset = new URLSearchParams(window.location.search).get('guest');
      if (preset) {
        const g = r.data.find(x => x.id === +preset);
        if (g) (g.gender === '男' ? setIdA : setIdB)(g.id);
      }
    });
  }, []);

  const males = guests.filter(g => g.gender === '男');
  const females = guests.filter(g => g.gender === '女');

  async function run() {
    setError('');
    setReport(null);
    setLoading(true);
    try {
      const { data } = await api.get('/fortune/hepan', { params: { a: idA, b: idB } });
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.error || '合盘失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <span className="text-2xl">🧧</span> 八字合盘 · 缘分测算
      </h2>
      <p className="text-sm text-gray-400 -mt-3">从已审核通过的嘉宾中各选一位，测算两人的传统缘分契合度（仅供娱乐参考）</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GuestPicker label="♂ 男方" color="blue" guests={males} value={idA} onChange={setIdA} />
        <GuestPicker label="♀ 女方" color="pink" guests={females} value={idB} onChange={setIdB} />
      </div>

      <button className="btn-primary w-full justify-center py-3 text-base" disabled={!idA || !idB || loading} onClick={run}>
        <Sparkles size={18} /> {loading ? '排盘测算中...' : '开始合盘'}
      </button>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      {report && (
        <div className="space-y-4">
          {/* Score */}
          <div className="card bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 border-pink-100 text-center py-6">
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-right">
                <p className="font-bold text-gray-900">{report.a.nickname}</p>
                <PillarRow bazi={report.a.bazi} />
              </div>
              <Heart className="text-pink-500 shrink-0" size={28} fill="currentColor" />
              <div className="text-left">
                <p className="font-bold text-gray-900">{report.b.nickname}</p>
                <PillarRow bazi={report.b.bazi} />
              </div>
            </div>
            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">{report.score}</p>
            <p className="text-lg font-bold text-gray-700 mt-1">「{report.level}」</p>
            {report.keyword && (
              <p className="text-sm text-purple-600 mt-2">✨ 缘分关键词：<strong>{report.keyword}</strong> ✨</p>
            )}
            <button className="btn-secondary btn-sm mt-4 mx-auto" onClick={() => generateHepanCard(report)}>
              <ImageDown size={14} /> 生成分享卡图片
            </button>
          </div>

          {/* 宜约会吉日 */}
          {report.lucky_dates?.length > 0 && (
            <div className="card bg-amber-50/60 border-amber-100">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <CalendarHeart size={16} className="text-amber-500" /> 黄历宜约会吉日（未来30天）
              </h3>
              <div className="flex flex-wrap gap-2">
                {report.lucky_dates.map((d, i) => (
                  <span key={i} className="bg-white rounded-lg px-3 py-1.5 text-sm text-gray-700 border border-amber-100">
                    📅 {d.date} <span className="text-xs text-amber-600">宜{d.yi}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sections */}
          {report.sections.map(s => (
            <div key={s.title} className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{s.title}</h3>
                <span className={`badge ${s.score_delta > 10 ? 'bg-green-100 text-green-700' : s.score_delta > 0 ? 'bg-blue-100 text-blue-700' : s.score_delta === 0 ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                  {s.score_delta > 0 ? '+' : ''}{s.score_delta} 分
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{s.detail}</p>
            </div>
          ))}

          {/* WuXing comparison */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">五行对照</h3>
            <div className="grid grid-cols-2 gap-4">
              {[report.a, report.b].map(p => (
                <div key={p.id}>
                  <p className="text-sm font-medium text-gray-700 mb-2">{p.nickname}</p>
                  <div className="space-y-1">
                    {Object.entries(p.bazi.wuxing).map(([wx, n]) => (
                      <div key={wx} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-gray-500">{wx}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" style={{ width: `${Math.min(n * 25, 100)}%` }} />
                        </div>
                        <span className="w-4 text-gray-400">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">{report.note}</p>
        </div>
      )}
    </div>
  );
}
