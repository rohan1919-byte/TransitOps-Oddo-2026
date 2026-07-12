const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireAccess } = require('../middleware/auth');

router.use(authenticate, requireAccess('maintenance'));

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT m.*, v.reg_no, v.name_model AS vehicle_name
    FROM maintenance_logs m JOIN vehicles v ON v.id = m.vehicle_id
    ORDER BY m.id DESC
  `);
  res.json(rows);
});

// Create maintenance record -> vehicle becomes In Shop, removed from dispatch pool
router.post('/', requireAccess('maintenance', true), async (req, res) => {
  const { vehicle_id, service_type, cost, service_date } = req.body;
  if (!vehicle_id || !service_type) {
    return res.status(400).json({ error: 'Vehicle and service type are required.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const v = await client.query('SELECT * FROM vehicles WHERE id = $1 FOR UPDATE', [vehicle_id]);
    if (!v.rows[0]) throw { status: 404, message: 'Vehicle not found.' };
    if (v.rows[0].status === 'On Trip') {
      throw { status: 409, message: 'Vehicle is currently On Trip and cannot enter maintenance until the trip ends.' };
    }

    const { rows } = await client.query(
      `INSERT INTO maintenance_logs (vehicle_id, service_type, cost, service_date, status)
       VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),'In Shop') RETURNING *`,
      [vehicle_id, service_type, cost || 0, service_date || null]
    );

    if (v.rows[0].status !== 'Retired') {
      await client.query(`UPDATE vehicles SET status = 'In Shop' WHERE id = $1`, [vehicle_id]);
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || 'Could not log maintenance.' });
  } finally {
    client.release();
  }
});

// Close maintenance -> vehicle restored to Available (unless retired)
router.post('/:id/close', requireAccess('maintenance', true), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const m = await client.query('SELECT * FROM maintenance_logs WHERE id = $1 FOR UPDATE', [req.params.id]);
    const record = m.rows[0];
    if (!record) throw { status: 404, message: 'Maintenance record not found.' };
    if (record.status === 'Completed') throw { status: 409, message: 'Record already completed.' };

    await client.query(`UPDATE maintenance_logs SET status = 'Completed' WHERE id = $1`, [record.id]);

    const v = await client.query('SELECT * FROM vehicles WHERE id = $1', [record.vehicle_id]);
    if (v.rows[0]?.status !== 'Retired') {
      await client.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [record.vehicle_id]);
    }

    const { rows } = await client.query('SELECT * FROM maintenance_logs WHERE id = $1', [record.id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || 'Could not close maintenance record.' });
  } finally {
    client.release();
  }
});

module.exports = router;
