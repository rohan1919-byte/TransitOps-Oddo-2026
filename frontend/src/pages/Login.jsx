import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ROLE_CONFIG = [
  { name: 'Fleet Manager', email: 'meera@transitops.in', color: 'var(--teal-600)', scope: 'Fleet, Drivers, Maintenance' },
  { name: 'Dispatcher', email: 'raven@transitops.in', color: 'var(--amber-500)', scope: 'Dashboard, Trips' },
  { name: 'Safety Officer', email: 'divya@transitops.in', color: 'var(--green-600)', scope: 'Drivers, Compliance' },
  { name: 'Financial Analyst', email: 'kunal@transitops.in', color: 'var(--red-600)', scope: 'Dashboard, Fleet, Fuel & Expenses, Analytics' },
];

export default function Login() {
  const [role, setRole] = useState('Dispatcher');
  const [email, setEmail] = useState('raven@transitops.in');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const selectedRole = ROLE_CONFIG.find((r) => r.name === role);

  function handleRoleChange(newRole) {
    setRole(newRole);
    const match = ROLE_CONFIG.find((r) => r.name === newRole);
    if (match) setEmail(match.email);
    setError('');
  }

  function handleEmailChange(value) {
    setEmail(value);
    setError('');
    const match = ROLE_CONFIG.find((r) => r.email.toLowerCase() === value.trim().toLowerCase());
    if (match && match.name !== role) {
      setRole(match.name);
    }
  }

  function validateForm() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Email is required.');
      return false;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return false;
    }
    if (!password) {
      setError('Password is required.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    const account = ROLE_CONFIG.find((r) => r.email.toLowerCase() === trimmedEmail);
    if (!account) {
      setError('This email is not registered. Use a demo account email.');
      return false;
    }
    if (account.name !== role) {
      setError(`"${trimmedEmail}" belongs to ${account.name}, not ${role}. Select the correct role.`);
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      await login(email.trim(), password, role);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-side">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-mark" style={{ width: 42, height: 42 }}>
              <svg width="22" height="22" viewBox="0 0 100 100">
                <path d="M20 62 L45 30 L58 48 L80 22" stroke="#E3A008" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>TransitOps</div>
              <div style={{ fontSize: 12, color: '#93A0BC' }}>Smart Transport Operations Platform</div>
            </div>
          </div>

          <h2 style={{ color: '#EDF1F9', fontSize: 26, marginTop: 60, lineHeight: 1.3 }}>
            One login,<br />four operational roles.
          </h2>
          <p style={{ color: '#93A0BC', fontSize: 13.5, maxWidth: 320, marginTop: 10 }}>
            Vehicles, drivers, dispatch, maintenance, and cost tracking — scoped
            automatically to what each role needs to see.
          </p>

          <div className="role-pill-list">
            {ROLE_CONFIG.map((r) => (
              <div className="role-pill" key={r.name}>
                <span className="swatch" style={{ background: r.color }} />
                <strong style={{ color: '#EDF1F9', fontWeight: 600 }}>{r.name}</strong>
                <span style={{ color: '#6E7BA0' }}>→ {r.scope}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Sign in to your account</h2>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀' : '☾'}
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 22 }}>
            Enter your credentials to continue
          </p>

          {error && <div className="alert alert-error">✕ {error}</div>}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="you@transitops.in"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role (RBAC)</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              {ROLE_CONFIG.map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <span style={{ fontSize: 13, color: 'var(--blue-600)', cursor: 'pointer' }}>Forgot password?</span>
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          {/* <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 20, lineHeight: 1.6 }}>
            Demo password for every role: <span className="mono">Passw0rd!</span>
          </p> */}
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
            Access is scoped by role after login:
          </p>
          <ul style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
            <li><strong>{selectedRole?.name}</strong> → {selectedRole?.scope}</li>
            {ROLE_CONFIG.filter((r) => r.name !== role).map((r) => (
              <li key={r.name}>{r.name} → {r.scope}</li>
            ))}
          </ul>
        </form>
      </div>
    </div>
  );
}
