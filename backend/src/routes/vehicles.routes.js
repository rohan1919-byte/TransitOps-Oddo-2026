const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireAccess, requireResourceOrTripsEdit } = require('../middleware/auth');

router.use(authenticate);

// GET available vehicles for dispatch selection (trips edit OR vehicles module access)
router.get('/available', requireResourceOrTripsEdit('vehicles'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM vehicles WHERE status = 'Available' ORDER BY id`
  );
  res.json(rows);
});

// GET /api/vehicles?type=&status=&region=&search=
router.get('/', requireAccess('vehicles'), async (req, res) => {
  const { type, status, region, search } = req.query;
  const clauses = [];
  const params = [];

  if (type && type !== 'All') {
    params.push(type);
    clauses.push(`type = $${params.length}`);
  }
  if (status && status !== 'All') {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  if (region && region !== 'All') {
    params.push(region);
    clauses.push(`region = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    clauses.push(`(LOWER(reg_no) LIKE $${params.length} OR LOWER(name_model) LIKE $${params.length})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM vehicles ${where} ORDER BY id`, params);
  res.json(rows);
});

router.post('/', requireAccess('vehicles', true), async (req, res) => {
  const { reg_no, name_model, type, capacity_kg, odometer, acquisition_cost, region } = req.body;

  if (!reg_no || !name_model || !type || !capacity_kg) {
    return res.status(400).json({ error: 'Registration No, Name/Model, Type and Capacity are required.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM vehicles WHERE reg_no = $1', [reg_no]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Registration number must be unique. This one is already registered.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO vehicles (reg_no, name_model, type, capacity_kg, odometer, acquisition_cost, region, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Available') RETURNING *`,
      [reg_no, name_model, type, capacity_kg, odometer || 0, acquisition_cost || 0, region || 'Ahmedabad']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not register vehicle.' });
  }
});

router.put('/:id', requireAccess('vehicles', true), async (req, res) => {
  const { id } = req.params;
  const { name_model, type, capacity_kg, odometer, acquisition_cost, status, region } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE vehicles SET name_model=$1, type=$2, capacity_kg=$3, odometer=$4,
       acquisition_cost=$5, status=$6, region=$7 WHERE id=$8 RETURNING *`,
      [name_model, type, capacity_kg, odometer, acquisition_cost, status, region, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Vehicle not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not update vehicle.' });
  }
});

router.delete('/:id', requireAccess('vehicles', true), async (req, res) => {
  await pool.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
