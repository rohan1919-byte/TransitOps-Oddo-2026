const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { PERMISSIONS } = require('../config/rbac');

const MAX_ATTEMPTS = 5;

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (!role) {
    return res.status(400).json({ error: 'Role is required.' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        error: `Account locked after 5 failed attempts. Try again in ${mins} minute(s).`,
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      const attempts = user.failed_attempts + 1;
      const locked = attempts >= MAX_ATTEMPTS;
      await pool.query(
        `UPDATE users SET failed_attempts = $1, locked_until = $2 WHERE id = $3`,
        [locked ? 0 : attempts, locked ? new Date(Date.now() + 15 * 60 * 1000) : null, user.id]
      );
      if (locked) {
        return res.status(423).json({ error: 'Account locked after 5 failed attempts. Try again in 15 minutes.' });
      }
      return res.status(401).json({
        error: `Invalid credentials. ${MAX_ATTEMPTS - attempts} attempt(s) remaining before lockout.`,
      });
    }

    // reset failed attempts on success
    await pool.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    if (role && user.role !== role) {
      return res.status(403).json({
        error: `Selected role "${role}" does not match this account. "${user.email}" is registered as ${user.role}.`,
      });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      permissions: PERMISSIONS[user.role],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

router.get('/roles', (req, res) => {
  res.json(Object.keys(PERMISSIONS));
});

module.exports = router;
