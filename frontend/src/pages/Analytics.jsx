import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import api from '../api/client';

function jitter(seed, amount) {
  const x = Math.sin(seed * 999) * 10000;
  return (x - Math.floor(x) - 0.5) * amount * 2;
}

function SketchBar(props) {
  const { x, y, width, height, fill, index = 0 } = props;
  if (!height || height <= 0) return null;
  const j = 3.2;
  const s = index + 1;
  const p = [
    [x + jitter(s + 0.1, j), y + jitter(s + 0.2, j)],
    [x + width + jitter(s + 0.3, j), y + jitter(s + 0.4, j)],
    [x + width + jitter(s + 0.5, j), y + height + jitter(s + 0.6, j)],
    [x + jitter(s + 0.7, j), y + height + jitter(s + 0.8, j)],
  ];
  const d = `M ${p[0][0]},${p[0][1]} L ${p[1][0]},${p[1][1]} L ${p[2][0]},${p[2][1]} L ${p[3][0]},${p[3][1]} Z`;
  const d2 = `M ${p[0][0] + 1.5},${p[0][1] - 1} L ${p[1][0] - 1},${p[1][1] + 1.5} L ${p[2][0] + 1},${p[2][1] - 1.5} L ${p[3][0] - 1.5},${p[3][1] + 1} Z`;

  return (
    <g>
      <path d={d} fill={fill} fillOpacity={0.8} stroke={fill} strokeWidth={2} strokeLinejoin="round" />
      <path d={d2} fill="none" stroke={fill} strokeWidth={1.3} strokeLinejoin="round" opacity={0.5} />
    </g>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [vehicleStatus, setVehicleStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/analytics/summary')
      .then((summaryRes) => {
        setData(summaryRes.data);
        if (summaryRes.data.vehicleStatusBreakdown) {
          setVehicleStatus(summaryRes.data.vehicleStatusBreakdown);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load analytics.');
      });
  }, []);

  async function exportCsv() {
    const res = await api.get('/analytics/export.csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'transitops_report.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const maxCost = data ? Math.max(1, ...data.topCostliestVehicles.map((v) => Number(v.total_cost))) : 1;
  const barColors = ['var(--red-600)', 'var(--amber-500)', 'var(--teal-600)', 'var(--blue-600)', 'var(--green-600)'];

  const statusRows = vehicleStatus && [
    { label: 'Available', count: vehicleStatus.Available, color: 'var(--green-600)' },
    { label: 'On Trip', count: vehicleStatus['On Trip'], color: 'var(--blue-600)' },
    { label: 'In Shop', count: vehicleStatus['In Shop'], color: 'var(--amber-500)' },
    { label: 'Retired', count: vehicleStatus.Retired, color: 'var(--red-600)' },
  ];
  const maxStatus = statusRows ? Math.max(1, ...statusRows.map((r) => r.count)) : 1;

  return (
    <Layout title="Reports & Analytics" subtitle="Fleet performance, cost and return on investment">
      <div className="filters-row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={exportCsv}>⭳ Export CSV</button>
      </div>

      {error && <div className="alert alert-error">✕ {error}</div>}

      {!data ? (
        <div className="empty-state">Loading analytics…</div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--accent': 'var(--teal-600)' }}>
              <div className="kpi-label">Fuel Efficiency</div>
              <div className="kpi-value">{data.fuelEfficiency} km/l</div>
            </div>
            <div className="kpi-card" style={{ '--accent': 'var(--green-600)' }}>
              <div className="kpi-label">Fleet Utilization</div>
              <div className="kpi-value">{data.fleetUtilization}%</div>
            </div>
            <div className="kpi-card" style={{ '--accent': 'var(--amber-500)' }}>
              <div className="kpi-label">Operational Cost</div>
              <div className="kpi-value">₹{data.operationalCost.toLocaleString()}</div>
            </div>
            <div className="kpi-card" style={{ '--accent': 'var(--blue-600)' }}>
              <div className="kpi-label">Vehicle ROI</div>
              <div className="kpi-value">{data.vehicleROI}%</div>
            </div>
          </div>
          <div className="rule-note" style={{ marginBottom: 18 }}>
            ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
          </div>

          <div className="two-col">
            <div className="card" style={{ padding: 18 }}>
              <div className="sketch-title">Monthly Revenue</div>
              {data.monthlyRevenue.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.monthlyRevenue}>
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v) => `₹${Number(v).toLocaleString()}`}
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}
                    />
                    <Bar dataKey="revenue" fill="var(--teal-600)" shape={<SketchBar />} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">Complete trips to see revenue trends.</div>
              )}
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="section-title">Top Costliest Vehicles</div>
              <div className="stack-gap">
                {data.topCostliestVehicles.map((v, i) => (
                  <div key={v.reg_no}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span>{v.name_model}</span>
                      <strong>₹{Number(v.total_cost).toLocaleString()}</strong>
                    </div>
                    <div className="hbar-track">
                      <div className="hbar-fill" style={{ width: `${(v.total_cost / maxCost) * 100}%`, background: barColors[i % barColors.length] }} />
                    </div>
                  </div>
                ))}
                {!data.topCostliestVehicles.length && <div className="empty-state">No cost data yet.</div>}
              </div>
            </div>
          </div>
          <div className="two-col" style={{ marginTop: 18 }}>
            <div className="card" style={{ padding: 18 }}>
              <div className="section-title">Vehicle Status Overview</div>
              {statusRows ? (
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
                            width: r.count === 0 ? '2%' : `${(r.count / maxStatus) * 100}%`,
                            background: r.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Loading vehicle status…</div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
