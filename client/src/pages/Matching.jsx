import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Sparkles, User, ChevronDown, ChevronUp, AlertTriangle, Ban, HeartHandshake, ImageDown } from 'lucide-react';
import { generateMatchCard } from '../utils/cards';

const LEVELS = [
  { min: 85, border: 'border-green-300', bg: 'bg-green-50', badge: 'bg-green-500', label: '高度契合' },
  { min: 70, border: 'border-blue-200', bg: 'bg-blue-50', badge: 'bg-blue-500', label: '较为匹配' },
  { min: 55, border: 'border-amber-200', bg: 'bg-amber-50', badge: 'bg-amber-500', label: '一般匹配' },
  { min: 0, border: 'border-gray-200', bg: 'bg-gray-50', badge: 'bg-gray-400', label: '匹配度低' },
];
const getLevel = s => LEVELS.find(l => s >= l.min) || LEVELS[3];

function DirectionBar({ label, pct, evaluated }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-32 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-300'}`}
          style={{ width: `${pct ?? 0}%` }} />
      </div>
      <span className="w-16 text-right font-semibold text-gray-700">
        {pct !== null ? `${pct}%` : '—'}
      </span>
      <span className="w-14 text-gray-300 text-right">{evaluated}个维度</span>
    </div>
  );
}

