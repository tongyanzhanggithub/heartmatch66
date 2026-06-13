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
  const W = 750, H = 1150;
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
  roundRect(ctx, 45, 130, W - 90, H - 290, 34);
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

  // 维度摘要：固定两列对齐（左列标题、右列分数），中间点线引导
  const secs = report.sections.slice(0, 4);
  const rowH = 52;
  let y = 880;
  const colL = 175, colR = W - 175;
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    const rowY = y + i * rowH;

    // 行间淡分隔线
    if (i > 0) {
      ctx.strokeStyle = 'rgba(168,85,247,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colL, rowY - rowH / 2 - 9);
      ctx.lineTo(colR, rowY - rowH / 2 - 9);
      ctx.stroke();
    }

    // 左列：标题
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6b7280';
    ctx.font = `26px ${FONT}`;
    ctx.fillText(s.title, colL, rowY);

    // 右列：分数（右对齐）
    ctx.textAlign = 'right';
    ctx.fillStyle = s.score_delta >= 0 ? '#16a34a' : '#dc2626';
    ctx.font = `bold 27px ${FONT}`;
    const sign = s.score_delta > 0 ? '+' : '';
    ctx.fillText(`${sign}${s.score_delta} 分`, colR, rowY);

    // 中间点线引导（从标题尾到分数头）
    ctx.font = `26px ${FONT}`;
    ctx.textAlign = 'left';
    const titleW = ctx.measureText(s.title).width;
    ctx.font = `bold 27px ${FONT}`;
    const scoreW = ctx.measureText(`${sign}${s.score_delta} 分`).width;
    ctx.strokeStyle = 'rgba(156,163,175,0.4)';
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(colL + titleW + 18, rowY - 8);
    ctx.lineTo(colR - scoreW - 18, rowY - 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.textAlign = 'center';

  // 底部
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9ca3af';
  ctx.font = `22px ${FONT}`;
  ctx.fillText('半日相知 · 仅供娱乐参考 · 感情幸福靠经营 💕', W / 2, H - 60);

  download(canvas, `合盘_${report.a.nickname}x${report.b.nickname}.png`);
}
