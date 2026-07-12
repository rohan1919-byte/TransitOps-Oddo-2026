const router = require('express').Router();
const { authenticate, requireAccess } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/rbac');

router.use(authenticate, requireAccess('settings'));

// In-memory demo depot settings (would be a settings table in a fuller build)
let depotSettings = {
  depotName: 'Gandhinagar Depot GJ4',
  currency: 'INR (₹)',
  distanceUnit: 'Kilometers',
};

router.get('/', (req, res) => {
  res.json({ depot: depotSettings, rbac: PERMISSIONS });
});

router.put('/', requireAccess('settings', true), (req, res) => {
  depotSettings = { ...depotSettings, ...req.body };
  res.json({ depot: depotSettings, rbac: PERMISSIONS });
});

module.exports = router;
