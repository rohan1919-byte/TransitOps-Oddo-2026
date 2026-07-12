import React from 'react';

const MAP = {
  Available: 'badge-green',
  'On Trip': 'badge-blue',
  'In Shop': 'badge-amber',
  Retired: 'badge-red',
  Draft: 'badge-grey',
  Dispatched: 'badge-blue',
  Completed: 'badge-green',
  Cancelled: 'badge-red',
  'Off Duty': 'badge-grey',
  Suspended: 'badge-red',
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${MAP[status] || 'badge-grey'}`}>{status}</span>;
}
