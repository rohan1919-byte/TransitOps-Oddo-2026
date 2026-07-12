const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireAccess } = require('../middleware/auth');

router.use(authenticate, requireAccess('fuel'));

router.get('/logs', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT f.*, v.reg_no, v.name_model AS vehicle_name
    FROM fuel_logs f JOIN vehicles v ON v.id = f.vehicle_id
    ORDER BY f.id DESC
  `);
  res.json(rows);
});

router.post('/logs', requireAccess('fuel', true), async (req, res) => {
  const { vehicle_id, liters, cost, log_date, trip_id } = req.body;
  if (!vehicle_id || !liters || !cost) {
    return res.status(400).json({ error: 'Vehicle, liters and cost are required.' });
  }
  const { rows } = await pool.query(
    `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, log_date) VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE)) RETURNING *`,
    [vehicle_id, trip_id || null, liters, cost, log_date || null]
  );
  res.status(201).json(rows[0]);
});

router.get('/expenses', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT e.*, v.reg_no, v.name_model AS vehicle_name, t.trip_code
    FROM expenses e
    JOIN vehicles v ON v.id = e.vehicle_id
    LEFT JOIN trips t ON t.id = e.trip_id
    ORDER BY e.id DESC
  `);
  res.json(rows);
});

router.post('/expenses', requireAccess('fuel', true), async (req, res) => {
  const { vehicle_id, trip_id, toll, other, maint_linked, status } = req.body;
  if (!vehicle_id) return res.status(400).json({ error: 'Vehicle is required.' });
  const { rows } = await pool.query(
    `INSERT INTO expenses (vehicle_id, trip_id, toll, other, maint_linked, status)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [vehicle_id, trip_id || null, toll || 0, other || 0, maint_linked || 0, status || 'Available']
  );
  res.status(201).json(rows[0]);
});

// Total operational cost per vehicle = Fuel + Maintenance (auto-computed)
router.get('/operational-cost', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      v.id AS vehicle_id, v.reg_no, v.name_model,
      COALESCE(f.fuel_total, 0) AS fuel_total,
      COALESCE(m.maint_total, 0) AS maintenance_total,
      COALESCE(f.fuel_total, 0) + COALESCE(m.maint_total, 0) AS total_operational_cost
    FROM vehicles v
    LEFT JOIN (SELECT vehicle_id, SUM(cost) AS fuel_total FROM fuel_logs GROUP BY vehicle_id) f ON f.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(cost) AS maint_total FROM maintenance_logs GROUP BY vehicle_id) m ON m.vehicle_id = v.id
    ORDER BY v.id
  `);
  res.json(rows);
});

module.exports = router;
