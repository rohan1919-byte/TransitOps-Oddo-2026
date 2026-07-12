import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMPTY = { vehicle_id: '', service_type: '', cost: '', service_date: '' };

export default function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const { can } = useAuth();
  const canEdit = can('maintenance', true);

  async function load() {
    const [l, v] = await Promise.all([api.get('/maintenance'), api.get('/vehicles')]);
    setLogs(l.data);
    setVehicles(v.data.filter((x) => x.status !== 'Retired'));
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/maintenance', form);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save service record.');
    }
  }

  async function closeRecord(id) {
    setError('');
    try {
      await api.post(`/maintenance/${id}/close`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not close record.');
    }
  }

  return (
    <Layout title="Maintenance" subtitle="Service history and shop status per vehicle">
      <div className="two-col">
        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Log Service Record</div>
          {error && <div className="alert alert-error">✕ {error}</div>}
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Vehicle</label>
              <select className="form-select" required disabled={!canEdit} value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name_model} ({v.reg_no})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Service Type</label>
              <input className="form-input" required disabled={!canEdit} value={form.service_type} onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))} placeholder="Oil Change" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Cost (₹)</label>
                <input className="form-input" type="number" disabled={!canEdit} value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" disabled={!canEdit} value={form.service_date} onChange={(e) => setForm((f) => ({ ...f, service_date: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={!canEdit}>Save</button>
          </form>

          <div className="rule-note">
            Available <span style={{ margin: '0 6px' }}>→</span> logging a service record <span style={{ margin: '0 6px' }}>→</span> In Shop<br />
            In Shop <span style={{ margin: '0 6px' }}>→</span> closing the record <span style={{ margin: '0 6px' }}>→</span> Available<br />
            Note: In Shop vehicles are removed from the dispatch pool.
          </div>
        </div>

        <div className="table-wrap">
          <div style={{ padding: '14px 16px 0' }} className="section-title">Service Log</div>
          <table>
            <thead><tr><th>Vehicle</th><th>Service</th><th>Cost</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.vehicle_name}</td>
                  <td>{l.service_type}</td>
                  <td>₹{Number(l.cost).toLocaleString()}</td>
                  <td><StatusBadge status={l.status === 'In Shop' ? 'In Shop' : 'Completed'} /></td>
                  <td>
                    {l.status === 'In Shop' && canEdit && (
                      <button className="btn btn-secondary btn-sm" onClick={() => closeRecord(l.id)}>Close</button>
                    )}
                  </td>
                </tr>
              ))}
              {!logs.length && <tr><td colSpan={5} className="empty-state">No maintenance records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
