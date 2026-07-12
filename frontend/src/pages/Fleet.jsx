import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMPTY = { reg_no: '', name_model: '', type: 'Van', capacity_kg: '', odometer: '', acquisition_cost: '', region: 'Ahmedabad' };

export default function Fleet() {
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({ type: 'All', status: 'All', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const { can } = useAuth();
  const canEdit = can('vehicles', true);

  async function load() {
    setLoadError('');
    try {
      const { data } = await api.get('/vehicles', { params: filters });
      setVehicles(data);
    } catch (err) {
      setLoadError(err.response?.data?.error || 'Could not load vehicles.');
      setVehicles([]);
    }
  }

  useEffect(() => { load(); }, [filters.type, filters.status]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/vehicles', form);
      setModalOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not register vehicle.');
    }
  }

  return (
    <Layout title="Vehicle Registry" subtitle="Master list of fleet assets">
      <div className="filters-row" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="select" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
            {['All', 'Van', 'Truck', 'Mini'].map((v) => <option key={v}>{v}</option>)}
          </select>
          <select className="select" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            {['All', 'Available', 'On Trip', 'In Shop', 'Retired'].map((v) => <option key={v}>{v}</option>)}
          </select>
          <input
            className="text-input"
            placeholder="Search reg. no…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Add Vehicle</button>
        )}
      </div>

      {loadError && <div className="alert alert-error">✕ {loadError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reg. No (Unique)</th><th>Name/Model</th><th>Type</th><th>Capacity</th>
              <th>Odometer</th><th>Acq. Cost</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td className="mono">{v.reg_no}</td>
                <td>{v.name_model}</td>
                <td>{v.type}</td>
                <td>{Number(v.capacity_kg).toLocaleString()} kg</td>
                <td>{Number(v.odometer).toLocaleString()}</td>
                <td>₹{Number(v.acquisition_cost).toLocaleString()}</td>
                <td><StatusBadge status={v.status} /></td>
              </tr>
            ))}
            {!vehicles.length && (
              <tr><td colSpan={7} className="empty-state">No vehicles match these filters yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="rule-note">Rule: Registration No. must be unique · Retired / In Shop vehicles are hidden from Trip Dispatcher.</div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Register a new vehicle">
        <form onSubmit={handleAdd}>
          {error && <div className="alert alert-error">✕ {error}</div>}
          <div className="form-group">
            <label className="form-label">Registration No.</label>
            <input className="form-input" required value={form.reg_no} onChange={(e) => setForm((f) => ({ ...f, reg_no: e.target.value }))} placeholder="GJ01AB1234" />
          </div>
          <div className="form-group">
            <label className="form-label">Name / Model</label>
            <input className="form-input" required value={form.name_model} onChange={(e) => setForm((f) => ({ ...f, name_model: e.target.value }))} placeholder="Van-10" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {['Van', 'Truck', 'Mini'].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Capacity (kg)</label>
              <input className="form-input" type="number" required value={form.capacity_kg} onChange={(e) => setForm((f) => ({ ...f, capacity_kg: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Odometer</label>
              <input className="form-input" type="number" value={form.odometer} onChange={(e) => setForm((f) => ({ ...f, odometer: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Acquisition Cost (₹)</label>
              <input className="form-input" type="number" value={form.acquisition_cost} onChange={(e) => setForm((f) => ({ ...f, acquisition_cost: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Region</label>
            <input className="form-input" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Add Vehicle</button>
        </form>
      </Modal>
    </Layout>
  );
}
