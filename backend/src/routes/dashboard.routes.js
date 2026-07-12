const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireAccess } = require('../middleware/auth');

router.use(authenticate, requireAccess('dashboard'));

router.get('/kpis', async (req, res) => {
  const { type, status, region } = req.query;

  const filterClauses = [];
  const filterParams = [];
  if (type && type !== 'All') { filterParams.push(type); filterClauses.push(`type = $${filterParams.length}`); }
  if (status && status !== 'All') { filterParams.push(status); filterClauses.push(`status = $${filterParams.length}`); }
  if (region && region !== 'All') { filterParams.push(region); filterClauses.push(`region = $${filterParams.length}`); }
  const filterWhere = filterClauses.length ? `WHERE ${filterClauses.join(' AND ')}` : '';

  const breakdownClauses = [];
  const breakdownParams = [];
  if (type && type !== 'All') { breakdownParams.push(type); breakdownClauses.push(`type = $${breakdownParams.length}`); }
  if (region && region !== 'All') { breakdownParams.push(region); breakdownClauses.push(`region = $${breakdownParams.length}`); }
  const breakdownWhere = breakdownClauses.length ? `WHERE ${breakdownClauses.join(' AND ')}` : '';

  const filtered = await pool.query(
    `SELECT status, COUNT(*)::int AS count FROM vehicles ${filterWhere} GROUP BY status`,
    filterParams
  );
  const filteredCounts = { Available: 0, 'On Trip': 0, 'In Shop': 0, Retired: 0 };
  filtered.rows.forEach((r) => { filteredCounts[r.status] = r.count; });

  const breakdown = await pool.query(
    `SELECT status, COUNT(*)::int AS count FROM vehicles ${breakdownWhere} GROUP BY status`,
    breakdownParams
  );
  const counts = { Available: 0, 'On Trip': 0, 'In Shop': 0, Retired: 0 };
  breakdown.rows.forEach((r) => { counts[r.status] = r.count; });

  const totalActive = filteredCounts.Available + filteredCounts['On Trip'] + filteredCounts['In Shop'];
  const utilization = totalActive > 0 ? Math.round((filteredCounts['On Trip'] / totalActive) * 100) : 0;

  const trips = await pool.query(`SELECT status, COUNT(*)::int AS count FROM trips GROUP BY status`);
  const tripCounts = { Draft: 0, Dispatched: 0, Completed: 0, Cancelled: 0 };
  trips.rows.forEach((r) => { tripCounts[r.status] = r.count; });

  const driversOnDuty = await pool.query(
    `SELECT COUNT(*)::int AS count FROM drivers WHERE status IN ('Available','On Trip')`
  );

  res.json({
    activeVehicles: totalActive,
    availableVehicles: filteredCounts.Available,
    vehiclesInMaintenance: filteredCounts['In Shop'],
    activeTrips: tripCounts.Dispatched,
    pendingTrips: tripCounts.Draft,
    driversOnDuty: driversOnDuty.rows[0].count,
    fleetUtilization: utilization,
    vehicleStatusBreakdown: counts,
  });
});

router.get('/recent-trips', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT t.id, t.trip_code, t.status, t.eta, v.name_model AS vehicle_name, d.name AS driver_name
    FROM trips t
    LEFT JOIN vehicles v ON v.id = t.vehicle_id
    LEFT JOIN drivers d ON d.id = t.driver_id
    ORDER BY t.id DESC LIMIT 6
  `);
  res.json(rows);
});

module.exports = router;
