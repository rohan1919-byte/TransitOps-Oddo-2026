const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireAccess, requireResourceOrTripsEdit } = require('../middleware/auth');
const { canDelete } = require('../config/rbac');

router.use(authenticate);

// Available drivers for dispatch (trips edit OR drivers module access)
router.get('/available', requireResourceOrTripsEdit('drivers'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM drivers WHERE status = 'Available' AND license_expiry >= CURRENT_DATE ORDER BY id`
  );
  res.json(rows);
});

router.get('/', requireAccess('drivers'), async (req, res) => {
  const { status, search } = req.query;
  const clauses = [];
  const params = [];
  if (status && status !== 'All') {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    clauses.push(`(LOWER(name) LIKE $${params.length} OR LOWER(license_no) LIKE $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM drivers ${where} ORDER BY id`, params);
  res.json(rows);
});

router.post('/', requireAccess('drivers', true), async (req, res) => {
  const { name, license_no, license_category, license_expiry, contact_no, safety_score } = req.body;
  if (!name || !license_no || !license_category || !license_expiry || !contact_no) {
    return res.status(400).json({ error: 'All driver fields are required.' });
  }
  try {
    const existing = await pool.query('SELECT id FROM drivers WHERE license_no = $1', [license_no]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'License number must be unique.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO drivers (name, license_no, license_category, license_expiry, contact_no, safety_score, status)
       VALUES ($1,$2,$3,$4,$5,$6,'Available') RETURNING *`,
      [name, license_no, license_category, license_expiry, contact_no, safety_score || 100]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not add driver.' });
  }
});

router.put('/:id', requireAccess('drivers', true), async (req, res) => {
  const { name, license_category, license_expiry, contact_no, safety_score, status } = req.body;
  const { rows } = await pool.query(
    `UPDATE drivers SET name=$1, license_category=$2, license_expiry=$3, contact_no=$4,
     safety_score=$5, status=$6 WHERE id=$7 RETURNING *`,
    [name, license_category, license_expiry, contact_no, safety_score, status, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Driver not found.' });
  res.json(rows[0]);
});

router.delete('/:id', requireAccess('drivers', true), async (req, res) => {
  if (!canDelete(req.user.role, 'drivers')) {
    return res.status(403).json({ error: 'Your role cannot permanently delete drivers.' });
  }
  await pool.query('DELETE FROM drivers WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
