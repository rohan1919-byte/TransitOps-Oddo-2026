import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const STAGES = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

const EMPTY = { source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight_kg: '', planned_distance_km: '' };

function Stepper({ status }) {
  if (status === 'Cancelled') {
    return (
      <div>
        <div className="stepper">
          <div className="step-dot done" />
          <div className="step-line" />
          <div className="step-dot" style={{ background: 'var(--red-600)', borderColor: 'var(--red-600)' }} />
        </div>
        <div className="step-labels"><span>Draft</span><span style={{ color: 'var(--red-600)' }}>Cancelled</span></div>
      </div>
    );
  }
  const idx = STAGES.indexOf(status);
  return (
    <div>
      <div className="stepper">
        {STAGES.slice(0, 3).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`step-dot ${i < idx ? 'done' : i === idx ? 'current' : ''}`} />
            {i < 2 && <div className={`step-line ${i < idx ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>
      <div className="step-labels"><span>Draft</span><span>Dispatched</span><span>Completed</span></div>
    </div>
  );
}

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeForm, setCompleteForm] = useState({ final_odometer: '', fuel_consumed_l: '', fuel_cost: '', revenue: '' });
  const [search, setSearch] = useState('');
  const { can } = useAuth();
  const canEdit = can('trips', true);

  async function loadAll() {
    setError('');
    try {
      const requests = [api.get('/trips')];
      if (canEdit) {
        requests.push(api.get('/vehicles/available'), api.get('/drivers/available'));
      }

      const results = await Promise.allSettled(requests);
      const [t, v, d] = canEdit ? results : [results[0], null, null];

      if (t.status === 'fulfilled') setTrips(t.value.data);
      if (v?.status === 'fulfilled') setVehicles(v.value.data);
      if (d?.status === 'fulfilled') setDrivers(d.value.data);

      const failed = results.find((r) => r.status === 'rejected');
      if (failed) {
        setError(failed.reason?.response?.data?.error || 'Could not load trip data.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load trip data.');
    }
  }

  useEffect(() => { loadAll(); }, [canEdit]);

  const selectedVehicle = vehicles.find((v) => String(v.id) === String(form.vehicle_id));
  const capacityBreach = selectedVehicle && form.cargo_weight_kg && Number(form.cargo_weight_kg) > Number(selectedVehicle.capacity_kg);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/trips', form);
      setCreateOpen(false);
      setForm(EMPTY);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create trip.');
    }
  }

  async function dispatch(id) {
    setError('');
    try {
      await api.post(`/trips/${id}/dispatch`);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not dispatch trip.');
    }
  }

  async function cancel(id) {
    setError('');
    try {
      await api.post(`/trips/${id}/cancel`);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not cancel trip.');
    }
  }

  async function submitComplete(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/trips/${completeTarget.id}/complete`, completeForm);
      setCompleteTarget(null);
      setCompleteForm({ final_odometer: '', fuel_consumed_l: '', fuel_cost: '', revenue: '' });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not complete trip.');
    }
  }

  const liveBoard = trips.slice(0, 6);
  const filtered = trips.filter((t) =>
    !search || t.trip_code.toLowerCase().includes(search.toLowerCase()) || (t.vehicle_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Trip Dispatcher" subtitle={canEdit ? 'Create, dispatch and track trips through their lifecycle' : 'View trip status and lifecycle'}>
      <div className="filters-row" style={{ justifyContent: 'space-between' }}>
        <input className="text-input" placeholder="Search trip or vehicle…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
        {canEdit && <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>+ Create Trip</button>}
      </div>

      {error && <div className="alert alert-error">✕ {error}</div>}

      <div className="two-col">
        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Trip Lifecycle</div>
          <Stepper status="Draft" />
          <div className="table-wrap" style={{ marginTop: 6 }}>
            <table>
              <thead>
                <tr><th>Trip</th><th>Route</th><th>Vehicle / Driver</th><th>Cargo</th><th>Status</th>{canEdit && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="mono">{t.trip_code}</td>
                    <td style={{ fontSize: 12.5 }}>{t.source} → {t.destination}</td>
                    <td style={{ fontSize: 12.5 }}>{t.vehicle_name || '—'} / {t.driver_name || '—'}</td>
                    <td>{Number(t.cargo_weight_kg)} kg</td>
                    <td><StatusBadge status={t.status} /></td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {t.status === 'Draft' && (
                            <>
                              <button className="btn btn-teal btn-sm" onClick={() => dispatch(t.id)}>Dispatch</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => cancel(t.id)}>Cancel</button>
                            </>
                          )}
                          {t.status === 'Dispatched' && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => setCompleteTarget(t)}>Complete</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => cancel(t.id)}>Cancel</button>
                            </>
                          )}
                          {['Completed', 'Cancelled'].includes(t.status) && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={canEdit ? 6 : 5} className="empty-state">{canEdit ? 'No trips yet — create one to get started.' : 'No trips found.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Live Board</div>
          <div className="stack-gap">
            {liveBoard.map((t) => (
              <div key={t.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <strong className="mono">{t.trip_code}</strong>
                  <StatusBadge status={t.status} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{t.source} → {t.destination}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t.vehicle_name || 'Unassigned'} {t.driver_name ? `/ ${t.driver_name}` : ''}
                </div>
              </div>
            ))}
          </div>
          <div className="rule-note">On Complete: odometer + fuel log → expenses → Vehicle & Driver Available.</div>
        </div>
      </div>

      {canEdit && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create trip">
        <form onSubmit={handleCreate}>
          {error && <div className="alert alert-error">✕ {error}</div>}
          <div className="form-group">
            <label className="form-label">Source</label>
            <input className="form-input" required value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="Gandhinagar Depot" />
          </div>
          <div className="form-group">
            <label className="form-label">Destination</label>
            <input className="form-input" required value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} placeholder="Ahmedabad Hub" />
          </div>
          <div className="form-group">
            <label className="form-label">Vehicle (Available only)</label>
            <select className="form-select" value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name_model} — {v.capacity_kg} kg capacity</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Driver (Available only)</label>
            <select className="form-select" value={form.driver_id} onChange={(e) => setForm((f) => ({ ...f, driver_id: e.target.value }))}>
              <option value="">Select driver…</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Cargo Weight (kg)</label>
              <input className="form-input" type="number" required value={form.cargo_weight_kg} onChange={(e) => setForm((f) => ({ ...f, cargo_weight_kg: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Planned Distance (km)</label>
              <input className="form-input" type="number" required value={form.planned_distance_km} onChange={(e) => setForm((f) => ({ ...f, planned_distance_km: e.target.value }))} />
            </div>
          </div>

          {selectedVehicle && (
            <div className={`alert ${capacityBreach ? 'alert-error' : 'alert-info'}`}>
              {capacityBreach ? '✕' : 'ℹ'} Vehicle Capacity {selectedVehicle.capacity_kg} kg
              {form.cargo_weight_kg ? ` · Cargo Weight ${form.cargo_weight_kg} kg` : ''}
              {capacityBreach ? ' — Capacity exceeded → dispatch blocked' : ''}
            </div>
          )}

          <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={capacityBreach}>
            {form.vehicle_id && form.driver_id ? 'Create & Dispatch Trip' : 'Create Draft Trip'}
          </button>
        </form>
        </Modal>
      )}

      {canEdit && (
        <Modal open={!!completeTarget} onClose={() => setCompleteTarget(null)} title={`Complete trip ${completeTarget?.trip_code || ''}`}>
        <form onSubmit={submitComplete}>
          <div className="form-group">
            <label className="form-label">Final Odometer</label>
            <input className="form-input" type="number" required value={completeForm.final_odometer} onChange={(e) => setCompleteForm((f) => ({ ...f, final_odometer: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Fuel Consumed (L)</label>
              <input className="form-input" type="number" required value={completeForm.fuel_consumed_l} onChange={(e) => setCompleteForm((f) => ({ ...f, fuel_consumed_l: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Fuel Cost (₹)</label>
              <input className="form-input" type="number" value={completeForm.fuel_cost} onChange={(e) => setCompleteForm((f) => ({ ...f, fuel_cost: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Trip Revenue (₹)</label>
            <input className="form-input" type="number" value={completeForm.revenue} onChange={(e) => setCompleteForm((f) => ({ ...f, revenue: e.target.value }))} />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Mark Completed</button>
        </form>
        </Modal>
      )}
    </Layout>
  );
}
