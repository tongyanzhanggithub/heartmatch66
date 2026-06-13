// 精美 Canvas 卡片绘制工具

const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function softCircle(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
}

function download(canvas, filename) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}

// 中文按字符自动换行；超过 maxLines 行则末行省略号。返回绘制后的 y。
function wrapText(ctx, text, x, y, maxW, lineH, maxLines = 99) {
  const lines = [];
  let line = '';
  for (const ch of String(text || '')) {
    if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  const show = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = show[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxW && last.length > 1) last = last.slice(0, -1);
    show[maxLines - 1] = last + '…';
  }
  for (const ln of show) { ctx.fillText(ln, x, y); y += lineH; }
  return y;
}

const ZODIACS = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const zodiacOf = y => ZODIACS[(y - 4) % 12];

// ─── 脱敏嘉宾资料卡 ───────────────────────────────
export function generateGuestCard(guest) {
  const isF = guest.gender === '女';
  const W = 750, H = 1050;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景：性别主题渐变
  const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
  if (isF) {
    bg.addColorStop(0, '#fff1f5'); bg.addColorStop(0.55, '#ffe4ef'); bg.addColorStop(1, '#fdd5e5');
  } else {
    bg.addColorStop(0, '#eff6ff'); bg.addColorStop(0.55, '#e0edfe'); bg.addColorStop(1, '#cfe3fc');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 柔光装饰
  softCircle(ctx, 90, 110, 220, isF ? 'rgba(244,114,182,0.18)' : 'rgba(96,165,250,0.18)');
  softCircle(ctx, W - 70, H - 200, 260, isF ? 'rgba(217,70,239,0.12)' : 'rgba(59,130,246,0.12)');
  softCircle(ctx, W - 120, 80, 120, 'rgba(253,224,71,0.25)');

  const accent = isF ? '#db2777' : '#2563eb';
  const accentSoft = isF ? '#f9a8d4' : '#93c5fd';

  // 顶部标识
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillText(`${isF ? '💗 女嘉宾' : '💙 男嘉宾'} · No.${isF ? 'F' : 'M'}${String(guest.id).padStart(3, '0')}`, W / 2, 92);

  // 中心白卡
  ctx.save();
  roundRect(ctx, 50, 135, W - 100, H - 320, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.shadowColor = isF ? 'rgba(219,39,119,0.18)' : 'rgba(37,99,235,0.18)';
  ctx.shadowBlur = 38;
  ctx.shadowOffsetY = 12;
  ctx.fill();
  ctx.restore();

  // 头像占位圆 + 首字
  const cx = W / 2, cy = 250;
  const avatarGrad = ctx.createLinearGradient(cx - 70, cy - 70, cx + 70, cy + 70);
  avatarGrad.addColorStop(0, isF ? '#f472b6' : '#60a5fa');
  avatarGrad.addColorStop(1, isF ? '#db2777' : '#2563eb');
  ctx.fillStyle = avatarGrad;
  ctx.beginPath(); ctx.arc(cx, cy, 72, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 60px ${FONT}`;
  ctx.fillText((guest.nickname || '?').slice(0, 1), cx, cy + 22);

  // 昵称
  ctx.fillStyle = '#111827';
  ctx.font = `bold 46px ${FONT}`;
  ctx.fillText(guest.nickname || '', cx, 400);

  // 年代+属相+星座行
  const yr = guest.birth_year;
  const meta = [
    yr ? `${String(yr).slice(2)}年生 · 属${zodiacOf(yr)}` : null,
    guest.height ? `${guest.height}cm` : null,
    guest.district || null,
  ].filter(Boolean).join('　·　');
  ctx.fillStyle = '#6b7280';
  ctx.font = `28px ${FONT}`;
  ctx.fillText(meta, cx, 452);

  // 职业胶囊
  if (guest.occupation || guest.circle) {
    const text = `${guest.circle || ''}${guest.circle && guest.occupation ? ' · ' : ''}${guest.occupation || ''}`;
    ctx.font = `bold 30px ${FONT}`;
    const tw = ctx.measureText(text).width;
    roundRect(ctx, cx - tw / 2 - 28, 478, tw + 56, 54, 27);
    ctx.fillStyle = isF ? '#fdf2f8' : '#eff6ff';
    ctx.fill();
    ctx.strokeStyle = accentSoft;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillText(text, cx, 515);
  }

  // 信息区（左对齐两列式）
  ctx.textAlign = 'left';
  let y = 600;
  const rows = [
    ['🎓', '学历', guest.education],
    ['🎯', '兴趣', guest.interests],
    ['💭', '择偶', guest.preferences || guest.one_liner],
  ].filter(r => r[2]);

  for (const [emoji, label, value] of rows) {
    ctx.font = `28px ${FONT}`;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`${emoji} ${label}`, 100, y);
    ctx.fillStyle = '#374151';
    ctx.font = `28px ${FONT}`;
    // 截断长文本
    let text = String(value);
    if (ctx.measureText(text).width > 420) {
      while (ctx.measureText(text + '…').width > 420 && text.length > 1) text = text.slice(0, -1);
      text += '…';
    }
    ctx.fillText(text, 230, y);
    y += 56;
  }

  // 一句话介绍（引用样式）
  if (guest.one_liner && guest.preferences) {
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `italic 30px ${FONT}`;
    let ol = `“${guest.one_liner}”`;
    if (ctx.measureText(ol).width > 560) {
      while (ctx.measureText(ol + '…”').width > 560 && ol.length > 2) ol = ol.slice(0, -1);
      ol += '…”';
    }
    ctx.fillText(ol, cx, y + 24);
    y += 70;
  }

  // 核验徽章
  let flags = {};
  try { flags = typeof guest.audit_flags === 'string' ? JSON.parse(guest.audit_flags || '{}') : (guest.audit_flags || {}); } catch { /* noop */ }
  const badges = [
    flags.real_name && '实名 ✓',
    flags.id_card && '证件 ✓',
    flags.single_promise && '单身承诺 ✓',
  ].filter(Boolean);
  if (badges.length) {
    ctx.textAlign = 'center';
    const badgeY = H - 250;
    const totalText = badges.join('   ');
    ctx.font = `bold 26px ${FONT}`;
    const tw = ctx.measureText(totalText).width;
    roundRect(ctx, cx - tw / 2 - 30, badgeY - 36, tw + 60, 54, 27);
    ctx.fillStyle = '#dcfce7';
    ctx.fill();
    ctx.fillStyle = '#15803d';
    ctx.fillText(totalText, cx, badgeY);
  }

  // 底部
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `bold 32px ${FONT}`;
  ctx.fillText('💌 想认识 TA？私信红娘报名', cx, H - 130);
  ctx.fillStyle = '#9ca3af';
  ctx.font = `22px ${FONT}`;
  ctx.fillText('半日相知 · 资料已脱敏 · 本人已授权展示 · 信息经平台核验', cx, H - 80);

  download(canvas, `嘉宾卡_${guest.nickname}.png`);
}

// ─── 八字合盘分享卡（升级版）────────────────────────
export function generateHepanCard(report) {
  const W = 750, H = 1500;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景：紫粉星空渐变
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fdf2f8');
  bg.addColorStop(0.45, '#fce7f3');
  bg.addColorStop(1, '#ede9fe');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  softCircle(ctx, 100, 130, 240, 'rgba(236,72,153,0.15)');
  softCircle(ctx, W - 80, H - 260, 280, 'rgba(139,92,246,0.15)');
  softCircle(ctx, W - 110, 150, 130, 'rgba(253,224,71,0.22)');

  // 散落小星星/爱心
  ctx.font = '26px serif';
  const deco = [['✨', 80, 300], ['💫', W - 90, 420], ['✨', 110, 760], ['💖', W - 70, 700], ['✨', W - 130, 950], ['💫', 70, 1000]];
  for (const [s, x, y] of deco) { ctx.globalAlpha = 0.5; ctx.fillText(s, x, y); }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';

  // 标题
  ctx.fillStyle = '#86198f';
  ctx.font = `bold 38px ${FONT}`;
  ctx.fillText('🧧 八字合盘 · 缘分测算', W / 2, 95);

  // 白卡
  ctx.save();
  roundRect(ctx, 45, 130, W - 90, H - 250, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.shadowColor = 'rgba(168,85,247,0.22)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 14;
  ctx.fill();
  ctx.restore();

  // 双方名字 + 心
  ctx.fillStyle = '#1f2937';
  ctx.font = `bold 50px ${FONT}`;
  const nameY = 230;
  ctx.fillText(report.a.nickname, W / 2 - 160, nameY);
  ctx.fillText(report.b.nickname, W / 2 + 160, nameY);
  ctx.font = '54px serif';
  ctx.fillText('💗', W / 2, nameY + 4);

  // 四柱信息
  const fmtP = b => {
    const p = b.pillars;
    const pillars = [p.year, p.month, p.day, p.time].filter(Boolean).join(' ');
    return `${pillars}${pillars ? ' · ' : ''}属${b.shengxiao}${b.xingzuo ? ' · ' + b.xingzuo + '座' : ''}`;
  };
  ctx.fillStyle = '#9ca3af';
  ctx.font = `24px ${FONT}`;
  ctx.fillText(fmtP(report.a.bazi), W / 2, 290);
  ctx.fillText(fmtP(report.b.bazi), W / 2, 326);

  // 分数光环
  const scx = W / 2, scy = 510;
  const ring = ctx.createLinearGradient(scx - 130, scy - 130, scx + 130, scy + 130);
  ring.addColorStop(0, '#ec4899');
  ring.addColorStop(1, '#8b5cf6');
  ctx.strokeStyle = ring;
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(scx, scy, 125, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(236,72,153,0.15)';
  ctx.lineWidth = 30;
  ctx.beginPath(); ctx.arc(scx, scy, 150, 0, 7); ctx.stroke();

  ctx.fillStyle = '#db2777';
  ctx.font = `bold 120px ${FONT}`;
  ctx.fillText(String(report.score), scx, scy + 34);
  ctx.fillStyle = '#9ca3af';
  ctx.font = `26px ${FONT}`;
  ctx.fillText('缘分指数', scx, scy + 86);

  // 等级
  ctx.fillStyle = '#86198f';
  ctx.font = `bold 46px ${FONT}`;
  ctx.fillText(`「${report.level}」`, W / 2, 730);

  // 关键词胶囊
  if (report.keyword) {
    const kw = `✨ ${report.keyword} ✨`;
    ctx.font = `bold 32px ${FONT}`;
    const tw = ctx.measureText(kw).width;
    roundRect(ctx, W / 2 - tw / 2 - 30, 760, tw + 60, 58, 29);
    const kg = ctx.createLinearGradient(W / 2 - tw / 2, 760, W / 2 + tw / 2, 818);
    kg.addColorStop(0, '#fce7f3'); kg.addColorStop(1, '#ede9fe');
    ctx.fillStyle = kg;
    ctx.fill();
    ctx.fillStyle = '#7c3aed';
    ctx.fillText(kw, W / 2, 800);
  }

  // 维度详解：标题 + 分数徽章 + 话术（自动换行，最多 3 行）
  let y = 880;
  const PAD = 80;
  for (const s of report.sections.slice(0, 4)) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1f2937';
    ctx.font = `bold 25px ${FONT}`;
    ctx.fillText(s.title, PAD, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = s.score_delta >= 0 ? '#16a34a' : '#dc2626';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`${s.score_delta > 0 ? '+' : ''}${s.score_delta} 分`, W - PAD, y);
    y += 32;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#6b7280';
    ctx.font = `21px ${FONT}`;
    y = wrapText(ctx, s.detail, PAD, y, W - PAD * 2, 30, 3) + 18;
  }

  // 宜约会吉日（彩蛋）
  if (report.lucky_dates && report.lucky_dates.length) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b45309';
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText('📅 黄历宜约会吉日', PAD, y);
    y += 32;
    ctx.fillStyle = '#92400e';
    ctx.font = `20px ${FONT}`;
    y = wrapText(ctx, report.lucky_dates.map(d => d.date).join('　'), PAD, y, W - PAD * 2, 28, 2);
  }

  // 底部
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9ca3af';
  ctx.font = `22px ${FONT}`;
  ctx.fillText('半日相知 · 仅供娱乐参考 · 感情幸福靠经营 💕', W / 2, H - 55);

  download(canvas, `合盘_${report.a.nickname}x${report.b.nickname}.png`);
}

// ─── AI 双向匹配分享卡 ───────────────────────────────
// item: matchPair 结果（含 guest/score/a_to_b/b_to_a/commonality/red_flags）；seeker: 发起匹配的嘉宾
export function generateMatchCard(item, seeker) {
  const cand = item.guest;
  const W = 750;
  const year = new Date().getFullYear();

  // 先算匹配亮点（双向明细+共性里分数最高的，去重），据此自适应卡片高度（消除下方空白）
  const pool = [...item.a_to_b.details, ...item.b_to_a.details, ...(item.commonality?.items || [])]
    .filter(d => d.score >= 70).sort((a, b) => b.score - a.score);
  const seen = new Set(), top = [];
  for (const h of pool) { if (seen.has(h.label)) continue; seen.add(h.label); top.push(h); if (top.length >= 5) break; }
  const nBars = 2 + (item.commonality && item.commonality.pct != null ? 1 : 0);
  const barsEnd = 540 + nBars * 54;          // 双向条结束 y
  const hiFirst = barsEnd + 38;              // 亮点首行 y
  const H = Math.round(hiFirst + Math.max(top.length, 1) * 33 + 64);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景：紫粉渐变
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#f5f3ff'); bg.addColorStop(0.5, '#faf5ff'); bg.addColorStop(1, '#fce7f3');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  softCircle(ctx, 90, 120, 220, 'rgba(168,85,247,0.15)');
  softCircle(ctx, W - 70, H - 150, 240, 'rgba(236,72,153,0.13)');
  softCircle(ctx, W - 110, 90, 120, 'rgba(99,102,241,0.16)');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#7c3aed';
  ctx.font = `bold 38px ${FONT}`;
  ctx.fillText('💞 AI 双向匹配报告', W / 2, 90);

  // 白卡
  ctx.save();
  roundRect(ctx, 45, 125, W - 90, H - 160, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.shadowColor = 'rgba(124,58,237,0.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.fill();
  ctx.restore();

  // 双方
  const sAge = seeker.birth_year ? year - seeker.birth_year : null;
  const cAge = cand.birth_year ? year - cand.birth_year : null;
  // 双方名字 + 心：居中成组，长昵称自动缩小字号，避免重叠或冲出卡片
  ctx.font = '38px serif';
  const wHeart = ctx.measureText('💞').width;
  let nf = 44;
  const namesW = () => { ctx.font = `bold ${nf}px ${FONT}`; return ctx.measureText(seeker.nickname).width + ctx.measureText(cand.nickname).width; };
  while (nf > 28 && namesW() + wHeart + 48 > W - 110) nf -= 2;
  ctx.font = `bold ${nf}px ${FONT}`;
  const wA = ctx.measureText(seeker.nickname).width;
  const wB = ctx.measureText(cand.nickname).width;
  let nx = (W - (wA + 48 + wHeart + wB)) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1f2937';
  ctx.fillText(seeker.nickname, nx, 205);
  const cxA = nx + wA / 2; nx += wA + 24;
  ctx.font = '38px serif'; ctx.fillText('💞', nx, 202); nx += wHeart + 24;
  ctx.fillStyle = '#1f2937'; ctx.font = `bold ${nf}px ${FONT}`;
  ctx.fillText(cand.nickname, nx, 205);
  const cxB = nx + wB / 2;

  // 资料行：各自居中于名字下方，超宽截断
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9ca3af';
  ctx.font = `21px ${FONT}`;
  const fitMeta = (s) => { let t = s; while (ctx.measureText(t).width > 290 && t.length > 1) t = t.slice(0, -1); return t === s ? s : t + '…'; };
  const metaS = fitMeta([sAge ? `${sAge}岁` : null, seeker.circle, seeker.education].filter(Boolean).join(' · '));
  const metaC = fitMeta([cAge ? `${cAge}岁` : null, cand.circle, cand.education].filter(Boolean).join(' · '));
  ctx.fillText(metaS, cxA, 240);
  ctx.fillText(metaC, cxB, 240);

  // 总分环
  const scx = W / 2, scy = 370;
  const ring = ctx.createLinearGradient(scx - 95, scy - 95, scx + 95, scy + 95);
  ring.addColorStop(0, '#a855f7'); ring.addColorStop(1, '#ec4899');
  ctx.strokeStyle = ring; ctx.lineWidth = 13;
  ctx.beginPath(); ctx.arc(scx, scy, 90, 0, 7); ctx.stroke();
  ctx.fillStyle = '#7c3aed'; ctx.font = `bold 84px ${FONT}`;
  ctx.fillText(String(item.score), scx, scy + 26);
  ctx.fillStyle = '#9ca3af'; ctx.font = `21px ${FONT}`;
  ctx.fillText('匹配指数', scx, scy + 60);
  const level = item.score >= 85 ? '高度契合' : item.score >= 70 ? '较为匹配' : item.score >= 55 ? '一般匹配' : '缘分待培养';
  ctx.fillStyle = '#86198f'; ctx.font = `bold 32px ${FONT}`;
  ctx.fillText(`「${level}」`, scx, scy + 112);

  // 双向契合条
  let y = scy + 170;
  const bar = (label, pct) => {
    const x0 = 90, x1 = W - 90, bw = x1 - x0;
    ctx.textAlign = 'left'; ctx.fillStyle = '#6b7280'; ctx.font = `21px ${FONT}`;
    ctx.fillText(label, x0, y - 8);
    ctx.textAlign = 'right'; ctx.fillStyle = '#7c3aed'; ctx.font = `bold 21px ${FONT}`;
    ctx.fillText(pct == null ? '—' : `${pct}%`, x1, y - 8);
    ctx.fillStyle = '#f3e8ff'; roundRect(ctx, x0, y, bw, 12, 6); ctx.fill();
    if (pct != null) {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#a855f7'); g.addColorStop(1, '#ec4899');
      ctx.fillStyle = g; roundRect(ctx, x0, y, Math.max(bw * pct / 100, 8), 12, 6); ctx.fill();
    }
    y += 54;
  };
  bar(`Ta 符合 ${seeker.nickname} 的期望`, item.a_to_b.pct);
  bar(`${seeker.nickname} 符合 Ta 的期望`, item.b_to_a.pct);
  if (item.commonality && item.commonality.pct != null) bar('双方共性契合', item.commonality.pct);

  // 匹配亮点（top 已在开头算好，此处只绘制）
  y += 4;
  ctx.textAlign = 'left'; ctx.fillStyle = '#7c3aed'; ctx.font = `bold 25px ${FONT}`;
  ctx.fillText('✨ 匹配亮点', 90, y); y += 34;
  ctx.font = `21px ${FONT}`;
  if (top.length === 0) {
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('双方资料完善后，匹配亮点会更丰富～', 90, y);
  } else {
    for (const h of top) {
      ctx.fillStyle = '#ec4899'; ctx.fillText('●', 90, y);
      ctx.fillStyle = '#374151';
      let line = `${h.label}：${h.note || ''}`;
      const full = line;
      while (ctx.measureText(line).width > W - 250 && line.length > 4) line = line.slice(0, -1);
      if (line.length < full.length) line += '…';
      ctx.fillText(line, 116, y);
      y += 33;
    }
  }

  // 底部（对客户展示，不含任何内部预警/底线信息）
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9ca3af';
  ctx.font = `20px ${FONT}`;
  ctx.fillText('半日相知 · AI 智能双向匹配 💞', W / 2, H - 38);

  download(canvas, `匹配卡_${seeker.nickname}x${cand.nickname}.png`);
}
