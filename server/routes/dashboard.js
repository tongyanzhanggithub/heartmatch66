const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => {
  const totalGuests = db.prepare("SELECT COUNT(*) as c FROM guests WHERE deleted=0 AND audit_status='通过'").get().c;
  const totalMale = db.prepare("SELECT COUNT(*) as c FROM guests WHERE deleted=0 AND audit_status='通过' AND gender='男'").get().c;
  const totalFemale = db.prepare("SELECT COUNT(*) as c FROM guests WHERE deleted=0 AND audit_status='通过' AND gender='女'").get().c;
  const pendingAudit = db.prepare("SELECT COUNT(*) as c FROM guests WHERE deleted=0 AND audit_status='待审'").get().c;

  const totalEvents = db.prepare("SELECT COUNT(*) as c FROM events WHERE deleted=0").get().c;
  const upcomingEvents = db.prepare("SELECT * FROM events WHERE deleted=0 AND status IN ('筹备','报名中','进行中') ORDER BY date_time ASC LIMIT 5").all();
  const pendingReg = db.prepare("SELECT COUNT(*) as c FROM registrations WHERE audit_status='待审'").get().c;

  // Monthly stats from reviews (last 6 months)
  const monthlyStats = db.prepare(`
    SELECT
      strftime('%Y-%m', e.date_time) as month,
      COUNT(*) as events,
      SUM(r.revenue_male + r.revenue_female + r.revenue_other) as revenue,
      SUM(r.cost) as cost,
      SUM(r.revenue_male + r.revenue_female + r.revenue_other - r.cost) as net_profit,
      AVG(CASE WHEN r.registered > 0 THEN (r.attended * 100.0 / r.registered) ELSE NULL END) as attend_rate
    FROM reviews r JOIN events e ON r.event_id = e.id
    WHERE e.date_time >= date('now','-6 months')
    GROUP BY month ORDER BY month ASC
  `).all();

  const totalNetProfit = db.prepare("SELECT SUM(revenue_male+revenue_female+revenue_other-cost) as s FROM reviews").get().s || 0;

  // 来源渠道分布（全部未删嘉宾，含待审——反映获客效果）
  const sourceChannels = db.prepare(`
    SELECT COALESCE(NULLIF(source_channel, ''), '未填') as channel, COUNT(*) as count
    FROM guests WHERE deleted = 0
    GROUP BY channel ORDER BY count DESC
  `).all();

  // 库内嘉宾（已通过）年龄分布，男女分桶
  const ageDistribution = db.prepare(`
    SELECT
      CASE
        WHEN age <= 25 THEN '25岁以下'
        WHEN age <= 30 THEN '26-30岁'
        WHEN age <= 35 THEN '31-35岁'
        WHEN age <= 40 THEN '36-40岁'
        ELSE '40岁以上'
      END as bucket,
      SUM(CASE WHEN gender = '男' THEN 1 ELSE 0 END) as male,
      SUM(CASE WHEN gender = '女' THEN 1 ELSE 0 END) as female
    FROM (
      SELECT gender, CAST(strftime('%Y','now') AS INTEGER) - birth_year as age
      FROM guests WHERE deleted = 0 AND audit_status = '通过' AND birth_year IS NOT NULL
    )
    GROUP BY bucket
    ORDER BY MIN(age)
  `).all();

  // 复购率：到场过 ≥2 场的嘉宾 / 到场过 ≥1 场的嘉宾
  const attendCounts = db.prepare(`
    SELECT guest_id, COUNT(*) as n FROM registrations WHERE attended = 1 GROUP BY guest_id
  `).all();
  const attendedOnce = attendCounts.length;
  const attendedRepeat = attendCounts.filter(r => r.n >= 2).length;
  const repeatRate = attendedOnce > 0 ? Math.round((attendedRepeat / attendedOnce) * 100) : null;

  res.json({
    totalGuests, totalMale, totalFemale, pendingAudit,
    totalEvents, upcomingEvents, pendingReg,
    monthlyStats, totalNetProfit,
    sourceChannels, ageDistribution,
    repeatStats: { attendedOnce, attendedRepeat, repeatRate },
  });
});

module.exports = router;
