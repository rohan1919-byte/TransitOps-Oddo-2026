import React from 'react';

export default function Modal({ open, onClose, title, children, width = 460 }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(14,24,48,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16 }}>{title}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
        {children}
      </div>
    </div>
  );
}
