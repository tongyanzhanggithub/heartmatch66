const router = require('express').Router();
const db = require('../db');

// Get review for an event
router.get('/event/:event_id', (req, res) => {
  const review = db.prepare('SELECT * FROM reviews WHERE event_id = ?').get(req.params.event_id);
  if (!review) return res.json(null);
  res.json(review);
});

// Create or update review
router.post('/event/:event_id', (req, res) => {
  const event_id = req.params.event_id;
  const event = db.prepare('SELECT id FROM events WHERE id = ? AND deleted = 0').get(event_id);
  if (!event) return res.status(404).json({ error: '活动不存在' });

  const {
    registered, attended, male_attended, female_attended, matches,
    revenue_male, revenue_female, revenue_other, cost, acquisition_cost,
    satisfaction, went_well, improve, actions, cases
  } = req.body;

  const existing = db.prepare('SELECT id FROM reviews WHERE event_id = ?').get(event_id);

  if (existing) {
    db.prepare(`
      UPDATE reviews SET
        registered=?, attended=?, male_attended=?, female_attended=?, matches=?,
        revenue_male=?, revenue_female=?, revenue_other=?, cost=?, acquisition_cost=?,
        satisfaction=?, went_well=?, improve=?, actions=?, cases=?,
        updated_at=datetime('now','localtime')
      WHERE event_id=?
    `).run(
      registered||0, attended||0, male_attended||0, female_attended||0, matches||0,
      revenue_male||0, revenue_female||0, revenue_other||0, cost||0, acquisition_cost||0,
      satisfaction||null, went_well||null, improve||null, actions||null, cases||null,
      event_id
    );
  } else {
    db.prepare(`
      INSERT INTO reviews (event_id, registered, attended, male_attended, female_attended, matches,
        revenue_male, revenue_female, revenue_other, cost, acquisition_cost,
        satisfaction, went_well, improve, actions, cases)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      event_id,
      registered||0, attended||0, male_attended||0, female_attended||0, matches||0,
      revenue_male||0, revenue_female||0, revenue_other||0, cost||0, acquisition_cost||0,
      satisfaction||null, went_well||null, improve||null, actions||null, cases||null
    );
  }

  res.json(db.prepare('SELECT * FROM reviews WHERE event_id = ?').get(event_id));
});

module.exports = router;
