const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate, requireAccess } = require('../middleware/auth');

router.use(authenticate, requireAccess('analytics'));

router.get('/summary', async (req, res) => {
  // Fuel efficiency = total planned distance of completed trips / total fuel liters
  const eff = await pool.query(`
    SELECT
      COALESCE(SUM(t.planned_distance_km), 0) AS total_distance,
      COALESCE(SUM(f.liters), 0) AS total_liters
    FROM trips t
    LEFT JOIN fuel_logs f ON f.trip_id = t.id
    WHERE t.status = 'Completed'
  `);
  const { total_distance, total_liters } = eff.rows[0];
  const fuelEfficiency = total_liters > 0 ? (total_distance / total_liters) : 0;

  const vehicles = await pool.query(`SELECT status FROM vehicles`);
  const active = vehicles.rows.filter((v) => v.status !== 'Retired').length;
  const onTrip = vehicles.rows.filter((v) => v.status === 'On Trip').length;
  const fleetUtilization = active > 0 ? Math.round((onTrip / active) * 100) : 0;

  const vehicleStatusBreakdown = { Available: 0, 'On Trip': 0, 'In Shop': 0, Retired: 0 };
  vehicles.rows.forEach((v) => { vehicleStatusBreakdown[v.status] = (vehicleStatusBreakdown[v.status] || 0) + 1; });

  const cost = await pool.query(`
    SELECT COALESCE(SUM(cost),0) AS total FROM (
      SELECT cost FROM fuel_logs
      UNION ALL
      SELECT cost FROM maintenance_logs
    ) c
  `);
  const operationalCost = Number(cost.rows[0].total);

  // ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost, averaged across fleet
  const roiData = await pool.query(`
    SELECT
      v.id, v.acquisition_cost,
      COALESCE(rev.revenue, 0) AS revenue,
      COALESCE(f.fuel, 0) AS fuel,
      COALESCE(m.maint, 0) AS maint
    FROM vehicles v
    LEFT JOIN (SELECT vehicle_id, SUM(revenue) AS revenue FROM trips WHERE status='Completed' GROUP BY vehicle_id) rev ON rev.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(cost) AS fuel FROM fuel_logs GROUP BY vehicle_id) f ON f.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(cost) AS maint FROM maintenance_logs GROUP BY vehicle_id) m ON m.vehicle_id = v.id
  `);
  const roiValues = roiData.rows
    .filter((r) => Number(r.acquisition_cost) > 0)
    .map((r) => (Number(r.revenue) - (Number(r.fuel) + Number(r.maint))) / Number(r.acquisition_cost));
  const vehicleROI = roiValues.length ? (roiValues.reduce((a, b) => a + b, 0) / roiValues.length) * 100 : 0;

  const monthly = await pool.query(`
    SELECT TO_CHAR(created_at, 'Mon') AS month, COALESCE(SUM(revenue),0) AS revenue
    FROM trips WHERE status = 'Completed'
    GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at)
  `);

  const costliest = await pool.query(`
    SELECT v.reg_no, v.name_model, COALESCE(f.fuel,0) + COALESCE(m.maint,0) AS total_cost
    FROM vehicles v
    LEFT JOIN (SELECT vehicle_id, SUM(cost) AS fuel FROM fuel_logs GROUP BY vehicle_id) f ON f.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(cost) AS maint FROM maintenance_logs GROUP BY vehicle_id) m ON m.vehicle_id = v.id
    ORDER BY total_cost DESC LIMIT 5
  `);

  res.json({
    fuelEfficiency: Number(fuelEfficiency.toFixed(1)),
    fleetUtilization,
    operationalCost,
    vehicleROI: Number(vehicleROI.toFixed(1)),
    monthlyRevenue: monthly.rows,
    topCostliestVehicles: costliest.rows,
    vehicleStatusBreakdown,
  });
});

// CSV export of a chosen report
router.get('/export.csv', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT v.reg_no, v.name_model, v.type, v.status,
      COALESCE(f.fuel,0) AS fuel_cost, COALESCE(m.maint,0) AS maintenance_cost,
      COALESCE(f.fuel,0) + COALESCE(m.maint,0) AS total_operational_cost
    FROM vehicles v
    LEFT JOIN (SELECT vehicle_id, SUM(cost) AS fuel FROM fuel_logs GROUP BY vehicle_id) f ON f.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(cost) AS maint FROM maintenance_logs GROUP BY vehicle_id) m ON m.vehicle_id = v.id
    ORDER BY v.id
  `);

  const header = 'Registration No,Name/Model,Type,Status,Fuel Cost,Maintenance Cost,Total Operational Cost\n';
  const csv = rows
    .map((r) => `${r.reg_no},${r.name_model},${r.type},${r.status},${r.fuel_cost},${r.maintenance_cost},${r.total_operational_cost}`)
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transitops_report.csv"');
  res.send(header + csv);
});

module.exports = router;