function DetailList({ title, details, skipped }) {
  if (!details.length && !skipped.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-1.5">{title}</p>
      <div className="space-y-1">
        {details.map(d => (
          <div key={d.label} className="flex items-start gap-2 text-xs">
            <span className={`shrink-0 w-10 text-center rounded px-1 py-0.5 font-medium ${d.score >= 80 ? 'bg-green-50 text-green-600' : d.score >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
              {d.score}
            </span>
            <span className="text-gray-600"><strong className="text-gray-700">{d.label}</strong>：{d.note}</span>
          </div>
        ))}
        {skipped.map(s => (
          <div key={s.label} className="flex items-start gap-2 text-xs opacity-50">
            <span className="shrink-0 w-10 text-center rounded px-1 py-0.5 bg-gray-100 text-gray-400">跳过</span>
            <span className="text-gray-400">{s.label}：{s.reason}（不计分）</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ item, seekerName, seekerId, seeker }) {
  const [expanded, setExpanded] = useState(false);
  const [introState, setIntroState] = useState(''); // '' | 'saving' | 'done' | error msg
  const { guest: g, score } = item;
  const level = getLevel(score);
  const age = g.birth_year ? new Date().getFullYear() - g.birth_year : null;

  async function introduce(e) {
    e.stopPropagation();
    setIntroState('saving');
    try {
      await api.post('/introductions', { guest_a: seekerId, guest_b: g.id, match_score: score });
      setIntroState('done');
    } catch (err) {
      setIntroState(err.response?.data?.error || '牵线失败');
    }
  }

  return (
    <div className={`rounded-xl border ${level.border} ${level.bg} overflow-hidden`}>
      <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className={`w-14 h-14 rounded-full ${level.badge} flex flex-col items-center justify-center shrink-0 shadow-sm`}>
          <span className="text-white font-bold text-lg leading-none">{score}</span>
          <span className="text-white/80 text-xs">分</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{g.nickname}</span>
            <span className={`badge ${level.badge} text-white text-xs`}>{level.label}</span>
            <span className="text-xs text-gray-400">基于 {item.coverage} 个维度</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
            {age && <span>{age}岁</span>}
            {g.height && <span>{g.height}cm</span>}
            {g.circle && <span>{g.circle}</span>}
            {g.occupation && <span>{g.occupation}</span>}
            {g.education && <span>{g.education}</span>}
            {g.mbti && <span className="text-violet-500">{g.mbti}</span>}
          </div>
          {/* 双向条 */}
          <div className="mt-2 space-y-1">
            <DirectionBar label={`Ta 符合${seekerName}的期望`} pct={item.a_to_b.pct} evaluated={item.a_to_b.evaluated} />
            <DirectionBar label={`${seekerName}符合 Ta 的期望`} pct={item.b_to_a.pct} evaluated={item.b_to_a.evaluated} />
            {item.commonality.pct !== null && (
              <DirectionBar label="双方共性" pct={item.commonality.pct} evaluated={item.commonality.evaluated} />
            )}
          </div>
        </div>
        <button className="text-gray-400 shrink-0">{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
      </div>

      {/* 红旗警告 */}
      {item.red_flags.length > 0 && (
        <div className="mx-4 mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg space-y-0.5">
          {item.red_flags.map((f, i) => (
            <p key={i} className="text-xs text-red-600 flex items-start gap-1">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              {f.who}的底线「{f.text}」——请人工确认{f.against}是否触雷
            </p>
          ))}
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-black/5 pt-3">
          <DetailList title={`▸ Ta 符合${seekerName}期望的明细`} details={item.a_to_b.details} skipped={item.a_to_b.skipped} />
          <DetailList title={`▸ ${seekerName}符合 Ta 期望的明细`} details={item.b_to_a.details} skipped={item.b_to_a.skipped} />
          {item.commonality.items.length > 0 && (
            <DetailList title="▸ 共性维度" details={item.commonality.items} skipped={[]} />
          )}
          {(item.mbti.a || item.mbti.b) && (
            <p className="text-xs text-gray-400">
              MBTI 参考：{item.mbti.a || '未填'} × {item.mbti.b || '未填'}（已计入共性维度，仅作轻量参考）
            </p>
          )}
          <div className="flex justify-end items-center gap-2">
            {introState === 'done' ? (
              <span className="text-xs text-green-600 font-medium">✓ 已加入牵线记录</span>
            ) : introState && introState !== 'saving' ? (
              <span className="text-xs text-amber-600">{introState}</span>
            ) : null}
            <button onClick={introduce} disabled={introState === 'saving' || introState === 'done'}
              className="btn-sm text-xs bg-pink-500 text-white hover:bg-pink-600 rounded-lg px-3 py-1.5 inline-flex items-center gap-1 disabled:opacity-50">
              <HeartHandshake size={13} /> {introState === 'saving' ? '牵线中...' : '牵线'}
            </button>
            <button onClick={e => { e.stopPropagation(); generateMatchCard(item, seeker); }}
              className="btn-secondary btn-sm text-xs inline-flex items-center gap-1">
              <ImageDown size={13} /> 匹配卡
            </button>
            <a href={`/guests/${g.id}`} onClick={e => e.stopPropagation()} className="btn-secondary btn-sm text-xs">查看档案</a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Matching() {
  const { guestId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [showExcluded, setShowExcluded] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/matching/${guestId}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [guestId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">双向匹配分析中...</div>;
  if (!data) return null;

  const { seeker, results, excluded } = data;
  const seekerAge = seeker.birth_year ? new Date().getFullYear() - seeker.birth_year : null;
  const filtered = results.filter(r => r.score >= minScore);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/guests')} className="btn-secondary btn-sm">
          <ArrowLeft size={14} /> 返回
        </button>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={20} className="text-purple-500" />
          AI 双向匹配 · {seeker.nickname}
        </h2>
      </div>

      <div className="card bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
            <User size={18} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{seeker.nickname}</p>
            <p className="text-xs text-gray-500">
              {seeker.gender} {seekerAge ? `· ${seekerAge}岁` : ''} {seeker.circle ? `· ${seeker.circle}` : ''}
            </p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>{results.length} 名候选可评分</p>
            {excluded.length > 0 && <p className="text-red-400">{excluded.length} 名因硬性条件冲突排除</p>}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">📐 {data.note}</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500">最低分数：</span>
        {[0, 55, 70, 85].map(v => (
          <button key={v} onClick={() => setMinScore(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${minScore === v ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {v === 0 ? '全部' : `${v}+`}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">显示 {filtered.length} / {results.length}</span>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">没有符合条件的匹配结果</div>
        ) : filtered.map(item => (
          <MatchCard key={item.guest.id} item={item} seekerName={seeker.nickname} seekerId={seeker.id} seeker={seeker} />
        ))}
      </div>

      {/* 资料不足无法评分 */}
      {data.unscorable?.length > 0 && (
        <div className="card bg-gray-50 border-dashed">
          <p className="text-sm text-gray-500 mb-2">
            📋 以下 {data.unscorable.length} 人因双方资料不足（无择偶条件、无标签）无法客观评分，可人工查看：
          </p>
          <div className="flex flex-wrap gap-2">
            {data.unscorable.map(({ guest: g }) => (
              <a key={g.id} href={`/guests/${g.id}`}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-primary-300">
                {g.nickname} {g.birth_year ? `· ${new Date().getFullYear() - g.birth_year}岁` : ''}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 硬性条件排除区 */}
      {excluded.length > 0 && (
        <div>
          <button onClick={() => setShowExcluded(v => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600">
            <Ban size={14} /> 已排除 {excluded.length} 人（硬性条件冲突）{showExcluded ? '▲' : '▼'}
          </button>
          {showExcluded && (
            <div className="mt-2 space-y-2">
              {excluded.map(item => (
                <div key={item.guest.id} className="card border-red-100 bg-red-50/40 py-3">
                  <p className="text-sm font-medium text-gray-700">{item.guest.nickname}</p>
                  {item.conflicts.map((c, i) => (
                    <p key={i} className="text-xs text-red-500 mt-0.5">⛔ {c}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
