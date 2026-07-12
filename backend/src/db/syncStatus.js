/**
 * Syncs vehicle and driver statuses with currently dispatched trips.
 * Resets stale On Trip statuses and promotes active dispatched assignments.
 * Run: npm run db:sync
 */
const pool = require('./pool');

async function syncStatuses(client) {
  const resetV = await client.query(`
    UPDATE vehicles SET status = 'Available'
    WHERE status = 'On Trip'
      AND id NOT IN (
        SELECT t.vehicle_id FROM trips t
        WHERE t.status = 'Dispatched' AND t.vehicle_id IS NOT NULL
      )
    RETURNING reg_no
  `);

  const resetD = await client.query(`
    UPDATE drivers SET status = 'Available'
    WHERE status = 'On Trip'
      AND id NOT IN (
        SELECT t.driver_id FROM trips t
        WHERE t.status = 'Dispatched' AND t.driver_id IS NOT NULL
      )
      AND status != 'Suspended'
    RETURNING name
  `);

  const v = await client.query(`
    UPDATE vehicles v SET status = 'On Trip'
    WHERE v.id IN (SELECT t.vehicle_id FROM trips t WHERE t.status = 'Dispatched' AND t.vehicle_id IS NOT NULL)
      AND v.status NOT IN ('Retired', 'On Trip')
    RETURNING v.reg_no
  `);

  const d = await client.query(`
    UPDATE drivers d SET status = 'On Trip'
    WHERE d.id IN (SELECT t.driver_id FROM trips t WHERE t.status = 'Dispatched' AND t.driver_id IS NOT NULL)
      AND d.status NOT IN ('Suspended', 'On Trip')
    RETURNING d.name
  `);

  return {
    resetVehicles: resetV.rowCount,
    resetDrivers: resetD.rowCount,
    onTripVehicles: v.rowCount,
    onTripDrivers: d.rowCount,
  };
}

async function run() {
  const client = await pool.connect();
  try {
    const result = await syncStatuses(client);
    console.log(`✔ Reset ${result.resetVehicles} vehicle(s) and ${result.resetDrivers} driver(s) to Available.`);
    console.log(`✔ Synced ${result.onTripVehicles} vehicle(s) and ${result.onTripDrivers} driver(s) to On Trip.`);
  } catch (err) {
    console.error('✘ Sync failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

module.exports = { syncStatuses };

if (require.main === module) {
  run();
}
