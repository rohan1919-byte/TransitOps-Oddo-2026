const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireAccess } = require('../middleware/auth');

router.use(authenticate, requireAccess('trips'));

async function nextTripCode(client) {
  const { rows } = await client.query(`SELECT trip_code FROM trips ORDER BY id DESC LIMIT 1`);
  const last = rows[0]?.trip_code;
  const n = last ? parseInt(last.replace('TR', ''), 10) + 1 : 1;
  return `TR${String(n).padStart(3, '0')}`;
}

// GET all trips (joined with vehicle/driver display info)
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT t.*, v.reg_no, v.name_model AS vehicle_name, d.name AS driver_name
    FROM trips t
    LEFT JOIN vehicles v ON v.id = t.vehicle_id
    LEFT JOIN drivers d ON d.id = t.driver_id
    ORDER BY t.id DESC
  `);
  res.json(rows);
});

// Create a Draft trip
router.post('/', requireAccess('trips', true), async (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km } = req.body;
  if (!source || !destination || !cargo_weight_kg || !planned_distance_km) {
    return res.status(400).json({ error: 'Source, destination, cargo weight and distance are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Rule: Cargo weight must not exceed vehicle max capacity
    if (vehicle_id) {
      const v = await client.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
      const vehicle = v.rows[0];
      if (!vehicle) throw { status: 404, message: 'Vehicle not found.' };
      if (vehicle.status !== 'Available') {
        throw { status: 409, message: `Vehicle is ${vehicle.status} and cannot be assigned to a new trip.` };
      }
      if (Number(cargo_weight_kg) > Number(vehicle.capacity_kg)) {
        throw {
          status: 422,
          message: `Cargo weight exceeded by ${(cargo_weight_kg - vehicle.capacity_kg).toFixed(0)} kg → dispatch blocked.`,
        };
      }
    }

    if (driver_id) {
      const d = await client.query('SELECT * FROM drivers WHERE id = $1', [driver_id]);
      const driver = d.rows[0];
      if (!driver) throw { status: 404, message: 'Driver not found.' };
      if (driver.status === 'Suspended') {
        throw { status: 422, message: 'Driver is Suspended and cannot be assigned to trips.' };
      }
      if (new Date(driver.license_expiry) < new Date()) {
        throw { status: 422, message: 'Driver license has expired and cannot be assigned to trips.' };
      }
      if (driver.status !== 'Available') {
        throw { status: 409, message: `Driver is already ${driver.status}.` };
      }
    }

    const trip_code = await nextTripCode(client);
    const hasAssignment = vehicle_id && driver_id;
    const tripStatus = hasAssignment ? 'Dispatched' : 'Draft';
    const tripEta = hasAssignment ? '30 min' : 'Awaiting vehicle';

    const { rows } = await client.query(
      `INSERT INTO trips (trip_code, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, status, eta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [trip_code, source, destination, vehicle_id || null, driver_id || null, cargo_weight_kg, planned_distance_km, tripStatus, tripEta]
    );

    if (hasAssignment) {
      await client.query(`UPDATE vehicles SET status = 'On Trip' WHERE id = $1`, [vehicle_id]);
      await client.query(`UPDATE drivers SET status = 'On Trip' WHERE id = $1`, [driver_id]);
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Could not create trip.' });
  } finally {
    client.release();
  }
});

