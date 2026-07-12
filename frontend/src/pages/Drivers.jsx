import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMPTY = { name: '', license_no: '', license_category: 'LMV', license_expiry: '', contact_no: '', safety_score: 100 };

function isExpired(date) {
  return new Date(date) < new Date();
}

function toForm(driver) {
  return {
    name: driver.name,
    license_no: driver.license_no,
    license_category: driver.license_category,
    license_expiry: driver.license_expiry?.slice(0, 10) || '',
    contact_no: driver.contact_no,
    safety_score: driver.safety_score,
    status: driver.status,
  };
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const { can } = useAuth();
  const canEdit = can('drivers', true);

  async function load() {
    const { data } = await api.get('/drivers', { params: { search } });
    setDrivers(data);
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setModalOpen(true);
  }

  function openEdit(driver) {
    setEditing(driver);
    setForm(toForm(driver));
    setError('');
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/drivers/${editing.id}`, form);
      } else {
        await api.post('/drivers', form);
      }
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.error || `Could not ${editing ? 'update' : 'add'} driver.`);
    }
  }

  async function updateStatus(driver, status) {
    setError('');
    try {
      await api.put(`/drivers/${driver.id}`, { ...toForm(driver), status });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update driver status.');
    }
  }

  const summary = ['Available', 'On Trip', 'Off Duty', 'Suspended'].map((s) => ({
    label: s, count: drivers.filter((d) => d.status === s).length,
  }));

  return (
    <Layout title="Drivers & Safety Profiles" subtitle="Compliance, licensing and safety scores">
      {error && !modalOpen && <div className="alert alert-error">✕ {error}</div>}

      <div className="filters-row" style={{ justifyContent: 'space-between' }}>
        <input className="text-input" placeholder="Search driver or license…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
        {canEdit && <button className="btn btn-primary" onClick={openAdd}>+ Add Driver</button>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Driver</th><th>License No.</th><th>Category</th><th>Expiry</th>
              <th>Contact</th><th>Safety Score</th><th>Status</th>
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td className="mono">{d.license_no}</td>
                <td>{d.license_category}</td>
                <td style={{ color: isExpired(d.license_expiry) ? 'var(--red-600)' : 'inherit', fontWeight: isExpired(d.license_expiry) ? 600 : 400 }}>
                  {new Date(d.license_expiry).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  {isExpired(d.license_expiry) ? ' · EXPIRED' : ''}
                </td>
                <td className="mono">{d.contact_no}</td>
                <td>{Number(d.safety_score).toFixed(0)}%</td>
                <td><StatusBadge status={d.status} /></td>
                {canEdit && (
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(d)}>Edit</button>
                      {d.status !== 'Suspended' && d.status !== 'On Trip' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(d, 'Suspended')}>Suspend</button>
                      )}
                      {d.status === 'Suspended' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(d, 'Available')}>Activate</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!drivers.length && <tr><td colSpan={canEdit ? 8 : 7} className="empty-state">No drivers found.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        {summary.map((s) => (
          <span key={s.label} className="badge badge-grey">{s.label}: {s.count}</span>
        ))}
      </div>
      <div className="rule-note">Rule: Expired license or Suspended status → blocked from trip assignment.</div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit driver' : 'Add a new driver'}>
        <form onSubmit={handleSave}>
          {error && <div className="alert alert-error">✕ {error}</div>}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">License No.</label>
            <input className="form-input" required disabled={!!editing} value={form.license_no} onChange={(e) => setForm((f) => ({ ...f, license_no: e.target.value }))} placeholder="DL-XXXXX" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.license_category} onChange={(e) => setForm((f) => ({ ...f, license_category: e.target.value }))}>
                {['LMV', 'HMV'].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input className="form-input" type="date" required value={form.license_expiry} onChange={(e) => setForm((f) => ({ ...f, license_expiry: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Contact No.</label>
            <input className="form-input" required value={form.contact_no} onChange={(e) => setForm((f) => ({ ...f, contact_no: e.target.value }))} placeholder="98XXXXXXXX" />
          </div>
          <div className="form-group">
            <label className="form-label">Safety Score</label>
            <input className="form-input" type="number" min="0" max="100" value={form.safety_score} onChange={(e) => setForm((f) => ({ ...f, safety_score: e.target.value }))} />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>{editing ? 'Save Changes' : 'Add Driver'}</button>
        </form>
      </Modal>
    </Layout>
  );
}
