import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [trips, setTrips] = useState([]);
  const [filters, setFilters] = useState({ type: 'All', status: 'All', region: 'All' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [kpiRes, tripRes] = await Promise.all([
        api.get('/dashboard/kpis', { params: filters }),
        api.get('/dashboard/recent-trips'),
      ]);
      setKpis(kpiRes.data);
      setTrips(tripRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load dashboard data.');
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters.type, filters.status, filters.region]);

  const KPI_DEFS = kpis && [
    { label: 'Active Vehicles', value: kpis.activeVehicles, accent: 'var(--teal-600)' },
    { label: 'Available Vehicles', value: kpis.availableVehicles, accent: 'var(--green-600)' },
    { label: 'Vehicles in Maintenance', value: kpis.vehiclesInMaintenance, accent: 'var(--amber-500)' },
    { label: 'Active Trips', value: kpis.activeTrips, accent: 'var(--blue-600)' },
    { label: 'Pending Trips', value: kpis.pendingTrips, accent: 'var(--text-muted)' },
    { label: 'Drivers On Duty', value: kpis.driversOnDuty, accent: 'var(--ink-800)' },
    { label: 'Fleet Utilization', value: `${kpis.fleetUtilization}%`, accent: 'var(--green-600)' },
  ];

  const statusRows = kpis && [
    { label: 'Available', count: kpis.vehicleStatusBreakdown.Available, color: 'var(--green-600)' },
    { label: 'On Trip', count: kpis.vehicleStatusBreakdown['On Trip'], color: 'var(--blue-600)' },
    { label: 'In Shop', count: kpis.vehicleStatusBreakdown['In Shop'], color: 'var(--amber-500)' },
    { label: 'Retired', count: kpis.vehicleStatusBreakdown.Retired, color: 'var(--red-600)' },
  ];
  const maxCount = statusRows ? Math.max(1, ...statusRows.map((r) => r.count)) : 1;

  return (
    <Layout title="Dashboard" subtitle="Live snapshot of your fleet's operational state">
      <div className="filters-row">
        <select className="select" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
          {['All', 'Van', 'Truck', 'Mini'].map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className="select" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          {['All', 'Available', 'On Trip', 'In Shop', 'Retired'].map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className="select" value={filters.region} onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}>
          {['All', 'Ahmedabad', 'Vadodara', 'Gandhinagar', 'Anand'].map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-error">✕ {error}</div>}

      {loading ? (
        <div className="empty-state">Loading dashboard…</div>
      ) : !kpis ? (
        <div className="empty-state">Dashboard data unavailable.</div>
      ) : (
        <>
          <div className="kpi-grid">
            {KPI_DEFS.map((k) => (
              <div className="kpi-card" key={k.label} style={{ '--accent': k.accent }}>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="two-col">
            <div className="table-wrap">
              <div style={{ padding: '14px 16px 0 16px' }} className="section-title">Recent Trips</div>
              <table>
                <thead>
                  <tr><th>Trip</th><th>Vehicle</th><th>Driver</th><th>Status</th><th>ETA</th></tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr key={t.id}>
                      <td className="mono">{t.trip_code}</td>
                      <td>{t.vehicle_name || '—'}</td>
                      <td>{t.driver_name || '—'}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td style={{ color: 'var(--text-muted)' }}>{t.eta || '—'}</td>
                    </tr>
                  ))}
                  {!trips.length && (
                    <tr><td colSpan={5} className="empty-state">No trips recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="section-title">Vehicle Status</div>
              <div className="stack-gap">
                {statusRows.map((r) => (
                  <div key={r.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span>{r.label}</span>
                      <strong>{r.count}</strong>
                    </div>
                    <div className="hbar-track">
                      <div
                        className={`hbar-fill${r.count === 0 ? ' hbar-fill-empty' : ''}`}
                        style={{
                          width: r.count === 0 ? '2%' : `${(r.count / maxCount) * 100}%`,
                          background: r.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