// Dispatch a Draft trip -> Dispatched; vehicle & driver -> On Trip
router.post('/:id/dispatch', requireAccess('trips', true), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: tripRows } = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [req.params.id]);
    const trip = tripRows[0];
    if (!trip) throw { status: 404, message: 'Trip not found.' };
    if (trip.status !== 'Draft') throw { status: 409, message: `Trip is already ${trip.status}.` };
    if (!trip.vehicle_id || !trip.driver_id) throw { status: 422, message: 'Assign both a vehicle and a driver before dispatching.' };

    const v = await client.query('SELECT * FROM vehicles WHERE id = $1 FOR UPDATE', [trip.vehicle_id]);
    const vehicle = v.rows[0];
    if (vehicle.status !== 'Available') throw { status: 409, message: `Vehicle is ${vehicle.status}, cannot dispatch.` };
    if (Number(trip.cargo_weight_kg) > Number(vehicle.capacity_kg)) {
      throw { status: 422, message: 'Cargo weight exceeds vehicle capacity → dispatch blocked.' };
    }

    const d = await client.query('SELECT * FROM drivers WHERE id = $1 FOR UPDATE', [trip.driver_id]);
    const driver = d.rows[0];
    if (driver.status === 'Suspended') throw { status: 422, message: 'Driver is Suspended, cannot dispatch.' };
    if (new Date(driver.license_expiry) < new Date()) throw { status: 422, message: 'Driver license expired, cannot dispatch.' };
    if (driver.status !== 'Available') throw { status: 409, message: `Driver is ${driver.status}, cannot dispatch.` };

    await client.query(`UPDATE vehicles SET status = 'On Trip' WHERE id = $1`, [vehicle.id]);
    await client.query(`UPDATE drivers SET status = 'On Trip' WHERE id = $1`, [driver.id]);
    const { rows } = await client.query(
      `UPDATE trips SET status = 'Dispatched', eta = COALESCE(eta, '30 min'), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [trip.id]
    );

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || 'Could not dispatch trip.' });
  } finally {
    client.release();
  }
});

// Complete a Dispatched trip -> Completed; vehicle & driver -> Available; logs fuel + odometer
router.post('/:id/complete', requireAccess('trips', true), async (req, res) => {
  const { final_odometer, fuel_consumed_l, fuel_cost, revenue } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: tripRows } = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [req.params.id]);
    const trip = tripRows[0];
    if (!trip) throw { status: 404, message: 'Trip not found.' };
    if (trip.status !== 'Dispatched') throw { status: 409, message: `Only dispatched trips can be completed.` };

    await client.query(
      `UPDATE trips SET status='Completed', final_odometer=$1, fuel_consumed_l=$2, revenue=$3, eta='Arrived', updated_at=NOW() WHERE id=$4`,
      [final_odometer || null, fuel_consumed_l || null, revenue || trip.revenue || 0, trip.id]
    );

    if (final_odometer) {
      await client.query(`UPDATE vehicles SET odometer = $1 WHERE id = $2`, [final_odometer, trip.vehicle_id]);
    }
    await client.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [trip.vehicle_id]);
    await client.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [trip.driver_id]);

    if (fuel_consumed_l) {
      await client.query(
        `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, log_date) VALUES ($1,$2,$3,$4,CURRENT_DATE)`,
        [trip.vehicle_id, trip.id, fuel_consumed_l, fuel_cost || 0]
      );
    }

    const { rows } = await client.query('SELECT * FROM trips WHERE id = $1', [trip.id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || 'Could not complete trip.' });
  } finally {
    client.release();
  }
});

// Cancel a Draft or Dispatched trip -> Cancelled; restores vehicle/driver to Available
router.post('/:id/cancel', requireAccess('trips', true), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: tripRows } = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [req.params.id]);
    const trip = tripRows[0];
    if (!trip) throw { status: 404, message: 'Trip not found.' };
    if (!['Draft', 'Dispatched'].includes(trip.status)) {
      throw { status: 409, message: `Trip is ${trip.status} and cannot be cancelled.` };
    }

    if (trip.status === 'Dispatched') {
      if (trip.vehicle_id) await client.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [trip.vehicle_id]);
      if (trip.driver_id) await client.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [trip.driver_id]);
    }

    const { rows } = await client.query(
      `UPDATE trips SET status='Cancelled', eta='Vehicle went to shop', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [trip.id]
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(err.status || 500).json({ error: err.message || 'Could not cancel trip.' });
  } finally {
    client.release();
  }
});

module.exports = router;
