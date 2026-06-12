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

  res.json({
    totalGuests, totalMale, totalFemale, pendingAudit,
    totalEvents, upcomingEvents, pendingReg,
    monthlyStats, totalNetProfit
  });
});

module.exports = router;
