/**
 * Initializes the TransitOps database:
 * 1. Runs schema.sql (drops & recreates all tables)
 * 2. Runs seed.sql (sample operational data)
 * 3. Seeds RBAC demo users with bcrypt hashed passwords
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    console.log('→ Running schema.sql ...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);

    console.log('→ Running seed.sql ...');
    const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seed);

    console.log('→ Syncing vehicle/driver status with dispatched trips ...');
    const { syncStatuses } = require('./syncStatus');
    await syncStatuses(client);

    console.log('→ Seeding demo users (RBAC) ...');
    const demoUsers = [
      { name: 'Raven Kapoor', email: 'raven@transitops.in', role: 'Dispatcher' },
      { name: 'Meera Fleet', email: 'meera@transitops.in', role: 'Fleet Manager' },
      { name: 'Divya Rao', email: 'divya@transitops.in', role: 'Safety Officer' },
      { name: 'Kunal Shah', email: 'kunal@transitops.in', role: 'Financial Analyst' },
    ];
    const passwordHash = await bcrypt.hash('Passw0rd!', 10);
    for (const u of demoUsers) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [u.name, u.email, passwordHash, u.role]
      );
    }

    console.log('✔ Database initialized successfully.');
    console.log('  Demo login (any role): password = Passw0rd!');
    demoUsers.forEach((u) => console.log(`    ${u.role.padEnd(18)} -> ${u.email}`));
  } catch (err) {
    console.error('✘ Database init failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
