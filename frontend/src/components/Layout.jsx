import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', resource: 'dashboard', end: true },
  { to: '/fleet', label: 'Fleet', resource: 'vehicles' },
  { to: '/drivers', label: 'Drivers', resource: 'drivers' },
  { to: '/trips', label: 'Trips', resource: 'trips' },
  { to: '/maintenance', label: 'Maintenance', resource: 'maintenance' },
  { to: '/fuel-expenses', label: 'Fuel & Expenses', resource: 'fuel' },
  { to: '/analytics', label: 'Analytics', resource: 'analytics' },
  { to: '/settings', label: 'Settings', resource: 'settings' },
];

const ROLE_INITIALS = {
  'Fleet Manager': 'FM',
  Dispatcher: 'DP',
  'Safety Officer': 'SO',
  'Financial Analyst': 'FA',
};

export default function Layout({ children, title, subtitle }) {
  const { user, can, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 100 100">
              <path d="M20 62 L45 30 L58 48 L80 22" stroke="#E3A008" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="brand-name">TransitOps</div>
            <div className="brand-tag">Smart Transport Ops</div>
          </div>
        </div>
        <nav className="nav-list">
          {NAV_ITEMS.filter((item) => can(item.resource)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="dot" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">TransitOps © 2026 · RBAC enabled</div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <input className="search-input" placeholder="Search…" />
          <div className="topbar-right">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀' : '☾'}
            </button>
            <span className="user-name">{user?.name}</span>
            <span className="role-chip">{user?.role}</span>
            <div className="avatar" title="Sign out" onClick={handleLogout} style={{ cursor: 'pointer' }}>
              {ROLE_INITIALS[user?.role] || 'U'}
            </div>
          </div>
        </header>
        <main className="page-content">
          {(title || subtitle) && (
            <div className="page-header">
              <div>
                <h1>{title}</h1>
                {subtitle && <div className="subtitle">{subtitle}</div>}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
