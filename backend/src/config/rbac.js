/**
 * RBAC permission matrix.
 * For each resource: 'edit' = full read/write, 'view' = read-only, undefined/'-' = no access.
 */
const PERMISSIONS = {
  'Fleet Manager': {
    dashboard: 'view',
    vehicles: 'edit',
    drivers: 'edit',
    trips: '-',
    maintenance: 'edit',
    fuel: '-',
    analytics: 'view',
    settings: '-',
  },
  Dispatcher: {
    dashboard: 'view',
    vehicles: 'view',
    drivers: '-',
    trips: 'edit',
    maintenance: '-',
    fuel: '-',
    analytics: '-',
    settings: '-',
  },
  'Safety Officer': {
    dashboard: 'view',
    vehicles: '-',
    drivers: 'edit',
    trips: 'view',
    maintenance: '-',
    fuel: '-',
    analytics: '-',
    settings: '-',
  },
  'Financial Analyst': {
    dashboard: 'view',
    vehicles: 'view',
    drivers: '-',
    trips: '-',
    maintenance: '-',
    fuel: 'edit',
    analytics: 'edit',
    settings: '-',
  },
};

function can(role, resource, needsEdit = false) {
  const level = PERMISSIONS[role]?.[resource];
  if (!level || level === '-') return false;
  if (needsEdit) return level === 'edit';
  return true; // 'view' or 'edit' both allow read
}

/** Roles blocked from permanent delete on a resource (edit access otherwise applies). */
const DELETE_DENIED = {
  drivers: ['Fleet Manager'],
};

function canDelete(role, resource) {
  if (DELETE_DENIED[resource]?.includes(role)) return false;
  return can(role, resource, true);
}

module.exports = { PERMISSIONS, can, canDelete };
