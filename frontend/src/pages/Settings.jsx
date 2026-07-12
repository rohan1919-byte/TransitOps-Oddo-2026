import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const RESOURCES = ['vehicles', 'drivers', 'trips', 'fuel', 'analytics'];
const RESOURCE_LABELS = { vehicles: 'Fleet', drivers: 'Drivers', trips: 'Trips', fuel: 'Fuel/Exp', analytics: 'Analytics' };

function Cell({ level }) {
  if (level === 'edit') return <span style={{ color: 'var(--green-600)', fontWeight: 700 }}>✓</span>;
  if (level === 'view') return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>view</span>;
  return <span style={{ color: 'var(--border)' }}>—</span>;
}

export default function Settings() {
  const [depot, setDepot] = useState(null);
  const [rbac, setRbac] = useState(null);
  const [saved, setSaved] = useState(false);
  const { can } = useAuth();
  const canEdit = can('settings', true);

  useEffect(() => {
    api.get('/settings').then((res) => {
      setDepot(res.data.depot);
      setRbac(res.data.rbac);
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    const { data } = await api.put('/settings', depot);
    setDepot(data.depot);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!depot || !rbac) return <Layout title="Settings & RBAC"><div className="empty-state">Loading…</div></Layout>;

  return (
    <Layout title="Settings & RBAC" subtitle="Depot configuration and role-based access control">
      <div className="two-col">
        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">General</div>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Depot Name</label>
              <input className="form-input" disabled={!canEdit} value={depot.depotName} onChange={(e) => setDepot((d) => ({ ...d, depotName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <input className="form-input" disabled={!canEdit} value={depot.currency} onChange={(e) => setDepot((d) => ({ ...d, currency: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Distance Unit</label>
              <input className="form-input" disabled={!canEdit} value={depot.distanceUnit} onChange={(e) => setDepot((d) => ({ ...d, distanceUnit: e.target.value }))} />
            </div>
            {canEdit && <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>{saved ? 'Saved ✓' : 'Save changes'}</button>}
          </form>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Role-Based Access (RBAC)</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  {RESOURCES.map((r) => <th key={r}>{RESOURCE_LABELS[r]}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(rbac).map(([role, perms]) => (
                  <tr key={role}>
                    <td>{role}</td>
                    {RESOURCES.map((r) => (
                      <td key={r}><Cell level={perms[r]} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
