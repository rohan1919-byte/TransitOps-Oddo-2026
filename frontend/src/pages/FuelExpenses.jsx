import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const FUEL_EMPTY = { vehicle_id: '', liters: '', cost: '', log_date: '' };
const EXP_EMPTY = { vehicle_id: '', toll: '', other: '', maint_linked: '' };

export default function FuelExpenses() {
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [fuelModal, setFuelModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [fuelForm, setFuelForm] = useState(FUEL_EMPTY);
  const [expForm, setExpForm] = useState(EXP_EMPTY);
  const [error, setError] = useState('');
  const { can } = useAuth();
  const canEdit = can('fuel', true);

  async function load() {
    const [f, e, v, c] = await Promise.all([
      api.get('/fuel/logs'),
      api.get('/fuel/expenses'),
      api.get('/vehicles'),
      api.get('/fuel/operational-cost'),
    ]);
    setFuelLogs(f.data);
    setExpenses(e.data);
    setVehicles(v.data);
    setTotalCost(c.data.reduce((sum, r) => sum + Number(r.total_operational_cost), 0));
  }

  useEffect(() => { load(); }, []);

  async function saveFuel(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/fuel/logs', fuelForm);
      setFuelModal(false);
      setFuelForm(FUEL_EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not log fuel.');
    }
  }

  async function saveExpense(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/fuel/expenses', expForm);
      setExpModal(false);
      setExpForm(EXP_EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not log expense.');
    }
  }

  return (
    <Layout title="Fuel & Expense Management" subtitle="Track fuel logs and other operational costs">
      <div className="filters-row" style={{ justifyContent: 'flex-end' }}>
        {canEdit && (
          <>
            <button className="btn btn-primary" onClick={() => setFuelModal(true)}>+ Log Fuel</button>
            <button className="btn btn-secondary" onClick={() => setExpModal(true)}>+ Add Expense</button>
          </>
        )}
      </div>

      {error && <div className="alert alert-error">✕ {error}</div>}

      <div className="table-wrap" style={{ marginBottom: 20 }}>
        <div style={{ padding: '14px 16px 0' }} className="section-title">Fuel Logs</div>
        <table>
          <thead><tr><th>Vehicle</th><th>Date</th><th>Liters</th><th>Fuel Cost</th></tr></thead>
          <tbody>
            {fuelLogs.map((f) => (
              <tr key={f.id}>
                <td>{f.vehicle_name}</td>
                <td>{new Date(f.log_date).toLocaleDateString('en-GB')}</td>
                <td>{Number(f.liters)} L</td>
                <td>₹{Number(f.cost).toLocaleString()}</td>
              </tr>
            ))}
            {!fuelLogs.length && <tr><td colSpan={4} className="empty-state">No fuel logs yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <div style={{ padding: '14px 16px 0' }} className="section-title">Other Expenses (Toll / Misc)</div>
        <table>
          <thead><tr><th>Trip</th><th>Vehicle</th><th>Toll</th><th>Other</th><th>Maint. (Linked)</th><th>Total</th></tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className="mono">{e.trip_code || '—'}</td>
                <td>{e.vehicle_name}</td>
                <td>₹{Number(e.toll).toLocaleString()}</td>
                <td>₹{Number(e.other).toLocaleString()}</td>
                <td>₹{Number(e.maint_linked).toLocaleString()}</td>
                <td><strong>₹{Number(e.total).toLocaleString()}</strong></td>
              </tr>
            ))}
            {!expenses.length && <tr><td colSpan={6} className="empty-state">No other expenses logged yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 4px' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Operational Cost (Auto) = Fuel + Maintenance</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--amber-600)' }}>
          ₹{totalCost.toLocaleString()}
        </span>
      </div>

      <Modal open={fuelModal} onClose={() => setFuelModal(false)} title="Log fuel">
        <form onSubmit={saveFuel}>
          <div className="form-group">
            <label className="form-label">Vehicle</label>
            <select className="form-select" required value={fuelForm.vehicle_id} onChange={(e) => setFuelForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name_model} ({v.reg_no})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Liters</label>
              <input className="form-input" type="number" required value={fuelForm.liters} onChange={(e) => setFuelForm((f) => ({ ...f, liters: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost (₹)</label>
              <input className="form-input" type="number" required value={fuelForm.cost} onChange={(e) => setFuelForm((f) => ({ ...f, cost: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={fuelForm.log_date} onChange={(e) => setFuelForm((f) => ({ ...f, log_date: e.target.value }))} />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Log Fuel</button>
        </form>
      </Modal>

      <Modal open={expModal} onClose={() => setExpModal(false)} title="Add expense">
        <form onSubmit={saveExpense}>
          <div className="form-group">
            <label className="form-label">Vehicle</label>
            <select className="form-select" required value={expForm.vehicle_id} onChange={(e) => setExpForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name_model} ({v.reg_no})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Toll (₹)</label>
              <input className="form-input" type="number" value={expForm.toll} onChange={(e) => setExpForm((f) => ({ ...f, toll: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Other (₹)</label>
              <input className="form-input" type="number" value={expForm.other} onChange={(e) => setExpForm((f) => ({ ...f, other: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Add Expense</button>
        </form>
      </Modal>
    </Layout>
  );
}
