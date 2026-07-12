const jwt = require('jsonwebtoken');
const { can } = require('../config/rbac');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, name, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}

/**
 * Guards a route by resource + required access level.
 * requireAccess('vehicles', true) -> needs 'edit' level
 * requireAccess('vehicles') -> needs at least 'view' level
 */
function requireAccess(resource, needsEdit = false) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!can(role, resource, needsEdit)) {
      return res.status(403).json({
        error: `Your role (${role}) does not have ${needsEdit ? 'edit' : 'view'} access to ${resource}.`,
      });
    }
    next();
  };
}

/** Dispatch pool endpoints: resource view/edit OR trips edit (for trip assignment). */
function requireResourceOrTripsEdit(resource) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (can(role, resource) || can(role, 'trips', true)) return next();
    return res.status(403).json({
      error: `Your role (${role}) cannot access ${resource} for dispatch.`,
    });
  };
}

module.exports = { authenticate, requireAccess, requireResourceOrTripsEdit };
